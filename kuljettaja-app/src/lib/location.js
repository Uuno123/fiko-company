import { useEffect, useState } from 'react'
import * as Location from 'expo-location'

// Esimerkkiosoite, jota näytetään kun oikeaa sijaintia ei saada (lupa
// evätty, paikannus ei toimi tai selaimen esikatselu, jossa osoitehakua ei ole).
export const DEMO_LOCATION = { address: 'Kauppakatu 18', city: 'Kuopio' }

// Osoite haetaan uudelleen vasta kun on liikuttu tarpeeksi ja edellisestä
// hausta on kulunut hetki - puhelimen osoitehakua ei saa kutsua jatkuvasti.
const GEOCODE_MIN_METERS = 40
const GEOCODE_MIN_INTERVAL_MS = 15000

function distanceMeters(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

function formatStreet(place) {
  const street = [place.street, place.streetNumber].filter(Boolean).join(' ')
  return street || place.name || null
}

// Ilman oikeaa osoitetta näytetään esimerkkiosoite (isDemo: true).
function withDemoAddress(state) {
  return state.address ? state : { ...state, address: DEMO_LOCATION.address, city: state.city ?? DEMO_LOCATION.city, isDemo: true }
}

// Kuljettajan sijainti ja katuosoite, päivittyy liikkuessa (vain kun appi on
// auki). status: 'loading' | 'ok' | 'denied' | 'error'. address on null vain
// sijaintia haettaessa.
export function useCourierLocation() {
  const [state, setState] = useState({ status: 'loading', position: null, address: null, city: null, isDemo: false })

  useEffect(() => {
    let cancelled = false
    let subscription = null
    let lastGeocoded = null
    let lastGeocodedAt = 0

    async function updateAddress(position) {
      const now = Date.now()
      if (lastGeocoded && (distanceMeters(lastGeocoded, position) < GEOCODE_MIN_METERS || now - lastGeocodedAt < GEOCODE_MIN_INTERVAL_MS)) {
        return
      }
      lastGeocoded = position
      lastGeocodedAt = now
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: position.lat, longitude: position.lng })
        const address = place && formatStreet(place)
        if (cancelled) return
        if (address) setState((s) => ({ ...s, address, city: place.city ?? s.city, isDemo: false }))
        else setState(withDemoAddress)
      } catch {
        // Osoitehaku ei onnistunut (esim. ei verkkoa tai selaimen esikatselu) -
        // näytetään edellinen tai esimerkkiosoite.
        if (!cancelled) setState(withDemoAddress)
      }
    }

    async function start() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (cancelled) return
        if (status !== 'granted') {
          setState((s) => withDemoAddress({ ...s, status: 'denied' }))
          return
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
          ({ coords }) => {
            if (cancelled) return
            const position = { lat: coords.latitude, lng: coords.longitude }
            setState((s) => ({ ...s, status: 'ok', position }))
            updateAddress(position)
          },
        )
        if (cancelled) subscription.remove()
      } catch {
        if (!cancelled) setState((s) => withDemoAddress({ ...s, status: 'error' }))
      }
    }

    start()
    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [])

  return state
}
