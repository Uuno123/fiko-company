import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import StaffHeader from '../components/StaffHeader.jsx'
import Footer from '../components/Footer.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import './AuthForm.css'

function StaffLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/henkilokunta/dashboard'

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

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <StaffHeader />
        <main className="auth-page auth-page--full-height">
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
      <StaffHeader />
      <main className="auth-page auth-page--full-height">
        <div className="auth-card">
          <h1>Henkilökunnan kirjautuminen</h1>
          <p className="auth-card__subtitle">
            Sisäinen näkymä Fikon henkilökunnalle - kaikki tilaukset, tilastot ja hakemukset yhdessä paikassa.
          </p>

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

            <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Kirjaudutaan...' : 'Kirjaudu sisään'}
            </button>
          </form>

          <p className="auth-footer">Henkilökuntatunnukset saa Fikon pääkäyttäjältä - ei itserekisteröitymistä.</p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default StaffLogin
