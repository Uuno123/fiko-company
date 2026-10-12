import { coordinate, deliveryLegMinutes, hasCoords } from './deliveryTime.js'

export const ORDER_STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'completed']

const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

// Kuljettajan vaiheet, joiden aikana toimitus on vielä kesken (orders.courier_status,
// migraatio 0043). Kuljettaja-app päivittää niitä: assigned -> at_restaurant ->
// picked_up -> delivered.
export const COURIER_ACTIVE_STATUSES = ['assigned', 'at_restaurant', 'picked_up']

// Onko tilaus asiakkaan kannalta vielä kesken? Ravintola voi merkitä
// toimitustilauksen luovutetuksi (completed) jo kun kuljettaja noutaa sen -
// toimitus jatkuu silti kunnes kuljettaja kuittaa sen perille.
export function isOrderInProgress(order) {
  return ACTIVE_ORDER_STATUSES.includes(order.status) || COURIER_ACTIVE_STATUSES.includes(order.courier_status)
}

function clockTime(value) {
  return new Date(value).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

// Asiakkaalle näytettävä lyhyt tila: kuljettajan vaihe kun kuljettaja on
// löytynyt, muuten ravintolan tila. (Ravintolan dashboard käyttää
// orderStatusLabel-funktiota, jossa ei ole kuljettajaa.)
export function customerStatusLabel(order) {
  if (order.status !== 'cancelled' && order.delivery_method === 'delivery') {
    switch (order.courier_status) {
      case 'assigned':
        return 'Kuljettaja tulossa'
      case 'at_restaurant':
        return 'Kuljettaja ravintolassa'
      case 'picked_up':
        return 'Matkalla'
      case 'delivered':
        return 'Toimitettu'
      default:
        // Kuljettaja luopui keikasta (migraatio 0045) - tilaus on taas tarjolla.
        if (order.courier_released_at) return 'Etsitään uutta kuljettajaa'
        if (order.status === 'ready') return 'Odottaa kuljettajaa'
    }
  }
  return orderStatusLabel(order.status, order.delivery_method)
}

// delivolla ei ole (vielä) kuljettajaseurantaa, joten ravintola voi todistetusti tietää vain
// milloin tilaus on valmis ja milloin se on noudettu HEILTÄ - ei milloin se on oikeasti
// perillä asiakkaalla. Siksi ravintolan toiminnot ja "completed"-tila eivät väitä "toimitettu",
// vaan "noudettu" sekä nouto- että toimitustilauksille.
export function orderStatusLabel(status, deliveryMethod) {
  const isDelivery = deliveryMethod === 'delivery'
  switch (status) {
    case 'pending':
      return 'Odottaa vahvistusta'
    case 'confirmed':
      return 'Hyväksytty'
    case 'preparing':
      return 'Valmistuu'
    case 'ready':
      return isDelivery ? 'Matkalla' : 'Valmis noudettavaksi'
    case 'completed':
      return isDelivery ? 'Toimitettu' : 'Noudettu'
    case 'cancelled':
      return 'Peruttu'
    default:
      return status
  }
}

export function nextOrderStatus(status) {
  const idx = ORDER_STATUS_FLOW.indexOf(status)
  if (idx === -1 || idx === ORDER_STATUS_FLOW.length - 1) return null
  return ORDER_STATUS_FLOW[idx + 1]
}

export function nextOrderActionLabel(status) {
  switch (status) {
    case 'pending':
      return 'Hyväksy tilaus'
    case 'confirmed':
      return 'Aloita valmistus'
    case 'preparing':
      return 'Merkitse valmiiksi'
    case 'ready':
      return 'Merkitse noudetuksi'
    default:
      return null
  }
}

export function isOrderCancellable(status) {
  return status === 'pending' || status === 'confirmed' || status === 'preparing'
}

// Ravintolan estimated_ready_at kertoo vain milloin RUOKA on valmis - toimitustilauksessa
// asiakkaalle näytettävä saapumisarvio tarvitsee lisäksi kuljetusajan päälle. Ilman
// koordinaatteja käytetään samaa +15 min -puskuria kuin RestaurantPage.jsx:n
// "Kuljetus n. X min" -arviossa.
export const DELIVERY_ETA_BUFFER_MINUTES = 15

// Kuljettajan arvio hyväksytään vain järkevänä: korkeintaan 4 h tilauksesta.
// (Virheellisestä sijainnista laskettu arvio näkyi kerran "21315 minuuttina".)
const MAX_DELIVERY_ETA_MS = 4 * 60 * 60 * 1000

function timeOf(value) {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

// Kuljetus ruoan valmistumisesta perille (ms): luovutus, ajo ravintolasta osoitteeseen
// ja luovutus ovella - sama malli kuin kuljettaja-appissa. Ajoaika pyörällä, jota
// hitaampaa kuljettajaa ei ole; nopeampi kulkuneuvo vain aikaistaa arviota.
function deliveryLegMs(order) {
  const from = { lat: coordinate(order.restaurants?.lat), lng: coordinate(order.restaurants?.lng) }
  const to = { lat: coordinate(order.delivery_lat), lng: coordinate(order.delivery_lng) }
  const minutes =
    hasCoords(from) && hasCoords(to) ? deliveryLegMinutes(from, to, 'bike') : DELIVERY_ETA_BUFFER_MINUTES
  return minutes * 60 * 1000
}

// Milloin kuljettaja noutaa tilauksen: hänen oma arvionsa, mutta ei koskaan ennen
// ravintolan ilmoittamaa valmistumisaikaa - ravintola on voinut lisätä aikaa
// keikan hyväksymisen jälkeen (tietokanta siirtää ajat itsekin, migraatio 0044).
export function courierPickupAt(order) {
  const arriveBy = timeOf(order.courier_arrive_by)
  if (arriveBy == null) return null
  const readyAt = timeOf(order.estimated_ready_at)
  return new Date(readyAt == null ? arriveBy : Math.max(arriveBy, readyAt))
}

// Asiakkaalle näytettävä saapumis- tai noutoaika. Toimitustilaus ei voi olla perillä
// ennen kuin ruoka on valmis ja ehtinyt matkan: ennen noutoa arvio on aina vähintään
// ravintolan valmistumisaika + kuljetus. Kun kuljettaja on löytynyt, käytetään hänen
// arviotaan (oma kulkuneuvo ja ajomatka), siirrettynä myöhemmäksi jos ruoka valmistuu
// hänen suunnittelemaansa noutoa myöhemmin. Noudon jälkeen kuljettajan arvio on
// sellaisenaan saapumisaika.
export function estimatedArrivalAt(order) {
  const readyAt = timeOf(order.estimated_ready_at)
  if (order.delivery_method !== 'delivery') return readyAt == null ? null : new Date(readyAt)

  let eta = timeOf(order.delivery_eta)
  const created = timeOf(order.created_at)
  if (eta != null && created != null && eta - created >= MAX_DELIVERY_ETA_MS) eta = null
  const pickedUp = order.courier_status === 'picked_up' || order.courier_status === 'delivered'
  if (eta != null && (pickedUp || readyAt == null)) return new Date(eta)
  if (readyAt == null) return null
  if (eta == null) return new Date(readyAt + deliveryLegMs(order))

  const pickupAt = timeOf(order.courier_arrive_by)
  const courierLeg = pickupAt != null && eta > pickupAt ? eta - pickupAt : deliveryLegMs(order)
  return new Date(Math.max(eta, readyAt + courierLeg))
}

// Lyhyt otsikko seurantanäkymään (Woltin "Super! ..." -tyyliin). Pidempi
// selitys tulee sen alle trackingMessage-funktiosta.
export function trackingHeadline(order) {
  const isDelivery = order.delivery_method === 'delivery'
  if (isDelivery && order.status !== 'cancelled') {
    switch (order.courier_status) {
      case 'assigned':
        return 'Kuljettaja on matkalla ravintolaan'
      case 'at_restaurant':
        return 'Kuljettaja noutaa tilaustasi'
      case 'picked_up':
        return 'Tilaus on matkalla'
      case 'delivered':
        return 'Tilaus toimitettu'
      default:
        if (order.courier_released_at) return 'Etsimme uutta kuljettajaa'
        if (order.status === 'ready') return 'Tilaus odottaa kuljettajaa'
    }
  }
  switch (order.status) {
    case 'pending':
      return 'Tilaus lähetetty!'
    case 'confirmed':
      return 'Ravintola hyväksyi tilauksesi'
    case 'preparing':
      return 'Tilaustasi valmistetaan'
    case 'ready':
      return isDelivery ? 'Tilaus on matkalla' : 'Tilaus on valmis noudettavaksi'
    case 'completed':
      return isDelivery ? 'Tilaus toimitettu' : 'Tilaus noudettu'
    case 'cancelled':
      return 'Tilaus peruttu'
    default:
      return ''
  }
}

// Ystävällisempi, ihmisen kirjoittaman oloinen tilateksti seurantanäkymään - eri sanoitus
// kuin lyhyt badge-teksti (orderStatusLabel), koska tässä on tilaa kertoa mitä tapahtuu seuraavaksi.
export function trackingMessage(order) {
  const isDelivery = order.delivery_method === 'delivery'
  if (isDelivery && order.status !== 'cancelled') {
    switch (order.courier_status) {
      case 'assigned': {
        const pickupAt = courierPickupAt(order)
        return pickupAt
          ? `Kuljettaja hakee tilauksesi ravintolasta klo ${clockTime(pickupAt)}.`
          : 'Kuljettaja hakee tilauksesi ravintolasta.'
      }
      case 'at_restaurant':
        return 'Kuljettaja on ravintolassa ja saa tilauksesi pian.'
      case 'picked_up':
        return 'Kuljettaja on noutanut tilauksesi ja on matkalla luoksesi.'
      case 'delivered':
        return 'Tilaus on toimitettu. Kiitos tilauksesta!'
      default:
        if (order.courier_released_at) {
          return 'Edellinen kuljettaja joutui luopumaan tilauksestasi. Etsimme sille uuden kuljettajan.'
        }
        if (order.status === 'ready') return 'Tilauksesi on valmis. Etsimme sille kuljettajaa.'
    }
  }
  switch (order.status) {
    case 'pending':
      return 'Tilauksesi odottaa vielä ravintolan vahvistusta.'
    case 'confirmed':
      return 'Ravintola on hyväksynyt tilauksesi ja aloittaa valmistuksen pian.'
    case 'preparing':
      return 'Ravintola valmistaa tilaustasi juuri nyt.'
    case 'ready':
      return isDelivery
        ? 'Tilauksesi on valmis ja matkalla sinulle.'
        : 'Tilauksesi on valmis - tervetuloa noutamaan!'
    case 'completed':
      return 'Tilaus on noudettu. Kiitos tilauksesta!'
    case 'cancelled':
      return 'Tilaus on peruttu.'
    default:
      return ''
  }
}
