import { Linking, Platform } from 'react-native'

// Navigointisovellukset, joihin reitti avataan (asetus). Apple Kartat vain iPhonella.
export const NAVIGATION_APPS = [
  { key: 'google', label: 'Google Maps' },
  ...(Platform.OS === 'ios' ? [{ key: 'apple', label: 'Apple Kartat' }] : []),
  { key: 'waze', label: 'Waze' },
]

export function navigationAppLabel(key) {
  return (NAVIGATION_APPS.find((app) => app.key === key) ?? NAVIGATION_APPS[0]).label
}

const hasCoords = (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng)

// Reittilinkki valittuun sovellukseen. Pyörällä pyöräilyreitti, autolla ja
// skootterilla ajoreitti. Waze osaa vain määränpään. Jos koordinaatteja ei ole,
// määränpää annetaan osoitteena (to.address) ja lähtöpisteeksi jää nykyinen sijainti.
export function routeUrl(appKey, from, to, vehicle) {
  const motorized = vehicle === 'car' || vehicle === 'scooter'
  const origin = hasCoords(from) ? `${from.lat},${from.lng}` : null
  const destination = hasCoords(to) ? `${to.lat},${to.lng}` : encodeURIComponent(to?.address ?? '')
  const app = NAVIGATION_APPS.some((item) => item.key === appKey) ? appKey : NAVIGATION_APPS[0].key

  if (app === 'apple') {
    return `https://maps.apple.com/?${origin ? `saddr=${origin}&` : ''}daddr=${destination}${motorized ? '&dirflg=d' : ''}`
  }
  if (app === 'waze') {
    return hasCoords(to) ? `https://waze.com/ul?ll=${destination}&navigate=yes` : `https://waze.com/ul?q=${destination}&navigate=yes`
  }
  return `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin}` : ''}&destination=${destination}&travelmode=${motorized ? 'driving' : 'bicycling'}`
}

export function openRoute(appKey, from, to, vehicle) {
  return Linking.openURL(routeUrl(appKey, from, to, vehicle)).catch(() => {})
}
