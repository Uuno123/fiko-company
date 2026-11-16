// Osoitehaku sovelluksessa: OpenStreetMapin Nominatim (ilmainen), kuten
// verkkosivun varahaku (frontend/src/lib/geocode.js). Haku rajataan Suomeen.
// Käyttöehdot: enintään noin yksi haku sekunnissa (kutsuja viivästää hakua)
// ja sovellus tunnistetaan geneerisellä nimellä, ei käyttäjän tiedoilla.
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const HEADERS = { Accept: 'application/json', 'User-Agent': 'Bidrop-app/1.0' }

export const ADDRESS_SEARCH_DEBOUNCE_MS = 700

function cityFrom(parts) {
  return parts.city || parts.town || parts.village || parts.municipality || ''
}

// Nominatimin osoite -> { label, full, lat, lng } kuten verkkosivulla.
function toAddress(place) {
  const parts = place.address ?? {}
  const street = [parts.road ?? parts.pedestrian ?? parts.footway, parts.house_number].filter(Boolean).join(' ')
  const locality = [parts.postcode, cityFrom(parts)].filter(Boolean).join(' ')
  const firstSegment = place.display_name?.split(',')[0]?.trim() ?? ''
  return {
    label: street || place.name || firstSegment,
    full: [street, locality].filter(Boolean).join(', ') || place.display_name || '',
    lat: Number(place.lat),
    lng: Number(place.lon),
  }
}

export async function searchAddresses(query, limit = 6) {
  const res = await fetch(
    `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&countrycodes=fi&limit=${limit}&addressdetails=1`,
    { headers: HEADERS },
  )
  if (!res.ok) throw new Error('Osoitehaku ei juuri nyt vastaa.')
  const places = await res.json()
  // Sama osoite tulee usein kahdesti (rakennus + osoitepiste): tuplat pois.
  const seen = new Set()
  return places
    .map((place) => ({ id: String(place.place_id), ...toAddress(place) }))
    .filter(({ full }) => full && !seen.has(full) && seen.add(full))
}
