import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import GoogleAuthButton from '../components/GoogleAuthButton.jsx'
import AppleAuthButton from '../components/AppleAuthButton.jsx'
import FacebookAuthButton from '../components/FacebookAuthButton.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import './AuthForm.css'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'

  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  // Ensimmäisellä ruudulla kysytään vain sähköposti (kuten lopullisessa
  // varmistusviesti-kirjautumisessa tulee olemaan). Salasana on toisena askeleena,
  // koska varmistusviestiä ei ole vielä rakennettu - kun se tulee, se korvaa
  // pelkästään tämän 'password'-askeleen.
  const [step, setStep] = useState('email') // 'email' | 'password'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function handleEmailContinue(e) {
    e.preventDefault()
    setErrorMessage('')
    setStep('password')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (error) {
      setErrorMessage(translateAuthError(error))
      setStatus('idle')
      return
    }

    navigate(redirectTo, { replace: true })
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setErrorMessage(translateAuthError(error))
      setStatus('idle')
      return
    }

    setStatus('reset-sent')
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <main className="auth-page auth-page--full-height">
          <div className="auth-card">
            <h1>Kirjautuminen ei ole käytössä</h1>
            <p className="auth-card__subtitle">Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <main className="auth-page auth-page--full-height">
        <div className="auth-card">
          {mode === 'login' ? (
            <>
              <h1>Kirjaudu sisään Delivoon</h1>
              <p className="auth-card__subtitle">Näet tilaushistoriasi ja tilaat nopeammin uudelleen.</p>

              <GoogleAuthButton />
              <AppleAuthButton />
              <FacebookAuthButton />
              <p className="auth-divider">tai jatka sähköpostilla</p>

              {step === 'email' ? (
                <form className="auth-form" onSubmit={handleEmailContinue}>
                  <div className="auth-field">
                    <label htmlFor="email">Anna sähköpostiosoite</label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="esimerkki@osoite.fi"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="auth-submit">
                    Jatka
                  </button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleLogin}>
                  {errorMessage && <p className="auth-error">{errorMessage}</p>}

                  <p className="auth-step-email">
                    {email}
                    <button
                      type="button"
                      className="auth-link-button"
                      onClick={() => {
                        setErrorMessage('')
                        setStatus('idle')
                        setStep('email')
                      }}
                    >
                      Vaihda
                    </button>
                  </p>

                  <div className="auth-field">
                    <label htmlFor="password">Salasana</label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() => {
                      setErrorMessage('')
                      setStatus('idle')
                      setMode('forgot')
                    }}
                  >
                    Unohditko salasanan?
                  </button>

                  <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
                    {status === 'submitting' ? 'Kirjaudutaan...' : 'Kirjaudu sisään'}
                  </button>
                </form>
              )}

              <p className="auth-footer">
                Eikö sinulla ole vielä tiliä? <Link to="/register" state={{ from: redirectTo }}>Rekisteröidy</Link>
              </p>

              {/* Referenssikuvassa "tietosuojaseloste" on linkki, mutta sellaista sivua ei ole
                  vielä olemassa - rikkinäisen linkin sijaan teksti on toistaiseksi pelkkää tekstiä. */}
              <p className="auth-legal">
                Delivon tietosuojaseloste sisältää tietoa henkilötietojen käsittelystä Delivolla.
              </p>
            </>
          ) : (
            <>
              <h1>Salasanan palautus</h1>
              <p className="auth-card__subtitle">Lähetämme sähköpostiisi linkin, jolla voit asettaa uuden salasanan.</p>

              {status === 'reset-sent' ? (
                <p className="auth-success">Lähetimme palautuslinkin osoitteeseen {email}, jos tili on olemassa.</p>
              ) : (
                <form className="auth-form" onSubmit={handleForgotPassword}>
                  {errorMessage && <p className="auth-error">{errorMessage}</p>}

                  <div className="auth-field">
                    <label htmlFor="reset-email">Sähköposti</label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
                    {status === 'submitting' ? 'Lähetetään...' : 'Lähetä palautuslinkki'}
                  </button>
                </form>
              )}

              <p className="auth-footer">
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    setErrorMessage('')
                    setStatus('idle')
                    setMode('login')
                  }}
                >
                  ← Takaisin kirjautumiseen
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default Login
