import { etaUpperMinutes } from './delivery.js'

// Etusivun suodatinpainikkeen valintasivun suodattimet (käyttäjän pyyntö
// 7.11.2026): liukusäätimet (arvio, toimitusaika, etäisyys), napit (ilmainen
// kuljetus, auki nyt), kategoriat ja järjestys. Valinnat kulkevat hakusivulle
// URL-parametreina, ja hakusivu suodattaa niillä (SearchResults.jsx).

export const RATING_RANGE = { min: 0, max: 10, step: 0.5 } // 0 = ei rajaa
export const ETA_RANGE = { min: 20, max: 60, step: 5 } // max = ei rajaa
export const DISTANCE_RANGE = { min: 1, max: 15, step: 1 } // max = ei rajaa

export const SORT_CHOICES = [
  { value: 'relevance', label: 'Suositellut' },
  { value: 'distance', label: 'Lähin', needsAddress: true },
  { value: 'eta', label: 'Nopein' },
  { value: 'rating', label: 'Paras arvio' },
]

export const EMPTY_BROWSE = {
  minRating: RATING_RANGE.min,
  maxEta: ETA_RANGE.max,
  maxKm: DISTANCE_RANGE.max,
  freeDelivery: false,
  openNow: false,
  categories: [],
  sort: 'relevance',
}

export function matchesBrowse(restaurant, f) {
  if (f.minRating > RATING_RANGE.min && !(Number(restaurant.rating) * 2 >= f.minRating)) return false
  if (f.maxEta < ETA_RANGE.max) {
    const eta = etaUpperMinutes(restaurant.pickup_estimate_minutes)
    if (eta == null || eta > f.maxEta) return false
  }
  if (f.maxKm < DISTANCE_RANGE.max && restaurant.distance_km != null && restaurant.distance_km > f.maxKm) return false
  if (f.freeDelivery && !restaurant.free_delivery) return false
  if (f.openNow && restaurant.is_open === false) return false
  if (f.categories.length > 0 && !f.categories.includes(restaurant.category)) return false
  return true
}

export function hasBrowseFilters(f) {
  return (
    f.minRating > RATING_RANGE.min ||
    f.maxEta < ETA_RANGE.max ||
    f.maxKm < DISTANCE_RANGE.max ||
    f.freeDelivery ||
    f.openNow ||
    f.categories.length > 0
  )
}

// q: haku, jonka päälle suodattimet tulevat (oletus kaikki ravintolat).
export function browseToParams(f, q = 'Kaikki ravintolat') {
  const params = new URLSearchParams({ q })
  if (f.minRating > RATING_RANGE.min) params.set('arvio', String(f.minRating))
  if (f.maxEta < ETA_RANGE.max) params.set('aika', String(f.maxEta))
  if (f.maxKm < DISTANCE_RANGE.max) params.set('km', String(f.maxKm))
  if (f.freeDelivery) params.set('ilmainen', '1')
  if (f.openNow) params.set('auki', '1')
  if (f.categories.length > 0) params.set('kat', f.categories.join('|'))
  if (f.sort !== 'relevance') params.set('jarj', f.sort)
  return params.toString()
}

export function browseFromParams(searchParams) {
  const num = (key, fallback) => {
    const value = Number(searchParams.get(key))
    return searchParams.has(key) && Number.isFinite(value) ? value : fallback
  }
  return {
    minRating: num('arvio', EMPTY_BROWSE.minRating),
    maxEta: num('aika', EMPTY_BROWSE.maxEta),
    maxKm: num('km', EMPTY_BROWSE.maxKm),
    freeDelivery: searchParams.get('ilmainen') === '1',
    openNow: searchParams.get('auki') === '1',
    categories: searchParams.get('kat')?.split('|').filter(Boolean) ?? [],
    sort: searchParams.get('jarj') ?? 'relevance',
  }
}
