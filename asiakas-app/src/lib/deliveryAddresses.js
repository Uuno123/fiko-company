import { useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Toimitusosoitteet sovelluksessa (käyttäjän pyyntö 16.11.2026): headerin
// osoitteesta aukeaa lista tallennetuista osoitteista ja "Lisää uusi osoite".
// Kuten verkkosivulla (lib/deliveryAddress.js) lisätyt osoitteet ja valinta
// tallennetaan laitteelle, ei tilille. Tilin osoite (customers.address) näkyy
// listassa aina ensimmäisenä nimellä "Koti".
const KEY = 'bidrop-delivery-addresses'
const MAX_SAVED = 20

let state = { saved: [], selectedId: null }
let loaded = false
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener(state)
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {})
}

async function load() {
  if (loaded) return
  loaded = true
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && Array.isArray(parsed.saved)) {
      state = { saved: parsed.saved, selectedId: parsed.selectedId ?? null }
      emit()
    }
  } catch {
    // Ei tallennettuja osoitteita - käytetään tilin osoitetta.
  }
}

function setState(next) {
  state = next
  persist()
  emit()
}

export function selectAddress(id) {
  setState({ ...state, selectedId: id })
}

// Uusi osoite listan alkuun ja valituksi. Sama osoite ei tule kahdesti.
// Mukana asunnon tyyppi, tyypin lisätiedot (porras, kerros, asunto, ovikoodi,
// yritys) ja ohjeet kuljettajalle. Sama osoite päivittyy uusilla tiedoilla.
export function addAddress(address) {
  const same = state.saved.find((a) => a.full.toLowerCase() === address.full.toLowerCase())
  const entry = {
    id: same?.id ?? `a${Date.now()}`,
    label: address.label,
    full: address.full,
    lat: address.lat,
    lng: address.lng,
    type: address.type ?? null,
    details: address.details ?? {},
    instructions: address.instructions ?? '',
  }
  const others = state.saved.filter((a) => a.id !== entry.id)
  setState({ saved: [entry, ...others].slice(0, MAX_SAVED), selectedId: entry.id })
}

// Muokkaus: tyyppi, lisätiedot ja ohjeet päivittyvät, valinta ei muutu.
export function updateAddress(id, fields) {
  setState({
    ...state,
    saved: state.saved.map((a) =>
      a.id === id
        ? { ...a, type: fields.type ?? null, details: fields.details ?? {}, instructions: fields.instructions ?? '' }
        : a,
    ),
  })
}

export function removeAddress(id) {
  setState({
    saved: state.saved.filter((a) => a.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId,
  })
}

// Kaikki osoitteet (Koti ensin) ja valittu osoite.
export function useDeliveryAddresses(customer) {
  const [snapshot, setSnapshot] = useState(state)

  useEffect(() => {
    listeners.add(setSnapshot)
    load()
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])

  const homeFull = customer?.address
  const homeLat = customer?.address_lat
  const homeLng = customer?.address_lng

  return useMemo(() => {
    const home =
      homeFull && homeLat != null && homeLng != null
        ? { id: 'home', label: 'Koti', full: homeFull, lat: homeLat, lng: homeLng, home: true }
        : null
    const addresses = [
      ...(home ? [home] : []),
      ...snapshot.saved.filter((a) => !home || a.full.toLowerCase() !== home.full.toLowerCase()),
    ]
    const selected = addresses.find((a) => a.id === snapshot.selectedId) ?? addresses[0] ?? null
    return { addresses, selected }
  }, [snapshot, homeFull, homeLat, homeLng])
}
