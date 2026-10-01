import { estimatedArrivalAt } from './orderStatus.js'

// TILAPÄINEN, käyttäjän pyynnöstä täysin simuloidun kassan jatke: simuloitua
// ("DEMO-") tilausta ei ole tietokannassa, joten se säilytetään selaimessa, jotta
// "Seuraa tilausta" -kupla löytää sen. Tila etenee ajan mukaan, ettei tilaus
// jää puoleksi tunniksi "odottaa vahvistusta" -tilaan. Poistetaan kun oikea
// maksu on käytössä - oikeat tilaukset tulevat tietokannasta.
const RETAIN_AFTER_DONE_MS = 10 * 60_000

function storageKey(userId) {
  return `delivo-demo-order-${userId}`
}

export function saveDemoOrder(userId, order) {
  if (!userId) return
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(order))
  } catch {
    // Tallennus estetty (esim. yksityinen ikkuna) - seurantakupla ei vain näy.
  }
}

function simulatedStatus(order, now) {
  const createdMs = Date.parse(order.created_at)
  const readyMs = Date.parse(order.estimated_ready_at)
  const arrivalMs = estimatedArrivalAt(order).getTime()
  const isDelivery = order.delivery_method === 'delivery'
  const elapsed = now - createdMs

  if (elapsed < 45_000) return 'pending'
  if (elapsed < 2 * 60_000) return 'confirmed'
  if (now < readyMs) return 'preparing'
  // Nouto odottaa noutajaa 10 min valmistumisen jälkeen; toimitus on
  // "matkalla" kunnes arvioitu saapumisaika on ohi.
  if (now < (isDelivery ? arrivalMs : readyMs + 10 * 60_000)) return 'ready'
  return 'completed'
}

// Palauttaa tilauksen ajan mukaan päivitetyllä tilalla, tai null jos
// tallennettua tilausta ei ole tai se on jo ollut valmis pitkään.
export function loadDemoOrder(userId, now = Date.now()) {
  if (!userId) return null
  let order
  try {
    order = JSON.parse(localStorage.getItem(storageKey(userId)))
  } catch {
    return null
  }
  if (!order?.created_at || !order?.estimated_ready_at) return null

  const status = simulatedStatus(order, now)
  if (status === 'completed' && now > estimatedArrivalAt(order).getTime() + RETAIN_AFTER_DONE_MS) {
    try {
      localStorage.removeItem(storageKey(userId))
    } catch {
      // ei väliä - vanhentunut tilaus vain pysyy piilossa
    }
    return null
  }
  return { ...order, status }
}
