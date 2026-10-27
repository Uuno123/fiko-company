import { useState } from 'react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import '../pages/AuthForm.css'
import './Settings.css'

function SettingsPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setStatus('submitting')

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setError(translateAuthError(updateError))
      setStatus('idle')
      return
    }

    setNewPassword('')
    setStatus('idle')
    setSaved(true)
  }

  return (
    <SettingsLayout title="Salasana" description="Vaihda kirjautumisessa käyttämäsi salasana.">
      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Vaihda salasana</h2>
        </div>
        <form className="settings-panel settings-panel__body auth-form" onSubmit={handleSubmit}>
          {error && <p className="auth-error">{error}</p>}
          {saved && <p className="auth-success">Salasana vaihdettu.</p>}

          <div className="auth-field">
            <label htmlFor="new-password">Uusi salasana</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <span className="auth-field__hint">Vähintään 6 merkkiä</span>
          </div>

          <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Vaihdetaan...' : 'Vaihda salasana'}
          </button>
        </form>
      </section>
    </SettingsLayout>
  )
}

export default SettingsPassword
