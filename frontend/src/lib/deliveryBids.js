import { useCallback, useEffect, useState } from 'react'
import { DELIVERY_PRICE_RANGE } from './delivery.js'
import { supabase } from './supabaseClient.js'

// Kuljetushinnan sopiminen asiakkaan puolella (migraatio 0058): kuljettajien
// tarjoukset reaaliajassa, tarjouksen hyväksyntä, oma hintatarjous ja peruutus.

const ORDER_FIELDS =
  'id, order_number, status, cancel_reason, bidding_expires_at, customer_offer_cents, delivery_price_cents, total_cents, payment_status'
const BID_FIELDS = 'id, courier_name, vehicle, price_cents, distance_km, status, created_at, updated_at'
// Kuljettajan kuva ja arvio tarjouksessa (migraatio 0062).
const BID_PROFILE_FIELDS = `${BID_FIELDS}, courier_photo_path, courier_rating, courier_review_count`
const PHOTO_BUCKET = 'courier-photos'
// Varmuuden vuoksi myös kyselynä (reaaliaikayhteys voi katketa).
const REFRESH_MS = 10_000

export const VEHICLE_LABELS = { bike: 'Polkupyörä', ebike: 'Sähköpyörä', scooter: 'Mopo', car: 'Auto' }

const ERROR_TEXTS = {
  bidding_closed: 'Hinnan sopimisen aika ehti päättyä.',
  bid_not_available: 'Kuljettaja ehti perua tarjouksensa. Valitse toinen tarjous.',
  courier_unavailable: 'Kuljettaja ehti ottaa toisen keikan. Valitse toinen tarjous.',
  invalid_price: `Hinnan pitää olla ${DELIVERY_PRICE_RANGE}.`,
  cannot_cancel: 'Tilausta ei voi enää perua, koska kuljetuksesta on jo sovittu.',
  order_not_found: 'Tilausta ei löytynyt.',
}

export function bidErrorText(error) {
  const message = String(error?.message ?? error ?? '')
  const code = Object.keys(ERROR_TEXTS).find((key) => message.includes(key))
  if (code) return ERROR_TEXTS[code]
  if (/network|fetch/i.test(message)) return 'Ei yhteyttä. Tarkista verkkoyhteys.'
  return 'Toiminto epäonnistui. Yritä uudelleen.'
}

async function fetchBids(orderId) {
  const query = (fields) =>
    supabase.from('delivery_bids').select(fields).eq('order_id', orderId).order('price_cents', { ascending: true })
  const result = await query(BID_PROFILE_FIELDS)
  // Migraatio 0062 ajamatta: tarjoukset ilman kuvaa ja arviota.
  if (result.error?.code === '42703') return query(BID_FIELDS)
  return result
}

// Kuljettajan profiilikuvan osoite (julkinen säiliö) tai null.
export function courierPhotoUrl(path) {
  if (!path || !supabase) return null
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

// 4.8 -> "4,8"
export function formatRating(value) {
  return Number(value).toLocaleString('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

// Tilauksen hintaneuvottelu: tilauksen tila ja kuljettajien tarjoukset (halvin
// ensin). orderId null = ei mitään (esim. noutotilaus).
export function useDeliveryNegotiation(orderId) {
  const [state, setState] = useState({ orderId: null, order: null, bids: [], loaded: false })

  const fetchAll = useCallback(async () => {
    if (!orderId) return
    const [orderResult, bidResult] = await Promise.all([
      supabase.from('orders').select(ORDER_FIELDS).eq('id', orderId).maybeSingle(),
      fetchBids(orderId),
    ])
    setState((current) => ({
      orderId,
      order: orderResult.data ?? (current.orderId === orderId ? current.order : null),
      bids: bidResult.data ?? (current.orderId === orderId ? current.bids : []),
      loaded: true,
    }))
  }, [orderId])

  useEffect(() => {
    if (!orderId) return undefined
    let cancelled = false
    const run = () => {
      if (!cancelled) fetchAll()
    }
    run()
    const channel = supabase
      .channel(`delivery-negotiation-${orderId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_bids', filter: `order_id=eq.${orderId}` },
        run,
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, run)
      .subscribe()
    const timer = setInterval(run, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [orderId, fetchAll])

  const current = state.orderId === orderId ? state : { order: null, bids: [], loaded: false }
  return {
    order: current.order,
    offeredBids: current.bids.filter((bid) => bid.status === 'offered'),
    acceptedBid: current.bids.find((bid) => bid.status === 'accepted') ?? null,
    loaded: current.loaded,
    refresh: fetchAll,
  }
}

async function rpc(name, params) {
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw error
  return data
}

export function acceptBid(bidId) {
  return rpc('customer_accept_bid', { p_bid_id: bidId })
}

// null poistaa oman tarjouksen.
export function setDeliveryOffer(orderId, priceCents) {
  return rpc('customer_set_delivery_offer', { p_order_id: orderId, p_price_cents: priceCents })
}

// Tarjouksen kuljettajan koko profiili (migraatio 0063): { name, photo_path,
// vehicle, since, rating, review_count, deliveries, distribution, reviews }.
// Ennen 0063:a vain uusimmat kirjoitetut arviot (0062): { reviews }.
export async function fetchBidCourierProfile(bidId) {
  const { data, error } = await supabase.rpc('bid_courier_profile', { p_bid_id: bidId })
  if (!error) return data
  if (!['PGRST202', '42883'].includes(error.code)) throw error
  return { reviews: (await rpc('bid_courier_reviews', { p_bid_id: bidId })) ?? [] }
}

export function cancelNegotiation(orderId) {
  return rpc('customer_cancel_order', { p_order_id: orderId })
}
