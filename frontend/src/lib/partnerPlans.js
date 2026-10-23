// delivon ravintolapaketit. Yksi lähde kumppanisivulle, hakemukselle ja kojelaudalle.
//
// Ei välityspalkkiota: ravintola maksaa kiinteän kuukausimaksun. Kuljetuspaketeissa
// kuukausimaksu sisältää tietyn määrän kuljetustilauksia, ja sen ylittävistä
// peritään pieni kiinteä maksu. Asiakkaan toimitus- ja palvelumaksu kattavat
// kuljettajan palkkion ja korttimaksun suunnilleen, joten kiintiö pitää isonkin
// paketin kannattavana.
//
// Kaikki hinnat ilman arvonlisäveroa: näytetään aina "+ alv".

import { formatPrice } from './format.js'

export const DEVICE_SETUP_CENTS = 29900
export const COMMITMENT_MONTHS = 6
export const EXTRA_DELIVERY_CENTS = 49

export const PARTNER_PLANS = [
  {
    key: 'nouto',
    name: 'Nouto',
    priceCents: 3999,
    // Ei kotiinkuljetusta: asiakas tilaa ja maksaa delivossa ja hakee itse.
    delivery: false,
    includedDeliveries: 0,
    features: ['Rajattomasti noutotilauksia', 'Asiakas tilaa ja maksaa Bidropissa, hakee itse'],
  },
  {
    key: 'kuljetus',
    name: 'Kuljetus',
    priceCents: 7999,
    delivery: true,
    includedDeliveries: 300,
    features: ['Nouto ja kotiinkuljetus Bidropin kuljettajilla', 'Asiakas seuraa kuljettajaa kartalla'],
  },
  {
    key: 'iso',
    name: 'Iso ravintola',
    priceCents: 19999,
    delivery: true,
    includedDeliveries: 1000,
    features: ['Nostettu näkyvyys etusivulla ja hauissa', 'Tarkempi myyntidata', 'Oma yhteyshenkilö'],
  },
]

// Tasaeurot ilman senttejä ("299 €"), muuten kuten formatPrice.
export function formatWholePrice(cents) {
  return cents % 100 === 0 ? `${cents / 100} €` : formatPrice(cents)
}

export function findPlan(key) {
  return PARTNER_PLANS.find((plan) => plan.key === key) ?? null
}

// Kuukauden maksut paketin mukaan: kuukausimaksu + kiintiön ylittävät kuljetukset.
export function monthlyPlanCharges(plan, deliveryOrders) {
  const extraDeliveries = Math.max(deliveryOrders - plan.includedDeliveries, 0)
  const extraCents = plan.delivery ? extraDeliveries * EXTRA_DELIVERY_CENTS : 0
  return { extraDeliveries, extraCents, totalCents: plan.priceCents + extraCents }
}

// Lyhyt kuvaus paketin tilauksista, esim. "300 kuljetustilausta / kk".
export function planOrdersLabel(plan) {
  if (!plan.delivery) return 'Vain nouto'
  return `${plan.includedDeliveries.toLocaleString('fi-FI')} kuljetustilausta / kk`
}
