import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import LoginModal from '../components/LoginModal.jsx'
import { useCart } from '../lib/CartContext.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { getRestaurantById } from '../lib/api.js'
import { formatPrice } from '../lib/format.js'
import './Cart.css'

const DELIVERY_FEE_CENTS = 599
const SERVICE_FEE_CENTS = 49
const STEPS = [
  { key: 'review', label: 'Ostoskori' },
  { key: 'details', label: 'Toimitus' },
  { key: 'payment', label: 'Maksutiedot' },
  { key: 'success', label: 'Vahvistus' },
]

const PROMO_CODES = {
  FIKO10: { type: 'percent', value: 10, label: '10 % alennus' },
  TERVETULOA: { type: 'fixed', value: 300, label: '3,00 € alennus' },
}

function formatCardNumber(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function detectCardBrand(number) {
  const digits = number.replace(/\D/g, '')
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  return null
}

function generateOrderNumber() {
  return `FIKO-${Math.floor(1000 + Math.random() * 9000)}`
}

function estimatedReadyTime() {
  return new Date(Date.now() + 25 * 60 * 1000).toLocaleTimeString('fi-FI', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupCount(group) {
  return group.lines.reduce((sum, line) => sum + line.quantity, 0)
}

function groupTotalCents(group) {
  return group.lines.reduce((sum, line) => sum + line.quantity * line.item.price_cents, 0)
}

function PromoCode({ promo, promoInput, setPromoInput, promoError, onApply, onRemove }) {
  return (
    <div className="promo-code">
      {promo ? (
        <div className="promo-code__applied">
          <span>
            🏷️ <strong>{promo.code}</strong> · {promo.label}
          </span>
          <button type="button" onClick={onRemove}>
            Poista
          </button>
        </div>
      ) : (
        <form className="promo-code__form" onSubmit={onApply}>
          <input
            type="text"
            placeholder="Alennuskoodi"
            aria-label="Alennuskoodi"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
          />
          <button type="submit">Käytä</button>
        </form>
      )}
      {promoError && <span className="promo-code__error">{promoError}</span>}
    </div>
  )
}

function Cart() {
  const cart = useCart()
  const { customer, isAuthenticated, status: authStatus } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('review')
  const [headerSearch, setHeaderSearch] = useState('')
  const [activeRestaurantId, setActiveRestaurantId] = useState(null)
  const [delivery, setDelivery] = useState({
    method: 'delivery',
    name: '',
    phone: '',
    address: '',
    postalCode: '',
    notes: '',
  })
  const [detailsErrors, setDetailsErrors] = useState({})
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' })
  const [cvcFocused, setCvcFocused] = useState(false)
  const [errors, setErrors] = useState({})
  const [order, setOrder] = useState(null)
  const [restaurants, setRestaurants] = useState({})
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null)
  const [promoError, setPromoError] = useState('')
  const fetchedRestaurantIds = useRef(new Set())

  const activeGroup = cart.groups.find((g) => g.restaurantId === activeRestaurantId) ?? null

  useEffect(() => {
    if (!customer) return
    setDelivery((d) => ({ ...d, name: d.name || customer.name || '', phone: d.phone || customer.phone || '' }))
    setCard((c) => ({ ...c, name: c.name || customer.name || '' }))
  }, [customer])

  useEffect(() => {
    cart.groups.forEach((group) => {
      if (fetchedRestaurantIds.current.has(group.restaurantId)) return
      fetchedRestaurantIds.current.add(group.restaurantId)
      getRestaurantById(group.restaurantId)
        .then((data) => setRestaurants((r) => ({ ...r, [group.restaurantId]: data })))
        .catch(() => {})
    })
  }, [cart.groups])

  useEffect(() => {
    if ((step === 'details' || step === 'payment') && !activeGroup) setStep('review')
  }, [step, activeGroup])

  const cartItemIds = useMemo(() => new Set(cart.lines.map((line) => line.item.id)), [cart.lines])
  const firstCity = useMemo(() => Object.values(restaurants).find((r) => r?.city)?.city, [restaurants])

  const activeSubtotal = activeGroup ? groupTotalCents(activeGroup) : 0
  const deliveryFee = activeGroup && delivery.method === 'delivery' ? DELIVERY_FEE_CENTS : 0
  const serviceFee = activeGroup ? SERVICE_FEE_CENTS : 0
  const discountCents = promo ? Math.min(promo.discountCents, activeSubtotal) : 0
  const totalWithDelivery = activeSubtotal + deliveryFee + serviceFee - discountCents
  const brand = useMemo(() => detectCardBrand(card.number), [card.number])

  function startCheckout(restaurantId) {
    setActiveRestaurantId(restaurantId)
    setStep('details')
  }

  function resumeCheckout(restaurantId) {
    setCard({ name: customer?.name || '', number: '', expiry: '', cvc: '' })
    setErrors({})
    setPromo(null)
    setPromoInput('')
    setPromoError('')
    setOrder(null)
    startCheckout(restaurantId)
  }

  function applyPromo(e) {
    e.preventDefault()
    const code = promoInput.trim().toUpperCase()
    const found = PROMO_CODES[code]
    if (!found) {
      setPromoError('Koodi ei kelpaa')
      return
    }
    const amount = found.type === 'percent' ? Math.round((activeSubtotal * found.value) / 100) : found.value
    setPromo({ code, label: found.label, discountCents: amount })
    setPromoError('')
  }

  function removePromo() {
    setPromo(null)
    setPromoInput('')
    setPromoError('')
  }

  function updateDelivery(field) {
    return (e) => setDelivery((d) => ({ ...d, [field]: e.target.value }))
  }

  function validateDetails() {
    const next = {}
    if (delivery.name.trim().length < 2) next.name = 'Anna nimesi'
    if (delivery.phone.trim().length < 6) next.phone = 'Anna puhelinnumero'
    if (delivery.method === 'delivery' && delivery.address.trim().length < 4) {
      next.address = 'Anna toimitusosoite'
    }
    setDetailsErrors(next)
    return Object.keys(next).length === 0
  }

  function handleContinueToPayment(e) {
    e.preventDefault()
    if (!validateDetails()) return
    setStep('payment')
  }

  function updateCard(field, formatter) {
    return (e) => setCard((c) => ({ ...c, [field]: formatter ? formatter(e.target.value) : e.target.value }))
  }

  function validate() {
    const next = {}
    if (card.name.trim().length < 2) next.name = 'Anna kortinhaltijan nimi'
    if (card.number.replace(/\s/g, '').length !== 16) next.number = 'Kortin numero on 16 numeroa'
    const [mm, yy] = card.expiry.split('/')
    if (!mm || !yy || yy.length !== 2 || Number(mm) < 1 || Number(mm) > 12) {
      next.expiry = 'Tarkista voimassaoloaika'
    }
    if (card.cvc.length < 3) next.cvc = 'CVC on 3 numeroa'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handlePay(e) {
    e.preventDefault()
    if (!validate() || !activeGroup) return
    setStep('processing')
    const { restaurantId, restaurantName, lines } = activeGroup
    setTimeout(() => {
      setOrder({
        number: generateOrderNumber(),
        readyAt: estimatedReadyTime(),
        totalCents: totalWithDelivery,
        restaurantName,
        lines,
        delivery,
        promo,
      })
      cart.clearRestaurant(restaurantId)
      setActiveRestaurantId(null)
      setStep('success')
    }, 1600)
  }

  const stepIndex = STEPS.findIndex((s) => s.key === (step === 'processing' ? 'payment' : step))
  const remainingGroups = order ? cart.groups : []

  const headerProps = {
    search: {
      value: headerSearch,
      onChange: setHeaderSearch,
      onSubmit: (q) => navigate(`/?q=${encodeURIComponent(q)}`),
      placeholder: 'Hae Fikosta...',
    },
    citySelector: firstCity
      ? {
          value: firstCity,
          options: [firstCity],
          onChange: (city) => navigate(`/?city=${encodeURIComponent(city)}`),
        }
      : null,
  }

  if (authStatus !== 'loading' && !isAuthenticated) {
    return (
      <div className="page">
        <Header {...headerProps} />
        <main className="cart-page" aria-hidden="true">
          <div className="cart-empty">
            <div className="cart-empty__icon">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 6h12l-1 9.5a1 1 0 0 1-1 .9H6a1 1 0 0 1-1-.9L4 6Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path d="M7 6V5a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
            <h1>Ostoskori</h1>
            <p>Kirjaudu sisään nähdäksesi ostoskorisi.</p>
          </div>
        </main>
        <LoginModal
          title="Kirjaudu ostoskoriin"
          message="Sinun täytyy kirjautua sisään ennen kuin voit siirtyä kassalle."
          onClose={() => navigate('/')}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <Header {...headerProps} />

      <main className="cart-page">
        {step !== 'success' && (
          <div className="checkout-steps">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`checkout-steps__item${i === stepIndex ? ' checkout-steps__item--active' : ''}${
                  i < stepIndex ? ' checkout-steps__item--done' : ''
                }`}
              >
                <span className="checkout-steps__dot">{i < stepIndex ? '✓' : i + 1}</span>
                {s.label}
              </div>
            ))}
          </div>
        )}

        {step === 'review' && cart.count === 0 && (
          <div className="cart-empty">
            <div className="cart-empty__icon">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 6h12l-1 9.5a1 1 0 0 1-1 .9H6a1 1 0 0 1-1-.9L4 6Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path d="M7 6V5a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
            <h1>Ostoskorisi on tyhjä</h1>
            <p>Selaa ravintoloita ja lisää herkullisia annoksia koriin.</p>
            <Link to="/" className="cart-empty__cta">
              Selaa ravintoloita
            </Link>
          </div>
        )}

        {step === 'review' && cart.count > 0 && (
          <div className="cart-layout">
            <section className="cart-panel">
              <h1 className="cart-panel__title">Ostoskori</h1>
              {cart.groups.length > 1 && (
                <p className="cart-panel__subtitle">
                  Tuotteita {cart.groups.length} eri ravintolasta. Tilaukset maksetaan ja lähetetään erikseen - valitse
                  kumman tilaat ensin.
                </p>
              )}

              {cart.groups.map((group, groupIndex) => {
                const suggestions = (restaurants[group.restaurantId]?.menu_items ?? [])
                  .filter((item) => !cartItemIds.has(item.id))
                  .slice(0, cart.groups.length > 1 ? 4 : 8)

                return (
                  <div className={`cart-group${groupIndex > 0 ? ' cart-group--divider' : ''}`} key={group.restaurantId}>
                    <div className="cart-group__header">
                      <span className="cart-group__name">{group.restaurantName}</span>
                      <button
                        type="button"
                        className="cart-group__clear"
                        onClick={() => cart.clearRestaurant(group.restaurantId)}
                      >
                        Tyhjennä
                      </button>
                    </div>

                    <ul className="cart-items">
                      {group.lines.map((line) => (
                        <li className="cart-item" key={line.item.id}>
                          <div className="cart-item__media">
                            {line.item.image_url ? (
                              <img src={line.item.image_url} alt={line.item.name} />
                            ) : (
                              <RestaurantAvatarPlaceholder name={line.item.name} size="thumb" />
                            )}
                          </div>

                          <div className="cart-item__info">
                            <span className="cart-item__name">{line.item.name}</span>
                            <span className="cart-item__unit-price">{formatPrice(line.item.price_cents)} / kpl</span>
                          </div>

                          <div className="quantity-stepper quantity-stepper--sm">
                            <button
                              type="button"
                              aria-label={`Vähennä tuotteen ${line.item.name} määrää`}
                              onClick={() => cart.setQuantity(group.restaurantId, line.item.id, line.quantity - 1)}
                            >
                              −
                            </button>
                            <span>{line.quantity}</span>
                            <button
                              type="button"
                              aria-label={`Lisää tuotteen ${line.item.name} määrää`}
                              onClick={() => cart.setQuantity(group.restaurantId, line.item.id, line.quantity + 1)}
                            >
                              +
                            </button>
                          </div>

                          <span className="cart-item__line-total">
                            {formatPrice(line.item.price_cents * line.quantity)}
                          </span>

                          <button
                            type="button"
                            className="cart-item__remove"
                            aria-label={`Poista ${line.item.name} korista`}
                            onClick={() => cart.removeItem(group.restaurantId, line.item.id)}
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path
                                d="m5 5 10 10M15 5 5 15"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>

                    {suggestions.length > 0 && (
                      <div className="cart-suggestions">
                        <h2 className="cart-suggestions__title">Lisää vielä jotain?</h2>
                        <div className="cart-suggestions__row">
                          {suggestions.map((item) => (
                            <div className="suggestion-card" key={item.id}>
                              <div className="suggestion-card__media">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} />
                                ) : (
                                  <RestaurantAvatarPlaceholder name={item.name} size="thumb" />
                                )}
                              </div>
                              <span className="suggestion-card__name">{item.name}</span>
                              <span className="suggestion-card__price">{formatPrice(item.price_cents)}</span>
                              <button
                                type="button"
                                className="suggestion-card__add"
                                aria-label={`Lisää ${item.name} ostoskoriin`}
                                onClick={() =>
                                  cart.addItem({ id: group.restaurantId, name: group.restaurantName }, item, 1)
                                }
                              >
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="cart-group__footer">
                      <span className="cart-group__subtotal">
                        {groupCount(group)} {groupCount(group) === 1 ? 'tuote' : 'tuotetta'} ·{' '}
                        {formatPrice(groupTotalCents(group))}
                      </span>
                      <button type="button" className="cart-group__checkout" onClick={() => startCheckout(group.restaurantId)}>
                        Tilaa tästä ravintolasta
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </section>

            <aside className="order-summary">
              <h2>Ostoskori yhteensä</h2>
              <div className="order-summary__row">
                <span>Tuotteita</span>
                <span>{cart.count} kpl</span>
              </div>
              <div className="order-summary__row order-summary__row--total">
                <span>Välisumma</span>
                <span>{formatPrice(cart.totalCents)}</span>
              </div>
              {cart.groups.length > 1 ? (
                <p className="order-summary__note">
                  Valitse yllä kumman ravintolan tilaat ensin - toimitusmaksu ja palvelumaksu lasketaan per tilaus.
                </p>
              ) : (
                <button
                  type="button"
                  className="order-summary__cta"
                  onClick={() => cart.groups[0] && startCheckout(cart.groups[0].restaurantId)}
                >
                  Jatka toimitustietoihin
                </button>
              )}
              <Link to="/" className="order-summary__back">
                ← Jatka ostoksia
              </Link>
            </aside>
          </div>
        )}

        {step === 'details' && activeGroup && (
          <div className="cart-layout">
            <section className="cart-panel">
              <button type="button" className="cart-panel__back" onClick={() => setStep('review')}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Takaisin ostoskoriin
              </button>
              <h1 className="cart-panel__title">Toimitustiedot</h1>
              <p className="cart-panel__subtitle">Tilaus ravintolasta {activeGroup.restaurantName}.</p>

              <div className="delivery-method">
                <button
                  type="button"
                  className={`delivery-method__option${delivery.method === 'delivery' ? ' delivery-method__option--active' : ''}`}
                  onClick={() => setDelivery((d) => ({ ...d, method: 'delivery' }))}
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M3 6h9l3 4h2v4h-1M3 6v8h1m0 0a2 2 0 1 0 4 0m-4 0h4m6 0a2 2 0 1 0 4 0m-4 0h4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Kotiinkuljetus
                </button>
                <button
                  type="button"
                  className={`delivery-method__option${delivery.method === 'pickup' ? ' delivery-method__option--active' : ''}`}
                  onClick={() => setDelivery((d) => ({ ...d, method: 'pickup' }))}
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Nouto ravintolasta
                </button>
              </div>

              <form className="payment-form" onSubmit={handleContinueToPayment}>
                <div className="payment-field-row">
                  <div className="payment-field">
                    <label htmlFor="delivery-name">Nimi</label>
                    <input
                      id="delivery-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Etunimi Sukunimi"
                      value={delivery.name}
                      onChange={updateDelivery('name')}
                    />
                    {detailsErrors.name && <span className="payment-field__error">{detailsErrors.name}</span>}
                  </div>
                  <div className="payment-field">
                    <label htmlFor="delivery-phone">Puhelin</label>
                    <input
                      id="delivery-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="040 123 4567"
                      value={delivery.phone}
                      onChange={updateDelivery('phone')}
                    />
                    {detailsErrors.phone && <span className="payment-field__error">{detailsErrors.phone}</span>}
                  </div>
                </div>

                {delivery.method === 'delivery' ? (
                  <>
                    <div className="payment-field-row">
                      <div className="payment-field payment-field--wide">
                        <label htmlFor="delivery-address">Osoite</label>
                        <input
                          id="delivery-address"
                          type="text"
                          autoComplete="street-address"
                          placeholder="Katuosoite 12"
                          value={delivery.address}
                          onChange={updateDelivery('address')}
                        />
                        {detailsErrors.address && <span className="payment-field__error">{detailsErrors.address}</span>}
                      </div>
                      <div className="payment-field">
                        <label htmlFor="delivery-postal">Postinumero</label>
                        <input
                          id="delivery-postal"
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          placeholder="00100"
                          value={delivery.postalCode}
                          onChange={updateDelivery('postalCode')}
                        />
                      </div>
                    </div>

                    <div className="payment-field">
                      <label htmlFor="delivery-notes">Ovikoodi / lisätiedot (valinnainen)</label>
                      <input
                        id="delivery-notes"
                        type="text"
                        placeholder="Esim. ovikoodi tai kerros"
                        value={delivery.notes}
                        onChange={updateDelivery('notes')}
                      />
                    </div>

                    <div className="delivery-map">
                      <svg className="delivery-map__grid" viewBox="0 0 360 160" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0 40 H360" />
                        <path d="M0 110 H360" />
                        <path d="M70 0 V160" />
                        <path d="M180 0 V160" />
                        <path d="M280 0 V160" />
                        <path className="delivery-map__route" d="M52 34 C 120 34, 140 90, 210 90 S 280 60, 300 78" />
                      </svg>
                      <span className="delivery-map__store" title={activeGroup.restaurantName}>
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="M3 6h9l3 4h2v4h-1M3 6v8h1m0 0a2 2 0 1 0 4 0m-4 0h4m6 0a2 2 0 1 0 4 0m-4 0h4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="delivery-map__pin">
                        <span className="delivery-map__pin-pulse" />
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                      <span className="delivery-map__eta">n. 25-35 min</span>
                      <span className="delivery-map__label">
                        {delivery.address.trim() ? delivery.address : 'Syötä osoite nähdäksesi arvion'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="pickup-info">
                    <span className="pickup-info__icon">
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <circle cx="10" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <div>
                      <strong>{activeGroup.restaurantName}</strong>
                      <span>Nouto valmiina n. 20 minuutin kuluttua</span>
                    </div>
                  </div>
                )}

                <button type="submit" className="payment-submit">
                  Jatka maksamaan
                </button>
              </form>
            </section>

            <aside className="order-summary">
              <h2>Yhteenveto</h2>
              <p className="order-summary__restaurant">{activeGroup.restaurantName}</p>
              <PromoCode
                promo={promo}
                promoInput={promoInput}
                setPromoInput={setPromoInput}
                promoError={promoError}
                onApply={applyPromo}
                onRemove={removePromo}
              />
              <div className="order-summary__row">
                <span>Välisumma</span>
                <span>{formatPrice(activeSubtotal)}</span>
              </div>
              <div className="order-summary__row">
                <span>Kuljetus</span>
                <span>{delivery.method === 'delivery' ? formatPrice(deliveryFee) : 'Ei toimitusta'}</span>
              </div>
              <div className="order-summary__row">
                <span>Palvelumaksu</span>
                <span>{formatPrice(serviceFee)}</span>
              </div>
              {promo && (
                <div className="order-summary__row order-summary__row--discount">
                  <span>Alennus ({promo.code})</span>
                  <span>−{formatPrice(discountCents)}</span>
                </div>
              )}
              <div className="order-summary__row order-summary__row--total">
                <span>Yhteensä</span>
                <span>{formatPrice(totalWithDelivery)}</span>
              </div>
            </aside>
          </div>
        )}

        {(step === 'payment' || step === 'processing') && activeGroup && (
          <div className="cart-layout">
            <section className="cart-panel">
              <button type="button" className="cart-panel__back" onClick={() => setStep('details')}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Takaisin toimitustietoihin
              </button>
              <h1 className="cart-panel__title">Maksutiedot</h1>
              <p className="cart-panel__subtitle">Tämä on demoympäristö - mitään oikeaa maksua ei veloiteta.</p>

              <div className={`payment-card${cvcFocused ? ' payment-card--flipped' : ''}`}>
                <div className="payment-card__inner">
                  <div className="payment-card__front">
                    <div className="payment-card__top">
                      <span className="payment-card__chip" />
                      {brand && <span className={`payment-card__brand payment-card__brand--${brand}`}>{brand}</span>}
                    </div>
                    <span className="payment-card__number">
                      {card.number ? formatCardNumber(card.number) : '•••• •••• •••• ••••'}
                    </span>
                    <div className="payment-card__bottom">
                      <div>
                        <span className="payment-card__label">Kortinhaltija</span>
                        <span className="payment-card__value">{card.name || 'ETUNIMI SUKUNIMI'}</span>
                      </div>
                      <div>
                        <span className="payment-card__label">Voimassa</span>
                        <span className="payment-card__value">{card.expiry || 'KK/VV'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="payment-card__back">
                    <div className="payment-card__stripe" />
                    <div className="payment-card__cvc-strip">
                      <span>{card.cvc.padEnd(3, '•')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <form className="payment-form" onSubmit={handlePay}>
                <div className="payment-field">
                  <label htmlFor="card-name">Kortinhaltijan nimi</label>
                  <input
                    id="card-name"
                    type="text"
                    autoComplete="cc-name"
                    placeholder="Etunimi Sukunimi"
                    value={card.name}
                    onChange={updateCard('name')}
                  />
                  {errors.name && <span className="payment-field__error">{errors.name}</span>}
                </div>

                <div className="payment-field">
                  <label htmlFor="card-number">Kortin numero</label>
                  <input
                    id="card-number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 5678 9012 3456"
                    value={formatCardNumber(card.number)}
                    onChange={updateCard('number', formatCardNumber)}
                  />
                  {errors.number && <span className="payment-field__error">{errors.number}</span>}
                </div>

                <div className="payment-field-row">
                  <div className="payment-field">
                    <label htmlFor="card-expiry">Voimassaolo</label>
                    <input
                      id="card-expiry"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="KK/VV"
                      value={card.expiry}
                      onChange={updateCard('expiry', formatExpiry)}
                    />
                    {errors.expiry && <span className="payment-field__error">{errors.expiry}</span>}
                  </div>

                  <div className="payment-field">
                    <label htmlFor="card-cvc">CVC</label>
                    <input
                      id="card-cvc"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      value={card.cvc}
                      onChange={updateCard('cvc', (v) => v.replace(/\D/g, '').slice(0, 3))}
                      onFocus={() => setCvcFocused(true)}
                      onBlur={() => setCvcFocused(false)}
                    />
                    {errors.cvc && <span className="payment-field__error">{errors.cvc}</span>}
                  </div>
                </div>

                <button type="submit" className="payment-submit" disabled={step === 'processing'}>
                  {step === 'processing' ? (
                    <span className="payment-submit__spinner" />
                  ) : (
                    `Maksa ${formatPrice(totalWithDelivery)}`
                  )}
                </button>

                <p className="payment-secure">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                  Tiedot pysyvät tällä laitteella - tämä on demo.
                </p>
              </form>
            </section>

            <aside className="order-summary">
              <h2>Tilauksen yhteenveto</h2>
              <p className="order-summary__restaurant">{activeGroup.restaurantName}</p>

              <div className="order-summary__delivery">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  {delivery.method === 'delivery' ? (
                    <path
                      d="M3 6h9l3 4h2v4h-1M3 6v8h1m0 0a2 2 0 1 0 4 0m-4 0h4m6 0a2 2 0 1 0 4 0m-4 0h4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
                <div>
                  <strong>{delivery.method === 'delivery' ? 'Kotiinkuljetus' : 'Nouto ravintolasta'}</strong>
                  <span>{delivery.method === 'delivery' ? delivery.address || '—' : activeGroup.restaurantName}</span>
                </div>
              </div>

              <ul className="order-summary__lines">
                {activeGroup.lines.map((line) => (
                  <li key={line.item.id}>
                    <span>
                      {line.quantity} × {line.item.name}
                    </span>
                    <span>{formatPrice(line.quantity * line.item.price_cents)}</span>
                  </li>
                ))}
              </ul>

              <PromoCode
                promo={promo}
                promoInput={promoInput}
                setPromoInput={setPromoInput}
                promoError={promoError}
                onApply={applyPromo}
                onRemove={removePromo}
              />
              <div className="order-summary__row">
                <span>Välisumma</span>
                <span>{formatPrice(activeSubtotal)}</span>
              </div>
              <div className="order-summary__row">
                <span>Kuljetus</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
              <div className="order-summary__row">
                <span>Palvelumaksu</span>
                <span>{formatPrice(serviceFee)}</span>
              </div>
              {promo && (
                <div className="order-summary__row order-summary__row--discount">
                  <span>Alennus ({promo.code})</span>
                  <span>−{formatPrice(discountCents)}</span>
                </div>
              )}
              <div className="order-summary__row order-summary__row--total">
                <span>Yhteensä</span>
                <span>{formatPrice(totalWithDelivery)}</span>
              </div>
            </aside>
          </div>
        )}

        {step === 'success' && order && (
          <div className="order-success">
            <div className="order-success__check">
              <svg viewBox="0 0 52 52" aria-hidden="true">
                <circle className="order-success__circle" cx="26" cy="26" r="24" fill="none" />
                <path className="order-success__mark" fill="none" d="M14 27l7 7 17-17" />
              </svg>
            </div>
            <h1>Kiitos tilauksestasi!</h1>
            <p>Maksu onnistui ja tilaus on lähetetty ravintolaan {order.restaurantName}.</p>

            <div className="order-success__details">
              <div>
                <span className="order-success__label">Tilausnumero</span>
                <span className="order-success__value">{order.number}</span>
              </div>
              <div>
                <span className="order-success__label">
                  {order.delivery?.method === 'delivery' ? 'Arvioitu toimitusaika' : 'Arvioitu valmistumisaika'}
                </span>
                <span className="order-success__value">{order.readyAt}</span>
              </div>
              <div>
                <span className="order-success__label">
                  {order.delivery?.method === 'delivery' ? 'Toimitusosoite' : 'Noutopaikka'}
                </span>
                <span className="order-success__value">
                  {order.delivery?.method === 'delivery' ? order.delivery.address : order.restaurantName}
                </span>
              </div>
              {order.promo && (
                <div>
                  <span className="order-success__label">Alennuskoodi</span>
                  <span className="order-success__value">{order.promo.code}</span>
                </div>
              )}
              <div>
                <span className="order-success__label">Maksettu</span>
                <span className="order-success__value">{formatPrice(order.totalCents)}</span>
              </div>
            </div>

            {remainingGroups.length > 0 && (
              <div className="order-success__more">
                <p>Korissasi on vielä tilaamattomia tuotteita:</p>
                {remainingGroups.map((group) => (
                  <button
                    key={group.restaurantId}
                    type="button"
                    className="order-success__more-btn"
                    onClick={() => resumeCheckout(group.restaurantId)}
                  >
                    Tilaa {group.restaurantName} ({groupCount(group)} tuotetta) →
                  </button>
                ))}
              </div>
            )}

            <Link to="/" className="order-success__cta">
              Takaisin etusivulle
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

export default Cart
