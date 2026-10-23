import { tr } from './i18n'

// Suomalaiset muotoilut: 1 234,50 €, 3,4 km, klo 18.05, ma 6.10. Päivien nimet
// valitulla kielellä (lib/i18n.js).

const NBSP = ' '

export function formatEuro(cents) {
  const [whole, decimals] = (Math.abs(cents) / 100).toFixed(2).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${cents < 0 ? '−' : ''}${grouped},${decimals}${NBSP}€`
}

export function formatKm(km) {
  return `${km.toFixed(1).replace('.', ',')}${NBSP}km`
}

export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}${NBSP}min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}${NBSP}h ${rest}${NBSP}min` : `${hours}${NBSP}h`
}

export function formatTime(date) {
  return `${date.getHours()}.${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatShortDate(date) {
  return `${date.getDate()}.${date.getMonth() + 1}.`
}

export function weekdayShort(date) {
  return tr(`day.short.${date.getDay()}`)
}

export function startOfDay(date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// Viikko alkaa maanantaista.
export function startOfWeek(date) {
  const day = startOfDay(date)
  return addDays(day, -((day.getDay() + 6) % 7))
}

export function isSameDay(a, b) {
  return dayKey(a) === dayKey(b)
}

// Päivän tunniste reittiparametreihin: 2026-10-06.
export function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function parseDayKey(key) {
  const [year, month, day] = String(key).split('-').map(Number)
  return new Date(year, month - 1, day)
}

// "Tänään", "Eilen" tai "Maanantai 6.10."
export function formatDayLabel(date, now = new Date()) {
  const diff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
  if (diff === 0) return tr('day.today')
  if (diff === 1) return tr('day.yesterday')
  return `${tr(`day.long.${date.getDay()}`)} ${formatShortDate(date)}`
}

// "6.–12.10." tai kuun vaihtuessa "29.9.–5.10."
export function formatWeekRange(weekStart) {
  const end = addDays(weekStart, 6)
  if (weekStart.getMonth() === end.getMonth()) return `${weekStart.getDate()}.–${formatShortDate(end)}`
  return `${formatShortDate(weekStart)}–${formatShortDate(end)}`
}

export function initials(name) {
  const parts = String(name).trim().split(/[\s-]+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
