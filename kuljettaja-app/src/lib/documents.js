import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { useAuth } from './auth'
import { supabase } from './supabase'

// Kuljettajan dokumentit (migraatio 0052). Kuva tallentuu yksityiseen
// courier-documents-säiliöön polkuun <kuljettajan id>/<tyyppi>-<aikaleima>.jpg
// ja siitä syntyy tarkastettava rivi courier_documents-tauluun. delivo
// hyväksyy tai hylkää sen Studiossa.

const BUCKET = 'courier-documents'

export const DOCUMENT_TYPES = [
  { key: 'id_card', label: 'Henkilökortti tai passi' },
  { key: 'driving_licence', label: 'Ajokortti' },
  { key: 'business_register', label: 'Y-tunnus tai kaupparekisteriote' },
  { key: 'bank_proof', label: 'Pankkitodiste tilinumerosta' },
]

export const DOCUMENT_STATUS = {
  missing: 'Puuttuu',
  pending: 'Tarkastettavana',
  approved: 'Hyväksytty',
  rejected: 'Hylätty',
}

// Pakolliset dokumentit: henkilöllisyys aina, ajokortti autolla ja
// skootterilla, pankkitodiste kun laskutat omalla yrityksellä. Sama sääntö
// on palvelimella (courier_missing_documents, migraatio 0053).
export function isRequiredDocument(type, profile) {
  if (type === 'id_card') return true
  if (type === 'driving_licence') return profile.vehicle === 'car' || profile.vehicle === 'scooter'
  if (type === 'bank_proof') return profile.billingMethod === 'own_company'
  return false
}

// Pakolliset dokumentit, joilla ei ole hyväksyttyä kuvaa. Online-tilaan
// pääsee vasta, kun lista on tyhjä. Uusi kuva ei vie jo hyväksyttyä pois.
export function missingDocuments(documents, profile) {
  return DOCUMENT_TYPES.filter(
    ({ key }) =>
      isRequiredDocument(key, profile) &&
      !documents.some((document) => document.type === key && document.status === 'approved'),
  )
}

// Omat dokumentit, uusin ensin. Haetaan aina kun näkymä tulee esiin.
export function useDocuments() {
  const { courier } = useAuth()
  const courierId = courier?.id ?? null
  const [documents, setDocuments] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!supabase || !courierId) return
    const { data, error: fetchError } = await supabase
      .from('courier_documents')
      .select('id, type, status, admin_note, created_at')
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(documentErrorText(fetchError))
      return
    }
    setError('')
    setDocuments(data ?? [])
    setLoaded(true)
  }, [courierId])

  useFocusEffect(
    useCallback(() => {
      reload()
    }, [reload]),
  )

  // Uusin dokumentti tyypille (uusi kuva korvaa aiemman tarkastuksessa).
  const latestOf = (type) => documents.find((document) => document.type === type) ?? null

  // loaded: haku onnistui ainakin kerran (ennen sitä ei tiedetä, mitä puuttuu).
  return { documents, loaded, latestOf, error, reload }
}

// Lataa kuvan säiliöön ja lisää tarkastettavan rivin.
export async function uploadDocument(courierId, type, asset) {
  if (!supabase) throw new Error('Supabase-yhteyttä ei ole määritetty.')
  const png = asset.mimeType === 'image/png'
  const path = `${courierId}/${type}-${Date.now()}.${png ? 'png' : 'jpg'}`
  const response = await fetch(asset.uri)
  const body = await response.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: png ? 'image/png' : 'image/jpeg', upsert: false })
  if (uploadError) throw uploadError
  const { error } = await supabase.from('courier_documents').insert({ courier_id: courierId, type, path })
  if (error) throw error
}

export function documentErrorText(error) {
  const code = error?.code ?? ''
  const message = String(error?.message ?? '')
  if (code === '42P01' || code === 'PGRST205' || /bucket not found/i.test(message)) {
    return 'Dokumentit eivät ole vielä käytössä. Ota yhteyttä tukeen.'
  }
  if (/exceeded|too large|payload/i.test(message)) return 'Kuva on liian suuri (enintään 10 Mt).'
  return 'Lähetys epäonnistui. Tarkista yhteys ja yritä uudelleen.'
}
