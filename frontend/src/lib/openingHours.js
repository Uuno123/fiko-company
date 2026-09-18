// Muoto (ks. supabase/migrations/0016_add_opening_hours_to_restaurants.sql):
// { mon: { open: "11:00", close: "21:00", closed: false }, tue: { ... }, ... }
// NULL/puuttuva sarake = aukioloaikoja ei ole vielä asetettu.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function getTodayHours(openingHours) {
  if (!openingHours) return null
  const key = DAY_KEYS[new Date().getDay()]
  return openingHours[key] ?? null
}

export function formatHoursRange(hours) {
  if (!hours || hours.closed || !hours.open || !hours.close) return null
  return `${hours.open}–${hours.close}`
}
