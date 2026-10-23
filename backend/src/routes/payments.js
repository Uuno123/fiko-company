import { Router } from 'express'
import { stripe } from '../stripeClient.js'
import { supabase, isSupabaseConfigured } from '../supabaseClient.js'

const router = Router()

const SERVICE_FEE_CENTS = 49
const MIN_CHARGE_CENTS = 50 // Stripe EUR-minimi
// Kuljetushinnasta sovitaan kuljettajan kanssa tilauksen jälkeen (migraatio 0058),
// joten kortilta varataan suurin mahdollinen hinta. Veloitus tehdään vasta kun
// ravintola hyväksyy (settlement.js), ja vain ruoka + sovittu kuljetushinta.
// Sama raja kuin dispatch_settings.bid_max_cents ja frontendin DELIVERY_BID.
export const MAX_DELIVERY_PRICE_CENTS = 799

// Pidettävä samassa muodossa kuin frontend/src/pages/Cart.jsx:n PROMO_CODES - jos toista
// muutetaan, muuta toinenkin, muuten näytetty ja veloitettu summa voivat erota.
const PROMO_CODES = {
  BIDROP10: { type: 'percent', value: 10 },
  TERVETULOA: { type: 'fixed', value: 300 },
  SUURTILAUS: { type: 'percent', value: 30, maxDiscountCents: 700, minSubtotalCents: 5000 },
  NOUTO15: { type: 'percent', value: 15, maxDiscountCents: 500, pickupOnly: true },
}

router.post('/create-intent', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Maksujen käsittely ei ole käytössä (STRIPE_SECRET_KEY puuttuu).' })
  }
  if (!isSupabaseConfigured) {
    return res.status(503).json({ error: 'Tilausten käsittely vaatii Supabase-yhteyden.' })
  }

  const { restaurantId, deliveryMethod, promoCode, lines } = req.body ?? {}

  if (!restaurantId || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Virheellinen tilaus.' })
  }
  if (deliveryMethod !== 'delivery' && deliveryMethod !== 'pickup') {
    return res.status(400).json({ error: 'Virheellinen toimitustapa.' })
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, is_open, menu_items(id, price_cents, is_available, menu_item_option_groups(menu_item_options(id, price_delta_cents)))')
    .eq('id', restaurantId)
    .maybeSingle()

  if (restaurantError || !restaurant) {
    return res.status(404).json({ error: 'Ravintolaa ei löytynyt.' })
  }
  if (restaurant.is_open === false) {
    return res.status(409).json({ error: 'Ravintola on juuri nyt kiinni.' })
  }

  const menuItemsById = new Map(restaurant.menu_items.map((item) => [item.id, item]))
  const optionPriceById = new Map()
  for (const item of restaurant.menu_items) {
    for (const group of item.menu_item_option_groups ?? []) {
      for (const option of group.menu_item_options ?? []) {
        optionPriceById.set(option.id, option.price_delta_cents)
      }
    }
  }

  let subtotalCents = 0
  for (const line of lines) {
    const menuItem = menuItemsById.get(line?.menuItemId)
    const quantity = Number(line?.quantity)
    if (!menuItem || menuItem.is_available === false || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Tilaus sisältää tuotteen, joka ei ole saatavilla.' })
    }
    const optionDeltas = Array.isArray(line.optionIds)
      ? line.optionIds.map((id) => optionPriceById.get(id) ?? 0)
      : []
    const unitPriceCents = menuItem.price_cents + optionDeltas.reduce((sum, delta) => sum + delta, 0)
    subtotalCents += unitPriceCents * quantity
  }

  const maxDeliveryCents = deliveryMethod === 'delivery' ? MAX_DELIVERY_PRICE_CENTS : 0
  const serviceFeeCents = SERVICE_FEE_CENTS

  let discountCents = 0
  let appliedPromoCode = null
  const promo = promoCode ? PROMO_CODES[String(promoCode).toUpperCase()] : null
  // minSubtotalCents täyttymättä -> koodia ei sovelleta, ei virhettä: tilaus
  // syntyy silti, vain ilman alennusta. Frontend on jo estänyt tämän UI:ssa,
  // mutta backend on se joka oikeasti veloittaa, joten se ei luota frontiin.
  // pickupOnly-koodi (NOUTO15) ei alenna kotiinkuljetusta.
  if (
    promo &&
    (!promo.minSubtotalCents || subtotalCents >= promo.minSubtotalCents) &&
    (!promo.pickupOnly || deliveryMethod === 'pickup')
  ) {
    appliedPromoCode = String(promoCode).toUpperCase()
    discountCents = promo.type === 'percent' ? Math.round((subtotalCents * promo.value) / 100) : promo.value
    if (promo.maxDiscountCents) discountCents = Math.min(discountCents, promo.maxDiscountCents)
    discountCents = Math.min(discountCents, subtotalCents)
  }

  // Ruoka + palvelumaksu - alennus. Kuljetus tulee tähän vasta sovittuna.
  const foodCents = Math.max(MIN_CHARGE_CENTS, subtotalCents + serviceFeeCents - discountCents)
  const authorizedCents = foodCents + maxDeliveryCents

  try {
    const intent = await stripe.paymentIntents.create({
      amount: authorizedCents,
      currency: 'eur',
      // Kortilta vain varataan summa. Veloitus (osa varauksesta) tai varauksen
      // vapautus tehdään, kun ravintola hyväksyy tai tilaus peruuntuu.
      capture_method: 'manual',
      // Vain kortti - muut Stripen automaattiset maksutavat (Bancontact, EPS, Klarna...)
      // vaativat uudelleenohjauksen (return_url), jota frontend ei tällä hetkellä käsittele.
      payment_method_types: ['card'],
      metadata: {
        restaurantId,
        deliveryMethod,
        promoCode: appliedPromoCode ?? '',
        // Palvelimen laskema ruokaosuus: veloitus ei luota asiakkaan tallentamiin summiin.
        foodCents: String(foodCents),
        maxDeliveryCents: String(maxDeliveryCents),
      },
    })

    res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      subtotalCents,
      deliveryFeeCents: 0,
      serviceFeeCents,
      discountCents,
      totalCents: foodCents,
      maxDeliveryCents,
      authorizedCents,
      promoCode: appliedPromoCode,
    })
  } catch (err) {
    console.error('[delivo-backend] Stripe PaymentIntentin luonti epäonnistui:', err.message)
    res.status(502).json({ error: 'Maksun aloitus epäonnistui. Yritä uudelleen.' })
  }
})

export default router
