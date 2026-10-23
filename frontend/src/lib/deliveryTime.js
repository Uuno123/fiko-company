// Kuljetusajan malli: sama laskenta asiakkaan saapumisarvioon (verkkosivu) ja
// kuljettajan tarjouksiin ja aikalaskureihin (kuljettaja-app), jotta asiakas ja
// kuljettaja näkevät saman ajan. Oma etäisyysarvio linnuntiestä - ei maksullista
// reittipalvelua.
//
// Myös kuljettaja-app käyttää tätä tiedostoa (kuljettaja-app/src/lib/jobs.js),
// joten pidä se riippumattomana: ei importteja eikä selaimen/Viten rajapintoja.

// Ajoreitti on linnuntietä pidempi. Keskinopeudet kaupungissa kulkuneuvoittain.
export const ROUTE_FACTOR = 1.35
export const SPEED_KMH = { bike: 15, ebike: 20, scooter: 25, car: 28 }
// Tilauksen luovutus ravintolassa ja asiakkaalle ovella.
export const HANDOVER_MIN = 2
export const DROPOFF_MIN = 2
// Ajoaika ravintolasta asiakkaalle, kun toisen pään koordinaatteja ei tiedetä.
export const DEFAULT_RIDE_MIN = 12

// Kuljetushinta sovitaan tilauksen jälkeen (migraatio 0058): kuljettaja tarjoaa
// hinnan haarukasta, asiakas hyväksyy tai tarjoaa omansa. Kuljettaja saa
// koko sovitun hinnan (100 %). Samat luvut ovat tietokannassa
// (dispatch_settings) ja backendin korttivarauksessa (routes/payments.js) - jos
// muutat näitä, muuta ne myös siellä.
export const DELIVERY_BID = {
  minCents: 199,
  maxCents: 799,
  courierSharePercent: 100,
  biddingMinutes: 10,
}

// Kuljettajan osuus sovitusta kuljetushinnasta.
export function courierShareCents(priceCents) {
  return Math.round((priceCents * DELIVERY_BID.courierSharePercent) / 100)
}

// Hinta haarukkaan sentin tarkkuudella (sama kuin tietokannassa).
export function clampBidCents(cents) {
  return Math.min(DELIVERY_BID.maxCents, Math.max(DELIVERY_BID.minCents, Math.round(cents)))
}

// Tietokannan tyhjä koordinaatti on null - Number(null) olisi 0 (Afrikan edusta),
// joten tyhjästä tulee NaN, jonka hasCoords hylkää.
export function coordinate(value) {
  return value == null || value === '' ? NaN : Number(value)
}

export function hasCoords(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng)
}

// Linnuntie-etäisyys kilometreinä.
export function haversineKm(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Ajoreitin pituus kilometreinä (0,1 km tarkkuudella).
export function routeKm(from, to) {
  return Math.round(haversineKm(from, to) * ROUTE_FACTOR * 10) / 10
}

// Ajoaika minuutteina. Lyhyinkin matka vie vähintään minMinutes.
export function travelMinutes(km, vehicle, minMinutes) {
  const speed = SPEED_KMH[vehicle] ?? SPEED_KMH.bike
  return Math.max(minMinutes, Math.round((km / speed) * 60))
}

// Ajo ravintolasta asiakkaalle minuutteina, kun pisteet tiedetään (vähintään 3 min).
export function rideMinutes(from, to, vehicle) {
  return hasCoords(from) && hasCoords(to) ? travelMinutes(routeKm(from, to), vehicle, 3) : DEFAULT_RIDE_MIN
}

// Ruoan valmistumisesta perille: luovutus ravintolassa, ajo ja luovutus ovella.
export function deliveryLegMinutes(from, to, vehicle) {
  return HANDOVER_MIN + rideMinutes(from, to, vehicle) + DROPOFF_MIN
}
