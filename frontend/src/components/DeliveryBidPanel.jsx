import { useEffect, useState } from 'react'
import { Check, ChevronRight, Minus, Plus, Timer, X } from 'lucide-react'
import { CourierAvatar } from './CourierAvatar.jsx'
import { ScoreSmiley } from './Smiley.jsx'
import CourierProfileSheet from './CourierProfileSheet.jsx'
import { formatPrice } from '../lib/format.js'
import { DELIVERY_BID, bidInputText, clampBidCents, isBidInRange, parseBidInput } from '../lib/deliveryTime.js'
import { formatScore } from '../lib/score.js'
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
// illustrated: tilauksen seurannan uusi ulkoasu (11.11.2026): siisti odotusrivi
// ilman kuvitusta (käyttäjän pyyntö) ja oma hinta + Tarjoa samalla rivillä.
// logo: ravintolan logo tutkan keskelle (illustrated-tila, käyttäjän valinta
// 12.11.2026 "Tutka keskellä").
export default function DeliveryBidPanel({ orderId, onCancelled, illustrated = false, logo = null }) {
  const { order, offeredBids, acceptedBid, loaded, refresh } = useDeliveryNegotiation(orderId)
  const secondsLeft = useSecondsLeft(order?.bidding_expires_at)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  // Oma hinta kirjoitettuna ("3,76"), null = ei muokattu (näytetään nykyinen tai ehdotus).
  const [draftText, setDraftText] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  // Tarjous, jonka kuljettajan profiili on auki (napautus kortista).
  const [profileBid, setProfileBid] = useState(null)
  // Oma hinta piilossa linkin takana tutkanäkymässä, kunnes asiakas avaa sen.
  const [offerOpen, setOfferOpen] = useState(false)

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
  // Tarkan summan voi kirjoittaa (esim. 3,76 €), +/- säätää 50 senttiä.
  // Kelvollinen vain haarukassa 1,99–7,99 €; kentästä poistuttaessa rajataan siihen.
  const suggestedCents = activeOffer ?? (cheapest ? clampBidCents(cheapest - OFFER_STEP_CENTS) : DEFAULT_OFFER_CENTS)
  const draftValue = draftText ?? bidInputText(suggestedCents)
  const parsedCents = parseBidInput(draftValue)
  const draftCents = isBidInRange(parsedCents) ? parsedCents : null
  const baseCents = clampBidCents(parsedCents ?? suggestedCents)
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
    setDraftText(bidInputText(clampBidCents(baseCents + delta)))
  }

  return (
    <section className={`bid-panel${illustrated ? ' bid-panel--fresh' : ''}`} aria-labelledby="bid-panel-title">
      {illustrated ? (
        // Tutka: ravintolan logo keskellä, sen ympärillä sykkivät renkaat.
        <header className={`bid-radar${offeredBids.length > 0 ? ' bid-radar--compact' : ''}`}>
          <div className="bid-radar__pulse" aria-hidden="true">
            <span />
            <span />
            <span />
            <div className="bid-radar__logo">{logo}</div>
          </div>
          <h3 id="bid-panel-title" className="bid-radar__title">
            {offeredBids.length > 0 ? 'Valitse kuljettaja' : 'Etsitään kuljettajaa'}
          </h3>
          <p className="bid-radar__sub">
            {expired
              ? 'Tarjousaika päättyi'
              : secondsLeft != null
                ? `Tarjouksia vielä ${formatClock(secondsLeft)}`
                : 'Tarjouksia tulossa'}
          </p>
        </header>
      ) : (
      <header className="bid-panel__head">
        <h3 id="bid-panel-title">Kuljettajien tarjoukset</h3>
        {secondsLeft != null && (
          <span className={`bid-panel__timer${secondsLeft < 60 ? ' bid-panel__timer--low' : ''}`}>
            <Timer size={14} strokeWidth={2.2} aria-hidden="true" />
            {expired ? 'Aika päättyi' : formatClock(secondsLeft)}
          </span>
        )}
      </header>
      )}

      {offeredBids.length === 0 && illustrated ? (
        <p className="bid-radar__hint">Lähellä olevien kuljettajien tarjoukset ilmestyvät tähän.</p>
      ) : offeredBids.length === 0 ? (
        <p className="bid-panel__empty">
          <span className="bid-panel__pulse" aria-hidden="true" />
          Odotetaan tarjouksia lähellä olevilta kuljettajilta…
        </p>
      ) : (
        <ul className="bid-panel__list" aria-live="polite">
          {offeredBids.map((bid, index) => {
            const distance = formatKm(bid.distance_km)
            // Edullisin tarjous merkitään, kun valittavaa on useampi (lista on hinnan mukaan).
            const cheapest = index === 0 && offeredBids.length > 1
            const reviewCount = bid.courier_review_count ?? 0
            return (
              <li key={bid.id} className={`bid-card${cheapest ? ' bid-card--cheapest' : ''}`}>
                {/* Kuva, nimi ja tähdet: napautus avaa kuljettajan koko profiilin. */}
                <button
                  type="button"
                  className="bid-card__courier"
                  onClick={() => setProfileBid(bid)}
                  aria-label={`Näytä kuljettajan ${bid.courier_name} profiili`}
                >
                  <CourierAvatar name={bid.courier_name} photoPath={bid.courier_photo_path} vehicle={bid.vehicle} />
                  <span className="bid-card__info">
                    <strong>
                      {bid.courier_name}
                      <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" />
                    </strong>
                    {reviewCount > 0 && bid.courier_rating != null ? (
                      <span className="bid-card__rating">
                        <ScoreSmiley rating={bid.courier_rating} size={15} />
                        <b>{formatScore(bid.courier_rating)}</b> · {reviewCount}{' '}
                        {reviewCount === 1 ? 'arvio' : 'arviota'}
                      </span>
                    ) : (
                      <span className="bid-card__new">Uusi kuljettaja</span>
                    )}
                    <span>
                      {VEHICLE_LABELS[bid.vehicle] ?? 'Kuljettaja'}
                      {distance ? ` · ${distance} ravintolasta` : ''}
                    </span>
                  </span>
                </button>
                <span className="bid-card__price">
                  {cheapest && <small className="bid-card__tag">Edullisin</small>}
                  {formatPrice(bid.price_cents)}
                </span>
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

      {profileBid && (
        <CourierProfileSheet
          bid={profileBid}
          distance={formatKm(profileBid.distance_km)}
          disabled={Boolean(busy) || expired || !offeredBids.some((bid) => bid.id === profileBid.id)}
          onAccept={(bid) => {
            setProfileBid(null)
            run(bid.id, () => acceptBid(bid.id))
          }}
          onClose={() => setProfileBid(null)}
        />
      )}

      {illustrated && !offerOpen && activeOffer == null ? (
        <button type="button" className="bid-radar__offer-link" onClick={() => setOfferOpen(true)}>
          Tarjoa omaa hintaa
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      ) : (
      <div className={`bid-panel__offer${illustrated ? ' bid-offer-apple' : ''}`}>
        <div className="bid-panel__offer-text">
          <span className="bid-panel__offer-head">
            <strong>{activeOffer ? 'Oma tarjouksesi' : illustrated ? 'Mitä maksaisit kuljetuksesta?' : 'Kirjoita oma hintasi'}</strong>
            {/* Avatun oman hinnan voi sulkea takaisin linkiksi (käyttäjän pyyntö 12.11.2026). */}
            {illustrated && offerOpen && activeOffer == null && (
              <button
                type="button"
                className="bid-panel__offer-close"
                aria-label="Sulje oma hinta"
                onClick={() => {
                  setOfferOpen(false)
                  setDraftText(null)
                }}
              >
                <X size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            )}
          </span>
          {illustrated ? null : (
            <span>
              {activeOffer
                ? `${formatPrice(activeOffer)} näkyy kuljettajille. Ensimmäinen sen hyväksyvä valitaan heti.`
                : 'Kuljettaja, joka hyväksyy hintasi, valitaan heti.'}{' '}
              Kirjoita tarkka summa {formatPrice(DELIVERY_BID.minCents)}–{formatPrice(DELIVERY_BID.maxCents)}.
            </span>
          )}
        </div>
        <div className="bid-panel__offer-controls">
          <div className="bid-stepper">
            <button
              type="button"
              onClick={() => stepDraft(-OFFER_STEP_CENTS)}
              disabled={baseCents <= DELIVERY_BID.minCents || expired}
              aria-label="Pienennä hintaa"
            >
              <Minus size={16} strokeWidth={2.4} />
            </button>
            <label className={`bid-stepper__value${draftCents == null ? ' is-invalid' : ''}`}>
              <input
                type="text"
                inputMode="decimal"
                value={draftValue}
                maxLength={5}
                disabled={expired}
                aria-label="Oma hintasi euroina"
                aria-invalid={draftCents == null}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setDraftText(e.target.value.replace(/[^\d,.]/g, '').slice(0, 5))}
                onBlur={() => setDraftText(bidInputText(baseCents))}
              />
              <span aria-hidden="true">€</span>
            </label>
            <button
              type="button"
              onClick={() => stepDraft(OFFER_STEP_CENTS)}
              disabled={baseCents >= DELIVERY_BID.maxCents || expired}
              aria-label="Suurenna hintaa"
            >
              <Plus size={16} strokeWidth={2.4} />
            </button>
          </div>
          {illustrated && (
            // Vedettävä oranssi palkki hinnan valintaan (käyttäjän pyyntö 12.11.2026).
            <span className="bid-offer-apple__range">
              <small>{formatPrice(DELIVERY_BID.minCents)}</small>
              <input
                type="range"
                className="bid-offer-apple__slider"
                min={DELIVERY_BID.minCents}
                max={DELIVERY_BID.maxCents}
                step={10}
                value={baseCents}
                disabled={expired}
                aria-label="Vedä hintaa"
                style={{
                  '--pct': `${((baseCents - DELIVERY_BID.minCents) / (DELIVERY_BID.maxCents - DELIVERY_BID.minCents)) * 100}%`,
                }}
                onChange={(e) => setDraftText(bidInputText(clampBidCents(Number(e.target.value))))}
              />
              <small>{formatPrice(DELIVERY_BID.maxCents)}</small>
            </span>
          )}
          <button
            type="button"
            className="bid-panel__offer-btn"
            disabled={Boolean(busy) || expired || draftCents == null || draftCents === activeOffer}
            onClick={() => run('offer', () => setDeliveryOffer(orderId, draftCents)).then((ok) => ok && setDraftText(null))}
          >
            {busy === 'offer' ? (
              <span className="bid-panel__spinner" aria-hidden="true" />
            ) : (
              <>
                {activeOffer ? 'Päivitä' : 'Tarjoa'}
                {illustrated && draftCents != null ? ` ${formatPrice(draftCents)}` : ''}
              </>
            )}
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

      )}

      {error && (
        <p className="bid-panel__error" role="alert">
          {error}
        </p>
      )}

      <p className="bid-panel__note">Ravintola saa tilauksen, kun hinnasta on sovittu.</p>

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
