import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import GoogleAuthButton from '../components/GoogleAuthButton.jsx'
import AppleAuthButton from '../components/AppleAuthButton.jsx'
import FacebookAuthButton from '../components/FacebookAuthButton.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import './AuthForm.css'

function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), phone: phone.trim() },
      },
    })

    if (error) {
      setErrorMessage(translateAuthError(error))
      setStatus('idle')
      return
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setErrorMessage('Tämä sähköposti on jo käytössä. Kirjaudu sisään tai käytä toista sähköpostia.')
      setStatus('idle')
      return
    }

    if (data.session) {
      navigate(redirectTo, { replace: true })
      return
    }

    setStatus('check-email')
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <Header />
        <main className="auth-page">
          <div className="auth-card">
            <h1>Rekisteröityminen ei ole käytössä</h1>
            <p className="auth-card__subtitle">Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <Header />
      <main className="auth-page">
        <div className="auth-card">
          <h1>Luo tili</h1>
          <p className="auth-card__subtitle">Näet tilaushistoriasi ja tilaat nopeammin uudelleen. Voit tilata myös ilman tiliä.</p>

          {status === 'check-email' ? (
            <p className="auth-success">
              Lähetimme vahvistuslinkin osoitteeseen {email}. Vahvista sähköpostisi, niin voit kirjautua sisään.
            </p>
          ) : (
            <>
              <GoogleAuthButton label="Rekisteröidy Googlella" />
              <AppleAuthButton label="Rekisteröidy Apple ID:llä" />
              <FacebookAuthButton label="Rekisteröidy Facebookilla" />
              <p className="auth-divider">tai jatka sähköpostilla</p>

              <form className="auth-form" onSubmit={handleSubmit}>
              {errorMessage && <p className="auth-error">{errorMessage}</p>}

              <div className="auth-field">
                <label htmlFor="name">Nimi</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

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
                <label htmlFor="phone">Puhelinnumero</label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password">Salasana</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="auth-field__hint">Vähintään 6 merkkiä</span>
              </div>

              <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Luodaan tiliä...' : 'Luo tili'}
              </button>
            </form>
            </>
          )}

          <p className="auth-footer">
            Onko sinulla jo tili? <Link to="/login" state={{ from: redirectTo }}>Kirjaudu sisään</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Register
