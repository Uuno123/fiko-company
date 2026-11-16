import { useEffect, useState } from 'react'
import { haversineKm } from './geocode.js'

// Kävijän valitsema toimitusosoite. Kysytään kun ravintola avataan ilman
// tallennettua osoitetta (AddressGate), ja sen perusteella etusivu näyttää
// lähimmät ravintolat ja kassa esitäyttää toimitusosoitteen. Tallennetaan
// selaimeen eikä tilille, koska osoite kysytään jo ennen kirjautumista.
const STORAGE_KEY = 'delivo-delivery-address'

export const ADDRESS_CHANGED_EVENT = 'delivo:delivery-address-changed'

// Bidrop toimii toistaiseksi Kuopiossa: osoitteen pitää olla tämän säteellä
// Kuopion keskustasta (ensikäynnin osoitenäkymä, WelcomeAddress.jsx).
export const SERVICE_AREA = { name: 'Kuopio', lat: 62.8924, lng: 27.677, radiusKm: 25 }

// Virheviesti, kun osoite on alueen ulkopuolella (osoitteen valinnat).
export const OUTSIDE_SERVICE_AREA_MESSAGE =
  'Bidrop toimii toistaiseksi vain Kuopiossa. Valitse osoite Kuopion alueelta.'

export function isInServiceArea(address) {
  if (!Number.isFinite(address?.lat) || !Number.isFinite(address?.lng)) return false
  return haversineKm(SERVICE_AREA, { lat: address.lat, lng: address.lng }) <= SERVICE_AREA.radiusKm
}

// "Selaa silti" ensikäynnin näkymässä: näkymää ei näytetä uudelleen tällä selaimella.
const WELCOME_SKIPPED_KEY = 'delivo-welcome-skipped'

export function welcomeSkipped() {
  try {
    return localStorage.getItem(WELCOME_SKIPPED_KEY) === '1'
  } catch {
    return false
  }
}

export function skipWelcome() {
  try {
    localStorage.setItem(WELCOME_SKIPPED_KEY, '1')
  } catch {
    // Yksityinen selaustila tms. - ohitus pätee vain tämän sivulatauksen ajan.
  }
}
export const OPEN_ADDRESS_PICKER_EVENT = 'delivo:open-address-picker'

export function getDeliveryAddress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored && Number.isFinite(stored.lat) && Number.isFinite(stored.lng) ? stored : null
  } catch {
    return null
  }
}

export function saveDeliveryAddress(address) {
  const value = { ...address, savedAt: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Yksityinen selaustila tms. - osoite pätee silloin vain tämän sivulatauksen ajan.
  }
  window.dispatchEvent(new CustomEvent(ADDRESS_CHANGED_EVENT, { detail: value }))
  return value
}

export function openAddressPicker() {
  window.dispatchEvent(new Event(OPEN_ADDRESS_PICKER_EVENT))
}

// Päivittyy sekä tämän välilehden muutoksista (oma tapahtuma) että muista
// välilehdistä (storage-tapahtuma).
export function useDeliveryAddress() {
  const [address, setAddress] = useState(getDeliveryAddress)
  useEffect(() => {
    function sync() {
      setAddress(getDeliveryAddress())
    }
    window.addEventListener(ADDRESS_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(ADDRESS_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return address
}

export { formatDistance, restaurantDistanceKm, withDistance, sortByDistance } from './distance.js'
