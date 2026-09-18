import SettingsLayout from '../components/SettingsLayout.jsx'
import './AuthForm.css'
import './Settings.css'

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
    <SettingsLayout>
      <section className="auth-card">
        <h2>Tallennetut kortit</h2>
        <div className="settings-empty">
          <p>Ei vielä tallennettuja maksukortteja.</p>
        </div>
      </section>

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
