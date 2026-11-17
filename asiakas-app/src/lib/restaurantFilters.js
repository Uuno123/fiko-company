import { formatDistance, withDistance } from '../../../frontend/src/lib/distance'
import { etaUpperMinutes } from '../../../frontend/src/lib/delivery'
import { scoreFromRating } from '../../../frontend/src/lib/score'
import { offerBadge } from '../../../frontend/src/lib/offers'
import { SORT_COMPARATORS } from '../../../frontend/src/lib/rankingCore'

// Ravintoloiden suodatus ja järjestys (käyttäjän pyyntö 17.11.2026: "oikea
// suodatus, sijainti, metrimäärät ja kaikki"). Sama logiikka haussa ja
// tarjoussivulla. Etäisyys lasketaan valitusta toimitusosoitteesta
// (lib/deliveryAddresses.js) samalla kaavalla kuin verkkosivulla
// (frontend/src/lib/distance.js).

// Etäisyyden askeleet kilometreinä; null = ei rajaa.
export const DISTANCE_STEPS = [0.5, 1, 2, 3, 5, null]
// Toimitusajan yläraja minuutteina (arvion haarukan yläpää).
export const ETA_OPTIONS = [null, 20, 30, 45]
// Arvosanan alaraja asteikolla 0-10.
export const SCORE_OPTIONS = [null, 8, 9]

export const SORTS = [
  { key: 'recommended', label: 'Suositellut' },
  { key: 'distance', label: 'Lähin ensin' },
  { key: 'rating', label: 'Paras arvio' },
  { key: 'eta', label: 'Nopein toimitus' },
]

export const OFFER_OPTIONS = [
  { value: '−40%', label: '−40 % eka tilaus' },
  { value: '−30%', label: '−30 %' },
  { value: '−15%', label: '−15 % nouto' },
  { value: '−10%', label: '−10 %' },
]

export const EMPTY_FILTERS = {
  sort: 'recommended',
  maxKm: null,
  maxEta: null,
  minScore: null,
  openNow: false,
  freeDelivery: false,
  offers: [],
  categories: [],
}

export function distanceLabel(km) {
  return km == null ? 'Ei rajaa' : formatDistance(km)
}

// Aktiiviset rajaukset pillereinä: label ja funktio, joka poistaa rajauksen.
export function activeFilterChips(filters) {
  const chips = []
  if (filters.sort !== 'recommended') {
    chips.push({ key: 'sort', label: SORTS.find((s) => s.key === filters.sort)?.label, clear: { sort: 'recommended' } })
  }
  if (filters.maxKm != null) chips.push({ key: 'km', label: `Alle ${distanceLabel(filters.maxKm)}`, clear: { maxKm: null } })
  if (filters.maxEta != null) chips.push({ key: 'eta', label: `Alle ${filters.maxEta} min`, clear: { maxEta: null } })
  if (filters.minScore != null) chips.push({ key: 'score', label: `Arvio ${filters.minScore}+`, clear: { minScore: null } })
  if (filters.openNow) chips.push({ key: 'open', label: 'Avoinna nyt', clear: { openNow: false } })
  if (filters.freeDelivery) chips.push({ key: 'free', label: 'Ilmainen kuljetus', clear: { freeDelivery: false } })
  for (const value of filters.offers) {
    chips.push({
      key: `offer-${value}`,
      label: OFFER_OPTIONS.find((o) => o.value === value)?.label ?? value,
      clear: (f) => ({ offers: f.offers.filter((v) => v !== value) }),
    })
  }
  for (const category of filters.categories) {
    chips.push({
      key: `cat-${category}`,
      label: category,
      clear: (f) => ({ categories: f.categories.filter((c) => c !== category) }),
    })
  }
  return chips
}

export function countActiveFilters(filters) {
  return activeFilterChips(filters).length
}

export function clearChip(filters, chip) {
  const patch = typeof chip.clear === 'function' ? chip.clear(filters) : chip.clear
  return { ...filters, ...patch }
}

// Suodattaa ja järjestää. Palauttaa ravintolat distance_km-kentän kanssa
// (kun osoite tiedossa). Suositellut = annettu järjestys.
export function applyFilters(restaurants, filters, address) {
  const list = withDistance(restaurants, address).filter((r) => {
    if (filters.maxKm != null && address && !(r.distance_km != null && r.distance_km <= filters.maxKm)) return false
    if (filters.maxEta != null) {
      const upper = etaUpperMinutes(r.pickup_estimate_minutes)
      if (!(upper != null && upper <= filters.maxEta)) return false
    }
    if (filters.minScore != null && !((scoreFromRating(r.rating) ?? 0) >= filters.minScore)) return false
    if (filters.openNow && r.is_open === false) return false
    if (filters.freeDelivery && !r.free_delivery) return false
    if (filters.offers.length && !filters.offers.includes(offerBadge(r)?.value)) return false
    if (filters.categories.length && !filters.categories.includes(r.category)) return false
    return true
  })
  const compare = SORT_COMPARATORS[filters.sort]
  return compare ? list.sort(compare) : list
}

// Keittiövalinnat: listan kategoriat yleisin ensin.
export function categoriesOf(restaurants) {
  const counts = new Map()
  for (const r of restaurants) if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}
