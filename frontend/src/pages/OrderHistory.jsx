import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SettingsLayout from '../components/SettingsLayout.jsx'
import DeliveryRouteMap from '../components/DeliveryRouteMap.jsx'
import OrderCountdownRing from '../components/OrderCountdownRing.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { formatPrice } from '../lib/format.js'
import { orderStatusLabel, estimatedArrivalAt, trackingMessage } from '../lib/orderStatus.js'
import './AuthForm.css'
import './Settings.css'

function formatEta(value) {
  return new Date(value).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

function formatOrderDate(value) {
  return new Date(value).toLocaleString('fi-FI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

function OrderLines({ order }) {
  return (
    <ul className="order-history-card__lines">
      {order.order_items.map((line) => (
        <li key={line.id}>
          <span>
            <span>
              {line.quantity} × {line.name}
            </span>
            {line.selected_options?.length > 0 && (
              <span className="order-history-card__options">
                {line.selected_options.map((o) => o.name).join(', ')}
              </span>
            )}
          </span>
          <span>{formatPrice((line.unit_price_cents ?? line.price_cents) * line.quantity)}</span>
        </li>
      ))}
    </ul>
  )
}

function PastOrderRow({ order, isOpen, onToggle }) {
  return (
    <div className="past-order-row">
      <button
        type="button"
        className="past-order-row__summary"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div>
          <strong>{order.restaurants?.name ?? 'Ravintola'}</strong>
          <span className="order-history-card__meta">
            {order.order_number} · {formatOrderDate(order.created_at)}
          </span>
        </div>
        <div className="past-order-row__right">
          <span className={`order-status-badge order-status-badge--${order.status}`}>
            {orderStatusLabel(order.status, order.delivery_method)}
          </span>
          <span className="past-order-row__total">{formatPrice(order.total_cents)}</span>
        </div>
      </button>
      {isOpen && (
        <div className="past-order-row__details">
          <span className={`order-method-badge order-method-badge--${order.delivery_method}`}>
            {order.delivery_method === 'delivery' ? 'Kotiinkuljetus' : 'Nouto'}
          </span>
          <OrderLines order={order} />
          <div className="order-history-card__total">
            <span>Yhteensä</span>
            <span>{formatPrice(order.total_cents)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderHistory() {
  const { session } = useAuth()
  const location = useLocation()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [openOrderId, setOpenOrderId] = useState(location.state?.openOrderId ?? null)

  useEffect(() => {
    if (!session) return
    let cancelled = false

    supabase
      .from('orders')
      .select('*, order_items(*), restaurants(name, lat, lng)')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setStatus('error')
          return
        }
        setOrders(data ?? [])
        setStatus('ready')
      })

    return () => {
      cancelled = true
    }
  }, [session])

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
  const pastOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status))

  return (
    <SettingsLayout>
      {status === 'loading' && (
        <section className="auth-card">
          <p className="state-message">Ladataan...</p>
        </section>
      )}

      {status === 'error' && (
        <section className="auth-card">
          <p className="settings-empty">Tilaushistorian haku epäonnistui.</p>
        </section>
      )}

      {status === 'ready' && orders.length === 0 && (
        <section className="auth-card">
          <div className="settings-empty">
            <p>Ei vielä tilauksia.</p>
            <p className="settings-empty__hint">Tehdyt tilauksesi näkyvät täällä.</p>
          </div>
          <Link to="/" className="auth-submit settings-empty__cta">
            Selaa ravintoloita
          </Link>
        </section>
      )}

      {status === 'ready' &&
        activeOrders.map((order) => {
          const isOpen = openOrderId === order.id
          return (
            <section className="auth-card order-history-card" key={order.id}>
              <button
                type="button"
                className="order-history-card__header order-history-card__header--button"
                onClick={() => setOpenOrderId(isOpen ? null : order.id)}
                aria-expanded={isOpen}
              >
                <div>
                  <h2>{order.restaurants?.name ?? 'Ravintola'}</h2>
                  <span className="order-history-card__meta">
                    {order.order_number} · {formatOrderDate(order.created_at)}
                  </span>
                </div>
                <span className={`order-status-badge order-status-badge--${order.status}`}>
                  {orderStatusLabel(order.status, order.delivery_method)}
                </span>
              </button>

              <span className={`order-method-badge order-method-badge--${order.delivery_method}`}>
                {order.delivery_method === 'delivery' ? 'Kotiinkuljetus' : 'Nouto'}
              </span>

              <OrderLines order={order} />

              <div className="order-history-card__total">
                <span>Yhteensä</span>
                <span>{formatPrice(order.total_cents)}</span>
              </div>

              {isOpen && (
                <div className="order-history-card__tracking">
                  {order.estimated_ready_at && order.status !== 'cancelled' && (
                    <OrderCountdownRing createdAt={order.created_at} arrivalAt={estimatedArrivalAt(order)} />
                  )}
                  <p className="order-history-card__tracking-message">{trackingMessage(order)}</p>
                  {order.estimated_ready_at && (
                    <p className="order-history-card__eta">
                      Arvio: n. {formatEta(estimatedArrivalAt(order))}
                      {order.delivery_method === 'delivery' ? ' (toimitus)' : ' (nouto)'}
                    </p>
                  )}
                  <DeliveryRouteMap
                    restaurant={order.restaurants}
                    destination={
                      order.delivery_method === 'delivery'
                        ? { lat: order.delivery_lat, lng: order.delivery_lng, address: order.delivery_address }
                        : undefined
                    }
                    pickupOnly={order.delivery_method === 'pickup'}
                  />
                </div>
              )}
            </section>
          )
        })}

      {status === 'ready' && pastOrders.length > 0 && (
        <section className="auth-card past-orders-section">
          <h2 className="past-orders-section__title">Vanhat tilaukset</h2>
          <div className="past-orders-section__list">
            {pastOrders.map((order) => (
              <PastOrderRow
                key={order.id}
                order={order}
                isOpen={openOrderId === order.id}
                onToggle={() => setOpenOrderId(openOrderId === order.id ? null : order.id)}
              />
            ))}
          </div>
        </section>
      )}
    </SettingsLayout>
  )
}

export default OrderHistory
