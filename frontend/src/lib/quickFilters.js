import { etaUpperMinutes } from './delivery.js'

// Etusivun pikavalinnat (käyttäjän pyyntö 29.10.2026). Pilleri vie hakutuloksiin
// hakusanalla query, ja hakusivu tunnistaa sanan (quickFilterForQuery) ja näyttää
// kaikki ehdon täyttävät ravintolat - samaan tapaan kuin "Tarjoukset"
// (isDealsQuery, lib/categories.js).
// "Alle 30 min" = kortin toimitusaika-arvion yläraja alle 30 min; arvio 9+ =
// vähintään 4,5 tietokannan 1–5-asteikolla (näytetään 0–10, lib/score.js).
export const QUICK_FILTERS = [
  {
    id: 'fast',
    query: 'Alle 30 min',
    test: (r) => (etaUpperMinutes(r.pickup_estimate_minutes) ?? Infinity) < 30,
  },
  { id: 'free', query: 'Ilmainen kuljetus', test: (r) => Boolean(r.free_delivery) },
  { id: 'top', query: 'Arvio 9+', test: (r) => Number(r.rating) >= 4.5 },
]

// Etusivun "Aivan nurkan takana" -rivin "Näytä kaikki" (käyttäjän pyyntö
// 3.11.2026): kaikki ravintolat lähimmästä alkaen. Ei suodatinpaneelissa.
export const NEARBY_FILTER = { id: 'near', query: 'Lähelläsi', test: () => true, sort: 'distance' }

export function quickFilterForQuery(query) {
  const term = (query ?? '').trim().toLowerCase()
  if (term === NEARBY_FILTER.query.toLowerCase()) return NEARBY_FILTER
  return QUICK_FILTERS.find((filter) => filter.query.toLowerCase() === term) ?? null
}
