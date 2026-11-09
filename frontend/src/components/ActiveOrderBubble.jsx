import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { useDeliveryNegotiation } from '../lib/deliveryBids.js'
import { customerStatusLabel, estimatedArrivalAt, isOrderInProgress } from '../lib/orderStatus.js'
import OrderChangeNotice from './OrderChangeNotice.jsx'
import OrderTrackingModal from './OrderTrackingModal.jsx'
import './ActiveOrderBubble.css'

// Kesken oleva tilaus: kuljetushinnasta sovitaan, ravintolan tila tai kuljettajan
// toimitus vielä kesken (ravintola voi merkitä tilauksen luovutetuksi ennen kuin
// kuljettaja on perillä).
const IN_PROGRESS_FILTER =
  'status.in.(awaiting_courier,pending,confirmed,preparing,ready),courier_status.in.(assigned,at_restaurant,picked_up)'

// ── Ilmoitukset muutoksista, joita asiakas ei itse tehnyt ────────────────────
// Ravintola perui tilauksen tai kuljettaja luopui keikasta (migraatio 0045).
// Kukin tapahtuma näytetään kerran: kuitatut tallennetaan selaimeen.
const SEEN_NOTICES_KEY = 'delivo-order-notices-seen'
// Peruutus ilmoitetaan myös, jos asiakas avaa sivun vasta myöhemmin.
const CANCELLED_LOOKBACK_MS = 6 * 60 * 60_000
const RELEASE_NOTICE_MS = 10 * 60_000

function loadSeenNotices() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_NOTICES_KEY)) ?? []
  } catch {
    return []
  }
}

function markNoticeSeen(key) {
  try {
    const seen = loadSeenNotices().filter((item) => item !== key)
    localStorage.setItem(SEEN_NOTICES_KEY, JSON.stringify([key, ...seen].slice(0, 50)))
  } catch {
    // Ei tallennustilaa - ilmoitus voi näkyä uudelleen seuraavalla latauksella.
  }
}

function noticeForOrder(row) {
  if (!row?.id) return null
  // Oman peruutuksen asiakas tietää jo.
  if (row.status === 'cancelled' && row.cancel_reason === 'customer_cancelled') return null
  if (row.status === 'cancelled') return { key: `cancelled:${row.id}`, kind: 'cancelled', order: row }
  const releasedAt = row.courier_released_at ? Date.parse(row.courier_released_at) : NaN
  if (!row.courier_id && Date.now() - releasedAt < RELEASE_NOTICE_MS && isOrderInProgress(row)) {
    return { key: `released:${row.id}:${row.courier_released_at}`, kind: 'released', order: row }
  }
  return null
}

export const OPEN_TRACKING_EVENT = 'bidrop:open-order-tracking'

function minutesLeft(order, now) {
  const arrival = estimatedArrivalAt(order)
  if (!arrival) return null
  return Math.max(Math.ceil((arrival.getTime() - now) / 60_000), 0)
}

function ActiveOrderBubble() {
  const { session, isAuthenticated } = useAuth()
  const location = useLocation()
  const [dbOrder, setDbOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [notice, setNotice] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  // Minuutit ja simuloidun tilauksen tila päivittyvät ilman sivun latausta.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !session) {
      setDbOrder(null)
      return
    }
    let cancelled = false

    function fetchActiveOrder() {
      supabase
        .from('orders')
        .select(
          'id, order_number, status, delivery_method, created_at, placed_at, estimated_ready_at, delivery_lat, delivery_lng, delivery_address, total_cents, delivery_fee_cents, service_fee_cents, discount_cents, promo_code, bidding_expires_at, customer_offer_cents, delivery_price_cents, courier_id, courier_status, courier_arrive_by, courier_released_at, delivery_eta, cancel_reason, order_items(*), restaurants(*)',
        )
        .eq('customer_id', session.user.id)
        .or(IN_PROGRESS_FILTER)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (cancelled) return
          setDbOrder(data?.[0] ?? null)
        })
    }

    function showNoticeFor(row) {
      const next = noticeForOrder(row)
      if (next && !loadSeenNotices().includes(next.key)) setNotice(next)
    }

    fetchActiveOrder()

    // Peruutus, joka tapahtui kun asiakas ei ollut sivulla.
    supabase
      .from('orders')
      .select('id, order_number, status, cancel_reason')
      .eq('customer_id', session.user.id)
      .eq('status', 'cancelled')
      .gte('updated_at', new Date(Date.now() - CANCELLED_LOOKBACK_MS).toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) showNoticeFor(data?.[0])
      })

    const channel = supabase
      .channel(`active-order-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${session.user.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') showNoticeFor(payload.new)
          fetchActiveOrder()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, session])

  const order = dbOrder
  // Kuljettajien hintatarjoukset kuplan otsikkoon (migraatio 0058).
  const awaitingCourier = order?.status === 'awaiting_courier'
  const { offeredBids } = useDeliveryNegotiation(awaitingCourier ? order.id : null)
  const hasOrder = Boolean(order)


  // Etusivun oma kello avaa seurannan (kartta ja kuljettajat) tällä
  // tapahtumalla, kun tilaus on käynnissä (käyttäjän pyyntö 9.11.2026).
  useEffect(() => {
    if (!hasOrder) return undefined
    const open = () => setShowModal(true)
    window.addEventListener(OPEN_TRACKING_EVENT, open)
    return () => window.removeEventListener(OPEN_TRACKING_EVENT, open)
  }, [hasOrder])

  const dismissNotice = useCallback(() => {
    if (notice) markNoticeSeen(notice.key)
    setNotice(null)
  }, [notice])

  // Ei näytetä kumppanipuolella (myös dashboardin esikatselu /__preview-dashboard -
  // asiakkaan tilauskupla näkyi siellä ravintolan näkymän päällä), tilausnäkymässä
  // (jo siellä) eikä ostoskorissa/kassalla (siellä on oma seurantanäkymä).
  // Sivuilla, joilla on header, kelluvan pillerin sijaan pelkkä kellonappi
  // (soittokello) headerissa (käyttäjän pyyntö 1.11.2026, Header.jsx #header-order-slot).
  const [headerSlot, setHeaderSlot] = useState(null)
  useEffect(() => {
    setHeaderSlot(document.getElementById('header-order-slot'))
  }, [location.pathname, hasOrder])

  const onPartnerSide =
    location.pathname.startsWith('/kumppani') || location.pathname.startsWith('/__preview-dashboard')
  const noticeElement = notice && !onPartnerSide ? <OrderChangeNotice notice={notice} onClose={dismissNotice} /> : null

  if (
    !order ||
    location.pathname.startsWith('/kumppani') ||
    location.pathname.startsWith('/__preview-dashboard') ||
    location.pathname === '/omat-tilaukset' ||
    location.pathname === '/ostoskori'
  ) {
    return noticeElement
  }

  const minutes = minutesLeft(order, now)
  // Otsikkona arvioitu aika, kun se tiedetään (käyttäjä: oranssi minuuttilaatta
  // pois, tilalle logo) - muuten kehotus seurata.
  const bidCount = offeredBids.length
  const title = awaitingCourier
    ? bidCount > 0
      ? `${bidCount} kuljetustarjous${bidCount === 1 ? '' : 'ta'}`
      : 'Odotetaan kuljettajia'
    : minutes != null && minutes > 0
      ? `${order.delivery_method === 'delivery' ? 'Perillä' : 'Noudettavissa'} n. ${minutes} min`
      : 'Seuraa tilausta'


  if (headerSlot) {
    return (
      <>
        {createPortal(
          <button
            type="button"
            className={`header-order-clock${awaitingCourier && bidCount > 0 ? ' has-bids' : ''}`}
            onClick={() => setShowModal(true)}
            aria-haspopup="dialog"
            aria-label={`${title}. ${order.restaurants?.name ?? 'Tilaus'} · ${customerStatusLabel(order)}. Avaa tilauksen seuranta`}
          >
            <Bell size={18} strokeWidth={2} aria-hidden="true" />
            {/* Kuljetustarjousten määrä, muuten pieni merkki käynnissä olevasta tilauksesta. */}
            {awaitingCourier && bidCount > 0 ? (
              <span className="header-order-clock__badge">{bidCount}</span>
            ) : (
              <span className="header-order-clock__dot" />
            )}
          </button>,
          headerSlot,
        )}
        {showModal && <OrderTrackingModal order={order} onClose={() => setShowModal(false)} />}
        {noticeElement}
      </>
    )
  }

  // Kelluva "Odotetaan kuljettajia" -pilleri poistettu (käyttäjän pyyntö
  // 9.11.2026). Tilausta seurataan headerin kellosta ja Tilaukset-sivulta.
  return (
    <>
      {showModal && <OrderTrackingModal order={order} onClose={() => setShowModal(false)} />}
      {noticeElement}
    </>
  )
}

export default ActiveOrderBubble
