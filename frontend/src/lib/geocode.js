import { hasGoogleMaps, loadGoogleMaps } from './googleMaps.js'

// Osoitehaku. Jaettu, koska sekä kassan karttavalitsin että headerin
// sijaintimodaali hakevat osoitteita - kaksi omaa toteutusta ajautuisi erilleen
// virheenkäsittelyn ja hakuehtojen osalta.
//
// Google ensin (osaa keskeneräiset haut kuten "Puijonk 18"), Nominatim
// (OpenStreetMap) varalla: ilman avainta tai kun demoavaimen päiväraja on
// täynnä, haku jatkaa toimimistaan heikommalla laadulla. Käänteishaku
// (koordinaatit -> osoite) käyttää Googlen Geocodingia, jota Maps Demo Key ei
// salli - sillä avaimella käänteishaku menee aina Nominatimiin.
//
// Kaikki funktiot palauttavat saman muotoisen osoitteen:
//   { label: 'Puijonkatu 18', full: 'Puijonkatu 18, 70110 Kuopio', city, lat, lng }
//
// Haku rajataan Suomeen: delivo toimii vain täällä, ja ilman rajausta
// "Kuopio" osuu myös Kuopioon Virossa.
const NOMINATIM = 'https://nominatim.openstreetmap.org'

// Nominatimin käyttöehdot sallivat noin yhden haun sekunnissa. Googlen
// automaattitäydennys on tehty kutsuttavaksi joka näppäilyllä, mutta
// demoavaimen 100 hakua päivässä kuluisi silloin parissa osoitteessa.
export const SEARCH_DEBOUNCE_MS = hasGoogleMaps ? 400 : 600

const STREET_TYPES = ['street_address', 'premise', 'subpremise']

async function fetchNominatim(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Osoitehaku ei juuri nyt vastaa.')
  return res.json()
}

// Googlen palvelut, jotka avain on jo kerran hylännyt (REQUEST_DENIED) - niitä
// ei yritetä uudelleen joka haulla, vaan mennään suoraan Nominatimiin.
const deniedServices = new Set()

// Ajaa Google-haun ja palauttaa null, jos Googlea ei ole käytössä tai se ei
// vastannut - kutsuja siirtyy silloin Nominatimiin.
async function tryGoogle(service, run) {
  if (!hasGoogleMaps || deniedServices.has(service)) return null
  try {
    return await run(await loadGoogleMaps())
  } catch (err) {
    if (err?.code === 'ZERO_RESULTS') return null
    if (err?.code === 'REQUEST_DENIED') deniedServices.add(service)
    console.warn(`[delivo] Google (${service}) ei vastannut, käytetään OpenStreetMapia:`, err)
    return null
  }
}

// Automaattitäydennys ja sitä seuraava paikan haku samalla istuntotunnisteella
// laskutetaan Googlella yhtenä istuntona. Tunniste vaihtuu, kun paikka on haettu.
let sessionToken = null

async function googleSuggestions(maps, query, limit) {
  const { AutocompleteSuggestion, AutocompleteSessionToken } = await maps.importLibrary('places')
  sessionToken ??= new AutocompleteSessionToken()
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: query,
    sessionToken,
    includedRegionCodes: ['fi'],
    includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
    language: 'fi',
    region: 'fi',
  })
  return suggestions
    .filter((suggestion) => suggestion.placePrediction)
    .slice(0, limit)
    .map(({ placePrediction: prediction }) => ({
      id: prediction.placeId,
      placeId: prediction.placeId,
      prediction,
      label: prediction.mainText?.text ?? prediction.text.text,
      full: prediction.text.text.replace(/,\s*(Suomi|Finland)$/i, ''),
    }))
}

// Googlen osoiteosat -> delivon osoite. component(type) palauttaa osan nimen,
// koska Places ja Geocoding nimeävät samat kentät eri tavalla.
function googleAddress(component, formatted, location, coords) {
  const street = [component('route'), component('street_number')].filter(Boolean).join(' ')
  const city = component('locality') || component('postal_town') || component('administrative_area_level_3')
  const locality = [component('postal_code'), city].filter(Boolean).join(' ')
  return {
    label: street || formatted.split(',')[0].trim(),
    full: [street, locality].filter(Boolean).join(', ') || formatted,
    city,
    lat: coords?.lat ?? location.lat(),
    lng: coords?.lng ?? location.lng(),
  }
}

async function googlePlaceAddress(prediction) {
  const place = prediction.toPlace()
  await place.fetchFields({ fields: ['location', 'addressComponents', 'formattedAddress'] })
  sessionToken = null
  const component = (type) => place.addressComponents?.find((c) => c.types.includes(type))?.longText ?? ''
  return googleAddress(component, place.formattedAddress ?? '', place.location)
}

// Nominatim palauttaa kaupungin eri kentässä riippuen paikkakunnan tyypistä:
// isoilla se on city, pienemmillä town tai village. Kunta (municipality) on
// viimeinen oljenkorsi, koska se on usein sama kuin kaupunki.
function cityFromNominatim(parts) {
  return parts.city || parts.town || parts.village || parts.municipality || ''
}

// Nominatimin display_name on pitkä ("18, Puijonkatu, Multimäki, Kuopio, ...,
// Suomi"), joten osoite kootaan itse osista. Koordinaatit voi antaa erikseen,
// kun ne tulevat laitteen paikannuksesta tai kartan klikkauksesta - ne ovat
// tarkempia kuin käänteishaun osuma.
function addressFromNominatim(place, coords) {
  const parts = place.address ?? {}
  const street = [parts.road ?? parts.pedestrian ?? parts.footway, parts.house_number].filter(Boolean).join(' ')
  const city = cityFromNominatim(parts)
  const locality = [parts.postcode, city].filter(Boolean).join(' ')
  const firstSegment = place.display_name?.split(',')[0]?.trim() ?? ''
  return {
    label: street || place.name || firstSegment,
    full: [street, locality].filter(Boolean).join(', ') || place.display_name || '',
    city,
    lat: coords?.lat ?? Number(place.lat),
    lng: coords?.lng ?? Number(place.lon),
  }
}

async function geocodeWithNominatim(text) {
  const [place] = await fetchNominatim(
    `${NOMINATIM}/search?format=json&q=${encodeURIComponent(text)}&countrycodes=fi&limit=1&addressdetails=1`,
  )
  return place ? addressFromNominatim(place) : null
}

// Hakuehdotukset kirjoitettavalle osoitteelle. Googlen ehdotuksilla ei vielä
// ole koordinaatteja (vain placeId), joten valittu ehdotus ajetaan
// resolveSuggestion()-funktion läpi ennen käyttöä. Nominatimin ehdotukset ovat
// valmiiksi täydellisiä (address-kenttä).
export async function searchAddresses(query, limit = 5) {
  const google = await tryGoogle('places', (maps) => googleSuggestions(maps, query, limit))
  if (google?.length) return google

  // Nominatim palauttaa saman osoitteen usein kahdesti (rakennus + osoitepiste),
  // joten tuplat karsitaan näytettävän osoitteen perusteella.
  const places = await fetchNominatim(
    `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=fi&limit=${limit}&addressdetails=1`,
  )
  const seen = new Set()
  return places
    .map((place) => {
      const address = addressFromNominatim(place)
      return { id: place.place_id, label: address.label, full: address.full, address }
    })
    .filter(({ full }) => !seen.has(full) && seen.add(full))
}

// Hakuehdotus -> täysi osoite koordinaatteineen. null, jos sijaintia ei löydy.
export async function resolveSuggestion(suggestion) {
  if (suggestion.address) return suggestion.address
  const address = await tryGoogle('places', () => googlePlaceAddress(suggestion.prediction))
  return address ?? geocodeWithNominatim(suggestion.full)
}

// Sama tallennettu osoite paikannetaan usein monta kertaa (esikatselu, ikkuna,
// Reactin kehitystilan tuplakutsu) - tulos muistetaan sivulatauksen ajan, ettei
// jokainen kerta kuluta demoavaimen päivärajaa.
const geocodeCache = new Map()

// Vapaa teksti (esim. profiiliin tallennettu osoite) -> osoite koordinaatteineen.
// null, jos osoitetta ei löydy.
export function geocodeAddress(text) {
  if (!geocodeCache.has(text)) {
    const lookup = (async () => {
      const address = await tryGoogle('places', async (maps) => {
        const [suggestion] = await googleSuggestions(maps, text, 1)
        return suggestion ? googlePlaceAddress(suggestion.prediction) : null
      })
      return address ?? geocodeWithNominatim(text)
    })()
    // Verkkovirhettä ei muisteta - seuraava kutsu yrittää uudelleen.
    geocodeCache.set(
      text,
      lookup.catch((err) => {
        geocodeCache.delete(text)
        throw err
      }),
    )
  }
  return geocodeCache.get(text)
}

// Koordinaatit (kartan klikkaus, laitteen paikannus) -> lähin katuosoite.
// Palautetut koordinaatit ovat annetut, eivät osoitteen keskipiste.
export async function reverseGeocode(lat, lng) {
  const coords = { lat, lng }
  const address = await tryGoogle('geocoding', async (maps) => {
    const { Geocoder } = await maps.importLibrary('geocoding')
    const { results } = await new Geocoder().geocode({ location: coords })
    const best = results.find((result) => result.types.some((type) => STREET_TYPES.includes(type))) ?? results[0]
    if (!best) return null
    const component = (type) => best.address_components.find((c) => c.types.includes(type))?.long_name ?? ''
    return googleAddress(component, best.formatted_address, best.geometry.location, coords)
  })
  if (address) return address

  const place = await fetchNominatim(`${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
  if (!place.display_name) throw new Error('Sijainnille ei löytynyt osoitetta.')
  return addressFromNominatim(place, coords)
}

// Linnuntie-etäisyys kilometreinä. Jaettu, koska kassan reittikartta ja
// etusivun "lähimmät ravintolat" laskevat saman asian.
export function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Selaimen paikannusvirheet (GeolocationPositionError.code) käyttäjän kielellä.
// Aiemmin kaikki kolme näkyivät samana "Paikannus ei onnistunut" -viestinä,
// jolloin käyttäjä ei tiennyt pitääkö sallia lupa vai kytkeä sijainti päälle.
const GEOLOCATION_ERRORS = {
  1: 'Sijainnin käyttö on estetty. Salli se osoiterivin vasemman reunan kuvakkeesta ja yritä uudelleen.',
  2: 'Laite ei löytänyt sijaintia. Tarkista, että sijaintipalvelut ovat päällä (Windows: Asetukset → Tietosuoja ja suojaus → Sijainti).',
  3: 'Paikannus kesti liian kauan. Yritä uudelleen.',
}

// Selaimen paikannus lupauksena, jotta sitä voi odottaa await-lauseella.
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Selain ei tue paikannusta.'))
      return
    }
    // Selaimet estävät paikannuksen suojaamattomalla yhteydellä - esim. kun
    // kehityspalvelinta avataan puhelimella lähiverkon IP-osoitteella
    // (http://192.168...). localhost ja https toimivat.
    if (!window.isSecureContext) {
      reject(new Error('Paikannus toimii vain suojatulla (https) yhteydellä.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(GEOLOCATION_ERRORS[err.code] ?? 'Paikannus ei onnistunut.')),
      // Tietokoneella ilman GPS:ää sijainti tulee Wi-Fi-verkoista, mikä voi
      // kestää yli 10 s. Viiden minuutin vanha sijainti kelpaa kotiosoitteeksi.
      { timeout: 20000, maximumAge: 5 * 60 * 1000 },
    )
  })
}
