export const ORDER_STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'completed']

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
      return 'Noudettu'
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
// asiakkaalle näytettävä saapumisarvio tarvitsee lisäksi kuljetusajan päälle. Sama +15 min
// -puskuri kuin RestaurantPage.jsx:n "Kuljetus n. X min" -arviossa muualla sovelluksessa.
export const DELIVERY_ETA_BUFFER_MINUTES = 15

export function estimatedArrivalAt(order) {
  if (!order.estimated_ready_at) return null
  const readyAt = new Date(order.estimated_ready_at)
  if (order.delivery_method !== 'delivery') return readyAt
  return new Date(readyAt.getTime() + DELIVERY_ETA_BUFFER_MINUTES * 60 * 1000)
}

// Ystävällisempi, ihmisen kirjoittaman oloinen tilateksti seurantanäkymään - eri sanoitus
// kuin lyhyt badge-teksti (orderStatusLabel), koska tässä on tilaa kertoa mitä tapahtuu seuraavaksi.
export function trackingMessage(order) {
  const isDelivery = order.delivery_method === 'delivery'
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
