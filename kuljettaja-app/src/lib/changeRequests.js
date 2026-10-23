import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { useAuth } from './auth'
import { billingMethodLabel, cityLabel, vehicleLabel } from './courier'
import { tr } from './i18n'
import { supabase } from './supabase'

// Muutospyynnöt lukittuihin tietoihin (migraatio 0051). Kuljettaja lähettää
// pyynnön, delivo hyväksyy sen Supabase Studiossa, ja trigger kopioi uuden
// arvon kuljettajan riville.

// Muutettavat kentät; nimet valitulla kielellä (changeFieldLabel).
export const CHANGE_FIELDS = {
  name: {},
  email: {},
  vehicle: {},
  city: {},
  business_id: {},
  billing_method: {},
  iban: {},
}

export function changeFieldLabel(field) {
  return tr(`changeField.${field}`)
}

// Arvo luettavassa muodossa: kulkuneuvo, kaupunki ja laskutustapa nimenä,
// tilinumerosta vain loppu.
export function displayChangeValue(field, raw) {
  if (!raw) return '–'
  if (field === 'vehicle') return vehicleLabel(raw)
  if (field === 'city') return cityLabel(raw)
  if (field === 'billing_method') return billingMethodLabel(raw) ?? raw
  if (field === 'iban') return `•••• ${String(raw).slice(-4)}`
  return raw
}

// Dokumentti, jota delivo tarvitsee muutoksen hyväksymiseen (sama sääntö kuin
// pakollisissa dokumenteissa, migraatio 0053): ajokortti autolla ja
// skootterilla, pankkitodiste tilinumerolle ja omalla yrityksellä laskuttaessa.
export function requiredDocumentFor(field, value) {
  if (field === 'vehicle' && (value === 'car' || value === 'scooter')) return 'driving_licence'
  if (field === 'iban') return 'bank_proof'
  if (field === 'billing_method' && value === 'own_company') return 'bank_proof'
  return null
}

// Rivin tila profiilissa ja laskutustiedoissa (LockedRow): pilleri ja lisärivi
// vain kun pyyntö on kesken tai hylätty.
export function changeRowStatus(field, pending, rejected) {
  if (pending) {
    return {
      status: 'pending',
      statusText: tr('status.pending'),
      detail: tr('change.requested', { value: displayChangeValue(field, pending.new_value) }),
    }
  }
  if (rejected) {
    return {
      status: 'rejected',
      statusText: tr('status.rejected'),
      detail: rejected.admin_note ? tr('change.rejectedReason', { note: rejected.admin_note }) : null,
    }
  }
  return {}
}

// Omat pyynnöt uusimmasta vanhimpaan. Haetaan aina kun näkymä tulee esiin, ja
// samalla kuljettajatiedot päivitetään, jotta hyväksytty muutos näkyy heti.
export function useChangeRequests() {
  const { courier, refreshCourier } = useAuth()
  const courierId = courier?.id ?? null
  const [requests, setRequests] = useState([])
  // Ensimmäinen haku tehty: ennen sitä ei tiedetä, onko pyyntö kesken.
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    if (!supabase || !courierId) return
    const { data, error } = await supabase
      .from('courier_change_requests')
      .select('id, field, new_value, status, admin_note, created_at, decided_at')
      .eq('courier_id', courierId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setRequests(data ?? [])
    setLoaded(true)
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

  return { requests, loaded, pendingFor, rejectedFor, reload }
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
  if (code === '23505') return tr('change.errOpen')
  if (String(error?.message ?? '').includes('same_value')) return tr('change.errSame')
  if (code === '42P01' || code === 'PGRST205') return tr('change.errDisabled')
  return tr('common.sendFailed')
}
