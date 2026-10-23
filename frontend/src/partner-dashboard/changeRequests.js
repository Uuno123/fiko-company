import { useCallback, useEffect, useState } from 'react'
import { useDashboardApi } from './api.js'
import { findPlan } from '../lib/partnerPlans.js'

// Ravintolan tunnistetiedot muuttuvat vain muutospyynnöllä, johon liitetään
// tarvittava dokumentti (migraatio 0055). delivo hyväksyy pyynnön Studiossa.

export const DOCUMENT_TYPES = {
  business_register: 'Kaupparekisteriote',
  food_permit: 'Elintarvikehuoneiston ilmoitus',
  bank_proof: 'Pankkitodiste',
  id_document: 'Henkilöllisyystodistus',
  other: 'Muu dokumentti',
}

export const DOCUMENT_STATUS = {
  pending: { label: 'Tarkastettavana', tone: 'info' },
  approved: { label: 'Hyväksytty', tone: 'success' },
  rejected: { label: 'Hylätty', tone: 'danger' },
}

// doc: pyyntöön vaadittava dokumentti ja ohje, mitä siinä pitää näkyä.
export const CHANGE_FIELDS = {
  name: {
    label: 'Ravintolan nimi',
    doc: 'business_register',
    docHint: 'Kaupparekisteriote tai muu todiste, jossa uusi nimi näkyy.',
  },
  address: {
    label: 'Osoite ja sijainti',
    doc: 'food_permit',
    docHint: 'Elintarvikehuoneiston ilmoitus tai omavalvontapäätös uudesta osoitteesta.',
  },
  city: {
    label: 'Kaupunki',
    doc: 'food_permit',
    docHint: 'Elintarvikehuoneiston ilmoitus uudesta toimipaikasta.',
  },
  company_name: {
    label: 'Yrityksen nimi',
    doc: 'business_register',
    docHint: 'Kaupparekisteriote, jossa yrityksen nimi näkyy.',
  },
  business_id: {
    label: 'Y-tunnus',
    doc: 'business_register',
    docHint: 'Kaupparekisteriote, jossa Y-tunnus näkyy.',
  },
  iban: {
    label: 'Tilinumero (IBAN)',
    doc: 'bank_proof',
    docHint: 'Pankin todistus tai tiliote, jossa tilinumero ja yrityksen nimi näkyvät.',
  },
  plan: {
    label: 'Paketti',
    doc: null,
  },
}

export function maskIban(iban) {
  if (!iban) return null
  const clean = String(iban).replace(/\s/g, '')
  return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`
}

// Arvo luettavaksi (paketti nimenä, tilinumero peitettynä).
export function displayValue(field, value) {
  if (!value) return null
  if (field === 'plan') return findPlan(value)?.name ?? value
  if (field === 'iban') return maskIban(value)
  return value
}

export function validateChange(field, value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'Anna uusi arvo'
  if (field === 'business_id' && !/^\d{7}-\d$/.test(trimmed)) return 'Y-tunnus muodossa 1234567-8'
  if (field === 'iban' && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(trimmed.replace(/\s/g, '').toUpperCase())) {
    return 'Tarkista tilinumero (esim. FI21 1234 5600 0007 85)'
  }
  return null
}

export function changeRequestErrorText(error) {
  const code = error?.code ?? ''
  const message = String(error?.message ?? '')
  if (code === '23505') return 'Tälle tiedolle on jo avoin muutospyyntö. Odota, että Bidrop käsittelee sen.'
  if (['42P01', 'PGRST205'].includes(code) || /bucket not found/i.test(message)) {
    return 'Muutospyynnöt eivät ole vielä käytössä. Ota yhteyttä Bidropin tukeen.'
  }
  if (/exceeded|too large|payload/i.test(message)) return 'Tiedosto on liian suuri (enintään 10 Mt).'
  return 'Lähetys epäonnistui. Tarkista yhteys ja yritä uudelleen.'
}

export function useChangeRequests(restaurantId) {
  const api = useDashboardApi()
  const [requests, setRequests] = useState([])
  const [documents, setDocuments] = useState([])
  const [status, setStatus] = useState('loading')

  const fetchAll = useCallback(
    () => Promise.all([api.fetchChangeRequests(restaurantId), api.fetchDocuments(restaurantId)]),
    [api, restaurantId],
  )

  function apply([nextRequests, nextDocuments]) {
    setRequests(nextRequests)
    setDocuments(nextDocuments)
    setStatus('ready')
  }

  useEffect(() => {
    if (!restaurantId) return undefined
    let cancelled = false
    fetchAll()
      .then((data) => {
        if (!cancelled) apply(data)
      })
      .catch((error) => {
        console.error('Muutospyyntöjen haku epäonnistui', error)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [fetchAll, restaurantId])

  async function load() {
    apply(await fetchAll())
  }

  // Avoin pyyntö tai viimeisin hylätty (jos sen jälkeen ei ole hyväksyttyä).
  const pendingFor = (field) => requests.find((r) => r.field === field && r.status === 'pending') ?? null
  const rejectedFor = (field) => {
    const latest = requests.find((r) => r.field === field && r.status !== 'pending')
    return latest?.status === 'rejected' ? latest : null
  }

  // Lähettää pyynnön ja liittää dokumentin. Heittää virheen, jos pyyntö ei mene.
  async function submit({ field, newValue, newLat, newLng, reason, file }) {
    const request = await api.createChangeRequest(restaurantId, { field, newValue, newLat, newLng, reason })
    let attachmentFailed = false
    if (file && CHANGE_FIELDS[field]?.doc) {
      try {
        await api.uploadDocument(restaurantId, { type: CHANGE_FIELDS[field].doc, file, changeRequestId: request.id })
      } catch (error) {
        console.error('Liitteen lataus epäonnistui', error)
        attachmentFailed = true
      }
    }
    await load()
    return { attachmentFailed }
  }

  async function uploadDocument(type, file) {
    await api.uploadDocument(restaurantId, { type, file })
    await load()
  }

  return { requests, documents, status, reload: load, pendingFor, rejectedFor, submit, uploadDocument }
}
