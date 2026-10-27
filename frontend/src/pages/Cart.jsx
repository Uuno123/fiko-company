import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Clock, MapPin, MessageSquareText, Trash2, User } from 'lucide-react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import AccountMenu from '../components/AccountMenu.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import { coordinate, deliveryLegMinutes, hasCoords } from '../lib/deliveryTime.js'
import { DELIVERY_ETA_BUFFER_MINUTES, estimatedArrivalAt } from '../lib/orderStatus.js'
import LoginModal from '../components/LoginModal.jsx'
import AddressPickerModal from '../components/AddressPickerModal.jsx'
import DeliveryBidPanel from '../components/DeliveryBidPanel.jsx'
import { geocodeAddress, haversineKm } from '../lib/geocode.js'
import { getDeliveryAddress } from '../lib/deliveryAddress.js'
import { DELIVERY_PRICE_RANGE } from '../lib/delivery.js'
import { useCart } from '../lib/CartContext.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { getRestaurantById, createPaymentIntent } from '../lib/api.js'
import { stripePromise } from '../lib/stripeClient.js'
import {
  formatDisplayAddress,
  formatPhone,
  formatPrice,
  internationalPhone,
  joinAddress,
  nationalPhone,
  splitAddress,
} from '../lib/format.js'
import { addressTypeLabel, hasSavedAddress, savedApartmentLine, savedCourierNotes } from '../lib/customerAddress.js'
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

// Kotiinkuljetuksessa ei ole kiinteää maksua: kuljettajat tarjoavat hinnan
// (DELIVERY_PRICE_RANGE) tilauksen jälkeen ja asiakas valitsee (migraatio 0058).
const SERVICE_FEE_CENTS = 49

const PROMO_CODES = {
  BIDROP10: { type: 'percent', value: 10, label: '10 % alennus' },
  TERVETULOA: { type: 'fixed', value: 300, label: '3,00 € alennus' },
  // Sama koodi mainostetaan ravintolakorttien merkissä (RestaurantCard) ja
  // etusivun mainoskarusellissa - maxDiscountCents ja minSubtotalCents pitävät
  // sen totena: alennus ei koskaan ole yli 7 € eikä koodi toimi ellei tilaus
  // ole vähintään 50 €. Sama katto ja raja on toistettava backendin
  // payments.js:ssä, joka laskee lopullisen summan.
  SUURTILAUS: {
    type: 'percent',
    value: 30,
    maxDiscountCents: 700,
    minSubtotalCents: 5000,
    label: '30 % alennus (enint. 7 €)',
  },
  // Etusivun noutobannerin tarjous. pickupOnly: alennus vain noutotilauksiin -
  // jos asiakas vaihtaa kotiinkuljetukseen, alennus ei ole voimassa. Sama
  // ehto backendin payments.js:ssä.
  NOUTO15: {
    type: 'percent',
    value: 15,
    maxDiscountCents: 500,
    pickupOnly: true,
    label: '15 % noutoalennus (enint. 5 €)',
  },
}

// Sama osoite kirjoitusasusta riippumatta (kassan osoite vs. profiilin osoite).
function sameAddress(a, b) {
  const normalize = (value) => (formatDisplayAddress(value) || '').trim().toLowerCase()
  return Boolean(a && b) && normalize(a) === normalize(b)
}

// Sama ehto kuin validateDetails-funktiossa: talon numero, 5-numeroinen
// postinumero ja kaupunki. Osoitteen erilliset kentät näytetään vain kun tämä
// ei täyty (käyttäjä: kassassa liikaa asioita).
function addressPartsComplete({ street = '', postalCode = '', city = '' }) {
  return /\d/.test(street) && /^\d{5}$/.test(postalCode.trim()) && Boolean(city.trim())
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

function GooglePayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.34-.17-1.98H10v3.74h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.28Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.9 6.62-2.44l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20Z"
      />
      <path fill="#FBBC05" d="M4.41 11.9a6 6 0 0 1 0-3.8V5.51H1.06a10 10 0 0 0 0 8.98l3.35-2.6Z" />
      <path
        fill="#EA4335"
        d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.06 5.51l3.35 2.6C5.2 5.74 7.4 3.98 10 3.98Z"
      />
    </svg>
  )
}

function ApplePayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13.85 3.02c-.66.78-1.72 1.4-2.77 1.31-.13-1.05.38-2.16 1-2.85C12.75.68 13.9.1 14.83.07c.11 1.09-.32 2.17-.98 2.95ZM14.82 4.55c-1.53-.09-2.83.87-3.56.87-.74 0-1.85-.82-3.05-.8-1.57.02-3.02.91-3.83 2.32-1.64 2.84-.42 7.03 1.17 9.33.78 1.13 1.71 2.39 2.94 2.34 1.17-.05 1.62-.76 3.04-.76 1.42 0 1.83.76 3.06.74 1.27-.02 2.07-1.14 2.85-2.28.9-1.3 1.27-2.57 1.29-2.63-.03-.01-2.47-.95-2.5-3.76-.02-2.35 1.92-3.47 2.01-3.53-1.1-1.62-2.81-1.8-3.42-1.84Z" />
    </svg>
  )
}

function VisaBadge() {
  return <span className="quick-pay__visa">VISA</span>
}

// TILAPÄINEN - katso kommentti placeOrderWithSimulatedPayment:n kohdalla Cart()-
// komponentissa. Yksi rivi kerrallaan valittavissa, ei kolme rinnakkaista nappia.
const QUICK_PAY_METHODS = [
  { key: 'google', icon: <GooglePayIcon />, label: 'Google Pay' },
  { key: 'apple', icon: <ApplePayIcon />, label: 'Apple Pay' },
  { key: 'visa', icon: <VisaBadge />, label: 'Maksukortti' },
]

// Alennuskoodi linkin takana (käyttäjä: kassassa liikaa asioita) - kenttä
// aukeaa vasta "Lisää alennuskoodi" -painalluksesta.
function PromoCode({ promo, promoApplies, promoInput, setPromoInput, promoError, onApply, onRemove }) {
  const [open, setOpen] = useState(false)

  if (!promo && !open) {
    return (
      <button type="button" className="promo-code__toggle" onClick={() => setOpen(true)}>
        Lisää alennuskoodi
      </button>
    )
  }

  return (
    <div className="promo-code">
      {promo ? (
        <div className="promo-code__applied">
          <span>
            🏷️ <strong>{promo.code}</strong> · {promoApplies ? promo.label : 'voimassa vain noudossa'}
          </span>
          <button type="button" onClick={onRemove}>
            Poista
          </button>
        </div>
      ) : (
        // Ei <form> - tämä renderöityy toimituslomakkeen (payment-form) sisällä,
        // ja sisäkkäiset <form>-elementit eivät ole validia HTML:ää (selain
        // sekoaa kumpi lomake submitoituu). Enter-näppäin toimii silti input-kentän
        // omalla onKeyDown:lla.
        <div className="promo-code__form">
          <input
            type="text"
            placeholder="Alennuskoodi"
            aria-label="Alennuskoodi"
            autoFocus={!promo}
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onApply(e)
              }
            }}
          />
          <button type="button" onClick={onApply}>
            Käytä
          </button>
        </div>
      )}
      {promoError && <span className="promo-code__error">{promoError}</span>}
    </div>
  )
}

// Kortti on hyväksytty: varattu (capture_method = manual, veloitus kun ravintola
// hyväksyy - backend/src/settlement.js) tai jo veloitettu.
const AUTHORIZED_STATUSES = ['requires_capture', 'succeeded']

function StripeCardSection({ clientSecret, cardName, setCardName, customerEmail, submitLabel, disabled, processing, setProcessing, onSuccess, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [nameError, setNameError] = useState('')
  // Tuplapainallus ehti ennen kuin processing-tila piirtyi: toinen vahvistus
  // samaan jo varattuun maksuun palautti Stripen virheen, vaikka kortti oli
  // hyväksytty. Lukko estää toisen vahvistuksen heti.
  const submittingRef = useRef(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements || disabled || processing || submittingRef.current) return
    if (cardName.trim().length < 2) {
      setNameError('Anna kortinhaltijan nimi')
      return
    }
    setNameError('')
    submittingRef.current = true
    setProcessing(true)

    // Jo hyväksytty maksu (esim. edellinen yritys onnistui, mutta vastaus jäi
    // saamatta): ei vahvisteta uudelleen, vaan jatketaan tilauksen tallennukseen.
    const before = await stripe.retrievePaymentIntent(clientSecret).catch(() => null)
    let paymentIntent = before?.paymentIntent
    let error = null
    if (!AUTHORIZED_STATUSES.includes(paymentIntent?.status)) {
      ;({ error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method_data: { billing_details: { name: cardName, email: customerEmail || undefined } },
        },
        redirect: 'if_required',
      }))
    }

    // Virhe voi tulla, vaikka kortti hyväksyttiin (yhteys katkesi vastauksen
    // aikana): maksun todellinen tila tarkistetaan ennen virheilmoitusta.
    if (error) {
      console.warn('[delivo-frontend] Stripe-vahvistus:', error.type, error.code, error.message)
      const after = await stripe.retrievePaymentIntent(clientSecret).catch(() => null)
      if (AUTHORIZED_STATUSES.includes(after?.paymentIntent?.status)) {
        error = null
        paymentIntent = after.paymentIntent
      }
    }

    if (error) {
      submittingRef.current = false
      setProcessing(false)
      onError(error.message || 'Maksu epäonnistui. Yritä uudelleen.')
      return
    }

    if (AUTHORIZED_STATUSES.includes(paymentIntent?.status)) {
      await onSuccess()
      // Jos tilauksen tallennus epäonnistui, uusi painallus yrittää tallennusta
      // uudelleen (kortti on jo hyväksytty, sitä ei vahvisteta toiseen kertaan).
      submittingRef.current = false
    } else {
      submittingRef.current = false
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
        {processing ? <span className="payment-submit__spinner" /> : submitLabel}
      </button>

      <p className="payment-secure">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        Maksu käsitellään Stripen kautta - korttitietosi eivät kulje Bidropin palvelimien läpi.
      </p>
    </form>
  )
}

function Cart() {
  const cart = useCart()
  const { customer, isAuthenticated, status: authStatus } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('review')
  const [activeRestaurantId, setActiveRestaurantId] = useState(null)
  // Etusivulla valittu toimitusosoite (AddressGate) esitäytetään koordinaatteineen,
  // jolloin reittikartta näkyy heti eikä osoitetta tarvitse hakea uudelleen.
  const [savedAddress] = useState(getDeliveryAddress)
  const [delivery, setDelivery] = useState({
    method: 'delivery',
    name: '',
    phone: '',
    // address on kartalta valittu osoite, street/postalCode/city sen muokattavat osat
    // (esim. puuttuvan talon numeron voi lisätä) ja apartment porras + asunto.
    // Tilauksen osoite kootaan osista: joinAddress(delivery).
    address: formatDisplayAddress(savedAddress?.full) ?? '',
    ...splitAddress(savedAddress?.full),
    apartment: '',
    lat: savedAddress?.lat ?? null,
    lng: savedAddress?.lng ?? null,
    leaveAtDoor: false,
    notes: '',
  })
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const closeAddressModal = useCallback(() => setAddressModalOpen(false), [])
  // Asiakas on muuttanut osoitetta tai kuljettajan tietoja tässä kassassa -
  // profiilin tiedot eivät enää korvaa niitä.
  const addressTouched = useRef(false)
  // Katu/postinumero/kaupunki-kentät vain kun valitusta osoitteesta puuttuu
  // jotain. Kerran avattuna ne pysyvät auki, jottei kenttä katoa kesken
  // kirjoittamisen heti kun puuttuva numero on lisätty. Uusi osoite ikkunasta
  // päättää tilan uudelleen (onConfirm).
  const addressIncomplete =
    delivery.method === 'delivery' && Boolean(delivery.address) && !addressPartsComplete(delivery)
  const [addressFieldsOpen, setAddressFieldsOpen] = useState(addressIncomplete)
  useEffect(() => {
    if (addressIncomplete) setAddressFieldsOpen(true)
  }, [addressIncomplete])
  // Yhteystiedot yhtenä rivinä, kentät vain muokattaessa tai kun profiilista
  // puuttuu nimi/puhelin. Sama "pysyy auki" -periaate kuin osoitteella.
  const [contactOpen, setContactOpen] = useState(false)
  useEffect(() => {
    if (customer && (!customer.name?.trim() || (customer.phone ?? '').trim().length < 6)) setContactOpen(true)
  }, [customer])
  // Ohjeet kuljettajalle -rivi on oletuksena kiinni; täytetyt tiedot näkyvät
  // rivillä tiivistelmänä ("A 7 · ovikoodi 1234 · Jätä ovelle").
  const [courierOpen, setCourierOpen] = useState(false)
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
  const [placingOrder, setPlacingOrder] = useState(false)
  const paymentElementRef = useRef(null)
  const [quickPayMethod, setQuickPayMethod] = useState('visa')
  const [quickPayPickerOpen, setQuickPayPickerOpen] = useState(false)
  const fetchedRestaurantIds = useRef(new Set())

  // Kassa näyttää aina yhden ravintolan tilauksen - oletuksena korin
  // ensimmäisen, ja useamman ravintolan korissa välilehdet vaihtavat sitä.
  const activeGroup = cart.groups.find((g) => g.restaurantId === activeRestaurantId) ?? cart.groups[0] ?? null
  const activeRestaurant = activeGroup ? restaurants[activeGroup.restaurantId] : null
  const activeRestaurantClosed = activeRestaurant?.is_open === false
  const hasDeliveryCoords = Boolean(delivery.lat && delivery.lng)
  // Kuriirille menevä osoite: katu + porras/asunto, postinumero ja kaupunki.
  const fullDeliveryAddress = joinAddress(delivery)
  const courierSummary = [
    delivery.apartment.trim(),
    delivery.notes.trim(),
    delivery.leaveAtDoor ? 'Jätä ovelle' : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const addressNote = [
    sameAddress(delivery.address, customer?.address) ? addressTypeLabel(customer?.address_type) : null,
    delivery.apartment.trim(),
  ]
    .filter(Boolean)
    .join(' · ')
  const contactComplete = delivery.name.trim().length >= 2 && delivery.phone.trim().length >= 6
  const showContactFields = contactOpen || !contactComplete || Boolean(detailsErrors.name || detailsErrors.phone)
  const deliveryDistanceKm =
    activeRestaurant?.lat && activeRestaurant?.lng && delivery.lat && delivery.lng
      ? haversineKm({ lat: activeRestaurant.lat, lng: activeRestaurant.lng }, { lat: delivery.lat, lng: delivery.lng })
      : null
  const deliveryDistanceLabel =
    deliveryDistanceKm != null ? ` (${deliveryDistanceKm.toFixed(1).replace('.', ',')} km)` : ''

  // Esitäyttää myös osoitteen profiilista. Vain jos osoitetta ei vielä ole -
  // säilyttää käyttäjän oman valinnan, jos hän ehti valita osoitteen ennen
  // kuin customer ladataan.
  // Kirjautuneen asiakkaan tallennetut tiedot ovat kassassa aina valmiina
  // (käyttäjän pyyntö 27.10.2026): osoite koordinaatteineen, porras ja asunto
  // sekä ohjeet kuljettajalle (lib/customerAddress.js), myös jos selaimeen on
  // valittu jokin muu osoite. Kassassa tehty oma muutos (addressTouched) jää.
  // Ilman tallennettua osoitetta profiilin osoite täytetään vain tyhjään kenttään.
  useEffect(() => {
    if (!customer) return
    setDelivery((d) => {
      const contact = {
        name: d.name || customer.name || '',
        phone: d.phone || nationalPhone(customer.phone),
      }
      if (hasSavedAddress(customer) && !addressTouched.current) {
        const profileAddress = formatDisplayAddress(customer.address)
        return {
          ...d,
          ...contact,
          address: profileAddress,
          ...splitAddress(profileAddress),
          ...(customer.address_lat != null && customer.address_lng != null
            ? { lat: customer.address_lat, lng: customer.address_lng }
            : {}),
          apartment: savedApartmentLine(customer),
          notes: savedCourierNotes(customer),
        }
      }
      const profileAddress = d.address ? null : formatDisplayAddress(customer.address)
      return {
        ...d,
        ...contact,
        ...(profileAddress ? { address: profileAddress, ...splitAddress(profileAddress) } : {}),
      }
    })
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
    if (step === 'payment' && !activeGroup) setStep('review')
  }, [step, activeGroup])

  useEffect(() => {
    if ((step === 'payment' || step === 'processing') && !paymentIntent) setStep('review')
  }, [step, paymentIntent])

  const activeSubtotal = activeGroup ? groupTotalCents(activeGroup) : 0
  const activePickupMinutes = activeRestaurant?.pickup_estimate_minutes ?? 25
  // Toimitusaika samalla mallilla kuin tilauksen seurannassa: valmistus + kuljetus
  // ravintolasta osoitteeseen (lib/deliveryTime.js), ilman sijaintia +15 min.
  const restaurantPoint = { lat: coordinate(activeRestaurant?.lat), lng: coordinate(activeRestaurant?.lng) }
  const deliveryPoint = { lat: coordinate(delivery.lat), lng: coordinate(delivery.lng) }
  const activeEtaMinutes =
    delivery.method !== 'delivery'
      ? activePickupMinutes
      : activePickupMinutes +
        (hasCoords(restaurantPoint) && hasCoords(deliveryPoint)
          ? deliveryLegMinutes(restaurantPoint, deliveryPoint, 'bike')
          : DELIVERY_ETA_BUFFER_MINUTES)
  const isDeliveryOrder = delivery.method === 'delivery'
  const serviceFee = activeGroup ? SERVICE_FEE_CENTS : 0
  // Noutokoodi (pickupOnly) ei alenna kotiinkuljetusta, vaikka se jäisi voimaan.
  const promoApplies = Boolean(promo) && (!promo.pickupOnly || delivery.method === 'pickup')
  const discountCents = promoApplies ? Math.min(promo.discountCents, activeSubtotal) : 0
  // Kotiinkuljetuksessa kuljetus lisätään vasta sovittuna.
  const totalNow = activeSubtotal + serviceFee - discountCents

  function resumeCheckout(restaurantId) {
    if (restaurants[restaurantId]?.is_open === false) return
    setCardName(customer?.name || '')
    setPayError('')
    setPromo(null)
    setPromoInput('')
    setPromoError('')
    setPaymentIntent(null)
    setOrder(null)
    setActiveRestaurantId(restaurantId)
    setStep('review')
  }

  function applyPromo(e) {
    e.preventDefault()
    const code = promoInput.trim().toUpperCase()
    const found = PROMO_CODES[code]
    if (!found) {
      setPromoError('Koodi ei kelpaa')
      return
    }
    if (found.pickupOnly && delivery.method !== 'pickup') {
      setPromoError('Koodi koskee vain noutotilauksia - valitse Nouto')
      return
    }
    if (found.minSubtotalCents && activeSubtotal < found.minSubtotalCents) {
      setPromoError(`Koodi vaatii vähintään ${formatPrice(found.minSubtotalCents)} tilauksen`)
      return
    }
    let amount = found.type === 'percent' ? Math.round((activeSubtotal * found.value) / 100) : found.value
    if (found.maxDiscountCents) amount = Math.min(amount, found.maxDiscountCents)
    setPromo({ code, label: found.label, discountCents: amount, pickupOnly: Boolean(found.pickupOnly) })
    setPromoError('')
  }

  function removePromo() {
    setPromo(null)
    setPromoInput('')
    setPromoError('')
  }

  // Kentän virhe poistuu heti kun sitä korjataan, ei vasta seuraavalla maksuyrityksellä.
  // "Valmis" palauttaa yhteystiedot tiivistelmäriviksi (käyttäjä: Muokkaa-
  // painalluksen jälkeen kenttiä ei saanut piiloon). Puutteelliset tiedot
  // näytetään virheinä eikä kenttiä suljeta.
  function closeContact() {
    if (contactComplete) {
      setContactOpen(false)
      setDetailsErrors(({ name: _name, phone: _phone, ...rest }) => rest)
      return
    }
    setDetailsErrors((errors) => ({
      ...errors,
      ...(delivery.name.trim().length < 2 ? { name: 'Anna nimesi' } : {}),
      ...(delivery.phone.trim().length < 6 ? { phone: 'Anna puhelinnumero' } : {}),
    }))
  }

  // Yhteystietokenttiin kirjoittaminen pitää kentät auki: muuten ne
  // vaihtuisivat tiivistelmäriviksi kesken kirjoittamisen heti kun tiedot
  // ovat täydet (showContactFields).
  function updateContact(field) {
    const update = updateDelivery(field)
    return (e) => {
      setContactOpen(true)
      update(e)
    }
  }

  function updateDelivery(field) {
    return (e) => {
      if (['street', 'postalCode', 'city', 'apartment', 'notes'].includes(field)) addressTouched.current = true
      setDelivery((d) => ({ ...d, [field]: e.target.value }))
      setDetailsErrors((errors) => {
        if (!errors[field]) return errors
        const { [field]: _fixed, ...rest } = errors
        return rest
      })
    }
  }

  // Kuljettaja tarvitsee osoitteen sijainnin: reitti, aika-arvio ja todiste
  // perillä (toimitus kuitataan kuljettajan sijainnilla osoitteessa). Profiilista
  // esitäytetyllä osoitteella sitä ei välttämättä ole, joten se haetaan ennen
  // maksua. Palauttaa { lat, lng } tai null - silloin osoitekenttään tulee virhe,
  // ja osoitteen voi valita kartalta.
  async function locateDeliveryAddress() {
    if (delivery.method !== 'delivery') return { lat: null, lng: null }
    if (delivery.lat != null && delivery.lng != null) return { lat: delivery.lat, lng: delivery.lng }
    try {
      const found = await geocodeAddress(fullDeliveryAddress)
      if (Number.isFinite(found?.lat) && Number.isFinite(found?.lng)) {
        setDelivery((d) => ({ ...d, lat: found.lat, lng: found.lng }))
        return { lat: found.lat, lng: found.lng }
      }
    } catch (err) {
      console.warn('[delivo-frontend] Toimitusosoitteen sijainnin haku epäonnistui:', err?.message ?? err)
    }
    setDetailsErrors((errors) => ({
      ...errors,
      address: 'Osoitetta ei löytynyt kartalta. Valitse osoite kartalta, jotta kuljettaja löytää perille.',
    }))
    return null
  }

  function validateDetails() {
    const next = {}
    if (delivery.name.trim().length < 2) next.name = 'Anna nimesi'
    if (delivery.phone.trim().length < 6) next.phone = 'Anna puhelinnumero'
    if (delivery.method === 'delivery') {
      if (!delivery.address.trim()) next.address = 'Valitse toimitusosoite'
      else {
        // Kartalta valitusta kohdasta puuttuu usein talon numero ("Metsurintie").
        if (!/\d/.test(delivery.street)) next.street = 'Lisää talon numero'
        if (!/^\d{5}$/.test(delivery.postalCode.trim())) next.postalCode = 'Anna 5-numeroinen postinumero'
        if (!delivery.city.trim()) next.city = 'Anna kaupunki'
      }
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
      if (!(await locateDeliveryAddress())) return
      const lines = activeGroup.lines.map((line) => ({
        menuItemId: line.item.id,
        quantity: line.quantity,
        optionIds: (line.selectedOptions ?? []).map((o) => o.optionId),
      }))
      const intent = await createPaymentIntent({
        restaurantId: activeGroup.restaurantId,
        deliveryMethod: delivery.method,
        promoCode: promoApplies ? promo.code : null,
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

  // Seurantanäkymä (OrderTrackingModal) lukee samaa muotoa kuin tietokannan
  // orders-rivi, jotta sama näkymä toimii heti tilauksen jälkeen ja myöhemmin
  // aktiivisen tilauksen kuplasta. estimated_ready_at on ruoan valmistumisaika -
  // kuljetusajan lisää estimatedArrivalAt itse. orderRow on tallennettu rivi
  // (osoitteen koordinaatit voivat olla haettu vasta tallennettaessa).
  function buildTrackingOrder({ orderRow, readyAt, totalCents, group }) {
    const restaurant = restaurants[group.restaurantId]
    const isDelivery = delivery.method === 'delivery'
    return {
      id: orderRow.id,
      order_number: orderRow.order_number,
      status: orderRow.status ?? 'pending',
      bidding_expires_at: orderRow.bidding_expires_at ?? null,
      delivery_method: delivery.method,
      created_at: new Date().toISOString(),
      estimated_ready_at: readyAt.toISOString(),
      delivery_address: isDelivery ? fullDeliveryAddress : null,
      delivery_lat: isDelivery ? orderRow.delivery_lat : null,
      delivery_lng: isDelivery ? orderRow.delivery_lng : null,
      total_cents: totalCents,
      // Maksut erittelyyn (Tilauksen tiedot), samat kuin tallennetulla rivillä.
      delivery_fee_cents: orderRow?.delivery_fee_cents ?? 0,
      service_fee_cents: orderRow?.service_fee_cents ?? 0,
      discount_cents: orderRow?.discount_cents ?? 0,
      promo_code: orderRow?.promo_code ?? null,
      restaurants: {
        name: group.restaurantName,
        lat: restaurant?.lat,
        lng: restaurant?.lng,
        address: restaurant?.address,
      },
      order_items: group.lines.map((line) => ({
        id: line.item.id + (line.optionsKey ?? ''),
        quantity: line.quantity,
        name: line.item.name,
        unit_price_cents: lineUnitPriceCents(line),
        selected_options: line.selectedOptions ?? [],
      })),
    }
  }

  // Tilausrivi ja tilausrivit tietokantaan - yhteinen pikamaksulle ja
  // Stripe-maksulle. Palauttaa tallennetun orders-rivin tai heittää virheen.
  // estimatedReadyAt on ruoan valmistumisaika - ei toimitusaikaa, jonka
  // estimatedArrivalAt lisää toimitustilauksille itse.
  async function saveOrderRows({ restaurantId, lines, totals, estimatedReadyAt, deliveryCoords, paymentIntentId }) {
    const isDelivery = delivery.method === 'delivery'
    const deliveryNotes = [isDelivery && delivery.leaveAtDoor ? 'Jätä ovelle' : null, delivery.notes.trim() || null]
      .filter(Boolean)
      .join(' - ')

    // Koordinaatit haetaan jo ennen maksua (locateDeliveryAddress). Tässä vain
    // varmistus: jo maksettu tilaus tallennetaan, vaikka haku epäonnistuisi.
    let deliveryLat = deliveryCoords?.lat ?? delivery.lat
    let deliveryLng = deliveryCoords?.lng ?? delivery.lng
    if (isDelivery && (deliveryLat == null || deliveryLng == null) && fullDeliveryAddress) {
      try {
        const found = await geocodeAddress(fullDeliveryAddress)
        if (Number.isFinite(found?.lat) && Number.isFinite(found?.lng)) {
          deliveryLat = found.lat
          deliveryLng = found.lng
        }
      } catch (err) {
        console.warn('[delivo-frontend] Toimitusosoitteen koordinaattien haku epäonnistui:', err?.message ?? err)
      }
    }

    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_id: customer.id,
        delivery_method: delivery.method,
        delivery_name: delivery.name.trim(),
        delivery_phone: internationalPhone(delivery.phone),
        delivery_address: isDelivery ? fullDeliveryAddress : null,
        delivery_lat: isDelivery ? deliveryLat : null,
        delivery_lng: isDelivery ? deliveryLng : null,
        delivery_notes: deliveryNotes || null,
        subtotal_cents: totals.subtotalCents,
        delivery_fee_cents: totals.deliveryFeeCents,
        service_fee_cents: totals.serviceFeeCents,
        discount_cents: totals.discountCents,
        promo_code: totals.promoCode,
        total_cents: totals.totalCents,
        estimated_ready_at: estimatedReadyAt.toISOString(),
        // Kortin varaus, jonka backend veloittaa ravintolan hyväksyessä.
        ...(paymentIntentId ? { payment_intent_id: paymentIntentId } : {}),
      })
      .select()
      .single()
    if (orderError || !orderRow) throw orderError ?? new Error('Tilausriviä ei palautettu')

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
    if (itemsError) throw itemsError

    return orderRow
  }

  // Pikamaksu (Google Pay / Apple Pay / kortti -napit): maksu on vielä
  // simuloitu, mutta tilaus on oikea orders-rivi, jonka ravintolan dashboard,
  // kuljettaja-app ja "Seuraa tilausta" -kupla näkevät. Summat samat kuin kassan
  // yhteenvedossa.
  async function placeOrderWithSimulatedPayment() {
    if (activeRestaurantClosed || !activeGroup || placingOrder || !validateDetails()) return
    if (!customer) {
      setPayError('Kirjaudu sisään tehdäksesi tilauksen.')
      return
    }
    setPlacingOrder(true)
    setPayError('')
    const { restaurantId, lines } = activeGroup
    const estimatedReadyAt = new Date(Date.now() + activePickupMinutes * 60 * 1000)
    try {
      const deliveryCoords = await locateDeliveryAddress()
      if (!deliveryCoords) return
      const orderRow = await saveOrderRows({
        restaurantId,
        lines,
        estimatedReadyAt,
        deliveryCoords,
        totals: {
          subtotalCents: activeSubtotal,
          deliveryFeeCents: 0,
          serviceFeeCents: serviceFee,
          discountCents,
          promoCode: promoApplies ? promo.code : null,
          totalCents: totalNow,
        },
      })
      setOrder(
        buildTrackingOrder({
          orderRow,
          readyAt: estimatedReadyAt,
          totalCents: totalNow,
          group: activeGroup,
        }),
      )
      cart.clearRestaurant(restaurantId)
      setActiveRestaurantId(null)
      setStep('success')
    } catch (err) {
      // Ravintola sulkeutui kassan ollessa auki: tietokanta hylkää tilauksen
      // (migraatio 0045). Merkitään ravintola kiinni, jolloin kassa näyttää
      // kiinni-ilmoituksen ja maksunappi lukittuu.
      if (err?.message === 'restaurant_closed') {
        setRestaurants((current) => ({ ...current, [restaurantId]: { ...current[restaurantId], is_open: false } }))
        return
      }
      console.error('[delivo-frontend] Tilauksen tallennus epäonnistui:', err?.message ?? err)
      setPayError('Tilauksen tallennus epäonnistui. Yritä uudelleen.')
    } finally {
      setPlacingOrder(false)
    }
  }

  async function handlePaymentSucceeded() {
    if (!activeGroup || !customer || !paymentIntent) return
    const { restaurantId, lines } = activeGroup
    const estimatedReadyAt = new Date(Date.now() + activePickupMinutes * 60 * 1000)

    let orderRow
    try {
      orderRow = await saveOrderRows({
        restaurantId,
        lines,
        estimatedReadyAt,
        totals: {
          subtotalCents: paymentIntent.subtotalCents,
          deliveryFeeCents: paymentIntent.deliveryFeeCents,
          serviceFeeCents: paymentIntent.serviceFeeCents,
          discountCents: paymentIntent.discountCents,
          promoCode: paymentIntent.promoCode,
          totalCents: paymentIntent.totalCents,
        },
        paymentIntentId: paymentIntent.paymentIntentId,
      })
    } catch {
      orderRow = null
    }

    if (!orderRow) {
      setPayError(
        'Maksu onnistui, mutta tilauksen tallennus epäonnistui. Älä maksa uudelleen - ota yhteyttä asiakaspalveluun.',
      )
      setStep('payment')
      return
    }

    setOrder(
      buildTrackingOrder({
        orderRow,
        readyAt: estimatedReadyAt,
        totalCents: paymentIntent.totalCents,
        group: activeGroup,
      }),
    )
    cart.clearRestaurant(restaurantId)
    setActiveRestaurantId(null)
    setPaymentIntent(null)
    setStep('success')
  }

  const remainingGroups = order ? cart.groups : []
  const orderArrival = order
    ? estimatedArrivalAt(order)?.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
    : null
  const hasMobileFixedCta = (step === 'review' && cart.count > 0) || step === 'payment' || step === 'processing'
  const hasDetailsErrors = Object.keys(detailsErrors).length > 0

  if (authStatus !== 'loading' && !isAuthenticated) {
    return (
      <div className="page page--cart">
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

  return (
    <div className="page page--cart">
      {/* Vahvistusnäkymässä on oma "Takaisin etusivulle" -nappi. */}
      {step !== 'success' && (
        <div className="cart-topbar">
          {/* Pyöreä takaisin-nuoli kuten ravintola- ja kategoriasivuilla (käyttäjä
              halusi vaihtaa "× Poistu ostoskorista" -napin). Palaa edelliselle
              sivulle; jos kassalle tultiin suoraan linkistä, etusivulle. */}
          <button
            type="button"
            className="cart-topbar__back"
            aria-label="Takaisin"
            onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <AccountMenu currentPath="/ostoskori" />
        </div>
      )}

      <main
        className={`cart-page${hasMobileFixedCta ? ' cart-page--fixed-cta' : ''}`}
      >
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

        {/* Kassa yhdellä sivulla: vasemmalla tilaus, toimitus, yhteystiedot ja
            maksutapa järjestyksessä, oikealla kiinnittyvä yhteenveto ja maksu. */}
        {step === 'review' && cart.count > 0 && activeGroup && (
          <div className="checkout">
            <div className="checkout__main">
              <header className="checkout__head">
                <h1>Kassa</h1>
                {cart.groups.length > 1 && (
                  <>
                    <div className="checkout-tabs" role="tablist" aria-label="Tilattava ravintola">
                      {cart.groups.map((group) => {
                        const selected = group.restaurantId === activeGroup.restaurantId
                        return (
                          <button
                            key={group.restaurantId}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`checkout-tab${selected ? ' checkout-tab--active' : ''}`}
                            onClick={() => setActiveRestaurantId(group.restaurantId)}
                          >
                            {group.restaurantName}
                            <span className="checkout-tab__count">{groupCount(group)}</span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="checkout__hint">Eri ravintoloiden tilaukset maksetaan ja toimitetaan erikseen.</p>
                  </>
                )}
              </header>

              <section className="checkout-section">
                <div className="checkout-section__head">
                  <h2>{activeGroup.restaurantName}</h2>
                  {/* "Tyhjennä" poistettu (käyttäjä: kassassa liikaa asioita) - tuotteen
                      saa pois miinusnapista, joka muuttuu roskakoriksi kun määrä on 1. */}
                  <div className="checkout-section__actions">
                    <Link to={`/ravintola/${activeGroup.restaurantId}`} className="checkout-link">
                      Lisää tuotteita
                    </Link>
                  </div>
                </div>

                {activeRestaurantClosed && (
                  <p className="checkout-notice">
                    {activeGroup.restaurantName} on juuri nyt kiinni, joten tilausta ei voi tehdä.
                  </p>
                )}

                <ul className="cart-items">
                  {activeGroup.lines.map((line) => (
                    <li className="cart-item" key={line.item.id + (line.optionsKey ?? '')}>
                      <div className="cart-item__media">
                        {line.item.image_url ? (
                          <img src={line.item.image_url} alt={line.item.name} />
                        ) : (
                          <RestaurantAvatarPlaceholder name={line.item.name} size="thumb" />
                        )}
                      </div>

                      {/* Hinta nimen alla ja määrä oikealla - erillinen kpl-hinta ja
                          ×-nappi poistettu (käyttäjä: liikaa asioita). */}
                      <div className="cart-item__info">
                        <span className="cart-item__name">{line.item.name}</span>
                        {line.selectedOptions?.length > 0 && (
                          <span className="cart-item__options">
                            {line.selectedOptions.map((o) => o.name).join(', ')}
                          </span>
                        )}
                        <span className="cart-item__price">{formatPrice(lineUnitPriceCents(line) * line.quantity)}</span>
                      </div>

                      <div className="quantity-stepper quantity-stepper--sm">
                        {/* Määrällä 1 miinus poistaa tuotteen (setQuantity 0 poistaa rivin),
                            joten se näytetään roskakorina. */}
                        <button
                          type="button"
                          aria-label={
                            line.quantity === 1
                              ? `Poista ${line.item.name} korista`
                              : `Vähennä tuotteen ${line.item.name} määrää`
                          }
                          onClick={() =>
                            cart.setQuantity(activeGroup.restaurantId, line.item.id, line.quantity - 1, line.optionsKey)
                          }
                        >
                          {line.quantity === 1 ? <Trash2 size={15} strokeWidth={2} aria-hidden="true" /> : '−'}
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Lisää tuotteen ${line.item.name} määrää`}
                          onClick={() =>
                            cart.setQuantity(activeGroup.restaurantId, line.item.id, line.quantity + 1, line.optionsKey)
                          }
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="checkout-section">
                <div className="checkout-section__head">
                  <h2>Toimitus</h2>
                </div>

                <div className="delivery-method">
                  <span
                    className="delivery-method__thumb"
                    style={{ transform: delivery.method === 'pickup' ? 'translateX(100%)' : 'translateX(0)' }}
                    aria-hidden="true"
                  />
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

                {delivery.method === 'delivery' ? (
                  <>
                    <div className="payment-field">
                      {/* Osoite yhtenä korttina (käyttäjän pyyntö 27.10.2026): osoite ja
                          asunnon tiedot, oikealla Muuta. Ei reittikarttaa eikä aika/matka-
                          merkkiä (käyttäjän pyyntö) - kortin painallus avaa osoitteen valinnan. */}
                      <button
                        type="button"
                        id="delivery-address"
                        className="address-card"
                        aria-label={`Toimitusosoite: ${fullDeliveryAddress || 'ei valittu'}. Muuta osoitetta`}
                        onClick={() => setAddressModalOpen(true)}
                      >
                        <span className="address-card__icon" aria-hidden="true">
                          <MapPin size={17} strokeWidth={2} />
                        </span>
                        <span className="address-card__text">
                          <strong>{joinAddress({ ...delivery, apartment: '' }) || 'Valitse toimitusosoite'}</strong>
                          {addressNote && <span>{addressNote}</span>}
                        </span>
                        <span className="address-card__change" aria-hidden="true">
                          {delivery.address ? 'Muuta' : 'Valitse'}
                        </span>
                      </button>

                      {detailsErrors.address && <span className="payment-field__error">{detailsErrors.address}</span>}

                      {addressModalOpen && (
                        <AddressPickerModal
                          title="Toimitusosoite"
                          initial={
                            delivery.address ? { address: delivery.address, lat: delivery.lat, lng: delivery.lng } : null
                          }
                          onConfirm={({ address, lat, lng }) => {
                            const parts = splitAddress(address)
                            addressTouched.current = true
                            setDelivery((d) => ({ ...d, address, ...parts, lat, lng }))
                            setAddressFieldsOpen(!addressPartsComplete(parts))
                            setAddressModalOpen(false)
                          }}
                          onClose={closeAddressModal}
                        />
                      )}
                    </div>

                    {/* Osoitteen osat vain kun valitusta osoitteesta puuttuu jotain
                        (esim. kartalta valitusta kohdasta talon numero). Muuten
                        osoiterivi yllä riittää. */}
                    {delivery.address && addressFieldsOpen && (
                      <div className="checkout-address-fix">
                        <div className="checkout-panel-head">
                          <p
                            className={`checkout-address-fix__hint${
                              addressPartsComplete(delivery) ? ' checkout-address-fix__hint--ok' : ''
                            }`}
                          >
                            {addressPartsComplete(delivery)
                              ? 'Osoite on nyt kunnossa.'
                              : 'Täydennä osoite, jotta kuljettaja löytää perille.'}
                          </p>
                          {/* Kun osoite on kunnossa, kentät saa piiloon - sama kuin
                              yhteystietojen "Valmis". */}
                          {addressPartsComplete(delivery) && (
                            <button
                              type="button"
                              className="checkout-panel-head__done"
                              onClick={() => setAddressFieldsOpen(false)}
                            >
                              Valmis
                            </button>
                          )}
                        </div>
                        <div className="payment-field">
                          <label htmlFor="delivery-street">Katuosoite</label>
                          <input
                            id="delivery-street"
                            type="text"
                            autoComplete="address-line1"
                            placeholder="Esim. Metsurintie 27"
                            value={delivery.street}
                            onChange={updateDelivery('street')}
                          />
                          {detailsErrors.street && <span className="payment-field__error">{detailsErrors.street}</span>}
                        </div>
                        <div className="payment-field-row">
                          <div className="payment-field">
                            <label htmlFor="delivery-postal-code">Postinumero</label>
                            <input
                              id="delivery-postal-code"
                              type="text"
                              inputMode="numeric"
                              autoComplete="postal-code"
                              maxLength={5}
                              placeholder="70150"
                              value={delivery.postalCode}
                              onChange={updateDelivery('postalCode')}
                            />
                            {detailsErrors.postalCode && (
                              <span className="payment-field__error">{detailsErrors.postalCode}</span>
                            )}
                          </div>
                          <div className="payment-field">
                            <label htmlFor="delivery-city">Kaupunki</label>
                            <input
                              id="delivery-city"
                              type="text"
                              autoComplete="address-level2"
                              placeholder="Kuopio"
                              value={delivery.city}
                              onChange={updateDelivery('city')}
                            />
                            {detailsErrors.city && <span className="payment-field__error">{detailsErrors.city}</span>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ohjeet kuljettajalle yhtenä rivinä (käyttäjä: toimitusosio häiritsi
                        eniten). Porras, ohjeet ja "Jätä ovelle" aukeavat painamalla;
                        täytetyt tiedot näkyvät rivillä tiivistelmänä. */}
                    <div className="checkout-detail">
                      <button
                        type="button"
                        className={`checkout-row${courierOpen ? ' checkout-row--open' : ''}`}
                        aria-expanded={courierOpen}
                        onClick={() => setCourierOpen((v) => !v)}
                      >
                        <span className="checkout-row__icon" aria-hidden="true">
                          <MessageSquareText size={17} strokeWidth={1.8} />
                        </span>
                        <span className={`checkout-row__text${courierSummary ? '' : ' checkout-row__text--muted'}`}>
                          {courierSummary || 'Ohjeet kuljettajalle'}
                        </span>
                        <ChevronDown className="checkout-row__chevron" size={18} strokeWidth={1.8} aria-hidden="true" />
                      </button>

                      {courierOpen && (
                        <div className="checkout-row__panel">
                          <div className="payment-field-row">
                            <div className="payment-field">
                              <label htmlFor="delivery-apartment">Porras ja asunto</label>
                              <input
                                id="delivery-apartment"
                                type="text"
                                autoComplete="address-line2"
                                placeholder="Esim. A 7"
                                value={delivery.apartment}
                                onChange={updateDelivery('apartment')}
                              />
                            </div>
                            <div className="payment-field">
                              <label htmlFor="delivery-notes">Ohjeet</label>
                              <input
                                id="delivery-notes"
                                type="text"
                                placeholder="Esim. ovikoodi tai kerros"
                                value={delivery.notes}
                                onChange={updateDelivery('notes')}
                              />
                            </div>
                          </div>
                          <label className="checkout-check">
                            <input
                              type="checkbox"
                              checked={delivery.leaveAtDoor}
                              onChange={(e) => setDelivery((d) => ({ ...d, leaveAtDoor: e.target.checked }))}
                            />
                            <span>Jätä tilaus ovelle</span>
                          </label>
                        </div>
                      )}
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
                      <span>Nouto valmiina n. {activePickupMinutes} minuutin kuluttua</span>
                    </div>
                  </div>
                )}

                {/* Yhteystiedot samassa osiossa yhtenä rivinä - kentät vain muokattaessa,
                    kun profiilista puuttuu tietoja tai tarkistus löysi virheen. */}
                <div className="checkout-detail">
                  {showContactFields ? (
                    <div className="checkout-row__panel checkout-row__panel--flat">
                      <div className="checkout-panel-head">
                        <span>Yhteystiedot</span>
                        <button type="button" className="checkout-panel-head__done" onClick={closeContact}>
                          Valmis
                        </button>
                      </div>
                      <div className="payment-field-row">
                        <div className="payment-field">
                          <label htmlFor="delivery-name">Nimi</label>
                          <input
                            id="delivery-name"
                            type="text"
                            autoComplete="name"
                            placeholder="Etunimi Sukunimi"
                            value={delivery.name}
                            onChange={updateContact('name')}
                          />
                          {detailsErrors.name && <span className="payment-field__error">{detailsErrors.name}</span>}
                        </div>
                        <div className="payment-field">
                          <label htmlFor="delivery-phone">Puhelin</label>
                          <div className="phone-input">
                            <span className="phone-input__prefix">+358</span>
                            <input
                              id="delivery-phone"
                              type="tel"
                              autoComplete="tel"
                              placeholder="40 123 4567"
                              value={delivery.phone}
                              onChange={updateContact('phone')}
                            />
                          </div>
                          {detailsErrors.phone && <span className="payment-field__error">{detailsErrors.phone}</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="checkout-row" onClick={() => setContactOpen(true)}>
                      <span className="checkout-row__icon" aria-hidden="true">
                        <User size={17} strokeWidth={1.8} />
                      </span>
                      <span className="checkout-row__text">
                        {delivery.name} · {formatPhone(delivery.phone)}
                      </span>
                      <span className="checkout-row__action">Muokkaa</span>
                    </button>
                  )}
                </div>
              </section>
            </div>

            <aside className="checkout-summary">
              <h2>Yhteenveto</h2>
              <p className="checkout-summary__eta">
                <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
                {delivery.method === 'delivery' ? 'Toimitus' : 'Nouto'} n. {activeEtaMinutes} min
              </p>

              <PromoCode
                promo={promo}
                promoApplies={promoApplies}
                promoInput={promoInput}
                setPromoInput={setPromoInput}
                promoError={promoError}
                onApply={applyPromo}
                onRemove={removePromo}
              />

              <div className="checkout-summary__rows">
                <div className="order-summary__row">
                  <span>Tuotteet ({groupCount(activeGroup)} kpl)</span>
                  <span>{formatPrice(activeSubtotal)}</span>
                </div>
                {/* Alennus kohdistuu vain tuotteisiin (ks. applyPromo/backendin
                    payments.js), joten se näytetään heti tuotteiden alla. */}
                {promoApplies && (
                  <div className="order-summary__row order-summary__row--discount">
                    <span>Alennus ({promo.code})</span>
                    <span>−{formatPrice(discountCents)}</span>
                  </div>
                )}
                <div className="order-summary__row">
                  <span>Kuljetus{isDeliveryOrder ? deliveryDistanceLabel : ''}</span>
                  <span>{isDeliveryOrder ? DELIVERY_PRICE_RANGE : 'Ei toimitusta'}</span>
                </div>
                <div className="order-summary__row">
                  <span>Palvelumaksu</span>
                  <span>{formatPrice(serviceFee)}</span>
                </div>
                <div className="order-summary__row order-summary__row--total">
                  <span>{isDeliveryOrder ? 'Yhteensä + kuljetus' : 'Yhteensä'}</span>
                  <span>{formatPrice(totalNow)}</span>
                </div>
              </div>


              {/* Maksutapa yhteenvedossa suoraan maksunapin yläpuolella eikä omana
                korttinaan (käyttäjä: kassassa liikaa asioita). TILAPÄINEN, käyttäjän
                pyynnöstä simuloitu maksu - ei oikeaa Stripe-veloitusta,
                mutta tilaus on oikea, katso placeOrderWithSimulatedPayment. */}
              <div className="quick-pay-select">
                <button
                  type="button"
                  className="quick-pay-select__current"
                  aria-expanded={quickPayPickerOpen}
                  onClick={() => setQuickPayPickerOpen((v) => !v)}
                >
                  <span className="quick-pay-select__icon">
                    {QUICK_PAY_METHODS.find((m) => m.key === quickPayMethod)?.icon}
                  </span>
                  <span className="quick-pay-select__text">
                    <strong>{QUICK_PAY_METHODS.find((m) => m.key === quickPayMethod)?.label}</strong>
                    <span>Valittu maksutapa</span>
                  </span>
                  <svg
                    className={`quick-pay-select__chevron${quickPayPickerOpen ? ' quick-pay-select__chevron--open' : ''}`}
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {quickPayPickerOpen && (
                  <div className="quick-pay-select__list">
                    {QUICK_PAY_METHODS.map((method) => (
                      <button
                        type="button"
                        key={method.key}
                        className={`quick-pay-select__option${method.key === quickPayMethod ? ' quick-pay-select__option--active' : ''}`}
                        onClick={() => {
                          setQuickPayMethod(method.key)
                          setQuickPayPickerOpen(false)
                        }}
                      >
                        <span className="quick-pay-select__icon">{method.icon}</span>
                        {method.label}
                        {method.key === quickPayMethod && (
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {payError && <p className="checkout-notice">{payError}</p>}
              {hasDetailsErrors && <p className="checkout-notice">Täydennä puuttuvat tiedot ennen maksamista.</p>}

              {/* Nappi vaihtuu valitun maksutavan mukaan kuten oikeissa
                  kassoissa: Google Pay- ja Apple Pay -tyyliset napit, kortilla
                  tavallinen "Maksa X €". Summa näkyy yllä Yhteensä-rivillä. */}
              <button
                type="button"
                className={`payment-submit payment-submit--${quickPayMethod}`}
                disabled={activeRestaurantClosed || placingOrder || creatingIntent}
                onClick={quickPayMethod === 'visa' ? handleContinueToPayment : placeOrderWithSimulatedPayment}
                aria-label={
                  quickPayMethod === 'google'
                    ? `Maksa ${formatPrice(totalNow)} Google Paylla`
                    : quickPayMethod === 'apple'
                      ? `Maksa ${formatPrice(totalNow)} Apple Paylla`
                      : undefined
                }
              >
                {quickPayMethod === 'google' && (
                  <>
                    Maksa
                    <span className="payment-submit__brand">
                      <GooglePayIcon />
                      Pay
                    </span>
                  </>
                )}
                {quickPayMethod === 'apple' && (
                  <>
                    Maksa
                    <span className="payment-submit__brand payment-submit__brand--apple">
                      <ApplePayIcon />
                      Pay
                    </span>
                  </>
                )}
                {quickPayMethod === 'visa' && (creatingIntent ? <span className="payment-submit__spinner" /> : 'Maksa')}
              </button>
            </aside>
          </div>
        )}

        {(step === 'payment' || step === 'processing') && activeGroup && paymentIntent && (
          <div className="cart-layout">
            <section className="cart-panel">
              <button type="button" className="cart-panel__back" onClick={() => setStep('review')}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Takaisin ostoskoriin
              </button>
              <h1 className="cart-panel__title">Maksutiedot</h1>
              <p className="cart-panel__subtitle">Stripe-testitila - kokeile esim. korttia 4242 4242 4242 4242.</p>

              {(payError || activeRestaurantClosed) && (
                <p className="payment-field__error payment-field__error--center">
                  {payError || `${activeGroup.restaurantName} on juuri nyt kiinni, joten tilausta ei voi lähettää.`}
                </p>
              )}

              {/* TILAPÄINEN placeholder käyttäjän pyynnöstä - ei oikeaa tallennettua
                  korttia (ei Stripe Customeria/tallennettuja maksutapoja taustalla).
                  Rivi EI piilota/korvaa oikeaa maksutapavalintaa (Stripen
                  PaymentElement alla, kortti + mahdolliset lompakot riippuen Stripe-
                  tilin asetuksista) - klikkaus vain vierittää sen näkyviin, koska
                  käyttäjä ei aiemmin löytänyt sitä kun tämä rivi peitti huomion siltä.
                  Poista/korvaa oikealla toteutuksella kun Stripe Customer + tallennetut
                  kortit rakennetaan. */}
              <button
                type="button"
                className="saved-card-preview"
                onClick={() => paymentElementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                <span className="saved-card-preview__icon">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="2.5" y="5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
                <div className="saved-card-preview__text">
                  <strong>Kortti •••• 4242</strong>
                  <span>Testitila</span>
                </div>
                <svg className="saved-card-preview__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div ref={paymentElementRef}>
                <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.clientSecret, appearance: STRIPE_APPEARANCE }}>
                  <StripeCardSection
                    clientSecret={paymentIntent.clientSecret}
                    cardName={cardName}
                    setCardName={setCardName}
                    customerEmail={customer?.email}
                    submitLabel="Maksa"
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
              </div>
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
                  <span>{delivery.method === 'delivery' ? fullDeliveryAddress || '—' : activeGroup.restaurantName}</span>
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
                <span>Kuljetus{isDeliveryOrder ? deliveryDistanceLabel : ''}</span>
                <span>{isDeliveryOrder ? 'sovitaan' : 'Ei toimitusta'}</span>
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
                <span>{paymentIntent.maxDeliveryCents > 0 ? 'Yhteensä + kuljetus' : 'Yhteensä'}</span>
                <span>{formatPrice(paymentIntent.totalCents)}</span>
              </div>
            </aside>
          </div>
        )}

        {/* Tilauksen jälkeen pelkkä vahvistus (käyttäjän toive) - seuranta
            löytyy etusivun "Seuraa tilausta" -kuplasta. */}
        {step === 'success' && order && (
          <div className="cart-empty order-done">
            <div className="cart-empty__icon order-done__icon">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="m5 10.5 3.2 3.2L15 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1>{order.status === 'awaiting_courier' ? 'Valitse kuljettaja' : 'Tilaus tehty!'}</h1>
            <p>
              {order.status === 'awaiting_courier'
                ? 'Lähellä olevat kuljettajat tarjoavat nyt hintaa kuljetukselle. Hyväksy sopiva tarjous tai tarjoa omaa hintaa – ravintola saa tilauksen, kun hinnasta on sovittu.'
                : 'Kiitos tilauksestasi. Voit seurata sitä etusivun Seuraa tilausta -painikkeesta.'}
            </p>
            <p className="order-done__meta">
              Tilausnumero {order.order_number} · {formatPrice(order.total_cents)}
              {orderArrival && (
                <>
                  {' · '}
                  {order.delivery_method === 'delivery' ? 'perillä' : 'noudettavissa'} noin klo {orderArrival}
                </>
              )}
            </p>

            {order.status === 'awaiting_courier' && order.id && (
              <div className="order-done__bids">
                <DeliveryBidPanel orderId={order.id} />
              </div>
            )}

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

            <Link to="/" className="cart-empty__cta">
              Takaisin etusivulle
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

export default Cart
