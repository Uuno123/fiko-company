import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

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
        <Header />
        <main className="auth-page">
          <div className="auth-card">
            <h1>Kirjautuminen ei ole käytössä</h1>
            <p className="auth-card__subtitle">Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="page">
      <Header />
      <main className="auth-page">
        <div className="auth-card">
          {mode === 'login' ? (
            <>
              <h1>Kirjaudu sisään</h1>
              <p className="auth-card__subtitle">Näet tilaushistoriasi ja tilaat nopeammin uudelleen.</p>

              <GoogleAuthButton />
              <AppleAuthButton />
              <FacebookAuthButton />
              <p className="auth-divider">tai jatka sähköpostilla</p>

              <form className="auth-form" onSubmit={handleLogin}>
                {errorMessage && <p className="auth-error">{errorMessage}</p>}

                <div className="auth-field">
                  <label htmlFor="email">Sähköposti</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="password">Salasana</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
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

              <p className="auth-footer">
                Eikö sinulla ole vielä tiliä? <Link to="/register" state={{ from: redirectTo }}>Rekisteröidy</Link>
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
      <Footer />
    </div>
  )
}

export default Login
