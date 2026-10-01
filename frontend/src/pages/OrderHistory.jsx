import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
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
    day: 'numeric',
    month: 'numeric',
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

function itemCountLabel(order) {
  const count = (order.order_items ?? []).reduce((sum, line) => sum + line.quantity, 0)
  return `${count} ${count === 1 ? 'tuote' : 'tuotetta'}`
}

function PastOrderRow({ order, isOpen, onToggle }) {
  const restaurantName = order.restaurants?.name ?? 'Ravintola'

  return (
    <li className="past-order">
      <button type="button" className="past-order__summary" onClick={onToggle} aria-expanded={isOpen}>
        <span className="past-order__thumb">
          {order.restaurants?.image_url ? (
            <img src={order.restaurants.image_url} alt="" loading="lazy" />
          ) : (
            <RestaurantAvatarPlaceholder name={restaurantName} size="thumb" />
          )}
        </span>
        <span className="past-order__main">
          <span className="past-order__name">{restaurantName}</span>
          <span className="past-order__meta">
            {formatOrderDate(order.created_at)} · {itemCountLabel(order)}
          </span>
        </span>
        <span className="past-order__side">
          <span className="past-order__total">{formatPrice(order.total_cents)}</span>
          <span className={`past-order__status past-order__status--${order.status}`}>
            {orderStatusLabel(order.status, order.delivery_method)}
          </span>
        </span>
        <ChevronDown className="past-order__chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="past-order__details">
          <div className="past-order__facts">
            <span>Tilaus {order.order_number}</span>
            <span>{order.delivery_method === 'delivery' ? 'Kotiinkuljetus' : 'Nouto'}</span>
          </div>
          <OrderLines order={order} />
          <div className="order-history-card__total">
            <span>Yhteensä</span>
            <span>{formatPrice(order.total_cents)}</span>
          </div>
          {order.restaurant_id && (
            <Link to={`/ravintola/${order.restaurant_id}`} className="past-order__link">
              Siirry ravintolaan
            </Link>
          )}
        </div>
      )}
    </li>
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
      .select('*, order_items(*), restaurants(name, lat, lng, image_url)')
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
    <SettingsLayout title="Tilaukset" description="Käynnissä olevat ja aiemmat tilauksesi.">
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
                    <OrderCountdownRing
                      createdAt={order.created_at}
                      arrivalAt={estimatedArrivalAt(order)}
                      deliveryMethod={order.delivery_method}
                    />
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
        <section className="settings-section">
          <div className="settings-section__head">
            <h2>Aiemmat tilaukset</h2>
            <span className="settings-section__count">{pastOrders.length}</span>
          </div>
          <ul className="settings-panel past-orders">
            {pastOrders.map((order) => (
              <PastOrderRow
                key={order.id}
                order={order}
                isOpen={openOrderId === order.id}
                onToggle={() => setOpenOrderId(openOrderId === order.id ? null : order.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </SettingsLayout>
  )
}

export default OrderHistory
