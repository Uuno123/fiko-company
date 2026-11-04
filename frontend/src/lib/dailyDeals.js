// Päivän tarjoukset (käyttäjän pyyntö 4.11.2026): osa tuotteista on joka päivä
// alennuksessa, ja valinta vaihtuu keskiyöllä Suomen aikaa. Valinta lasketaan
// tuotteen id:stä ja päivämäärästä, joten sama sääntö toimii ilman tietokantaa.
// SAMA SÄÄNTÖ on backendin src/lib/dailyDeals.js:ssä, joka laskee veloitettavan
// hinnan - jos muutat toista, muuta toinenkin, muuten näytetty ja veloitettu
// hinta eroavat.

const TIME_ZONE = 'Europe/Helsinki'

// Päivä muodossa VVVV-KK-PP Suomen aikaa.
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

// 0 = ei tarjousta, muuten alennusprosentti. Noin joka neljäs tuote.
export function dealPercent(itemId, date = new Date()) {
  if (!itemId) return 0
  if (FIXED_DEALS[itemId]) return FIXED_DEALS[itemId]
  const h = hash(`${itemId}:${dealPeriod(date)}`) % 8
  if (h === 0) return 30
  if (h === 1) return 20
  return 0
}

// Tuotteen perushinta päivän alennuksella (lisävalintojen hinnat ennallaan).
export function dealPriceCents(item, date = new Date()) {
  const percent = dealPercent(item?.id, date)
  if (!percent) return item.price_cents
  return Math.round((item.price_cents * (100 - percent)) / 100)
}

// Aikaa tarjousjakson loppuun (keskiyö Suomen aikaa) millisekunteina.
export function msUntilDealsEnd(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)]),
  )
  const elapsed = (parts.hour * 3600 + parts.minute * 60 + parts.second) * 1000 + date.getMilliseconds()
  // Jakson ensimmäisenä päivänä loppuun on tämän päivän lisäksi koko huominen.
  const extraDay = dayNumber(date) % 2 === 0 ? 24 * 3600 * 1000 : 0
  return Math.max(0, 24 * 3600 * 1000 - elapsed + extraDay)
}

export function formatCountdown(ms) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}
