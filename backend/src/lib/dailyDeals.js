// Päivän tarjoukset: sama sääntö kuin frontendin src/lib/dailyDeals.js:ssä
// (4.11.2026). Osa tuotteista on alennuksessa, ja valinta vaihtuu keskiyöllä
// Suomen aikaa. Maksun luonti (routes/payments.js) laskee tuotteen hinnan tällä,
// jotta veloitettu summa vastaa sivulla näytettyä. Jos muutat toista, muuta
// toinenkin.

const TIME_ZONE = 'Europe/Helsinki'

export function dealDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date)
}

// Tarjoukset ovat voimassa kaksi päivää kerrallaan (käyttäjän pyyntö 4.11.2026:
// "päättyy huomenna keskiyöllä"): jakso alkaa parillisena päivänumerona ja
// päättyy seuraavan päivän keskiyöllä Suomen aikaa.
function dayNumber(date = new Date()) {
  const [y, m, d] = dealDay(date).split('-').map(Number)
  // +1: jakso alkaa 4.11.2026 (käyttäjän pyyntö), joten päivänumero siirretään yhdellä.
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 1
}

export function dealPeriod(date = new Date()) {
  return Math.floor(dayNumber(date) / 2)
}

// Kiinteät tarjoukset tietyille tuotteille (voimassa samat jaksot kuin muut):
// McDonald's Maple BBQ & Bacon Double Quarter Pounder -ateria -70 % (käyttäjän
// pyyntö 4.11.2026).
const FIXED_DEALS = {
  '7855b43a-a6ff-46d3-8b76-a893596ff4ba': 70,
}

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

export function dealPercent(itemId, date = new Date()) {
  if (!itemId) return 0
  if (FIXED_DEALS[itemId]) return FIXED_DEALS[itemId]
  const h = hash(`${itemId}:${dealPeriod(date)}`) % 8
  if (h === 0) return 30
  if (h === 1) return 20
  return 0
}

export function dealPriceCents(item, date = new Date()) {
  const percent = dealPercent(item?.id, date)
  if (!percent) return item.price_cents
  return Math.round((item.price_cents * (100 - percent)) / 100)
}
