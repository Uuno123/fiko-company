import { Link } from 'react-router-dom'
import DeliveryRouteMap from './DeliveryRouteMap.jsx'
import OrderCountdownRing from './OrderCountdownRing.jsx'
import { formatPrice } from '../lib/format.js'
import { orderStatusLabel, estimatedArrivalAt, trackingMessage } from '../lib/orderStatus.js'
import '../pages/Settings.css'
import './OrderTrackingModal.css'

function formatEta(value) {
  return new Date(value).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

function OrderTrackingModal({ order, onClose }) {
  return (
    <div className="order-tracking-modal__backdrop" onClick={onClose}>
      <div className="order-tracking-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="order-tracking-modal__close" aria-label="Sulje" onClick={onClose}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div className="order-tracking-modal__header">
          <h2>{order.restaurants?.name ?? 'Ravintola'}</h2>
          <span className="order-history-card__meta">{order.order_number}</span>
          <span className={`order-status-badge order-status-badge--${order.status}`}>
            {orderStatusLabel(order.status, order.delivery_method)}
          </span>
        </div>

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

        <div className="order-history-card__total">
          <span>Yhteensä</span>
          <span>{formatPrice(order.total_cents)}</span>
        </div>

        <Link to="/omat-tilaukset" className="order-tracking-modal__all-link" onClick={onClose}>
          Kaikki tilaukset
        </Link>
      </div>
    </div>
  )
}

export default OrderTrackingModal
