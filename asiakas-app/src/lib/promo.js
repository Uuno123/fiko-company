import { supabase } from './supabase'
import { formatPrice } from '../../../frontend/src/lib/format'

// Alennuskoodit - SAMAT kuin verkkosivun Cart.jsx PROMO_CODES ja backendin
// payments.js. Jos muutat yhtä, muuta kaikki, muuten näytetty ja veloitettu
// summa eroavat.
const PROMO_CODES = {
  BIDROP10: { type: 'percent', value: 10, label: '10 % alennus' },
  TERVETULOA: { type: 'percent', value: 40, maxDiscountCents: 1000, firstOrderOnly: true, label: '40 % alennus (enint. 10 €)' },
  SUURTILAUS: { type: 'percent', value: 30, maxDiscountCents: 700, minSubtotalCents: 5000, label: '30 % alennus (enint. 7 €)' },
  NOUTO15: { type: 'percent', value: 15, maxDiscountCents: 500, pickupOnly: true, label: '15 % noutoalennus (enint. 5 €)' },
}

// Sama tarkistus kuin verkkosivun applyPromo. Palauttaa { promo } tai { error }.
export async function checkPromoCode(input, { subtotalCents, method, customerId }) {
  const code = String(input ?? '').trim().toUpperCase()
  const found = PROMO_CODES[code]
  if (!found) return { error: 'Koodi ei kelpaa' }
  if (found.firstOrderOnly) {
    if (!customerId || !supabase) return { error: 'Kirjaudu sisään käyttääksesi koodia' }
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .neq('status', 'cancelled')
    if (error || (count ?? 0) > 0) return { error: 'Koodi käy vain ensimmäiseen tilaukseen' }
  }
  if (found.pickupOnly && method !== 'pickup') return { error: 'Koodi koskee vain noutotilauksia - valitse Nouto' }
  if (found.minSubtotalCents && subtotalCents < found.minSubtotalCents) {
    return { error: `Koodi vaatii vähintään ${formatPrice(found.minSubtotalCents)} tilauksen` }
  }
  let amount = found.type === 'percent' ? Math.round((subtotalCents * found.value) / 100) : found.value
  if (found.maxDiscountCents) amount = Math.min(amount, found.maxDiscountCents)
  return { promo: { code, label: found.label, discountCents: amount, pickupOnly: Boolean(found.pickupOnly) } }
}
