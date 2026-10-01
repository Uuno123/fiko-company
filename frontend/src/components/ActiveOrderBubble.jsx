import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronUp } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { orderStatusLabel, estimatedArrivalAt } from '../lib/orderStatus.js'
import { loadDemoOrder } from '../lib/demoOrder.js'
import OrderTrackingModal from './OrderTrackingModal.jsx'
import './ActiveOrderBubble.css'

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

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
          'id, order_number, status, delivery_method, created_at, estimated_ready_at, delivery_lat, delivery_lng, delivery_address, total_cents, order_items(*), restaurants(name, lat, lng, address)',
        )
        .eq('customer_id', session.user.id)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (cancelled) return
          setDbOrder(data?.[0] ?? null)
        })
    }

    fetchActiveOrder()

    const channel = supabase
      .channel(`active-order-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${session.user.id}` },
        () => fetchActiveOrder(),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, session])

  // Luetaan joka renderöinnillä (sivunvaihto tai 30 s tikitys): simuloitu
  // tilaus tallentuu kassalla, ja tila etenee ajan mukana.
  const demoOrder = isAuthenticated && session ? loadDemoOrder(session.user.id, now) : null
  const activeDemo = demoOrder && ACTIVE_STATUSES.includes(demoOrder.status) ? demoOrder : null
  const order =
    dbOrder && activeDemo
      ? Date.parse(activeDemo.created_at) > Date.parse(dbOrder.created_at)
        ? activeDemo
        : dbOrder
      : (dbOrder ?? activeDemo)

  // Ei näytetä kumppanipuolella, tilausnäkymässä (jo siellä) eikä ostoskorissa/kassalla
  // (siellä on jo oma seurantanäkymä tilauksen jälkeen).
  if (
    !order ||
    location.pathname.startsWith('/kumppani') ||
    location.pathname === '/omat-tilaukset' ||
    location.pathname === '/ostoskori'
  ) {
    return null
  }

  const minutes = minutesLeft(order, now)

  return (
    <>
      <button
        type="button"
        className="active-order-bubble"
        onClick={() => setShowModal(true)}
        aria-haspopup="dialog"
      >
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
        <span className="active-order-bubble__text">
          <span className="active-order-bubble__title">Seuraa tilausta</span>
          <span className="active-order-bubble__status">
            {order.restaurants?.name ?? 'Tilaus'} · {orderStatusLabel(order.status, order.delivery_method)}
          </span>
        </span>
        <ChevronUp className="active-order-bubble__chevron" size={18} strokeWidth={2} aria-hidden="true" />
      </button>

      {showModal && <OrderTrackingModal order={order} onClose={() => setShowModal(false)} />}
    </>
  )
}

export default ActiveOrderBubble
