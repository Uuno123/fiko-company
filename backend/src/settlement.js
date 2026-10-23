import { stripe as defaultStripe } from './stripeClient.js'
import { supabaseAdmin } from './supabaseClient.js'

// Veloitukset (migraatio 0058). Kassalla kortilta vain varataan summa
// (routes/payments.js, capture_method = manual). Tämä palvelimen ajastin käy
// tilaukset läpi 15 s välein:
//   - Ravintola hyväksyi -> veloitetaan varauksesta ruoka + palvelumaksu - alennus
//     (palvelimen laskema, PaymentIntentin metadata) + sovittu kuljetushinta.
//     Loput varauksesta vapautuu. Jako kirjataan order_settlements-tauluun.
//   - Peruttu ennen veloitusta -> varaus vapautetaan (ei maksua, ei Stripen kuluja).
//   - Peruttu veloituksen jälkeen -> maksu palautetaan.
// Veloitus vasta ravintolan hyväksynnässä: hylätty tilaus ei maksa mitään, kun
// taas palautuksesta Stripe pitää käsittelymaksunsa.
// Vaatii backend/.env: STRIPE_SECRET_KEY ja SUPABASE_SERVICE_ROLE_KEY.

const INTERVAL_MS = 15_000
const BATCH_SIZE = 50
const ACCEPTED_STATUSES = ['confirmed', 'preparing', 'ready', 'completed']

const ORDER_FIELDS =
  'id, restaurant_id, status, delivery_method, subtotal_cents, discount_cents, service_fee_cents, delivery_price_cents, courier_fee_cents, payment_intent_id, payment_status'

// Veloitettava summa: ruokaosuus palvelimen laskemana (ei asiakkaan tallentamista
// summista) + sovittu kuljetushinta, enintään varattu summa.
export function captureAmount(order, intent) {
  const food = Number(intent.metadata?.foodCents)
  const foodCents = Number.isInteger(food) && food > 0 ? food : order.subtotal_cents + order.service_fee_cents - order.discount_cents
  const deliveryCents = order.delivery_method === 'delivery' ? (order.delivery_price_cents ?? 0) : 0
  return Math.min(foodCents + deliveryCents, intent.amount_capturable)
}

// Jako: ravintolalle koko ruokasumma (delivon alennuskoodit ovat delivon
// kustannus, kumppaniehdot), kuljettajalle koko sovittu kuljetushinta
// (kirjattu tilaukselle sopimuksessa), delivolle loput (palvelumaksu - alennukset).
export function splitCapture(order, capturedCents) {
  const restaurantCents = order.subtotal_cents
  const courierCents = order.delivery_method === 'delivery' ? (order.courier_fee_cents ?? 0) : 0
  return {
    restaurant_cents: restaurantCents,
    courier_cents: courierCents,
    delivo_cents: capturedCents - restaurantCents - courierCents,
  }
}

// Yksi tilaus. store: { setPaymentStatus(order, status), saveSettlement(row), markRefunded(orderId, cents) }.
export async function settleOrder(order, { stripe, store }) {
  const intent = await stripe.paymentIntents.retrieve(order.payment_intent_id)
  // Asiakas tallentaa tilauksen itse: maksun pitää kuulua samalle ravintolalle.
  if (intent.metadata?.restaurantId !== order.restaurant_id) {
    await store.setPaymentStatus(order, 'failed')
    return 'failed'
  }

  if (order.status === 'cancelled') {
    if (intent.status === 'requires_capture') {
      await stripe.paymentIntents.cancel(intent.id, {}, { idempotencyKey: `release-${order.id}` })
      await store.setPaymentStatus(order, 'released')
      return 'released'
    }
    if (intent.status === 'canceled') {
      await store.setPaymentStatus(order, 'released')
      return 'released'
    }
    if (intent.status === 'succeeded') {
      const refund = await stripe.refunds.create({ payment_intent: intent.id }, { idempotencyKey: `refund-${order.id}` })
      await store.markRefunded(order.id, refund.amount)
      await store.setPaymentStatus(order, 'refunded')
      return 'refunded'
    }
    await store.setPaymentStatus(order, 'failed')
    return 'failed'
  }

  if (!ACCEPTED_STATUSES.includes(order.status) || order.payment_status !== 'authorized') return 'skipped'

  let captured = intent
  if (intent.status === 'requires_capture') {
    captured = await stripe.paymentIntents.capture(
      intent.id,
      { amount_to_capture: captureAmount(order, intent) },
      { idempotencyKey: `capture-${order.id}` },
    )
  } else if (intent.status !== 'succeeded') {
    // Varaus vanheni tai korttia ei koskaan vahvistettu.
    await store.setPaymentStatus(order, 'failed')
    return 'failed'
  }

  const capturedCents = captured.amount_received
  await store.saveSettlement({
    order_id: order.id,
    payment_intent_id: intent.id,
    captured_cents: capturedCents,
    ...splitCapture(order, capturedCents),
  })
  await store.setPaymentStatus(order, 'captured')
  return 'captured'
}

function supabaseStore(db) {
  async function check(promise) {
    const { error } = await promise
    if (error) throw error
  }
  return {
    // Ehdollinen päivitys: rinnakkainen ajo ei kirjoita vanhan tilan päälle.
    setPaymentStatus: (order, status) =>
      check(db.from('orders').update({ payment_status: status }).eq('id', order.id).eq('payment_status', order.payment_status)),
    saveSettlement: (row) => check(db.from('order_settlements').upsert(row, { onConflict: 'order_id' })),
    markRefunded: (orderId, cents) =>
      check(db.from('order_settlements').update({ refunded_cents: cents }).eq('order_id', orderId)),
  }
}

// Käsittelyä odottavat: ravintolan hyväksymät tai perutut varaukset ja
// veloituksen jälkeen perutut.
export async function runSettlementPass({ stripe = defaultStripe, db = supabaseAdmin, log = console } = {}) {
  const { data, error } = await db
    .from('orders')
    .select(ORDER_FIELDS)
    .not('payment_intent_id', 'is', null)
    .or(
      `and(payment_status.eq.authorized,status.in.(${[...ACCEPTED_STATUSES, 'cancelled'].join(',')})),and(payment_status.eq.captured,status.eq.cancelled)`,
    )
    .order('updated_at', { ascending: true })
    .limit(BATCH_SIZE)
  if (error) {
    log.error('[delivo-backend] Veloitettavien tilausten haku epäonnistui:', error.message)
    return []
  }

  const store = supabaseStore(db)
  const results = []
  for (const order of data ?? []) {
    try {
      results.push([order.id, await settleOrder(order, { stripe, store })])
    } catch (err) {
      // Stripen hylkäämä pyyntö (esim. varaus vanhentunut) ei korjaannu yrittämällä
      // uudelleen; verkkovirhe korjaantuu, joten se yritetään seuraavalla kierroksella.
      if (err?.type === 'StripeInvalidRequestError') {
        await store.setPaymentStatus(order, 'failed').catch(() => {})
        results.push([order.id, 'failed'])
      }
      log.error(`[delivo-backend] Tilauksen ${order.id} veloitus epäonnistui:`, err?.message ?? err)
    }
  }
  return results
}

export function startSettlementWorker({ log = console } = {}) {
  if (!defaultStripe || !supabaseAdmin) {
    log.warn(
      '[delivo-backend] Veloitukset eivät ole käytössä: STRIPE_SECRET_KEY tai SUPABASE_SERVICE_ROLE_KEY puuttuu backend/.env-tiedostosta.\n' +
        '  -> Kortilta tehdyt varaukset vapautuvat itsestään 7 päivän kuluttua, mutta mitään ei veloiteta.',
    )
    return () => {}
  }
  let running = false
  async function tick() {
    if (running) return
    running = true
    try {
      const results = await runSettlementPass({ log })
      for (const [orderId, result] of results) {
        if (result !== 'skipped') log.log(`[delivo-backend] Tilaus ${orderId}: ${result}`)
      }
    } finally {
      running = false
    }
  }
  tick()
  const timer = setInterval(tick, INTERVAL_MS)
  return () => clearInterval(timer)
}
