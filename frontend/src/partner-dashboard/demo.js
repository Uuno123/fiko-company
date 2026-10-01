import { DAY_MS } from './utils.js'

// TILAPÄINEN, käyttäjän valinnasta: esimerkkidata niille kojelaudan osille, joille ei
// vielä ole tietokantaa (arviot, kampanjat, tilitykset, laskut, käyttäjät, poikkeusajat,
// toimitusalue). Näkymät merkitsevät nämä "Esimerkkidata"-tunnuksella, ettei ravintoilija
// luule niitä omikseen. Korvataan oikealla datalla sitä mukaa kun taulut tehdään.

function ago(days, hours = 0) {
  return new Date(Date.now() - days * DAY_MS - hours * 3_600_000).toISOString()
}

function ahead(days) {
  return new Date(Date.now() + days * DAY_MS).toISOString()
}

export const DEMO_REVIEWS = [
  { id: 'r1', author: 'Aino K.', rating: 5, date: ago(0, 3), text: 'Burgeri oli mehukas ja ranskalaiset rapeita. Tilaus tuli nopeammin kuin arvio!', reply: null },
  { id: 'r2', author: 'Mikko L.', rating: 4, date: ago(1, 5), text: 'Hyvää ruokaa, mutta kastiketta olisi saanut olla enemmän.', reply: null },
  { id: 'r3', author: 'Sanna P.', rating: 5, date: ago(2, 1), text: 'Paras cheeseburger Kuopiossa. Tilaan uudestaan.', reply: 'Kiitos Sanna, tervetuloa uudelleen!' },
  { id: 'r4', author: 'Juho V.', rating: 2, date: ago(3, 7), text: 'Tilauksesta puuttui juoma ja ruoka oli haaleaa.', reply: null },
  { id: 'r5', author: 'Emilia R.', rating: 5, date: ago(5, 2), text: 'Ystävällinen palvelu noudossa ja annos juuri kuten kuvassa.', reply: null },
  { id: 'r6', author: 'Ville T.', rating: 4, date: ago(8, 4), text: 'Maistui hyvältä, pakkaus voisi olla parempi.', reply: 'Kiitos palautteesta, kokeilemme uusia pakkauksia.' },
  { id: 'r7', author: 'Laura N.', rating: 3, date: ago(11, 6), text: 'Ihan ok, mutta hinta-laatusuhde voisi olla parempi.', reply: null },
  { id: 'r8', author: 'Otto H.', rating: 5, date: ago(15, 2), text: 'Loistava bbq-kastike!', reply: null },
]

export const DEMO_CAMPAIGNS = [
  { id: 'c1', name: 'Arki-illan burgeritarjous', type: 'percent', value: 20, target: 'Burgerit', status: 'active', starts: ago(3), ends: ahead(11), orders: 42, salesCents: 58340 },
  { id: 'c2', name: 'Ilmainen kuljetus yli 30 €', type: 'free_delivery', value: 0, target: 'Kaikki tuotteet', status: 'scheduled', starts: ahead(4), ends: ahead(18), orders: 0, salesCents: 0 },
  { id: 'c3', name: 'Kesän ranskalaiset -1 €', type: 'fixed', value: 100, target: 'Ranskalaiset', status: 'ended', starts: ago(40), ends: ago(20), orders: 118, salesCents: 91200 },
]

export const DEMO_PAYOUTS = [
  { id: 'p1', period: 'Viikko 38', date: ahead(2), amountCents: 184620, status: 'upcoming' },
  { id: 'p2', period: 'Viikko 37', date: ago(5), amountCents: 201480, status: 'paid' },
  { id: 'p3', period: 'Viikko 36', date: ago(12), amountCents: 176350, status: 'paid' },
  { id: 'p4', period: 'Viikko 35', date: ago(19), amountCents: 190910, status: 'paid' },
]

export const DEMO_INVOICES = [
  { id: 'i1', number: 'DLV-2026-0912', title: 'Kuukausimaksu ja välityspalkkiot, elokuu', date: ago(27), amountCents: 43210, status: 'paid' },
  { id: 'i2', number: 'DLV-2026-0815', title: 'Kuukausimaksu ja välityspalkkiot, heinäkuu', date: ago(58), amountCents: 39880, status: 'paid' },
  { id: 'i3', number: 'DLV-2026-0718', title: 'Kuukausimaksu ja välityspalkkiot, kesäkuu', date: ago(89), amountCents: 41150, status: 'paid' },
]

export const DEMO_STAFF = [
  { id: 's1', name: 'Omistaja (sinä)', email: null, role: 'owner', lastActive: ago(0) },
  { id: 's2', name: 'Keittiö', email: 'keittio@burgertalli.fi', role: 'kitchen', lastActive: ago(0, 2) },
  { id: 's3', name: 'Mira Salonen', email: 'mira@burgertalli.fi', role: 'manager', lastActive: ago(2) },
]

export const STAFF_ROLES = {
  owner: { label: 'Omistaja', description: 'Kaikki oikeudet, myös talous ja käyttäjät' },
  manager: { label: 'Esihenkilö', description: 'Tilaukset, ruokalista, saatavuus ja tilastot' },
  kitchen: { label: 'Keittiö', description: 'Vain tilaukset ja tuotteiden saatavuus' },
}

export const DEMO_EXCEPTIONS = [
  { id: 'e1', date: ahead(12), label: 'Itsenäisyyspäivän aatto', closed: false, open: '12:00', close: '18:00' },
  { id: 'e2', date: ahead(38), label: 'Joulupäivä', closed: true },
]

export const DEMO_DELIVERY_SETTINGS = { radiusKm: 5, minOrderCents: 1500, feeCents: 599, freeOverCents: 4000 }

export const DEMO_COMPANY = {
  companyName: 'Burger Talli Oy',
  businessId: '3214567-8',
  iban: 'FI21 1234 5600 0007 85',
  billingEmail: 'laskutus@burgertalli.fi',
  billingAddress: 'Puijonkatu 15, 70100 Kuopio',
}

// Delivon omat uutiset ja vinkit - staattista sisältöä, ei ravintolan dataa.
export const NEWS = [
  { id: 'n1', title: 'Uusi: vastaa arvosteluihin suoraan kojelaudalta', text: 'Vastatut arvostelut saavat keskimäärin enemmän uusintatilauksia.', tag: 'Uutuus' },
  { id: 'n2', title: 'Näin nostat tilausmäärää ruokakuvilla', text: 'Tuotteet joissa on kuva myyvät selvästi useammin kuin ilman.', tag: 'Vinkki' },
  { id: 'n3', title: 'Syksyn kampanjakausi alkaa', text: 'Kokeile arki-illan tarjousta hiljaisille tunneille.', tag: 'Markkinointi' },
]
