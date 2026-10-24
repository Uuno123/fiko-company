import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { useAuth } from './auth'
import { tr } from './i18n'
import { supabase } from './supabase'

// Profiilikuva ja asiakkaiden arviot (migraatio 0062). Asiakas näkee
// hintatarjouksessa kuvan, nimen ("Janne K."), tähtiarvion, arvioiden määrän ja
// kulkuneuvon. Kuva tallentuu julkiseen courier-photos-säiliöön kuljettajan omaan
// kansioon, ja courier_set_photo liittää sen profiiliin (näkyy heti).

const BUCKET = 'courier-photos'

export function courierPhotoUrl(path) {
  if (!path || !supabase) return null
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadProfilePhoto(courierId, asset) {
  if (!supabase) throw new Error('Supabase-yhteyttä ei ole määritetty.')
  const png = asset.mimeType === 'image/png'
  const path = `${courierId}/${Date.now()}.${png ? 'png' : 'jpg'}`
  const response = await fetch(asset.uri)
  const body = await response.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: png ? 'image/png' : 'image/jpeg', upsert: false })
  if (uploadError) throw uploadError
  const { error } = await supabase.rpc('courier_set_photo', { p_path: path })
  if (error) throw error
}

export async function removeProfilePhoto() {
  const { error } = await supabase.rpc('courier_set_photo', { p_path: null })
  if (error) throw error
}

export function photoErrorText(error) {
  const code = error?.code ?? ''
  const message = String(error?.message ?? '')
  if (message === 'camera_denied') return tr('docs.cameraDenied')
  if (message === 'library_denied') return tr('docs.libraryDenied')
  if (['42883', 'PGRST202'].includes(code) || /bucket not found/i.test(message)) return tr('photo.notEnabled')
  if (/exceeded|too large|payload/i.test(message)) return tr('photo.tooLarge')
  return tr('photo.uploadFailed')
}

// Keskiarvo kuljettajan riviltä: { average, count } tai null (ei arvioita).
export function courierRating(courier) {
  const count = courier?.rating_count ?? 0
  if (!count) return null
  return { average: courier.rating_sum / count, count }
}

// 4.8 -> "4,8" (suomeksi) / "4.8"
export function formatRating(value, language) {
  return Number(value).toLocaleString(language === 'en' ? 'en-GB' : 'fi-FI', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

// Omat arviot, uusin ensin (arvioijaa ei näytetä). Haetaan kun näkymä tulee esiin.
export function useCourierReviews() {
  const { courier } = useAuth()
  const courierId = courier?.id ?? null
  const [reviews, setReviews] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    if (!supabase || !courierId) return
    supabase
      .from('courier_reviews')
      .select('id, stars, comment, created_at')
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(['42P01', 'PGRST205'].includes(fetchError.code) ? tr('photo.notEnabled') : tr('common.loadFailed'))
          return
        }
        setError('')
        setReviews(data ?? [])
        setLoaded(true)
      })
  }, [courierId])

  useFocusEffect(reload)

  return { reviews, loaded, error }
}
