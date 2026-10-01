import { useEffect, useState } from 'react'
import { haversineKm } from './geocode.js'

// Kävijän valitsema toimitusosoite. Kysytään kun ravintola avataan ilman
// tallennettua osoitetta (AddressGate), ja sen perusteella etusivu näyttää
// lähimmät ravintolat ja kassa esitäyttää toimitusosoitteen. Tallennetaan
// selaimeen eikä tilille, koska osoite kysytään jo ennen kirjautumista.
const STORAGE_KEY = 'delivo-delivery-address'

export const ADDRESS_CHANGED_EVENT = 'delivo:delivery-address-changed'
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

export function formatDistance(km) {
  if (km == null) return null
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 50) * 50)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

// TILAPÄINEN: mallit (täyteravintolat, lib/categories.js) ovat keksittyjä eikä
// niillä ole sijaintia. Niille arvotaan vakaa 0,4-4,8 km etäisyys ravintolan ja
// osoitteen perusteella, jotta "lähimmät" toimii myös pelkillä malleilla.
// Sama osoite antaa aina saman luvun. Oikeilla ravintoloilla etäisyys lasketaan
// niiden omista koordinaateista.
function demoDistanceKm(restaurantId, address) {
  const seed = `${restaurantId}|${address.lat.toFixed(3)}|${address.lng.toFixed(3)}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return 0.4 + (hash % 1000) / 1000 * 4.4
}

export function restaurantDistanceKm(restaurant, address) {
  if (!address) return null
  // null-tarkistus ennen Number()-muunnosta: Number(null) olisi 0 eli päiväntasaaja.
  if (restaurant.lat != null && restaurant.lng != null) {
    return haversineKm({ lat: Number(restaurant.lat), lng: Number(restaurant.lng) }, address)
  }
  return restaurant.isPlaceholder ? demoDistanceKm(restaurant.id, address) : null
}

// Lisää kortille distance_km-kentän (RestaurantCard näyttää sen) muuttamatta
// järjestystä - kategoriarivien järjestys on mainospaikkojen järjestys.
export function withDistance(restaurants, address) {
  if (!address) return restaurants
  return restaurants.map((restaurant) => ({ ...restaurant, distance_km: restaurantDistanceKm(restaurant, address) }))
}

// Kuten withDistance, mutta lähin ensin. Vain "Lähelläsi"-riville ja käyttäjän
// itse valitsemaan "Lähin ensin" -lajitteluun. Ravintolat ilman sijaintia jäävät
// loppuun alkuperäiseen järjestykseen.
export function sortByDistance(restaurants, address) {
  if (!address) return restaurants
  return withDistance(restaurants, address).sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
}
