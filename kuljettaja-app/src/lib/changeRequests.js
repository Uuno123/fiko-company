import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { useAuth } from './auth'
import { supabase } from './supabase'

// Muutospyynnöt lukittuihin tietoihin (migraatio 0051). Kuljettaja lähettää
// pyynnön, delivo hyväksyy sen Supabase Studiossa, ja trigger kopioi uuden
// arvon kuljettajan riville.

export const CHANGE_FIELDS = {
  name: { label: 'Nimi' },
  email: { label: 'Sähköposti' },
  vehicle: { label: 'Kulkuneuvo' },
  city: { label: 'Kaupunki' },
  business_id: { label: 'Y-tunnus' },
  billing_method: { label: 'Laskutustapa' },
  iban: { label: 'Tilinumero (IBAN)' },
}

// Omat pyynnöt uusimmasta vanhimpaan. Haetaan aina kun näkymä tulee esiin, ja
// samalla kuljettajatiedot päivitetään, jotta hyväksytty muutos näkyy heti.
export function useChangeRequests() {
  const { courier, refreshCourier } = useAuth()
  const courierId = courier?.id ?? null
  const [requests, setRequests] = useState([])

  const reload = useCallback(async () => {
    if (!supabase || !courierId) return
    const { data, error } = await supabase
      .from('courier_change_requests')
      .select('id, field, new_value, status, admin_note, created_at, decided_at')
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setRequests(data ?? [])
  }, [courierId])

  useFocusEffect(
    useCallback(() => {
      reload()
      refreshCourier()
    }, [reload, refreshCourier]),
  )

  // Avoin pyyntö kentälle (enintään yksi, ks. 0051).
  const pendingFor = (field) => requests.find((request) => request.field === field && request.status === 'pending') ?? null
  // Viimeisin hylätty pyyntö, jos sen jälkeen ei ole tehty uutta.
  const rejectedFor = (field) => {
    const latest = requests.find((request) => request.field === field)
    return latest?.status === 'rejected' ? latest : null
  }

  return { requests, pendingFor, rejectedFor, reload }
}

export async function submitChangeRequest(courierId, field, newValue, reason) {
  if (!supabase) throw new Error('Supabase-yhteyttä ei ole määritetty.')
  const { error } = await supabase.from('courier_change_requests').insert({
    courier_id: courierId,
    field,
    new_value: newValue,
    reason: reason || null,
  })
  if (error) throw error
}

export function changeRequestErrorText(error) {
  const code = error?.code ?? ''
  if (code === '23505') return 'Sinulla on jo avoin muutospyyntö tälle tiedolle. Odota, että delivo käsittelee sen.'
  if (code === '42P01' || code === 'PGRST205') return 'Muutospyynnöt eivät ole vielä käytössä. Ota yhteyttä tukeen.'
  return 'Lähetys epäonnistui. Tarkista yhteys ja yritä uudelleen.'
}
