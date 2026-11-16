import { haversineKm } from './deliveryTime.js'

// Etäisyydet ravintolaan ilman selainriippuvuuksia, jotta asiakassovellus
// (asiakas-app) voi käyttää samaa koodia. deliveryAddress.js vie nämä eteenpäin.

export function formatDistance(km) {
  if (km == null) return null
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 50) * 50)} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

// TILAPÄINEN: mallit (täyteravintolat, lib/categories.js) ovat keksittyjä eikä
// niillä ole sijaintia. Niille arvotaan vakaa 0,4-4,8 km etäisyys ravintolan ja
// osoitteen perusteella, jotta "lähimmät" toimii myös pelkillä malleilla.
// Sama osoite antaa aina saman luvun. Oikeilla ravintoloilla etäisyys lasketaan
// niiden omista koordinaateista.
function demoDistanceKm(restaurantId, address) {
  const seed = `${restaurantId}|${address.lat.toFixed(3)}|${address.lng.toFixed(3)}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return 0.4 + (hash % 1000) / 1000 * 4.4
}

export function restaurantDistanceKm(restaurant, address) {
  if (!address) return null
  // null-tarkistus ennen Number()-muunnosta: Number(null) olisi 0 eli päiväntasaaja.
  if (restaurant.lat != null && restaurant.lng != null) {
    return haversineKm({ lat: Number(restaurant.lat), lng: Number(restaurant.lng) }, address)
  }
  return restaurant.isPlaceholder ? demoDistanceKm(restaurant.id, address) : null
}

// Lisää kortille distance_km-kentän (RestaurantCard näyttää sen) muuttamatta
// järjestystä - kategoriarivien järjestys on mainospaikkojen järjestys.
export function withDistance(restaurants, address) {
  if (!address) return restaurants
  return restaurants.map((restaurant) => ({ ...restaurant, distance_km: restaurantDistanceKm(restaurant, address) }))
}

// Kuten withDistance, mutta lähin ensin. Vain "Lähelläsi"-riville ja käyttäjän
// itse valitsemaan "Lähin ensin" -lajitteluun. Ravintolat ilman sijaintia jäävät
// loppuun alkuperäiseen järjestykseen.
export function sortByDistance(restaurants, address) {
  if (!address) return restaurants
  return withDistance(restaurants, address).sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
}
