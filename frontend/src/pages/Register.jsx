import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import GoogleAuthButton from '../components/GoogleAuthButton.jsx'
import AppleAuthButton from '../components/AppleAuthButton.jsx'
import FacebookAuthButton from '../components/FacebookAuthButton.jsx'
import { BirthDateField, CodeInput, PhoneField } from '../components/AuthInputs.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import { nationalPhone, splitName } from '../lib/format.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { forgetAuthRedirect, readAuthRedirect, rememberAuthRedirect } from '../lib/authRedirect.js'
import { REGISTER_ADDRESS_PATH, ageFromBirthDate, hasSavedAddress } from '../lib/customerAddress.js'
import './AuthForm.css'

// Rekisteröityminen alkaa AINA sähköpostin vahvistuksella (käyttäjän vaatimus):
//   1. sähköposti -> Supabase lähettää 6-numeroisen koodin (signInWithOtp), joka
//      syötetään tällä sivulla (verifyOtp) - käyttäjän pyyntö 27.10.2026, linkin
//      tilalle. Koodi tulee sähköpostiin vain, jos Supabasen Magic Link- ja
//      Confirm signup -pohjissa on {{ .Token }}; linkkiversio toimii edelleen,
//      jos pohjassa on vielä linkki.
//   2. vahvistettuna vasta nyt nimi, puhelin, syntymäaika ja salasana
//   3. erillinen osoitesivu (RegisterAddress.jsx): asunnon tyyppi, tarkka osoite
//      ja ohjeet kuljettajalle, kuten Woltissa (käyttäjän pyyntö 27.10.2026)
// Tiliä ei siis voi täyttää valmiiksi ennen kuin sähköpostin omistus on todistettu.
// Paluuosoite talletetaan selaimeen (lib/authRedirect.js), koska linkki avautuu
// usein uuteen välilehteen. Myös Google-kirjautuminen palaa tälle sivulle: Google
// antaa nimen, joten salasanaa ei kysytä, mutta puhelin, syntymäaika ja osoite
// kysytään kuten muiltakin. Sisältö näkyy puhelimella alhaalta liukuvassa
// paneelissa ja työpöydällä omana sivunaan (App.jsx: AppRoutes).

// Tietosuoja-asetuksen mukaan alle 13-vuotias tarvitsisi huoltajan suostumuksen.
const MIN_AGE = 13
// Supabasen "Email OTP Length" -asetus (Authentication -> Providers -> Email).
const CODE_LENGTH = 6
// Supabase sallii uuden koodin samalle osoitteelle oletuksena minuutin välein.
const RESEND_SECONDS = 60

const EMPTY_BIRTH = { day: '', month: '', year: '' }

// { day, month, year } -> 'yyyy-mm-dd', tai null jos puuttuu tai päivää ei ole
// (esim. 31. helmikuuta).
function birthDateIso({ day, month, year }) {
  if (!day || !month || !year) return null
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (date.getMonth() !== Number(month) - 1) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function birthParts(iso) {
  const [year, month, day] = String(iso ?? '').split('-')
  return year && month && day ? { day: String(Number(day)), month: String(Number(month)), year } : EMPTY_BIRTH
}

// preview: { step, onNext } vain esikatselusivulta (pages/__PreviewRegister.jsx).
// Silloin mitään ei lähetetä Supabaseen, vaan "Jatka" siirtyy seuraavaan vaiheeseen.
function Register({ preview } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, customer, status: authStatus, refreshCustomer } = useAuth()

  const [email, setEmail] = useState(preview?.step === 'code' ? 'matti@example.com' : '')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('') // ilman +358-etuliitettä
  const [birth, setBirth] = useState(EMPTY_BIRTH)
  const [password, setPassword] = useState('')
  // 'idle' | 'submitting' | 'code-sent' | 'verifying'
  const [status, setStatus] = useState(preview?.step === 'code' ? 'code-sent' : 'idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(preview?.step === 'code' ? RESEND_SECONDS : 0)

  // Uuden koodin pyyntö aukeaa vasta kun Supabasen minuuttiraja on kulunut.
  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  // Nimi tallennetaan user_metadataan vasta tässä vaiheessa, joten sen puuttuminen
  // tarkoittaa että sähköposti on vahvistettu mutta salasana on vielä asettamatta.
  // Googlen kautta tulleella nimi on valmiina eikä salasanaa tarvita.
  const needsPassword = !session?.user.user_metadata?.name
  // Asiakasrivi (AuthContext) latautuu vasta istunnon jälkeen; siihen asti ei
  // tiedetä, puuttuuko jotain.
  const customerLoading = Boolean(session) && !customer
  const detailsComplete =
    !needsPassword && Boolean(customer?.name?.trim() && customer?.phone?.trim() && customer?.birth_date)
  const needsDetails = Boolean(customer) && !detailsComplete

  // Tiedot valmiina: osoitesivulle, tai jos osoitekin on jo tallennettu, paluuosoitteeseen.
  function continueAfterDetails() {
    if (hasSavedAddress(customer)) {
      const target = readAuthRedirect()
      forgetAuthRedirect()
      navigate(target, { replace: true })
    } else {
      navigate(REGISTER_ADDRESS_PATH, { replace: true })
    }
  }

  useEffect(() => {
    if (session && detailsComplete && status !== 'submitting') continueAfterDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, detailsComplete, status])

  // Googlen nimi ja aiemmin annetut tiedot valmiiksi kenttiin.
  useEffect(() => {
    if (!customer) return
    const { first, last } = splitName(customer.name)
    setFirstName((current) => current || first)
    setLastName((current) => current || last)
    setPhone((current) => current || nationalPhone(customer.phone))
    setBirth((current) => (current === EMPTY_BIRTH ? birthParts(customer.birth_date) : current))
  }, [customer])

  // Lähettää koodin (ensimmäinen kerta lomakkeelta, uusi koodi napista).
  async function sendCode(e) {
    e?.preventDefault()
    setErrorMessage('')
    if (preview) {
      if (status === 'code-sent') setResendIn(RESEND_SECONDS)
      else preview.onNext()
      return
    }
    const resending = status === 'code-sent'
    if (!resending) setStatus('submitting')

    rememberAuthRedirect(location.state?.from || '/')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/register` },
    })

    if (error) {
      setErrorMessage(translateAuthError(error))
      if (!resending) setStatus('idle')
      return
    }

    setCode('')
    setResendIn(RESEND_SECONDS)
    setStatus('code-sent')
  }

  // Oikea koodi kirjaa sisään: AuthContext saa istunnon ja asiakasrivin, jolloin
  // sivu vaihtuu tietolomakkeeseen.
  async function verifyCode(token) {
    if (token.length !== CODE_LENGTH || status === 'verifying') return
    setErrorMessage('')
    if (preview) {
      preview.onNext()
      return
    }
    setStatus('verifying')

    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })

    if (error) {
      setErrorMessage(translateAuthError(error))
      setStatus('code-sent')
      return
    }

    setStatus('idle')
  }

  function changeEmail() {
    setErrorMessage('')
    setCode('')
    setStatus('idle')
  }

  async function completeProfile(e) {
    e.preventDefault()
    setErrorMessage('')

    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 6 || phoneDigits.length > 11) {
      setErrorMessage('Tarkista puhelinnumero.')
      return
    }
    const birthDate = birthDateIso(birth)
    const age = birthDate ? ageFromBirthDate(birthDate) : null
    if (age == null || age > 120) {
      setErrorMessage('Tarkista syntymäaika.')
      return
    }
    if (age < MIN_AGE) {
      setErrorMessage(`Bidropin käyttäjän on oltava vähintään ${MIN_AGE}-vuotias.`)
      return
    }
    if (preview) {
      preview.onNext()
      return
    }

    setStatus('submitting')
    // Nimi tallennetaan yhtenä (kuljettaja ja ravintola näkevät koko nimen),
    // puhelin kansainvälisessä muodossa.
    const name = `${firstName.trim()} ${lastName.trim()}`
    const fullPhone = `+358${phoneDigits}`

    const { error } = await supabase.auth.updateUser({
      ...(needsPassword ? { password } : {}),
      data: { name, phone: fullPhone },
    })

    if (error) {
      setErrorMessage(translateAuthError(error))
      setStatus('idle')
      return
    }

    // Asiakasrivi syntyi tyhjillä tiedoilla jo vahvistuksessa (handle_new_customer-trigger),
    // joten nimi, puhelin ja syntymäaika päivitetään siihen erikseen.
    const { error: profileError } = await supabase
      .from('customers')
      .update({ name, phone: fullPhone, birth_date: birthDate })
      .eq('id', session.user.id)

    if (profileError) {
      console.error('[delivo-frontend] Asiakastietojen tallennus epäonnistui:', profileError)
      setErrorMessage('Tietojen tallennus epäonnistui. Yritä uudelleen.')
      setStatus('idle')
      return
    }

    await refreshCustomer()
    continueAfterDetails()
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-card">
        <h1 id="auth-title">Rekisteröityminen ei ole käytössä</h1>
        <p className="auth-card__subtitle">
          Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
        </p>
      </div>
    )
  }

  // Valmis tili ohjataan eteenpäin (efekti yllä) - ei välähdystä sähköpostilomakkeesta.
  if (authStatus === 'loading' || customerLoading || (session && detailsComplete)) {
    return null
  }

  if (needsDetails) {
    return (
      <div className="auth-card">
        <h1 id="auth-title">Viimeistele tilisi</h1>

        <form className="auth-form" onSubmit={completeProfile}>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <p className="auth-step-email">{session.user.email}</p>

          <div className="auth-field-row">
            <div className="auth-field">
              <label htmlFor="first-name">Etunimi</label>
              <input
                id="first-name"
                type="text"
                autoComplete="given-name"
                required
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="last-name">Sukunimi</label>
              <input
                id="last-name"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="phone">Puhelinnumero</label>
            <PhoneField id="phone" value={phone} onChange={setPhone} />
          </div>

          <div className="auth-field">
            <label htmlFor="birth-day">Syntymäaika</label>
            <BirthDateField
              idPrefix="birth"
              value={birth}
              onChange={setBirth}
              latestYear={new Date().getFullYear() - MIN_AGE}
            />
            <span className="auth-field__hint">Ikäsi tarkistamista varten. Ei näy muille.</span>
          </div>

          {needsPassword && (
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
          )}

          <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Tallennetaan...' : 'Jatka'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h1 id="auth-title">Luo Bidrop-tili</h1>

      {status === 'code-sent' || status === 'verifying' ? (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault()
            verifyCode(code)
          }}
        >
          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <p className="auth-step-email">
            {email.trim()}
            <button type="button" className="auth-link-button" onClick={changeEmail}>
              Vaihda
            </button>
          </p>

          <div className="auth-field">
            <span className="auth-field__label">Syötä sähköpostiin lähetetty {CODE_LENGTH}-numeroinen koodi</span>
            <CodeInput
              length={CODE_LENGTH}
              value={code}
              onChange={setCode}
              onComplete={verifyCode}
              disabled={status === 'verifying'}
              autoFocus
            />
            {/* Kunnes oma SMTP ja koodipohja on otettu käyttöön (odottaa verkkotunnusta),
                Supabasen oletusviestissä on linkki eikä koodia - linkki toimii yhä. */}
            <span className="auth-field__hint">
              Viesti tulee hetken kuluttua; tarkista tarvittaessa roskapostikansio. Jos viestissä on linkki koodin
              sijaan, avaa linkki, niin pääset jatkamaan.
            </span>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={code.length !== CODE_LENGTH || status === 'verifying'}
          >
            {status === 'verifying' ? 'Tarkistetaan...' : 'Vahvista'}
          </button>

          <button type="button" className="auth-link-button" disabled={resendIn > 0} onClick={() => sendCode()}>
            {resendIn > 0 ? `Lähetä uusi koodi (${resendIn} s)` : 'Lähetä uusi koodi'}
          </button>
        </form>
      ) : (
        <>
          <GoogleAuthButton label="Rekisteröidy Googlella" returnTo={location.state?.from || '/'} />
          <AppleAuthButton label="Rekisteröidy Apple ID:llä" />
          <FacebookAuthButton label="Rekisteröidy Facebookilla" />
          <p className="auth-divider">tai jatka sähköpostilla</p>

          <form className="auth-form" onSubmit={sendCode}>
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
        Onko sinulla jo tili?{' '}
        <Link to="/login" replace state={{ ...location.state, from: location.state?.from || '/' }}>
          Kirjaudu sisään
        </Link>
      </p>

      {/* Referenssikuvassa "tietosuojaseloste" on linkki, mutta sellaista sivua ei ole
              vielä olemassa - rikkinäisen linkin sijaan teksti on toistaiseksi pelkkää tekstiä. */}
      <p className="auth-legal">Bidropin tietosuojaseloste sisältää tietoa henkilötietojen käsittelystä Bidropilla.</p>
    </div>
  )
}

export default Register
