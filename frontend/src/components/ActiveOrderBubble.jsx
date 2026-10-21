import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Minus } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { customerStatusLabel, estimatedArrivalAt, isOrderInProgress } from '../lib/orderStatus.js'
import { SIGNED_OUT_EVENT } from '../lib/signOutCleanup.js'
import OrderChangeNotice from './OrderChangeNotice.jsx'
import OrderTrackingModal from './OrderTrackingModal.jsx'
import './ActiveOrderBubble.css'

// Kesken oleva tilaus: ravintolan tila tai kuljettajan toimitus vielä kesken
// (ravintola voi merkitä tilauksen luovutetuksi ennen kuin kuljettaja on perillä).
const IN_PROGRESS_FILTER =
  'status.in.(pending,confirmed,preparing,ready),courier_status.in.(assigned,at_restaurant,picked_up)'

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
  if (row.status === 'cancelled') return { key: `cancelled:${row.id}`, kind: 'cancelled', order: row }
  const releasedAt = row.courier_released_at ? Date.parse(row.courier_released_at) : NaN
  if (!row.courier_id && Date.now() - releasedAt < RELEASE_NOTICE_MS && isOrderInProgress(row)) {
    return { key: `released:${row.id}:${row.courier_released_at}`, kind: 'released', order: row }
  }
  return null
}

function minutesLeft(order, now) {
  const arrival = estimatedArrivalAt(order)
  if (!arrival) return null
  return Math.max(Math.ceil((arrival.getTime() - now) / 60_000), 0)
}

// ── Raahaus (käyttäjän pyyntö: pitkä painallus ja sitten liikuttaminen) ─────
// Pitkä painallus nostaa kuplan, minkä jälkeen sitä voi raahata. Puhelimella
// (koko levyinen palkki) liike on vain pystysuunnassa, työpöydällä vapaa.
// Paikka muistetaan selaimessa erikseen kummallekin asettelulle.
const LONG_PRESS_MS = 350
const MOVE_TOLERANCE_PX = 8
const EDGE_MARGIN_PX = 8
const POSITION_KEY = 'delivo-order-bubble-position'
// Sama raja kuin ActiveOrderBubble.css:n palkkiasettelulla.
const BAR_QUERY = '(max-width: 560px)'

function loadPosition() {
  try {
    return JSON.parse(localStorage.getItem(POSITION_KEY)) ?? {}
  } catch {
    return {}
  }
}

function savePosition(position) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position))
  } catch {
    // Ei tallennustilaa - paikka pätee vain tämän sivulatauksen ajan.
  }
}

// Pienennetty tila (käyttäjän pyyntö: kuplan voi pienentää laatikoksi) muistetaan
// sivulta toiselle.
const MINIMIZED_KEY = 'delivo-order-bubble-minimized'

function loadMinimized() {
  try {
    return localStorage.getItem(MINIMIZED_KEY) === '1'
  } catch {
    return false
  }
}

function saveMinimized(minimized) {
  try {
    if (minimized) localStorage.setItem(MINIMIZED_KEY, '1')
    else localStorage.removeItem(MINIMIZED_KEY)
  } catch {
    // Ei tallennustilaa - tila pätee vain tämän sivulatauksen ajan.
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function useBarLayout() {
  const [bar, setBar] = useState(() => window.matchMedia(BAR_QUERY).matches)
  useEffect(() => {
    const mql = window.matchMedia(BAR_QUERY)
    const update = (event) => setBar(event.matches)
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  return bar
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
          'id, order_number, status, delivery_method, created_at, estimated_ready_at, delivery_lat, delivery_lng, delivery_address, total_cents, courier_id, courier_status, courier_arrive_by, courier_released_at, delivery_eta, cancel_reason, order_items(*), restaurants(name, lat, lng, address)',
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

  const barLayout = useBarLayout()
  const layoutKey = barLayout ? 'bar' : 'float'
  const bubbleRef = useRef(null)
  const pressRef = useRef(null)
  // Raahauksen jälkeen selain laukaisee vielä click-tapahtuman - se ei saa avata seurantaa.
  const suppressClickRef = useRef(false)
  const [position, setPosition] = useState(loadPosition)
  const [dragging, setDragging] = useState(false)
  const [minimized, setMinimized] = useState(loadMinimized)

  // Uloskirjautuessa (lib/signOutCleanup.js) paikka ja pienennys nollautuvat
  // myös muistista, ettei seuraava kirjautuja saa edellisen asetuksia.
  useEffect(() => {
    function onSignedOut() {
      setPosition({})
      setMinimized(false)
    }
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut)
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut)
  }, [])
  const hasOrder = Boolean(order)

  const dismissNotice = useCallback(() => {
    if (notice) markNoticeSeen(notice.key)
    setNotice(null)
  }, [notice])

  // Tallennettu paikka pysyy näytön sisällä myös ikkunan koon muuttuessa
  // (esim. puhelimen kääntö tai pienempi selainikkuna).
  useEffect(() => {
    if (!hasOrder) return undefined
    function keepInside() {
      const el = bubbleRef.current
      if (!el) return
      const { width, height } = el.getBoundingClientRect()
      setPosition((current) => {
        const saved = current[layoutKey]
        if (!saved) return current
        const y = clamp(saved.y, EDGE_MARGIN_PX, window.innerHeight - height - EDGE_MARGIN_PX)
        const x = saved.x == null ? null : clamp(saved.x, EDGE_MARGIN_PX, window.innerWidth - width - EDGE_MARGIN_PX)
        if (y === saved.y && (x == null || x === saved.x)) return current
        return { ...current, [layoutKey]: x == null ? { y } : { x, y } }
      })
    }
    keepInside()
    window.addEventListener('resize', keepInside)
    return () => window.removeEventListener('resize', keepInside)
  }, [hasOrder, layoutKey, minimized])

  // Ei näytetä kumppanipuolella (myös dashboardin esikatselu /__preview-dashboard -
  // asiakkaan tilauskupla näkyi siellä ravintolan näkymän päällä), tilausnäkymässä
  // (jo siellä) eikä ostoskorissa/kassalla (siellä on oma seurantanäkymä).
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
  const timeTile = (
    <span className="active-order-bubble__time" aria-hidden="true">
      {minutes != null && minutes > 0 ? (
        <>
          <strong>{minutes}</strong>
          <span>min</span>
        </>
      ) : (
        <span className="active-order-bubble__dot" />
      )}
    </span>
  )

  const saved = position[layoutKey]
  const positionStyle = saved
    ? barLayout
      ? { top: saved.y, bottom: 'auto' }
      : { left: saved.x, top: saved.y, right: 'auto', bottom: 'auto' }
    : undefined

  function handlePointerDown(e) {
    if (e.button !== 0) return
    suppressClickRef.current = false
    const el = bubbleRef.current
    const rect = el.getBoundingClientRect()
    const press = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      active: false,
    }
    press.timer = setTimeout(() => {
      press.active = true
      suppressClickRef.current = true
      setDragging(true)
      navigator.vibrate?.(12)
      // Osoitin kaapataan vasta nostettaessa: kaappaus heti painalluksessa
      // ohjaisi lyhyen napautuksen click-tapahtuman kääreelle, jolloin
      // sisemmät napit (seuranta, pienennys) eivät reagoisi.
      try {
        el.setPointerCapture(press.id)
      } catch {
        // Osoitinkaappaus ei ole kaikissa selaimissa käytettävissä - raahaus toimii silti.
      }
    }, LONG_PRESS_MS)
    pressRef.current = press
  }

  // Raahauksen aikana sijainti asetetaan suoraan elementille (ei Reactin
  // tilaan joka liikkeellä), jotta liike pysyy sulavana. Tila päivittyy
  // vasta irrotettaessa.
  function handlePointerMove(e) {
    const press = pressRef.current
    if (!press || press.id !== e.pointerId) return
    if (!press.active) {
      // Liike ennen pitkää painallusta: ei raahausta eikä myöskään napautusta.
      if (Math.hypot(e.clientX - press.startX, e.clientY - press.startY) > MOVE_TOLERANCE_PX) {
        clearTimeout(press.timer)
        pressRef.current = null
        suppressClickRef.current = true
      }
      return
    }
    const el = bubbleRef.current
    const { width, height } = el.getBoundingClientRect()
    el.style.top = `${clamp(e.clientY - press.grabY, EDGE_MARGIN_PX, window.innerHeight - height - EDGE_MARGIN_PX)}px`
    el.style.bottom = 'auto'
    if (!barLayout) {
      el.style.left = `${clamp(e.clientX - press.grabX, EDGE_MARGIN_PX, window.innerWidth - width - EDGE_MARGIN_PX)}px`
      el.style.right = 'auto'
    }
  }

  function finishPress(e) {
    const press = pressRef.current
    if (!press || press.id !== e.pointerId) return
    clearTimeout(press.timer)
    pressRef.current = null
    if (!press.active) return
    setDragging(false)
    const el = bubbleRef.current
    // Nostettiin mutta ei liikutettu - paikka ei muuttunut.
    if (!el.style.top) return
    const y = Math.round(parseFloat(el.style.top))
    const next = barLayout ? { y } : { x: Math.round(parseFloat(el.style.left)), y }
    setPosition((current) => {
      const updated = { ...current, [layoutKey]: next }
      savePosition(updated)
      return updated
    })
  }

  // Raahauksen jälkeen selaimen click ei saa avata seurantaa eikä pienentää.
  function guarded(action) {
    return () => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      action()
    }
  }

  function changeMinimized(next) {
    setMinimized(next)
    saveMinimized(next)
  }

  return (
    <>
      <div
        ref={bubbleRef}
        className={`active-order-bubble${dragging ? ' is-dragging' : ''}${minimized ? ' is-minimized' : ''}`}
        style={positionStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPress}
        onPointerCancel={finishPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        {minimized ? (
          // Pienennettynä pelkkä aikalaatta; napautus palauttaa täyden kuplan.
          <button
            type="button"
            className="active-order-bubble__box"
            onClick={guarded(() => changeMinimized(false))}
            aria-label={`Näytä tilauksen seuranta${minutes ? ` (${minutes} min)` : ''}`}
          >
            {timeTile}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="active-order-bubble__main"
              onClick={guarded(() => setShowModal(true))}
              aria-haspopup="dialog"
            >
              {timeTile}
              <span className="active-order-bubble__text">
                <span className="active-order-bubble__title">Seuraa tilausta</span>
                <span className="active-order-bubble__status">
                  {order.restaurants?.name ?? 'Tilaus'} · {customerStatusLabel(order)}
                </span>
              </span>
            </button>
            <button
              type="button"
              className="active-order-bubble__minimize"
              onClick={guarded(() => changeMinimized(true))}
              aria-label="Pienennä tilauksen seuranta"
            >
              <Minus size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {showModal && <OrderTrackingModal order={order} onClose={() => setShowModal(false)} />}
      {noticeElement}
    </>
  )
}

export default ActiveOrderBubble
