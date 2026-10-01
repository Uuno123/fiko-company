// Google Maps JavaScript API:n lataus. Avain tulee frontend/.env-tiedostosta
// (VITE_GOOGLE_MAPS_API_KEY). Ilman avainta, tai jos Google hylkää avaimen,
// kartat ja osoitehaku käyttävät OpenStreetMapia (lib/mapView.js, lib/geocode.js).
//
// MVP käyttää Maps Demo Keytä: ei maksukorttia, mutta 100 kutsua päivässä per
// rajapinta. Kun raja täyttyy, Google lakkaa vastaamasta loppupäiväksi - siksi
// varapolku on olemassa, ettei esittely jumitu.
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export const hasGoogleMaps = Boolean(API_KEY)

let loadPromise = null
let failed = false
const failureListeners = new Set()

// Google kutsuu tätä, kun avain ei kelpaa (väärä avain, osoitetta ei ole
// sallittu avaimen rajauksissa tms.). Jo piirretyt kartat näyttäisivät silloin
// Googlen virheruudun, joten ne vaihdetaan OpenStreetMapiin.
window.gm_authFailure = () => {
  failed = true
  console.warn('[delivo] Google Maps hylkäsi API-avaimen - käytetään OpenStreetMapia.')
  failureListeners.forEach((listener) => listener())
}

export function onGoogleMapsFailure(listener) {
  failureListeners.add(listener)
  return () => failureListeners.delete(listener)
}

export function loadGoogleMaps() {
  if (!API_KEY) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY puuttuu'))
  if (failed) return Promise.reject(new Error('Google Maps hylkäsi API-avaimen'))

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const callbackName = '__delivoGoogleMapsReady'
      window[callbackName] = () => {
        delete window[callbackName]
        resolve(window.google.maps)
      }
      const params = new URLSearchParams({
        key: API_KEY,
        v: 'weekly',
        loading: 'async',
        language: 'fi',
        region: 'FI',
        callback: callbackName,
      })
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`
      script.async = true
      script.onerror = () => {
        // Seuraava kutsu yrittää uudelleen (esim. hetkellinen verkkokatko).
        loadPromise = null
        script.remove()
        reject(new Error('Google Maps -skriptin lataus epäonnistui'))
      }
      document.head.appendChild(script)
    })
  }
  return loadPromise
}
