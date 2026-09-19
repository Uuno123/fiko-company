import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import Header from '../components/Header.jsx'
import AccountMenu from '../components/AccountMenu.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import LoginModal from '../components/LoginModal.jsx'
import AddressMapPicker from '../components/AddressMapPicker.jsx'
import DeliveryRouteMap, { haversineKm } from '../components/DeliveryRouteMap.jsx'
import { useCart } from '../lib/CartContext.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { getRestaurantById, createPaymentIntent } from '../lib/api.js'
import { stripePromise } from '../lib/stripeClient.js'
import { formatPrice } from '../lib/format.js'
import './Cart.css'

const STRIPE_APPEARANCE = {
  theme: 'flat',
  variables: {
    colorPrimary: '#14150f',
    colorBackground: '#ffffff',
    colorText: '#14150f',
    colorTextSecondary: '#6c7066',
    colorTextPlaceholder: '#6c7066',
    colorDanger: '#9a2828',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSizeBase: '16px',
    fontWeightNormal: '500',
    borderRadius: '12px',
    spacingUnit: '4px',
    spacingGridRow: '16px',
  },
  rules: {
    '.Input': {
      border: '1.5px solid #e2e5db',
      boxShadow: 'none',
      padding: '12px 14px',
    },
    '.Input:focus': {
      border: '1.5px solid #000000',
      boxShadow: '0 0 0 4px rgba(0, 0, 0, 0.18)',
      outline: 'none',
    },
    '.Label': {
      fontWeight: '600',
      fontSize: '0.85rem',
      marginBottom: '6px',
    },
    '.Tab': {
      border: '1.5px solid #e2e5db',
      boxShadow: 'none',
    },
    '.Tab:hover': {
      border: '1.5px solid #14150f',
    },
    '.Tab--selected': {
      border: '1.5px solid #14150f',
      boxShadow: 'none',
    },
    '.TabIcon--selected': {
      fill: '#14150f',
    },
    '.Block': {
      border: '1.5px solid #e2e5db',
      boxShadow: 'none',
    },
  },
}

const DELIVERY_FEE_CENTS = 599
const SERVICE_FEE_CENTS = 49
const STEPS = [
  { key: 'review', label: 'Ostoskori' },
  { key: 'details', label: 'Toimitus' },
  { key: 'payment', label: 'Maksutiedot' },
  { key: 'success', label: 'Vahvistus' },
]

const PROMO_CODES = {
  DELIVO10: { type: 'percent', value: 10, label: '10 % alennus' },
  TERVETULOA: { type: 'fixed', value: 300, label: '3,00 € alennus' },
}

function formatTime(date) {
  return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

function groupCount(group) {
  return group.lines.reduce((sum, line) => sum + line.quantity, 0)
}

function lineUnitPriceCents(line) {
  return line.unitPriceCents ?? line.item.price_cents
}

function groupTotalCents(group) {
  return group.lines.reduce((sum, line) => sum + line.quantity * lineUnitPriceCents(line), 0)
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

function StripeCardSection({ cardName, setCardName, customerEmail, totalCents, disabled, processing, setProcessing, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [nameError, setNameError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements || disabled || processing) return
    if (cardName.trim().length < 2) {
      setNameError('Anna kortinhaltijan nimi')
      return
    }
    setNameError('')
    setProcessing(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: { billing_details: { name: cardName, email: customerEmail || undefined } },
      },
      redirect: 'if_required',
    })

    if (error) {
      setProcessing(false)
      onError(error.message || 'Maksu epäonnistui. Yritä uudelleen.')
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      await onSuccess()
    } else {
      setProcessing(false)
      onError('Maksua ei voitu vahvistaa. Yritä uudelleen.')
    }
  }

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      <div className="payment-method-card">
        <span className="payment-method-card__label">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2.5" y="5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Maksutapa
        </span>

        <div className="payment-field">
          <label htmlFor="card-name">Kortinhaltijan nimi</label>
          <input
            id="card-name"
            type="text"
            autoComplete="cc-name"
            placeholder="Etunimi Sukunimi"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
          {nameError && <span className="payment-field__error">{nameError}</span>}
        </div>

        <div className="stripe-payment-element">
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      </div>

      <button type="submit" className="payment-submit" disabled={!stripe || processing || disabled}>
        {processing ? <span className="payment-submit__spinner" /> : `Maksa ${formatPrice(totalCents)}`}
      </button>

      <p className="payment-secure">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        Maksu käsitellään Stripen kautta - korttitietosi eivät kulje delivon palvelimien läpi.
      </p>
    </form>
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
    lat: null,
    lng: null,
    leaveAtDoor: false,
    notes: '',
  })
  const [editingAddress, setEditingAddress] = useState(true)
  const [addressExpanded, setAddressExpanded] = useState(false)
  const [detailsErrors, setDetailsErrors] = useState({})
  const [cardName, setCardName] = useState('')
  const [payError, setPayError] = useState('')
  const [order, setOrder] = useState(null)
  const [restaurants, setRestaurants] = useState({})
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [paymentIntent, setPaymentIntent] = useState(null)
  const [creatingIntent, setCreatingIntent] = useState(false)
  const fetchedRestaurantIds = useRef(new Set())

  const activeGroup = cart.groups.find((g) => g.restaurantId === activeRestaurantId) ?? null
  const activeRestaurant = activeGroup ? restaurants[activeGroup.restaurantId] : null
  const activeRestaurantClosed = activeRestaurant?.is_open === false
  const hasDeliveryCoords = Boolean(delivery.lat && delivery.lng)
  const showAddressPicker = editingAddress || !hasDeliveryCoords
  const deliveryDistanceKm =
    activeRestaurant?.lat && activeRestaurant?.lng && delivery.lat && delivery.lng
      ? haversineKm({ lat: activeRestaurant.lat, lng: activeRestaurant.lng }, { lat: delivery.lat, lng: delivery.lng })
      : null
  const deliveryDistanceLabel = deliveryDistanceKm != null ? ` (${deliveryDistanceKm.toFixed(1)} km)` : ''

  useEffect(() => {
    if (!customer) return
    setDelivery((d) => ({
      ...d,
      name: d.name || customer.name || '',
      phone: d.phone || customer.phone || '',
    }))
    setCardName((n) => n || customer.name || '')
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

  useEffect(() => {
    if ((step === 'payment' || step === 'processing') && !paymentIntent) setStep('details')
  }, [step, paymentIntent])

  const cartItemIds = useMemo(() => new Set(cart.lines.map((line) => line.item.id)), [cart.lines])
  const firstCity = useMemo(() => Object.values(restaurants).find((r) => r?.city)?.city, [restaurants])

  const activeSubtotal = activeGroup ? groupTotalCents(activeGroup) : 0
  const deliveryFee = activeGroup && delivery.method === 'delivery' ? DELIVERY_FEE_CENTS : 0
  const serviceFee = activeGroup ? SERVICE_FEE_CENTS : 0
  const discountCents = promo ? Math.min(promo.discountCents, activeSubtotal) : 0
  const totalWithDelivery = activeSubtotal + deliveryFee + serviceFee - discountCents

  function startCheckout(restaurantId) {
    if (restaurants[restaurantId]?.is_open === false) return
    setActiveRestaurantId(restaurantId)
    setStep('details')
  }

  function resumeCheckout(restaurantId) {
    setCardName(customer?.name || '')
    setPayError('')
    setPromo(null)
    setPromoInput('')
    setPromoError('')
    setPaymentIntent(null)
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

  async function handleContinueToPayment(e) {
    e.preventDefault()
    if (activeRestaurantClosed || !validateDetails() || !activeGroup) return
    setCreatingIntent(true)
    setPayError('')
    try {
      const lines = activeGroup.lines.map((line) => ({
        menuItemId: line.item.id,
        quantity: line.quantity,
        optionIds: (line.selectedOptions ?? []).map((o) => o.optionId),
      }))
      const intent = await createPaymentIntent({
        restaurantId: activeGroup.restaurantId,
        deliveryMethod: delivery.method,
        promoCode: promo?.code ?? null,
        lines,
      })
      setPaymentIntent(intent)
      setStep('payment')
    } catch (err) {
      setPayError(err.message || 'Maksun aloitus epäonnistui. Yritä uudelleen.')
    } finally {
      setCreatingIntent(false)
    }
  }

  async function handlePaymentSucceeded() {
    if (!activeGroup || !customer || !paymentIntent) return
    const { restaurantId, restaurantName, lines } = activeGroup

    const pickupMinutes = restaurants[restaurantId]?.pickup_estimate_minutes ?? 25
    const estimatedMinutes = delivery.method === 'delivery' ? pickupMinutes + 15 : pickupMinutes
    const estimatedReadyAt = new Date(Date.now() + estimatedMinutes * 60 * 1000)
    const deliveryNotes = [
      delivery.method === 'delivery' && delivery.leaveAtDoor ? 'Jätä ovelle' : null,
      delivery.notes.trim() || null,
    ]
      .filter(Boolean)
      .join(' - ')

    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_id: customer.id,
        delivery_method: delivery.method,
        delivery_name: delivery.name.trim(),
        delivery_phone: delivery.phone.trim(),
        delivery_address: delivery.method === 'delivery' ? delivery.address.trim() : null,
        delivery_lat: delivery.method === 'delivery' ? delivery.lat : null,
        delivery_lng: delivery.method === 'delivery' ? delivery.lng : null,
        delivery_notes: deliveryNotes || null,
        subtotal_cents: paymentIntent.subtotalCents,
        delivery_fee_cents: paymentIntent.deliveryFeeCents,
        service_fee_cents: paymentIntent.serviceFeeCents,
        discount_cents: paymentIntent.discountCents,
        promo_code: paymentIntent.promoCode,
        total_cents: paymentIntent.totalCents,
        estimated_ready_at: estimatedReadyAt.toISOString(),
      })
      .select()
      .single()

    if (orderError || !orderRow) {
      setPayError(
        'Maksu onnistui, mutta tilauksen tallennus epäonnistui. Älä maksa uudelleen - ota yhteyttä asiakaspalveluun.',
      )
      setStep('payment')
      return
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      lines.map((line) => ({
        order_id: orderRow.id,
        menu_item_id: line.item.id,
        name: line.item.name,
        price_cents: line.item.price_cents,
        unit_price_cents: lineUnitPriceCents(line),
        selected_options: line.selectedOptions ?? [],
        quantity: line.quantity,
      })),
    )

    if (itemsError) {
      setPayError(
        'Maksu onnistui, mutta tilauksen tallennus epäonnistui. Älä maksa uudelleen - ota yhteyttä asiakaspalveluun.',
      )
      setStep('payment')
      return
    }

    setOrder({
      number: orderRow.order_number,
      readyAt: formatTime(estimatedReadyAt),
      totalCents: paymentIntent.totalCents,
      restaurantName,
      lines,
      delivery,
      promo,
    })
    cart.clearRestaurant(restaurantId)
    setActiveRestaurantId(null)
    setPaymentIntent(null)
    setStep('success')
  }

  const stepIndex = STEPS.findIndex((s) => s.key === (step === 'processing' ? 'payment' : step))
  const remainingGroups = order ? cart.groups : []
  const hasMobileFixedCta =
    (step === 'review' && cart.count > 0 && cart.groups.length === 1) ||
    step === 'details' ||
    step === 'payment' ||
    step === 'processing'

  const headerProps = {
    variant: 'dark',
    search: {
      value: headerSearch,
      onChange: setHeaderSearch,
      onSubmit: (q) => navigate(`/?q=${encodeURIComponent(q)}`),
      placeholder: 'Hae delivosta...',
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
      <div className="page page--cart">
        <Header {...headerProps} />
        <div className="cart-topbar">
          <button type="button" className="cart-topbar__back" aria-label="Takaisin" onClick={() => navigate('/')}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <AccountMenu currentPath="/ostoskori" />
        </div>
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

  // Mobiilin takaisin-nuoli peruu yhden vaiheen kerrallaan, ei poistu koko
  // kassalta kesken täytön.
  function handleTopbarBack() {
    if (step === 'payment' || step === 'processing') setStep('details')
    else if (step === 'details') setStep('review')
    else navigate('/')
  }

  return (
    <div className="page page--cart">
      <Header {...headerProps} />

      {/* Mobiilissa koko header korvataan tällä: pelkkä takaisin-nuoli ja tili
          vastakkaisissa reunoissa, jotta kassalla ei ole mitään ylimääräistä. */}
      <div className="cart-topbar">
        <button type="button" className="cart-topbar__back" aria-label="Takaisin" onClick={handleTopbarBack}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <AccountMenu currentPath="/ostoskori" />
      </div>

      <main className={`cart-page${hasMobileFixedCta ? ' cart-page--fixed-cta' : ''}`}>
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
                <span className="checkout-steps__label">{s.label}</span>
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
                const groupClosed = restaurants[group.restaurantId]?.is_open === false

                return (
                  <div className={`cart-group${groupIndex > 0 ? ' cart-group--divider' : ''}`} key={group.restaurantId}>
                    <div className="cart-group__header">
                      <div className="cart-group__title">
                        <span className="cart-group__name">{group.restaurantName}</span>
                        {groupClosed && <span className="cart-group__closed-badge">Kiinni juuri nyt</span>}
                      </div>
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
                        <li className="cart-item" key={line.item.id + (line.optionsKey ?? '')}>
                          <div className="cart-item__media">
                            {line.item.image_url ? (
                              <img src={line.item.image_url} alt={line.item.name} />
                            ) : (
                              <RestaurantAvatarPlaceholder name={line.item.name} size="thumb" />
                            )}
                          </div>

                          <div className="cart-item__info">
                            <span className="cart-item__name">{line.item.name}</span>
                            {line.selectedOptions?.length > 0 && (
                              <span className="cart-item__options">
                                {line.selectedOptions.map((o) => o.name).join(', ')}
                              </span>
                            )}
                            <span className="cart-item__unit-price">{formatPrice(lineUnitPriceCents(line))} / kpl</span>
                          </div>

                          <div className="quantity-stepper quantity-stepper--sm">
                            <button
                              type="button"
                              aria-label={`Vähennä tuotteen ${line.item.name} määrää`}
                              onClick={() =>
                                cart.setQuantity(group.restaurantId, line.item.id, line.quantity - 1, line.optionsKey)
                              }
                            >
                              −
                            </button>
                            <span>{line.quantity}</span>
                            <button
                              type="button"
                              aria-label={`Lisää tuotteen ${line.item.name} määrää`}
                              onClick={() =>
                                cart.setQuantity(group.restaurantId, line.item.id, line.quantity + 1, line.optionsKey)
                              }
                            >
                              +
                            </button>
                          </div>

                          <span className="cart-item__line-total">
                            {formatPrice(lineUnitPriceCents(line) * line.quantity)}
                          </span>

                          <button
                            type="button"
                            className="cart-item__remove"
                            aria-label={`Poista ${line.item.name} korista`}
                            onClick={() => cart.removeItem(group.restaurantId, line.item.id, line.optionsKey)}
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
                      <button
                        type="button"
                        className="cart-group__checkout"
                        disabled={groupClosed}
                        onClick={() => startCheckout(group.restaurantId)}
                      >
                        {groupClosed ? 'Ravintola on kiinni' : 'Tilaa tästä ravintolasta'}
                        {!groupClosed && (
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
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
              <div className={`checkout-hero${activeRestaurant?.image_url ? '' : ' checkout-hero--fallback'}`}>
                {activeRestaurant?.image_url && <img src={activeRestaurant.image_url} alt="" />}
                <div className="checkout-hero__overlay">
                  <span className="checkout-hero__eyebrow">Tilaus</span>
                  <h1>{activeGroup.restaurantName}</h1>
                </div>
              </div>

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
                    <div className="payment-field payment-field--wide">
                      <label htmlFor="delivery-address">Osoite</label>

                      <button
                        type="button"
                        id="delivery-address"
                        className={`address-summary-row${addressExpanded ? ' address-summary-row--open' : ''}`}
                        onClick={() => setAddressExpanded((v) => !v)}
                      >
                        <span className="address-summary-row__icon">
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
                        <span className="address-summary-row__text">
                          {delivery.address || 'Valitse toimitusosoite'}
                        </span>
                        <svg className="address-summary-row__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="m6 8 4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {detailsErrors.address && (
                        <span className="payment-field__error">{detailsErrors.address}</span>
                      )}

                      {addressExpanded &&
                        (showAddressPicker ? (
                          <div className="address-summary-row__panel">
                            <AddressMapPicker
                              value={delivery.address}
                              onChange={(address, coords, meta) => {
                                setDelivery((d) => ({
                                  ...d,
                                  address,
                                  lat: coords?.lat ?? d.lat,
                                  lng: coords?.lng ?? d.lng,
                                }))
                                // Vain aito käyttäjän valinta (kartan klikkaus / hakutulos) sulkee
                                // muokkaustilan - ei passiivinen synkronointi (esim. tämän
                                // komponentin uudelleenmountautuminen jo tunnetulla osoitteella,
                                // joka muuten sulkisi muokkaustilan heti takaisin ennen kuin
                                // käyttäjä ehtii tehdä mitään).
                                if (coords && meta?.interactive) setEditingAddress(false)
                              }}
                            />

                            {customer?.address && (
                              <button
                                type="button"
                                className="use-profile-address-btn"
                                onClick={() => {
                                  setDelivery((d) => ({ ...d, address: customer.address }))
                                  setEditingAddress(false)
                                }}
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
                                Käytä profiilin sijaintia
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="address-summary-row__panel">
                            <DeliveryRouteMap
                              restaurant={
                                activeRestaurant
                                  ? { lat: activeRestaurant.lat, lng: activeRestaurant.lng, name: activeGroup.restaurantName }
                                  : null
                              }
                              destination={{ lat: delivery.lat, lng: delivery.lng, address: delivery.address }}
                            />
                            <button type="button" className="edit-address-btn" onClick={() => setEditingAddress(true)}>
                              Muokkaa osoitetta
                            </button>
                          </div>
                        ))}
                    </div>

                    <div className="toggle-row">
                      <div className="toggle-row__text">
                        <span className="toggle-row__label">Jätä tilaus ovelle</span>
                        <span className="toggle-row__hint">Kuriiri jättää tilauksen ovelle ilman suoraa kontaktia.</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={delivery.leaveAtDoor}
                        className={`toggle-switch${delivery.leaveAtDoor ? ' toggle-switch--on' : ''}`}
                        onClick={() => setDelivery((d) => ({ ...d, leaveAtDoor: !d.leaveAtDoor }))}
                      >
                        <span className="toggle-switch__thumb" />
                      </button>
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

                {(activeRestaurantClosed || payError) && (
                  <p className="payment-field__error payment-field__error--center">
                    {payError || `${activeGroup.restaurantName} on juuri nyt kiinni, joten tilausta ei voi jatkaa.`}
                  </p>
                )}

                <button type="submit" className="payment-submit" disabled={activeRestaurantClosed || creatingIntent}>
                  {creatingIntent ? <span className="payment-submit__spinner" /> : 'Jatka maksamaan'}
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
                <span>Kuljetus{delivery.method === 'delivery' ? deliveryDistanceLabel : ''}</span>
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

        {(step === 'payment' || step === 'processing') && activeGroup && paymentIntent && (
          <div className="cart-layout">
            <section className="cart-panel">
              <button type="button" className="cart-panel__back" onClick={() => setStep('details')}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Takaisin toimitustietoihin
              </button>
              <h1 className="cart-panel__title">Maksutiedot</h1>
              <p className="cart-panel__subtitle">Stripe-testitila - kokeile esim. korttia 4242 4242 4242 4242.</p>

              {(payError || activeRestaurantClosed) && (
                <p className="payment-field__error payment-field__error--center">
                  {payError || `${activeGroup.restaurantName} on juuri nyt kiinni, joten tilausta ei voi lähettää.`}
                </p>
              )}

              <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.clientSecret, appearance: STRIPE_APPEARANCE }}>
                <StripeCardSection
                  cardName={cardName}
                  setCardName={setCardName}
                  customerEmail={customer?.email}
                  totalCents={paymentIntent.totalCents}
                  disabled={activeRestaurantClosed}
                  processing={step === 'processing'}
                  setProcessing={(processing) => setStep(processing ? 'processing' : 'payment')}
                  onSuccess={handlePaymentSucceeded}
                  onError={(message) => {
                    setPayError(message)
                    setStep('payment')
                  }}
                />
              </Elements>
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
                  {delivery.method === 'delivery' && delivery.leaveAtDoor && (
                    <span className="order-summary__delivery-note">Jätetään ovelle</span>
                  )}
                </div>
              </div>

              <ul className="order-summary__lines">
                {activeGroup.lines.map((line) => (
                  <li key={line.item.id + (line.optionsKey ?? '')}>
                    <span>
                      {line.quantity} × {line.item.name}
                      {line.selectedOptions?.length > 0 && (
                        <span className="order-summary__line-options">
                          {' '}
                          ({line.selectedOptions.map((o) => o.name).join(', ')})
                        </span>
                      )}
                    </span>
                    <span>{formatPrice(line.quantity * lineUnitPriceCents(line))}</span>
                  </li>
                ))}
              </ul>

              <div className="order-summary__row">
                <span>Välisumma</span>
                <span>{formatPrice(paymentIntent.subtotalCents)}</span>
              </div>
              <div className="order-summary__row">
                <span>Kuljetus{delivery.method === 'delivery' ? deliveryDistanceLabel : ''}</span>
                <span>{formatPrice(paymentIntent.deliveryFeeCents)}</span>
              </div>
              <div className="order-summary__row">
                <span>Palvelumaksu</span>
                <span>{formatPrice(paymentIntent.serviceFeeCents)}</span>
              </div>
              {paymentIntent.discountCents > 0 && (
                <div className="order-summary__row order-summary__row--discount">
                  <span>Alennus ({paymentIntent.promoCode})</span>
                  <span>−{formatPrice(paymentIntent.discountCents)}</span>
                </div>
              )}
              <div className="order-summary__row order-summary__row--total">
                <span>Yhteensä</span>
                <span>{formatPrice(paymentIntent.totalCents)}</span>
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
