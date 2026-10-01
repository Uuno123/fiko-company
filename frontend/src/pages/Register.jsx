import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import GoogleAuthButton from '../components/GoogleAuthButton.jsx'
import AppleAuthButton from '../components/AppleAuthButton.jsx'
import FacebookAuthButton from '../components/FacebookAuthButton.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './AuthForm.css'

// Rekisteröityminen alkaa AINA sähköpostin vahvistuksella (käyttäjän vaatimus):
//   1. sähköposti -> Supabase lähettää vahvistuslinkin (signInWithOtp)
//   2. linkki palaa tälle sivulle kirjautuneena -> vasta nyt nimi, puhelin ja salasana
// Tiliä ei siis voi täyttää valmiiksi ennen kuin sähköpostin omistus on todistettu.
// Linkki avautuu usein uuteen välilehteen, joten paluuosoite talletetaan selaimeen.
const REDIRECT_KEY = 'delivo-register-redirect'

function readStoredRedirect() {
  try {
    return localStorage.getItem(REDIRECT_KEY) || '/'
  } catch {
    return '/'
  }
}

function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, status: authStatus, refreshCustomer } = useAuth()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'link-sent'
  const [errorMessage, setErrorMessage] = useState('')

  // Nimi tallennetaan user_metadataan vasta viimeisessä vaiheessa, joten sen puuttuminen
  // tarkoittaa että sähköposti on vahvistettu mutta tiedot ovat vielä täyttämättä.
  const profileComplete = Boolean(session?.user.user_metadata?.name)
  const needsDetails = Boolean(session) && !profileComplete

  useEffect(() => {
    if (session && profileComplete && status !== 'submitting') {
      navigate(readStoredRedirect(), { replace: true })
    }
  }, [session, profileComplete, status, navigate])

  async function sendVerificationLink(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    try {
      localStorage.setItem(REDIRECT_KEY, location.state?.from || '/')
    } catch {
      // Ei tallennustilaa - rekisteröitymisen jälkeen palataan etusivulle.
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/register` },
    })

    if (error) {
      setErrorMessage(translateAuthError(error))
      setStatus('idle')
      return
    }

    setStatus('link-sent')
  }

  async function completeProfile(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    const { error } = await supabase.auth.updateUser({
      password,
      data: { name: name.trim(), phone: phone.trim() },
    })

    if (error) {
      setErrorMessage(translateAuthError(error))
      setStatus('idle')
      return
    }

    // Asiakasrivi syntyi tyhjillä tiedoilla jo vahvistuksessa (handle_new_customer-trigger),
    // joten nimi ja puhelin päivitetään siihen erikseen.
    const { error: profileError } = await supabase
      .from('customers')
      .update({ name: name.trim(), phone: phone.trim() })
      .eq('id', session.user.id)

    if (profileError) {
      console.error('[delivo-frontend] Asiakastietojen tallennus epäonnistui:', profileError)
      setErrorMessage('Tietojen tallennus epäonnistui. Yritä uudelleen.')
      setStatus('idle')
      return
    }

    await refreshCustomer()
    const target = readStoredRedirect()
    try {
      localStorage.removeItem(REDIRECT_KEY)
    } catch {
      // Ei tallennustilaa - ei mitään poistettavaa.
    }
    navigate(target, { replace: true })
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <main className="auth-page auth-page--full-height">
          <div className="auth-card">
            <h1>Rekisteröityminen ei ole käytössä</h1>
            <p className="auth-card__subtitle">Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</p>
          </div>
        </main>
      </div>
    )
  }

  if (authStatus === 'loading') {
    return <div className="page" />
  }

  if (needsDetails) {
    return (
      <div className="page">
        <main className="auth-page auth-page--full-height">
          <div className="auth-card">
            <h1>Viimeistele tilisi</h1>
            <p className="auth-card__subtitle">Sähköposti vahvistettu. Lisää vielä tietosi ja salasana.</p>

            <form className="auth-form" onSubmit={completeProfile}>
              {errorMessage && <p className="auth-error">{errorMessage}</p>}

              <p className="auth-step-email">{session.user.email}</p>

              <div className="auth-field">
                <label htmlFor="name">Nimi</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                {status === 'submitting' ? 'Tallennetaan...' : 'Luo tili'}
              </button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <main className="auth-page auth-page--full-height">
        <div className="auth-card">
          <h1>Luo Delivo-tili</h1>
          <p className="auth-card__subtitle">Näet tilaushistoriasi ja tilaat nopeammin uudelleen. Voit tilata myös ilman tiliä.</p>

          {status === 'link-sent' ? (
            <>
              <p className="auth-success">
                Lähetimme vahvistuslinkin osoitteeseen {email}. Avaa linkki, niin pääset lisäämään nimesi ja
                salasanasi.
              </p>
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setErrorMessage('')
                  setStatus('idle')
                }}
              >
                Vaihda sähköpostiosoite tai lähetä uudelleen
              </button>
            </>
          ) : (
            <>
              <GoogleAuthButton label="Rekisteröidy Googlella" />
              <AppleAuthButton label="Rekisteröidy Apple ID:llä" />
              <FacebookAuthButton label="Rekisteröidy Facebookilla" />
              <p className="auth-divider">tai jatka sähköpostilla</p>

              <form className="auth-form" onSubmit={sendVerificationLink}>
                {errorMessage && <p className="auth-error">{errorMessage}</p>}

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

                <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Lähetetään...' : 'Jatka'}
                </button>
              </form>
            </>
          )}

          <p className="auth-footer">
            Onko sinulla jo tili? <Link to="/login" state={{ from: location.state?.from || '/' }}>Kirjaudu sisään</Link>
          </p>

          {/* Referenssikuvassa "tietosuojaseloste" on linkki, mutta sellaista sivua ei ole
              vielä olemassa - rikkinäisen linkin sijaan teksti on toistaiseksi pelkkää tekstiä. */}
          <p className="auth-legal">
            Delivon tietosuojaseloste sisältää tietoa henkilötietojen käsittelystä Delivolla.
          </p>
        </div>
      </main>
    </div>
  )
}

export default Register
