import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BottomSheet from './BottomSheet.jsx'
import GoogleAuthButton from './GoogleAuthButton.jsx'
import AppleAuthButton from './AppleAuthButton.jsx'
import FacebookAuthButton from './FacebookAuthButton.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import '../pages/AuthForm.css'
import './LoginModal.css'

// Kassan kirjautuminen alhaalta liukuvana paneelina (BottomSheet), kuten /login.
function LoginModal({ title, message, onClose }) {
  const location = useLocation()
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
    // Onnistuneen kirjautumisen jälkeen AuthContext päivittää istunnon ja modaali sulkeutuu automaattisesti.
  }

  return (
    <BottomSheet onClose={onClose} labelledBy="login-modal-title">
      <div className="login-modal">
        {!isSupabaseConfigured ? (
          <>
            <h2 id="login-modal-title">Kirjautuminen ei ole käytössä</h2>
            <p className="login-modal__subtitle">
              Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
            </p>
          </>
        ) : (
          <>
            <h2 id="login-modal-title">{title || 'Kirjaudu jatkaaksesi'}</h2>
            <p className="login-modal__subtitle">
              {message || 'Sinun täytyy kirjautua sisään ennen kassalle siirtymistä.'}
            </p>

            <GoogleAuthButton />
            <AppleAuthButton />
            <FacebookAuthButton />
            <p className="auth-divider">tai jatka sähköpostilla</p>

            <form className="auth-form" onSubmit={handleLogin}>
              {errorMessage && <p className="auth-error">{errorMessage}</p>}

              <div className="auth-field">
                <label htmlFor="login-modal-email">Sähköposti</label>
                <input
                  id="login-modal-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="login-modal-password">Salasana</label>
                <input
                  id="login-modal-password"
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

            <p className="auth-footer">
              Eikö sinulla ole vielä tiliä?{' '}
              {/* overHome: rekisteröintipaneelin taustalla etusivu - tämä sivu näyttäisi taas tämän ikkunan. */}
              <Link to="/register" state={{ from: location.pathname, overHome: true }}>
                Rekisteröidy
              </Link>
            </p>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

export default LoginModal
