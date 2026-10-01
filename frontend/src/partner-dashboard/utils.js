import { formatPrice } from '../lib/format.js'

export { formatPrice }

export const DAY_MS = 24 * 60 * 60 * 1000
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

// Pidettävä samana kuin migraation 0028 pg_cron-ajastin, joka peruu hyväksymättömät
// tilaukset kannassa - tämä on vain näkyvä laskuri.
export const PENDING_AUTO_CANCEL_MINUTES = 3

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysAgo(n, from = new Date()) {
  return new Date(startOfDay(from).getTime() - n * DAY_MS)
}

export function inRange(order, from, to) {
  const t = new Date(order.created_at).getTime()
  return t >= from.getTime() && t < to.getTime()
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

export function formatDateTime(value) {
  return `${formatDate(value)} klo ${formatTime(value)}`
}

export function relativeDay(value) {
  const day = startOfDay(new Date(value)).getTime()
  const today = startOfDay().getTime()
  if (day === today) return 'Tänään'
  if (day === today - DAY_MS) return 'Eilen'
  return formatDate(value)
}

export function minutesUntil(value, now = Date.now()) {
  return Math.round((new Date(value).getTime() - now) / 60_000)
}

export function itemCount(order) {
  return (order.order_items ?? []).reduce((sum, line) => sum + line.quantity, 0)
}

export function lineTotalCents(line) {
  return (line.unit_price_cents ?? line.price_cents) * line.quantity
}

// Käänteisgeokoodattu osoite on usein pitkä ("2, Maljalahdenkatu, Maljalahti, Kuopio, ...").
// Korteissa riittää katu + numero luonnollisessa järjestyksessä.
export function shortAddress(address) {
  if (!address) return ''
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (/^\d+[a-z]?$/i.test(parts[0]) && parts[1]) return `${parts[1]} ${parts[0]}`
  return parts[0]
}

export function centsToEuroInput(cents) {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function euroInputToCents(value) {
  const euros = parseFloat(String(value).replace(',', '.').trim())
  return Number.isNaN(euros) ? null : Math.round(euros * 100)
}

export function percentChange(current, previous) {
  if (!previous) return current > 0 ? null : 0
  return Math.round(((current - previous) / previous) * 100)
}

// Ravintolan osuus tilauksesta: tuotteet miinus alennus. total_cents sisältää myös
// kuljetus- ja palvelumaksun, jotka eivät kuulu ravintolalle - siksi kaikki
// ravintolalle näytettävät myyntiluvut lasketaan tästä, ei total_centsistä.
export function restaurantShareCents(order) {
  return Math.max((order.subtotal_cents ?? 0) - (order.discount_cents ?? 0), 0)
}

export function sumSales(orders) {
  return orders.reduce((sum, o) => sum + restaurantShareCents(o), 0)
}

export const WEEKDAYS = [
  { key: 'mon', label: 'Maanantai', short: 'Ma' },
  { key: 'tue', label: 'Tiistai', short: 'Ti' },
  { key: 'wed', label: 'Keskiviikko', short: 'Ke' },
  { key: 'thu', label: 'Torstai', short: 'To' },
  { key: 'fri', label: 'Perjantai', short: 'Pe' },
  { key: 'sat', label: 'Lauantai', short: 'La' },
  { key: 'sun', label: 'Sunnuntai', short: 'Su' },
]

export function normalizeOpeningHours(value) {
  const hours = {}
  for (const day of WEEKDAYS) {
    hours[day.key] = { open: '11:00', close: '21:00', closed: false, ...(value?.[day.key] ?? {}) }
  }
  return hours
}

// Ravintolan paketti päätellään välityspalkkiosta (kannassa ei ole omaa pakettisaraketta,
// ks. migraatiot 0020 ja 0040).
export const PLANS = [
  { key: 'perus', name: 'Peruspaketti', priceCents: 4999, commission: 25 },
  { key: 'pro', name: 'Pro', priceCents: 7999, commission: 10 },
  { key: 'business', name: 'Business', priceCents: 16999, commission: 0 },
]

export function planForCommission(commission) {
  const value = Number(commission ?? 25)
  return PLANS.find((p) => p.commission === value) ?? { key: 'custom', name: 'Oma sopimus', priceCents: null, commission: value }
}

export function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function storageSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Selaimen tallennus estetty - asetus pätee vain tämän käynnin ajan.
  }
}
