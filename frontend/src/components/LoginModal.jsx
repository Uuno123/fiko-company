import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GoogleAuthButton from './GoogleAuthButton.jsx'
import AppleAuthButton from './AppleAuthButton.jsx'
import FacebookAuthButton from './FacebookAuthButton.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import '../pages/AuthForm.css'
import './LoginModal.css'

function LoginModal({ title, message, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

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
    <div className="login-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
        <button type="button" className="login-modal__close" aria-label="Sulje" onClick={onClose}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

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
            <p className="login-modal__subtitle">{message || 'Sinun täytyy kirjautua sisään ennen kassalle siirtymistä.'}</p>

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
              Eikö sinulla ole vielä tiliä? <Link to="/register">Rekisteröidy</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default LoginModal
