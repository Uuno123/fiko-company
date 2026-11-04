// Ravintolan tarjousmerkki (siirretty RestaurantCardista 4.11.2026, jotta
// ravintolasivu näyttää saman tarjouksen kuin etusivun kortti).
// Tarjousmerkit käyttäjän mallikuvan mukaan (2.11.2026): iso arvo ja pieni
// selite. Kokeilussa kaksi tyyliä: badgeStyle="corner" (kulmalappu kuvan
// vasemmassa yläkulmassa) tavallisilla riveillä ja "sticker" (pyöreä tarra
// oikeassa reunassa) nostoriveillä (DealsRow). Vain oikeita tarjouksia: koodit
// toimivat kassalla (Cart.jsx PROMO_CODES, backendin payments.js). Ilmaisesta
// kuljetuksesta ei merkkiä - se näkyy tietorivillä tekstinä.
export const OFFER_BADGES = [
  // SUURTILAUS: 30 %, enintään 7 €.
  { value: '−30%', note: 'max 7 €', text: '−30 % tilauksesta (max 7 €)', tone: 'orange' },
  // BIDROP10
  { value: '−10%', note: 'tilauksesta', text: '−10 % tilauksesta', tone: 'orange' },
  // TERVETULOA: 40 % ensimmäisestä tilauksesta, enintään 10 €.
  { value: '−40%', note: 'eka tilaus', text: '−40 % ekasta tilauksesta (max 10 €)', tone: 'black' },
  // NOUTO15: 15 % noutotilauksista.
  { value: '−15%', note: 'noudosta', text: '−15 % noudosta (max 5 €)', tone: 'black' },
]

// Sama ravintola saa aina saman merkin. Jokaisella ravintolalla on merkki
// (käyttäjän pyyntö 3.11.2026, aiemmin noin 2/5 ilman). Burgereilla −30 %.
export function offerBadge(restaurant) {
  const key = String(restaurant.id ?? restaurant.name ?? '')
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  if (restaurant.category === 'Burgerit') return OFFER_BADGES[0]
  return OFFER_BADGES[hash % OFFER_BADGES.length]
}
