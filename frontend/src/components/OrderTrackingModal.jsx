import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, MessageCircle, Receipt } from 'lucide-react'
import DeliveryBidPanel from './DeliveryBidPanel.jsx'
import DeliveryRouteMap from './DeliveryRouteMap.jsx'
import OrderCountdownRing from './OrderCountdownRing.jsx'
import { formatPrice } from '../lib/format.js'
import {
  ORDER_STATUS_FLOW,
  customerStatusLabel,
  estimatedArrivalAt,
  isOrderInProgress,
  trackingHeadline,
  trackingMessage,
} from '../lib/orderStatus.js'
import { courierHasFood, useCourierPosition } from '../lib/courierTracking.js'
import '../pages/Settings.css'
import './OrderTrackingModal.css'

function formatEta(value) {
  return new Date(value).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

// Asiakkaalle näytettävät vaiheet. "completed" ei ole oma palkkinsa, vaan se
// täyttää kaikki - tilaus on silloin ohi eikä edistymistä ole enää jäljellä.
const TRACKED_STEPS = ORDER_STATUS_FLOW.slice(0, 4)

// Seurantanäkymä Woltin mallin mukaan: kartta yläosassa, sen reunan päälle
// nouseva iso aikalaskuri, sivuilla tuki- ja kuittinapit, alla tila. Tilauksen
// tiedot ovat kuittinapin (tai "Tilauksen tiedot" -rivin) takana.
//
// Sama näkymä sekä heti tilauksen jälkeen (variant="page", Cart.jsx) että
// aktiivisen tilauksen kuplasta avattuna (modaali alla).
export function OrderTrackingView({ order, onClose, variant = 'modal', children }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const arrivalAt = estimatedArrivalAt(order)
  const showRing = Boolean(arrivalAt) && order.status !== 'cancelled' && isOrderInProgress(order)
  const isDelivery = order.delivery_method === 'delivery'
  // Kuljettajan nouto ja ravintolan luovutusmerkintä täyttävät viimeisen vaiheen.
  const stepIndex =
    order.status === 'completed' || order.courier_status === 'picked_up' || order.courier_status === 'delivered'
      ? TRACKED_STEPS.length - 1
      : TRACKED_STEPS.indexOf(order.status)
  const courierPosition = useCourierPosition(order)
  const destination = isDelivery ? order.delivery_address : order.restaurants?.address

  return (
    <div className={`tracking tracking--${variant}`}>
      <div className="tracking__map">
        <DeliveryRouteMap
          restaurant={order.restaurants}
          destination={
            isDelivery ? { lat: order.delivery_lat, lng: order.delivery_lng, address: order.delivery_address } : undefined
          }
          pickupOnly={!isDelivery}
          bottomInset={showRing ? 120 : 0}
          showEta={false}
          courier={courierPosition}
          hideRestaurant={courierHasFood(order)}
          // Seurannassa kartta on näkymän pääosa, joten hiiren rulla ja
          // kosketuslevyn nipistys zoomaavat sitä kuten Woltissa.
          gestures="greedy"
        />
        <button type="button" className="tracking__close" aria-label="Sulje" onClick={onClose}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="tracking__sheet">
        <div className="tracking__ring-row">
          <a href="mailto:tuki@bidrop.fi" className="tracking__side-btn" aria-label="Ota yhteyttä asiakastukeen">
            <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
          </a>

          {showRing ? (
            <OrderCountdownRing
              createdAt={order.created_at}
              arrivalAt={arrivalAt}
              deliveryMethod={order.delivery_method}
              size="lg"
            />
          ) : (
            <div className={`tracking__state tracking__state--${order.status}`}>
              {customerStatusLabel(order)}
            </div>
          )}

          <button
            type="button"
            className={`tracking__side-btn${detailsOpen ? ' tracking__side-btn--active' : ''}`}
            aria-label="Tilauksen tiedot"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <Receipt size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <span className="tracking__restaurant">{order.restaurants?.name ?? 'Ravintola'}</span>
        <h2 className="tracking__headline">{trackingHeadline(order)}</h2>
        <p className="tracking__message">{trackingMessage(order)}</p>

        {/* Kotiinkuljetuksen hinnasta sovitaan ennen kuin ravintola saa tilauksen. */}
        {order.status === 'awaiting_courier' && order.id && <DeliveryBidPanel orderId={order.id} />}

        {/* Edistymispalkki kertoo vaiheen yhdellä silmäyksellä. Peruttu tilaus
            ei etene, joten sille palkkia ei näytetä. */}
        {order.status !== 'cancelled' && stepIndex >= 0 && (
          <div
            className="tracking__steps"
            role="img"
            aria-label={`Vaihe ${stepIndex + 1}/${TRACKED_STEPS.length}`}
          >
            {TRACKED_STEPS.map((step, i) => (
              <span
                key={step}
                className={`tracking__step${i <= stepIndex ? ' tracking__step--done' : ''}${
                  i === stepIndex ? ' tracking__step--current' : ''
                }`}
              />
            ))}
          </div>
        )}

        <div className="tracking__details">
          <button
            type="button"
            className="tracking__details-toggle"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <span>
              Tilauksen tiedot
              <span className="tracking__details-meta">
                {order.order_number} · {formatPrice(order.total_cents)}
              </span>
            </span>
            <ChevronDown className="tracking__details-chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>

          {detailsOpen && (
            <div className="tracking__details-body">
              {(arrivalAt || destination) && (
                <dl className="tracking__facts">
                  {arrivalAt && order.status !== 'cancelled' && (
                    <div className="tracking__fact">
                      <dt>{isDelivery ? 'Arvioitu toimitus' : 'Arvioitu nouto'}</dt>
                      <dd>n. {formatEta(arrivalAt)}</dd>
                    </div>
                  )}
                  {destination && (
                    <div className="tracking__fact">
                      <dt>{isDelivery ? 'Toimitusosoite' : 'Noutopaikka'}</dt>
                      <dd>{destination}</dd>
                    </div>
                  )}
                </dl>
              )}

              <ul className="tracking__lines">
                {order.order_items.map((line) => (
                  <li key={line.id}>
                    <span className="tracking__line-qty">{line.quantity}×</span>
                    <span className="tracking__line-name">
                      {line.name}
                      {line.selected_options?.length > 0 && (
                        <span className="tracking__line-options">
                          {line.selected_options.map((o) => o.name).join(', ')}
                        </span>
                      )}
                    </span>
                    <span className="tracking__line-price">
                      {formatPrice((line.unit_price_cents ?? line.price_cents) * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Maksut näkyviin, jotta tuotteet ja yhteissumma täsmäävät. */}
              <div className="tracking__sums">
                {order.status === 'awaiting_courier' && (
                  <div className="tracking__sum">
                    <span>Toimitus</span>
                    <span>sovitaan</span>
                  </div>
                )}
                {order.delivery_fee_cents > 0 && (
                  <div className="tracking__sum">
                    <span>Toimitus</span>
                    <span>{formatPrice(order.delivery_fee_cents)}</span>
                  </div>
                )}
                {order.service_fee_cents > 0 && (
                  <div className="tracking__sum">
                    <span>Palvelumaksu</span>
                    <span>{formatPrice(order.service_fee_cents)}</span>
                  </div>
                )}
                {order.discount_cents > 0 && (
                  <div className="tracking__sum tracking__sum--discount">
                    <span>Alennus{order.promo_code ? ` (${order.promo_code})` : ''}</span>
                    <span>−{formatPrice(order.discount_cents)}</span>
                  </div>
                )}
                <div className="tracking__total">
                  <span>{order.status === 'awaiting_courier' ? 'Yhteensä ilman toimitusta' : 'Yhteensä'}</span>
                  <span>{formatPrice(order.total_cents)}</span>
                </div>
              </div>

              {variant === 'modal' && (
                <Link to="/omat-tilaukset" className="tracking__all-link" onClick={onClose}>
                  Kaikki tilaukset
                  <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}

// Työpöydällä keskitetty modaali, puhelimella koko näytön kokoinen näkymä joka
// liukuu alhaalta ylös (ja sulkiessa takaisin alas) - ks. OrderTrackingModal.css.
function OrderTrackingModal({ order, onClose }) {
  const [closing, setClosing] = useState(false)

  function requestClose() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) onClose()
    else setClosing(true)
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') requestClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`order-tracking-modal__backdrop${closing ? ' order-tracking-modal__backdrop--closing' : ''}`}
      onClick={requestClose}
    >
      <div
        className={`order-tracking-modal${closing ? ' order-tracking-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Tilauksen seuranta"
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) onClose()
        }}
      >
        <OrderTrackingView order={order} onClose={requestClose} />
      </div>
    </div>
  )
}

export default OrderTrackingModal
