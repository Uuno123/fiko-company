/* TEMPORARY PREVIEW FILE - not part of the app, not linked from anywhere, safe to delete.
   Näyttää oikeat rekisteröitymisvaiheet (Register.jsx ja RegisterAddress.jsx) ilman
   Supabasea: mitään ei lähetetä eikä tallenneta, vaan "Jatka" siirtyy seuraavaan
   vaiheeseen. Ylhäällä vaihevalitsin; ?step=email|code|details|address avaa suoraan. */
import { useState } from 'react'
import { AuthContext } from '../lib/AuthContext.jsx'
import Register from './Register.jsx'
import { AddressStepForm } from './RegisterAddress.jsx'
import './AuthForm.css'

const STEPS = [
  { id: 'email', label: '1. Sähköposti' },
  { id: 'code', label: '2. Koodi' },
  { id: 'details', label: '3. Tiedot' },
  { id: 'address', label: '4. Osoite' },
  { id: 'done', label: 'Valmis' },
]

const MOCK_USER = { id: 'preview-user', email: 'matti@example.com', user_metadata: {} }

const MOCK_CUSTOMER = {
  id: MOCK_USER.id,
  name: '',
  phone: '',
  email: MOCK_USER.email,
  birth_date: null,
  address: null,
  address_type: null,
  address_lat: null,
  address_lng: null,
  address_details: {},
  courier_instructions: null,
}

const SIGNED_OUT = {
  session: null,
  customer: null,
  isAuthenticated: false,
  status: 'ready',
  signOut: async () => {},
  refreshCustomer: async () => {},
}

const SIGNED_IN = { ...SIGNED_OUT, session: { user: MOCK_USER }, customer: MOCK_CUSTOMER, isAuthenticated: true }

const barStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 60,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  overflowX: 'auto',
  background: '#14150f',
  color: '#fff',
  fontSize: '0.85rem',
}

function stepButtonStyle(active) {
  return {
    flexShrink: 0,
    padding: '6px 12px',
    border: 'none',
    borderRadius: 999,
    background: active ? '#f4501e' : 'rgba(255, 255, 255, 0.12)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  }
}

function PreviewRegister() {
  const [step, setStep] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('step')
    return STEPS.some((s) => s.id === requested) ? requested : 'email'
  })

  function next() {
    const index = STEPS.findIndex((s) => s.id === step)
    setStep(STEPS[Math.min(index + 1, STEPS.length - 1)].id)
    window.scrollTo(0, 0)
  }

  const signedIn = step === 'details' || step === 'address'

  return (
    <AuthContext.Provider value={signedIn ? SIGNED_IN : SIGNED_OUT}>
      <div style={barStyle}>
        <strong style={{ flexShrink: 0, marginRight: 4 }}>Esikatselu</strong>
        {STEPS.map((s) => (
          <button key={s.id} type="button" style={stepButtonStyle(s.id === step)} onClick={() => setStep(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {step === 'address' && (
        <AddressStepForm customer={MOCK_CUSTOMER} userId={MOCK_USER.id} preview={{ onNext: next }} />
      )}

      {step === 'done' && (
        <div className="page">
          <main className="auth-page auth-page--full-height">
            <div className="auth-card">
              <h1>Tili valmis</h1>
              <p className="auth-card__subtitle">
                Oikeassa palvelussa asiakas palaa tästä sivulle, jolta rekisteröityminen alkoi (yleensä etusivu tai
                kassa).
              </p>
              <button type="button" className="auth-submit" onClick={() => setStep('email')}>
                Aloita alusta
              </button>
            </div>
          </main>
        </div>
      )}

      {step !== 'address' && step !== 'done' && (
        <div className="page">
          <main className="auth-page auth-page--full-height">
            <Register key={step} preview={{ step, onNext: next }} />
          </main>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export default PreviewRegister
