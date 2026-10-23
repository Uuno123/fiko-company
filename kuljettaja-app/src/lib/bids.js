import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Vibration } from 'react-native'
import { ROUTE_FACTOR, coordinate } from '../../../frontend/src/lib/deliveryTime'
import { tr } from './i18n'
import { supabase } from './supabase'

// Kuljetushinnan tarjoaminen (migraatio 0058). Online-tilassa ilman keikkaa
// kuljettaja näkee lähellä (8 km) olevat kotiinkuljetustilaukset, joiden
// kuljetushinnasta ei ole vielä sovittu, ja tarjoaa hinnan 1,99-7,99 €. Asiakas
// valitsee tarjouksista - tai on jo tarjonnut oman hintansa, jonka kuljettaja
// voi hyväksyä (sovittu heti). Tarkka osoite näkyy vasta valinnan jälkeen.
// Yksi avoin tarjous kerrallaan.

const POLL_MS = 8000

// Tietokannan virhekoodit valitulla kielellä.
const ERROR_TEXTS = {
  courier_offline: () => tr('bidErr.courier_offline'),
  courier_busy: () => tr('jobErr.courier_busy'),
  bid_pending_elsewhere: () => tr('bidErr.bid_pending_elsewhere'),
  invalid_price: () => tr('bidErr.invalid_price', { range: '1,99–7,99 €' }),
  order_not_available: () => tr('bidErr.order_not_available'),
  no_location: () => tr('bidErr.no_location'),
  not_a_courier: () => tr('jobErr.not_a_courier'),
}

export function bidErrorText(error) {
  const message = String(error?.message ?? error ?? '')
  const code = Object.keys(ERROR_TEXTS).find((key) => message.includes(key))
  if (code) return ERROR_TEXTS[code]()
  if (/network|fetch/i.test(message)) return tr('common.network')
  return tr('bidErr.failed')
}

// Palvelimen pyyntö sovelluksen muotoon. Matkat ovat linnuntietä, joten
// ajoreitti arvioidaan samalla kertoimella kuin muualla (deliveryTime.js).
function toRequest(row) {
  const approachKm = Number(row.distance_km) || 0
  const deliveryKm = Number(row.delivery_km) || 0
  return {
    id: row.order_id,
    restaurant: {
      name: row.restaurant_name ?? tr('common.restaurant'),
      address: row.restaurant_address ?? '',
      lat: coordinate(row.restaurant_lat),
      lng: coordinate(row.restaurant_lng),
    },
    dropoff: { area: row.dropoff_area ?? tr('common.customer'), lat: coordinate(row.dropoff_lat), lng: coordinate(row.dropoff_lng) },
    approachKm: Math.round(approachKm * ROUTE_FACTOR * 10) / 10,
    deliveryKm: Math.round(deliveryKm * ROUTE_FACTOR * 10) / 10,
    foodCents: row.food_cents ?? 0,
    itemCount: row.item_count ?? 0,
    customerOfferCents: row.customer_offer_cents ?? null,
    readyAt: row.estimated_ready_at ? Date.parse(row.estimated_ready_at) : null,
    createdAt: row.created_at ? Date.parse(row.created_at) : null,
    expiresAt: row.bidding_expires_at ? Date.parse(row.bidding_expires_at) : null,
    myBidCents: row.my_bid_cents ?? null,
    myBidStatus: row.my_bid_status ?? null,
  }
}

// enabled: online eikä keikkaa kesken. onAccepted(orderId): asiakas valitsi
// tämän kuljettajan (tai kuljettaja hyväksyi asiakkaan hinnan). onNotice(text):
// lyhyt ilmoitus (asiakas valitsi toisen, tilaus peruttiin).
export function useBidRequests({ courierId, enabled, haptics, onAccepted, onNotice }) {
  const [requests, setRequests] = useState([])
  const [skipped, setSkipped] = useState([])
  const [busy, setBusy] = useState(false)
  const latest = useRef({ onAccepted, onNotice, haptics })
  useEffect(() => {
    latest.current = { onAccepted, onNotice, haptics }
  })
  // Avoin oma tarjous: jos tilaus katoaa listalta, tarkistetaan mitä sille kävi
  // (reaaliaikainen ilmoitus voi jäädä tulematta).
  const openBid = useRef(null)
  const seen = useRef(new Set())
  // Asiakkaan viimeksi nähty hinta pyynnöittäin (vastatarjouksen huomaamiseen).
  const customerOfferSeen = useRef({})
  const selfWithdrawn = useRef(new Set())

  const checkBidOutcome = useCallback(async (orderId) => {
    const { data } = await supabase.from('delivery_bids').select('status').eq('order_id', orderId).maybeSingle()
    if (openBid.current !== orderId) return
    openBid.current = null
    if (data?.status === 'accepted') latest.current.onAccepted?.(orderId)
    else if (data?.status === 'rejected') latest.current.onNotice?.(tr('notice.otherCourier'))
    else if (data?.status === 'withdrawn' && !selfWithdrawn.current.has(orderId)) latest.current.onNotice?.(tr('notice.orderCancelled'))
  }, [])

  const apply = useCallback(
    (list) => {
      setRequests(list)
      const mine = list.find((request) => request.myBidStatus === 'offered')
      if (openBid.current && !list.some((request) => request.id === openBid.current)) checkBidOutcome(openBid.current)
      if (mine) openBid.current = mine.id
      // Uusi pyyntö: värinä (asetus), kuten keikkatarjouksessa.
      const fresh = list.filter((request) => !seen.current.has(request.id))
      fresh.forEach((request) => seen.current.add(request.id))
      // Asiakas vastasi omaan tarjoukseen omalla hinnallaan: myös siitä värinä.
      // (Ensimmäinen näkemä on lähtötilanne, ei vastatarjous.)
      const counterOffer =
        mine != null &&
        mine.id in customerOfferSeen.current &&
        mine.customerOfferCents != null &&
        mine.customerOfferCents !== customerOfferSeen.current[mine.id]
      if (mine) customerOfferSeen.current[mine.id] = mine.customerOfferCents
      if ((fresh.length > 0 || counterOffer) && latest.current.haptics) Vibration.vibrate([0, 250, 150, 250])
    },
    [checkBidOutcome],
  )

  // Virhe (esim. migraatio 0058 ajamatta): ei pyyntöjä, vanha keikkajako toimii.
  const load = useCallback(
    () =>
      supabase.rpc('courier_bid_requests').then(({ data, error }) => {
        if (!error) apply((data ?? []).map(toRequest))
      }),
    [apply],
  )

  useEffect(() => {
    if (!courierId || !enabled) return undefined
    load()
    const timer = setInterval(load, POLL_MS)
    // Sovellus palasi näkyviin (esim. push-ilmoituksesta): pyynnöt heti, kun
    // tuore sijainti on ehtinyt palvelimelle (jobs.js lähettää sen samalla).
    let resumeTimer = null
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      clearTimeout(resumeTimer)
      resumeTimer = setTimeout(load, 1500)
    })
    return () => {
      clearInterval(timer)
      clearTimeout(resumeTimer)
      subscription.remove()
    }
  }, [courierId, enabled, load])

  // Oman tarjouksen tila heti: hyväksytty, hylätty (asiakas valitsi toisen) tai poistettu.
  useEffect(() => {
    if (!courierId) return undefined
    const channel = supabase
      .channel(`courier-bids-${courierId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_bids', filter: `courier_id=eq.${courierId}` },
        (payload) => {
          const row = payload.new
          if (row?.order_id && openBid.current === row.order_id && row.status !== 'offered') {
            checkBidOutcome(row.order_id)
          }
          load()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [courierId, load, checkBidOutcome])

  // Palauttaa virhetekstin tai null.
  async function placeBid(orderId, priceCents) {
    if (busy) return null
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('courier_place_bid', { p_order_id: orderId, p_price_cents: priceCents })
      if (error) {
        load()
        return bidErrorText(error)
      }
      selfWithdrawn.current.delete(orderId)
      if (data?.status === 'accepted') {
        openBid.current = null
        latest.current.onAccepted?.(orderId)
        return null
      }
      openBid.current = orderId
      await load()
      return null
    } catch (err) {
      return bidErrorText(err)
    } finally {
      setBusy(false)
    }
  }

  async function withdrawBid(orderId) {
    selfWithdrawn.current.add(orderId)
    openBid.current = null
    setBusy(true)
    try {
      await supabase.rpc('courier_withdraw_bid', { p_order_id: orderId })
      await load()
    } finally {
      setBusy(false)
    }
  }

  function skip(orderId) {
    setSkipped((current) => [...current, orderId])
  }

  const visible = enabled ? requests : []
  // Oma avoin tarjous ensin, sitten ohittamattomat lähimmästä alkaen.
  const mine = visible.find((request) => request.myBidStatus === 'offered') ?? null
  const queue = visible.filter((request) => request.myBidStatus !== 'offered' && !skipped.includes(request.id))
  return {
    current: mine ?? queue[0] ?? null,
    hasOpenBid: Boolean(mine),
    queueLength: queue.length + (mine ? 1 : 0),
    busy,
    placeBid,
    withdrawBid,
    skip,
  }
}
