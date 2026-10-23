import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { rememberAuthRedirect } from '../lib/authRedirect.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Onko Google otettu käyttöön Supabasessa (Authentication > Providers)?
// Ilman tätä tarkistusta käytöstä poistettu kirjautuminen päätyisi Supabasen
// raakaan virhesivuun. Jos tarkistus ei onnistu, yritetään silti.
async function googleEnabled() {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } })
    if (!response.ok) return true
    const settings = await response.json()
    return settings.external?.google !== false
  } catch {
    return true
  }
}

// Google-kirjautuminen ja -rekisteröityminen (sama toiminto: uusi Google-tili
// luo asiakastilin, handle_new_customer-trigger ottaa nimen Googlelta). Google
// palaa /register-sivulle, joka ohjaa returnTo-osoitteeseen (oletus: nykyinen sivu).
function GoogleAuthButton({ label = 'Jatka Googlella', returnTo }) {
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setError('')
    setBusy(true)
    if (!(await googleEnabled())) {
      setError('Google-kirjautuminen ei ole vielä käytössä. Jatka sähköpostilla.')
      setBusy(false)
      return
    }
    rememberAuthRedirect(returnTo ?? `${location.pathname}${location.search}`)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/register` },
    })
    // Onnistuessa selain siirtyy Googleen, joten tänne tullaan vain virheessä.
    if (oauthError) {
      setError('Google-kirjautuminen epäonnistui. Yritä uudelleen tai jatka sähköpostilla.')
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className="oauth-btn" onClick={signIn} disabled={busy} aria-busy={busy}>
        <svg className="oauth-btn__icon" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M19.6 10.23c0-.68-.06-1.33-.17-1.96H10v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.31 2.99-7.27Z"
            fill="#4285F4"
          />
          <path
            d="M10 20c2.7 0 4.96-.89 6.61-2.42l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.06v2.59A10 10 0 0 0 10 20Z"
            fill="#34A853"
          />
          <path
            d="M4.41 11.93a5.99 5.99 0 0 1 0-3.86V5.48H1.06a10 10 0 0 0 0 9.04l3.35-2.59Z"
            fill="#FBBC05"
          />
          <path
            d="M10 3.96c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.98 9.98 0 0 0 10 0a10 10 0 0 0-8.94 5.48l3.35 2.6C5.2 5.72 7.4 3.96 10 3.96Z"
            fill="#EA4335"
          />
        </svg>
        {busy ? 'Siirrytään Googleen…' : label}
      </button>
      {error && <p className="auth-error oauth-error">{error}</p>}
    </>
  )
}

export default GoogleAuthButton
