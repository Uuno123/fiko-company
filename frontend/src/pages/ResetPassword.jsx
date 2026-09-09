import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import './AuthForm.css'

function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return

    // Supabase lukee palautuslinkin access_tokenin URL:sta ja luo session automaattisesti.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMessage(translateAuthError(error))
      setStatus('idle')
      return
    }

    navigate('/', { replace: true })
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <Header />
        <main className="auth-page">
          <div className="auth-card">
            <h1>Salasanan palautus ei ole käytössä</h1>
            <p className="auth-card__subtitle">Supabase-yhteyttä ei ole määritetty.</p>
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
          <h1>Aseta uusi salasana</h1>

          {!ready ? (
            <p className="auth-card__subtitle">Tarkistetaan palautuslinkkiä...</p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {errorMessage && <p className="auth-error">{errorMessage}</p>}

              <div className="auth-field">
                <label htmlFor="password">Uusi salasana</label>
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
                {status === 'submitting' ? 'Tallennetaan...' : 'Tallenna uusi salasana'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
