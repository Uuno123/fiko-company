import { useEffect, useState } from 'react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import './AuthForm.css'
import './Settings.css'

// TILAPÄINEN, käyttäjän pyynnöstä esittelykäyttöön: kortin "tallennus" ei ole
// oikea maksupalvelu. Selaimeen jää vain kortin merkki, 4 viimeistä numeroa ja
// voimassaolo - ei koskaan koko numeroa eikä turvakoodia. Oikeassa toteutuksessa
// kortti tallennetaan Stripeen (SetupIntent), ei omaan tietokantaan.
function storageKey(customerId) {
  return `delivo-demo-cards-${customerId}`
}

function loadCards(customerId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(customerId))) ?? []
  } catch {
    return []
  }
}

function saveCards(customerId, cards) {
  try {
    localStorage.setItem(storageKey(customerId), JSON.stringify(cards))
  } catch {
    // Selaimen tallennus estetty (esim. yksityinen ikkuna) - kortit näkyvät silti tämän käynnin ajan.
  }
}

function cardBrand(digits) {
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  return 'Kortti'
}

// Luhn-tarkiste: sama tarkistus jonka oikea korttilomake tekee, joten
// kirjoitusvirhe huomataan jo ennen tallennusta (4242 4242 4242 4242 kelpaa).
function passesLuhn(digits) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

function formatCardNumber(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

function validateCard({ number, expiry, cvc, name }) {
  const errors = {}
  const digits = number.replace(/\D/g, '')
  if (digits.length < 13 || !passesLuhn(digits)) errors.number = 'Tarkista kortin numero'

  const match = expiry.match(/^(\d{2})\/(\d{2})$/)
  const month = match ? Number(match[1]) : 0
  const year = match ? 2000 + Number(match[2]) : 0
  const now = new Date()
  const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)
  if (!match || month < 1 || month > 12 || expired) errors.expiry = 'Tarkista voimassaolo (KK/VV)'

  if (!/^\d{3,4}$/.test(cvc)) errors.cvc = '3-4 numeroa'
  if (name.trim().length < 2) errors.name = 'Anna kortinhaltijan nimi'
  return errors
}

const EMPTY_FORM = { number: '', expiry: '', cvc: '', name: '' }

function SavedCards() {
  const { customer } = useAuth()
  const [cards, setCards] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (customer?.id) setCards(loadCards(customer.id))
  }, [customer?.id])

  function updateCards(next) {
    setCards(next)
    if (customer?.id) saveCards(customer.id, next)
  }

  function startAdding() {
    setForm({ ...EMPTY_FORM, name: customer?.name ?? '' })
    setErrors({})
    setSaved(false)
    setAdding(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validateCard(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const digits = form.number.replace(/\D/g, '')
    updateCards([
      ...cards,
      { id: `${Date.now()}`, brand: cardBrand(digits), last4: digits.slice(-4), expiry: form.expiry },
    ])
    setForm(EMPTY_FORM)
    setAdding(false)
    setSaved(true)
  }

  function removeCard(id) {
    setSaved(false)
    updateCards(cards.filter((card) => card.id !== id))
  }

  return (
    <section className="auth-card">
      <div className="saved-cards__head">
        <h2>Tallennetut kortit</h2>
        {!adding && (
          <button type="button" className="settings-section__action" onClick={startAdding}>
            + Lisää kortti
          </button>
        )}
      </div>

      {saved && <p className="auth-success">Kortti lisätty.</p>}

      {cards.length === 0 && !adding && (
        <div className="settings-empty">
          <p>Ei vielä tallennettuja maksukortteja.</p>
        </div>
      )}

      {cards.length > 0 && (
        <ul className="saved-cards">
          {cards.map((card, index) => (
            <li key={card.id} className="saved-card">
              <span className={`card-brand card-brand--${card.brand.toLowerCase()}`}>
                {card.brand === 'Mastercard' ? 'MC' : card.brand.toUpperCase()}
              </span>
              <span className="saved-card__main">
                <span className="saved-card__number">
                  {card.brand} •••• {card.last4}
                  {index === 0 && <span className="saved-card__default">Oletus</span>}
                </span>
                <span className="saved-card__expiry">Voimassa {card.expiry}</span>
              </span>
              <button type="button" className="settings-panel__link" onClick={() => removeCard(card.id)}>
                Poista
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form className="auth-form card-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="card-number">Kortin numero</label>
            <input
              id="card-number"
              inputMode="numeric"
              autoComplete="off"
              placeholder="1234 5678 9012 3456"
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: formatCardNumber(e.target.value) }))}
            />
            {errors.number && <span className="card-form__error">{errors.number}</span>}
          </div>

          <div className="card-form__row">
            <div className="auth-field">
              <label htmlFor="card-expiry">Voimassa</label>
              <input
                id="card-expiry"
                inputMode="numeric"
                autoComplete="off"
                placeholder="KK/VV"
                value={form.expiry}
                onChange={(e) => setForm((f) => ({ ...f, expiry: formatExpiry(e.target.value) }))}
              />
              {errors.expiry && <span className="card-form__error">{errors.expiry}</span>}
            </div>
            <div className="auth-field">
              <label htmlFor="card-cvc">Turvakoodi</label>
              <input
                id="card-cvc"
                inputMode="numeric"
                autoComplete="off"
                placeholder="CVC"
                value={form.cvc}
                onChange={(e) => setForm((f) => ({ ...f, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              />
              {errors.cvc && <span className="card-form__error">{errors.cvc}</span>}
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="card-name">Kortinhaltijan nimi</label>
            <input
              id="card-name"
              autoComplete="off"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <span className="card-form__error">{errors.name}</span>}
          </div>

          <div className="profile-edit-actions">
            <button type="submit" className="auth-submit">
              Tallenna kortti
            </button>
            <button type="button" className="auth-link-button" onClick={() => setAdding(false)}>
              Peruuta
            </button>
          </div>

          <p className="settings-empty__hint">
            Esittelytila: korttia ei veloiteta eikä sen numeroa tallenneta - vain 4 viimeistä numeroa näytetään.
          </p>
        </form>
      )}
    </section>
  )
}

function AppleBadge() {
  return (
    <span className="payment-badge payment-badge--black">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M14.2 3.4c.6-.75 1.05-1.8.93-2.9-.9.05-2 .6-2.65 1.35-.6.65-1.1 1.7-.96 2.7 1 .08 1.98-.5 2.68-1.15Z"
          fill="currentColor"
        />
        <path
          d="M17.4 14.1c-.28.65-.62 1.25-1.02 1.83-.55.8-1 1.35-1.35 1.65-.55.5-1.13.76-1.75.78-.45.01-.99-.13-1.62-.41-.63-.28-1.2-.42-1.73-.42-.55 0-1.14.14-1.78.42-.64.28-1.16.43-1.56.44-.6.03-1.2-.24-1.79-.8-.38-.35-.86-.92-1.42-1.72-.6-.85-1.1-1.85-1.49-3-.42-1.24-.63-2.44-.63-3.6 0-1.33.29-2.47.86-3.44.45-.77 1.06-1.38 1.81-1.83a4.9 4.9 0 0 1 2.44-.73c.48 0 1.11.15 1.9.45.79.3 1.29.45 1.51.45.16 0 .72-.18 1.66-.53.9-.32 1.65-.46 2.27-.41 1.68.14 2.94.79 3.78 1.98-1.5.91-2.24 2.18-2.23 3.82.01 1.28.47 2.34 1.37 3.19.41.39.86.69 1.37.9-.11.32-.23.63-.36.93Z"
          fill="currentColor"
        />
      </svg>
      <span>Pay</span>
    </span>
  )
}

function GoogleBadge() {
  return (
    <span className="payment-badge payment-badge--outline">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M19.6 10.23c0-.68-.06-1.33-.17-1.96H10v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.31 2.99-7.27Z"
          fill="#4285F4"
        />
        <path
          d="M10 20c2.7 0 4.96-.89 6.61-2.42l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.06v2.59A10 10 0 0 0 10 20Z"
          fill="#34A853"
        />
        <path d="M4.41 11.93a5.99 5.99 0 0 1 0-3.86V5.48H1.06a10 10 0 0 0 0 9.04l3.35-2.59Z" fill="#FBBC05" />
        <path
          d="M10 3.96c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.98 9.98 0 0 0 10 0a10 10 0 0 0-8.94 5.48l3.35 2.6C5.2 5.72 7.4 3.96 10 3.96Z"
          fill="#EA4335"
        />
      </svg>
      <span>Pay</span>
    </span>
  )
}

function MobilePayBadge() {
  return (
    <span className="payment-badge payment-badge--mobilepay">
      <span>MobilePay</span>
    </span>
  )
}

function KlarnaBadge() {
  return (
    <span className="payment-badge payment-badge--klarna">
      <span>Klarna</span>
    </span>
  )
}

const METHODS = [
  { id: 'apple-pay', label: 'Apple Pay', Badge: AppleBadge },
  { id: 'google-pay', label: 'Google Pay', Badge: GoogleBadge },
  { id: 'mobilepay', label: 'MobilePay', Badge: MobilePayBadge },
  { id: 'klarna', label: 'Klarna', Badge: KlarnaBadge },
]

function SettingsPayments() {
  return (
    <SettingsLayout title="Maksutavat" description="Tallennetut kortit ja muut maksutavat.">
      <SavedCards />

      <section className="auth-card">
        <h2>Muut maksutavat</h2>
        <div className="payment-methods">
          {METHODS.map(({ id, label, Badge }) => (
            <div className="payment-method-row" key={id}>
              <Badge />
              <span className="payment-method-row__label">{label}</span>
              <span className="payment-method-row__status">Tulossa</span>
            </div>
          ))}
        </div>
        <p className="settings-empty__hint">
          Korttien ja muiden maksutapojen tallennus tulee käyttöön kun oikea maksupalvelu (esim. Stripe) on kytketty -
          korttitietoja ei koskaan tallenneta suoraan omaan tietokantaan.
        </p>
      </section>
    </SettingsLayout>
  )
}

export default SettingsPayments
