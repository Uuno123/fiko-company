import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SettingsLayout from '../components/SettingsLayout.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { formatPrice } from '../lib/format.js'
import { customerStatusLabel } from '../lib/orderStatus.js'
import { restaurantThumb } from '../lib/brandLogos.js'
import { VEHICLE_LABELS } from '../lib/deliveryBids.js'
import './AuthForm.css'
import './Settings.css'
import './OrderDetail.css'

// Yksittäisen tilauksen oma näkymä (käyttäjän pyyntö 9.11.2026): tilauslistan
// rivi avaa tämän sivun eikä enää laajennu listan sisällä. Ravintola, tila,
// tilauksen tiedot, tuotteet ja hintaerittely.
function formatDateTime(value) {
  const d = new Date(value)
  const date = d.toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
  return `${date.charAt(0).toUpperCase()}${date.slice(1)} klo ${time}`
}

// Kevytyrittäjä laskuttaa laskutuspalvelun kautta ilman omaa Y-tunnusta.
const BILLING_LABELS = { ukko: 'UKKO.fi-laskutuspalvelu', eezy: 'Eezy-laskutuspalvelu' }

function lineTotal(line) {
  return (line.unit_price_cents ?? line.price_cents) * line.quantity
}

export default function OrderDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('loading')
  // Kuljettaja = tilauksen hyväksytty kuljetustarjous (migraatio 0058).
  const [courier, setCourier] = useState(null)
  // Koko nimi ja Y-tunnus (migraatio 0067, order_courier_details).
  const [courierInfo, setCourierInfo] = useState(null)

  useEffect(() => {
    if (!session) return undefined
    let cancelled = false
    supabase
      .from('orders')
      .select('*, order_items(*), restaurants(name, image_url)')
      .eq('id', id)
      .eq('customer_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setStatus(error ? 'error' : 'missing')
          return
        }
        setOrder(data)
        setStatus('ready')
      })
    supabase
      .from('delivery_bids')
      .select('courier_name, vehicle, price_cents')
      .eq('order_id', id)
      .eq('status', 'accepted')
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.courier_name) setCourier(data)
      })
    // Ilman migraatiota 0067 virhe ohitetaan ja näytetään tarjouksen nimi.
    supabase.rpc('order_courier_details', { p_order_id: id }).then(({ data, error }) => {
      if (!cancelled && !error && data) setCourierInfo(data)
    })
    return () => {
      cancelled = true
    }
  }, [id, session])

  const restaurantName = order?.restaurants?.name ?? 'Ravintola'
  const thumb = order ? restaurantThumb(order.restaurants?.name, order.restaurants?.image_url) : null
  const items = order?.order_items ?? []
  const subtotal = items.reduce((sum, line) => sum + lineTotal(line), 0)
  const isDelivery = order?.delivery_method === 'delivery'
  // Sovittu kuljetushinta: tilaukselle tallennettu hinta, muuten hyväksytty tarjous.
  const deliveryPrice = order?.delivery_price_cents ?? courier?.price_cents ?? null

  return (
    <SettingsLayout title="Tilaus" backTo="/omat-tilaukset">
      {status === 'loading' && <p className="state-message">Ladataan...</p>}
      {status === 'error' && <p className="settings-empty">Tilauksen haku epäonnistui.</p>}
      {status === 'missing' && (
        <div className="settings-empty">
          <p>Tilausta ei löytynyt.</p>
          <Link to="/omat-tilaukset" className="order-detail__link">
            Takaisin tilauksiin
          </Link>
        </div>
      )}

      {status === 'ready' && order && (
        <div className="order-detail">
          <header className="order-detail__hero">
            <span className="order-detail__thumb">
              {thumb ? (
                <img
                  src={thumb.src}
                  alt=""
                  className={thumb.logo ? 'brand-thumb-logo' : undefined}
                  style={thumb.style}
                />
              ) : (
                <RestaurantAvatarPlaceholder name={restaurantName} size="thumb" />
              )}
            </span>
            <div className="order-detail__hero-text">
              <h1>{restaurantName}</h1>
              <p>{formatDateTime(order.created_at)}</p>
              <span className={`past-order__status past-order__status--${order.status}`}>
                {customerStatusLabel(order)}
              </span>
            </div>
          </header>

          {order.status === 'cancelled' && order.cancel_reason && (
            <p className="order-detail__note">Peruutuksen syy: {order.cancel_reason}</p>
          )}

          <section className="order-detail__section">
            <h2>Tilauksen tiedot</h2>
            <dl className="order-detail__facts">
              <div>
                <dt>Tilausnumero</dt>
                <dd>{order.order_number}</dd>
              </div>
              <div>
                <dt>Toimitustapa</dt>
                <dd>{isDelivery ? 'Kotiinkuljetus' : 'Nouto'}</dd>
              </div>
            </dl>
          </section>

          {/* Kuljetuksen tiedot omana osionaan (käyttäjän pyyntö 9.11.2026). */}
          {isDelivery && (
            <section className="order-detail__section">
              <h2>Kuljetus</h2>
              <dl className="order-detail__facts">
                {(courierInfo?.name || courier) && (
                  <div>
                    <dt>Kuljettaja</dt>
                    <dd>{courierInfo?.name ?? courier.courier_name}</dd>
                  </div>
                )}
                {courierInfo?.business_id && (
                  <div>
                    <dt>Y-tunnus</dt>
                    <dd>{courierInfo.business_id}</dd>
                  </div>
                )}
                {!courierInfo?.business_id && BILLING_LABELS[courierInfo?.billing_method] && (
                  <div>
                    <dt>Laskutus</dt>
                    <dd>{BILLING_LABELS[courierInfo.billing_method]}</dd>
                  </div>
                )}
                {courier && VEHICLE_LABELS[courier.vehicle] && (
                  <div>
                    <dt>Kulkuneuvo</dt>
                    <dd>{VEHICLE_LABELS[courier.vehicle]}</dd>
                  </div>
                )}
                {deliveryPrice != null && (
                  <div>
                    <dt>Kuljetuksen hinta</dt>
                    <dd>{formatPrice(deliveryPrice)}</dd>
                  </div>
                )}
                {order.delivery_address && (
                  <div>
                    <dt>Toimitusosoite</dt>
                    <dd>{order.delivery_address}</dd>
                  </div>
                )}
                {!courier && !courierInfo && deliveryPrice == null && (
                  <div>
                    <dt>Kuljettaja</dt>
                    <dd>Ei valittu</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <section className="order-detail__section">
            <h2>Tuotteet</h2>
            <ul className="order-detail__lines">
              {items.map((line) => (
                <li key={line.id}>
                  <span className="order-detail__qty">{line.quantity}×</span>
                  <span className="order-detail__line-main">
                    <span>{line.name}</span>
                    {line.selected_options?.length > 0 && (
                      <small>{line.selected_options.map((o) => o.name).join(', ')}</small>
                    )}
                  </span>
                  <span className="order-detail__price">{formatPrice(lineTotal(line))}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="order-detail__section">
            <dl className="order-detail__sum">
              <div>
                <dt>Välisumma</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              {order.delivery_fee_cents > 0 && (
                <div>
                  <dt>Toimitusmaksu</dt>
                  <dd>{formatPrice(order.delivery_fee_cents)}</dd>
                </div>
              )}
              {order.service_fee_cents > 0 && (
                <div>
                  <dt>Palvelumaksu</dt>
                  <dd>{formatPrice(order.service_fee_cents)}</dd>
                </div>
              )}
              {order.discount_cents > 0 && (
                <div>
                  <dt>Alennus{order.promo_code ? ` (${order.promo_code})` : ''}</dt>
                  <dd>−{formatPrice(order.discount_cents)}</dd>
                </div>
              )}
              <div className="order-detail__total">
                <dt>Yhteensä</dt>
                <dd>{formatPrice(order.total_cents)}</dd>
              </div>
            </dl>
          </section>

          {order.restaurant_id && (
            <Link to={`/ravintola/${order.restaurant_id}`} className="order-detail__cta">
              Siirry ravintolaan
            </Link>
          )}
        </div>
      )}
    </SettingsLayout>
  )
}
