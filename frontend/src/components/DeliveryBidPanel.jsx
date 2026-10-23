import { useEffect, useState } from 'react'
import { Bike, Car, Check, Minus, Plus, Timer, Zap } from 'lucide-react'
import { formatPrice } from '../lib/format.js'
import { DELIVERY_BID, clampBidCents } from '../lib/deliveryTime.js'
import {
  VEHICLE_LABELS,
  acceptBid,
  bidErrorText,
  cancelNegotiation,
  setDeliveryOffer,
  useDeliveryNegotiation,
} from '../lib/deliveryBids.js'
import './DeliveryBidPanel.css'

// Oman tarjouksen säätö 50 sentin askelin (tietokanta pyöristää 10 senttiin).
const OFFER_STEP_CENTS = 50
const DEFAULT_OFFER_CENTS = 399

const VEHICLE_ICONS = { bike: Bike, ebike: Zap, scooter: Bike, car: Car }

function formatKm(km) {
  if (!Number.isFinite(km)) return null
  return km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)} m` : `${km.toFixed(1).replace('.', ',')} km`
}

function useSecondsLeft(expiresAt) {
  const target = expiresAt ? Date.parse(expiresAt) : NaN
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!Number.isFinite(target)) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [target])
  return Number.isFinite(target) ? Math.max(0, Math.ceil((target - now) / 1000)) : null
}

function formatClock(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// Kuljetushinnan sopiminen (käyttäjän malli): lähellä olevat kuljettajat
// tarjoavat hinnan, asiakas hyväksyy yhden tai tarjoaa omaa hintaansa.
// Ravintola saa tilauksen vasta, kun hinnasta on sovittu. Näkyy kassan
// vahvistussivulla ja tilauksen seurannassa.
export default function DeliveryBidPanel({ orderId, onCancelled }) {
  const { order, offeredBids, acceptedBid, loaded, refresh } = useDeliveryNegotiation(orderId)
  const secondsLeft = useSecondsLeft(order?.bidding_expires_at)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (!orderId || !loaded || !order) {
    return (
      <section className="bid-panel bid-panel--loading" aria-busy="true">
        <span className="bid-panel__pulse" aria-hidden="true" />
        Ladataan kuljetustarjouksia…
      </section>
    )
  }

  if (order.status !== 'awaiting_courier') {
    if (order.status === 'cancelled') {
      return (
        <section className="bid-panel bid-panel--done" aria-live="polite">
          <strong>Tilaus peruttiin</strong>
          <p>
            {order.cancel_reason === 'customer_cancelled'
              ? 'Peruit tilauksen ennen kuin kuljetuksesta sovittiin.'
              : 'Kuljetuksesta ei ehditty sopia ajoissa.'}{' '}
            Tilauksesta ei veloiteta mitään.
          </p>
        </section>
      )
    }
    return (
      <section className="bid-panel bid-panel--done bid-panel--agreed" aria-live="polite">
        <span className="bid-panel__done-icon" aria-hidden="true">
          <Check size={20} strokeWidth={2.6} />
        </span>
        <div>
          <strong>
            Sovittu{acceptedBid ? `: ${acceptedBid.courier_name}` : ''} ·{' '}
            {formatPrice(order.delivery_price_cents ?? acceptedBid?.price_cents ?? 0)}
          </strong>
          <p>Ravintola sai tilauksesi. Kuljettaja hakee sen, kun ruoka on valmis.</p>
        </div>
      </section>
    )
  }

  const activeOffer = order.customer_offer_cents
  const cheapest = offeredBids[0]?.price_cents
  const draftCents =
    draft ?? activeOffer ?? (cheapest ? clampBidCents(cheapest - OFFER_STEP_CENTS) : DEFAULT_OFFER_CENTS)
  const expired = secondsLeft === 0

  async function run(key, action) {
    setBusy(key)
    setError('')
    try {
      await action()
      await refresh()
      return true
    } catch (err) {
      setError(bidErrorText(err))
      refresh()
      return false
    } finally {
      setBusy(null)
    }
  }

  function stepDraft(delta) {
    setDraft(clampBidCents(draftCents + delta))
  }

  return (
    <section className="bid-panel" aria-labelledby="bid-panel-title">
      <header className="bid-panel__head">
        <h3 id="bid-panel-title">Kuljettajien tarjoukset</h3>
        {secondsLeft != null && (
          <span className={`bid-panel__timer${secondsLeft < 60 ? ' bid-panel__timer--low' : ''}`}>
            <Timer size={14} strokeWidth={2.2} aria-hidden="true" />
            {expired ? 'Aika päättyi' : formatClock(secondsLeft)}
          </span>
        )}
      </header>

      {offeredBids.length === 0 ? (
        <p className="bid-panel__empty">
          <span className="bid-panel__pulse" aria-hidden="true" />
          Odotetaan tarjouksia lähellä olevilta kuljettajilta…
        </p>
      ) : (
        <ul className="bid-panel__list" aria-live="polite">
          {offeredBids.map((bid) => {
            const Icon = VEHICLE_ICONS[bid.vehicle] ?? Bike
            const distance = formatKm(bid.distance_km)
            return (
              <li key={bid.id} className="bid-card">
                <span className="bid-card__avatar" aria-hidden="true">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="bid-card__info">
                  <strong>{bid.courier_name}</strong>
                  <span>
                    {VEHICLE_LABELS[bid.vehicle] ?? 'Kuljettaja'}
                    {distance ? ` · ${distance} ravintolasta` : ''}
                  </span>
                </span>
                <span className="bid-card__price">{formatPrice(bid.price_cents)}</span>
                <button
                  type="button"
                  className="bid-card__accept"
                  disabled={Boolean(busy) || expired}
                  onClick={() => run(bid.id, () => acceptBid(bid.id))}
                  aria-label={`Hyväksy ${bid.courier_name}, ${formatPrice(bid.price_cents)}`}
                >
                  {busy === bid.id ? <span className="bid-panel__spinner" aria-hidden="true" /> : 'Hyväksy'}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="bid-panel__offer">
        <div className="bid-panel__offer-text">
          <strong>{activeOffer ? 'Oma tarjouksesi' : 'Tarjoa omaa hintaa'}</strong>
          <span>
            {activeOffer
              ? `${formatPrice(activeOffer)} näkyy kuljettajille. Ensimmäinen sen hyväksyvä valitaan heti.`
              : 'Kuljettaja, joka hyväksyy hintasi, valitaan heti.'}
          </span>
        </div>
        <div className="bid-panel__offer-controls">
          <div className="bid-stepper">
            <button
              type="button"
              onClick={() => stepDraft(-OFFER_STEP_CENTS)}
              disabled={draftCents <= DELIVERY_BID.minCents || expired}
              aria-label="Pienennä hintaa"
            >
              <Minus size={16} strokeWidth={2.4} />
            </button>
            <output aria-live="polite">{formatPrice(draftCents)}</output>
            <button
              type="button"
              onClick={() => stepDraft(OFFER_STEP_CENTS)}
              disabled={draftCents >= DELIVERY_BID.maxCents || expired}
              aria-label="Suurenna hintaa"
            >
              <Plus size={16} strokeWidth={2.4} />
            </button>
          </div>
          <button
            type="button"
            className="bid-panel__offer-btn"
            disabled={Boolean(busy) || expired || draftCents === activeOffer}
            onClick={() => run('offer', () => setDeliveryOffer(orderId, draftCents)).then((ok) => ok && setDraft(null))}
          >
            {busy === 'offer' ? <span className="bid-panel__spinner" aria-hidden="true" /> : activeOffer ? 'Päivitä' : 'Tarjoa'}
          </button>
        </div>
        {activeOffer != null && (
          <button
            type="button"
            className="bid-panel__link"
            disabled={Boolean(busy)}
            onClick={() => run('offer', () => setDeliveryOffer(orderId, null))}
          >
            Poista oma tarjous
          </button>
        )}
      </div>

      {error && (
        <p className="bid-panel__error" role="alert">
          {error}
        </p>
      )}

      <p className="bid-panel__note">
        Ravintola saa tilauksen, kun hinnasta on sovittu.
      </p>

      {confirmCancel ? (
        <div className="bid-panel__confirm" role="group" aria-label="Vahvista peruutus">
          <span>Perutaanko tilaus?</span>
          <button type="button" className="bid-panel__link" onClick={() => setConfirmCancel(false)}>
            Ei
          </button>
          <button
            type="button"
            className="bid-panel__cancel-yes"
            disabled={Boolean(busy)}
            onClick={() =>
              run('cancel', async () => {
                await cancelNegotiation(orderId)
                onCancelled?.()
              })
            }
          >
            Kyllä, peru
          </button>
        </div>
      ) : (
        <button type="button" className="bid-panel__link bid-panel__cancel" onClick={() => setConfirmCancel(true)}>
          Peru tilaus
        </button>
      )}
    </section>
  )
}
