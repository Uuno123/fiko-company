import { useEffect, useState } from 'react'
import { restaurantDistanceKm } from './deliveryAddress.js'
import { supabase } from './supabaseClient.js'

// Ravintoloiden järjestys (dokumentti "Delivo: ravintoloiden järjestys",
// 21.10.2026). Sama sääntö etusivun riveillä, kategoriasivulla ja haussa:
//   1. Sponsoroidut (Iso ravintola -paketti + voimassa oleva featured_until) paikoilla
//      1 ja 4, enintään 2 per lista - vain auki oleva ja asiakkaan osoitteeseen
//      toimittava. Useampi sponsori vuorottelee päivittäin.
//   2. Auki olevat pisteiden mukaan (0-100):
//        35 L läheisyys + 25 A arvosana + 15 S suosio + 15 U uutuus + 10 K kierto
//   3. Kiinni olevat, se joka aukeaa ensimmäisenä ylimpänä.
//   4. Täytepohjat (isPlaceholder) aivan lopussa.
// Kun asiakas valitsee järjestyksen itse (arvosana, nopein, lähin), sponsoreita on
// vain yksi ylimpänä ja loput tarkasti asiakkaan valinnan mukaan.

// Sama säde kuin kuljettajien jakelussa (migraatio 0046): kauempana oleva
// ravintola ei toimita asiakkaalle, eikä sitä nosteta sponsorina.
export const DELIVERY_RADIUS_KM = 8
const SPONSOR_SLOTS = [0, 3]
const NEW_FULL_DAYS = 30
const NEW_FADE_DAYS = 60
// Arvosana lasketaan vasta tästä määrästä arvosteluja - uutta ravintolaa ei
// rangaista siitä, ettei sillä ole vielä arvosteluja.
const MIN_REVIEWS = 5
const NEUTRAL_RATING = 0.6
const DAY_MS = 24 * 60 * 60 * 1000

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

// Paikallinen päivä muodossa 2026-10-21 - kierto ja sponsorointi vaihtuvat
// keskiyöllä Suomen aikaa, eivät UTC:n mukaan.
function dayKey(now) {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Päivän "arpa" 0-1: sama koko päivän (lista ei hypi joka päivityksellä),
// eri huomenna. Ravintolan id + päivä tiivisteenä.
function dailyRandom(seed) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

// Sponsoroitu = Iso ravintola -paketti (plan, migraatio 0049), jonka
// sponsorointipäivä (featured_until, 0050) on voimassa.
export function isSponsored(restaurant, now = Date.now()) {
  return (
    restaurant.plan === 'iso' &&
    Boolean(restaurant.featured_until) &&
    String(restaurant.featured_until).slice(0, 10) >= dayKey(now)
  )
}

function distanceOf(restaurant, address) {
  if (restaurant.distance_km != null) return restaurant.distance_km
  return restaurantDistanceKm(restaurant, address)
}

function isOpen(restaurant) {
  return restaurant.is_open !== false
}

// Pisteet 0-100. popularity: Map(ravintolan id -> suosio 0-1, eli tilaukset 30
// päivässä suhteessa suosituimpaan ravintolaan).
export function restaurantScore(restaurant, { address, popularity, now = Date.now() }) {
  const km = distanceOf(restaurant, address)
  const L = address && km != null ? clamp01(1 - km / DELIVERY_RADIUS_KM) : 0.5

  const reviews = restaurant.review_count ?? 0
  const A = reviews >= MIN_REVIEWS && restaurant.rating != null ? clamp01((Number(restaurant.rating) - 3) / 2) : NEUTRAL_RATING

  const S = clamp01(Number(popularity?.get(restaurant.id) ?? 0))

  const createdAt = restaurant.created_at ? Date.parse(restaurant.created_at) : NaN
  const ageDays = (now - createdAt) / DAY_MS
  const U = !Number.isFinite(ageDays)
    ? 0
    : ageDays <= NEW_FULL_DAYS
      ? 1
      : clamp01((NEW_FADE_DAYS - ageDays) / (NEW_FADE_DAYS - NEW_FULL_DAYS))

  const K = dailyRandom(`${restaurant.id}|${dayKey(now)}`)

  return 35 * L + 25 * A + 15 * S + 15 * U + 10 * K
}

// Minuutit seuraavaan aukeamiseen aukioloaikojen mukaan (lähimmät 7 päivää),
// tai Infinity jos aikoja ei ole. Kiinni olevista aikaisimmin aukeava ylimpänä.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
function minutesUntilOpen(restaurant, now) {
  const hours = restaurant.opening_hours
  if (!hours) return Infinity
  const start = new Date(now)
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
    const entry = hours[DAY_KEYS[day.getDay()]]
    if (!entry || entry.closed || !entry.open) continue
    const [h, m] = entry.open.split(':').map(Number)
    const opensAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime()
    if (opensAt > now) return (opensAt - now) / 60_000
  }
  return Infinity
}

// Järjestää listan. Palauttaa uudet oliot; sponsoroiduilla on sponsored: true.
//   address: asiakkaan toimitusosoite (lib/deliveryAddress.js) tai null
//   popularity: Map id -> suosio 0-1 (useRankingSignals)
//   compare: asiakkaan oma järjestys (vertailufunktio) - silloin 1 sponsori
export function rankRestaurants(list, { address = null, popularity = null, compare = null, now = Date.now() } = {}) {
  const fillers = []
  const closed = []
  const open = []
  for (const restaurant of list) {
    if (restaurant.isPlaceholder) fillers.push(restaurant)
    else if (!isOpen(restaurant)) closed.push(restaurant)
    else open.push(restaurant)
  }

  const scored = open.map((restaurant) => ({
    restaurant,
    score: restaurantScore(restaurant, { address, popularity, now }),
  }))

  // Sponsori vain jos se toimittaa asiakkaan osoitteeseen; useampi vuorottelee päivittäin.
  const slots = compare ? SPONSOR_SLOTS.slice(0, 1) : SPONSOR_SLOTS
  const sponsors = scored
    .filter(({ restaurant }) => {
      if (!isSponsored(restaurant, now)) return false
      const km = distanceOf(restaurant, address)
      return !address || (km != null && km <= DELIVERY_RADIUS_KM)
    })
    .sort((a, b) => dailyRandom(`sponsor|${a.restaurant.id}|${dayKey(now)}`) - dailyRandom(`sponsor|${b.restaurant.id}|${dayKey(now)}`))
    .slice(0, slots.length)
  const sponsorIds = new Set(sponsors.map(({ restaurant }) => restaurant.id))

  const rest = scored.filter(({ restaurant }) => !sponsorIds.has(restaurant.id))
  if (compare) rest.sort((a, b) => compare(a.restaurant, b.restaurant))
  else rest.sort((a, b) => b.score - a.score)

  const ranked = rest.map(({ restaurant }) => restaurant)
  sponsors.forEach(({ restaurant }, i) => {
    ranked.splice(Math.min(slots[i], ranked.length), 0, { ...restaurant, sponsored: true })
  })

  closed.sort((a, b) => minutesUntilOpen(a, now) - minutesUntilOpen(b, now))
  return [...ranked, ...closed, ...fillers]
}

// Suosio (tilaukset 30 päivässä, 0-1) tietokannasta, migraatio 0050. Haetaan kerran
// sivulatauksella - järjestyksen ei tarvitse päivittyä minuutin tarkkuudella.
let popularityPromise = null
function loadPopularity() {
  if (!supabase) return Promise.resolve(new Map())
  popularityPromise ??= supabase
    .rpc('restaurant_popularity')
    .then(({ data, error }) => {
      if (error) throw error
      return new Map((data ?? []).map((row) => [row.restaurant_id, Number(row.popularity) || 0]))
    })
    .catch(() => {
      popularityPromise = null
      return new Map()
    })
  return popularityPromise
}

export function useRankingSignals() {
  const [popularity, setPopularity] = useState(null)
  useEffect(() => {
    let cancelled = false
    loadPopularity().then((map) => {
      if (!cancelled) setPopularity(map)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return { popularity }
}

// Asiakkaan itse valitsemat järjestykset (kategoriasivu, haku, Lähelläsi-rivi).
// Annetaan rankRestaurants-funktiolle compare-asetuksena.
export const SORT_COMPARATORS = {
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  eta: (a, b) => (a.pickup_estimate_minutes ?? Infinity) - (b.pickup_estimate_minutes ?? Infinity),
  distance: (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
}
