import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PartnerHeader from '../components/PartnerHeader.jsx'
import Footer from '../components/Footer.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { translateAuthError } from '../lib/authErrors.js'
import './AuthForm.css'

function PartnerRegister() {
  const navigate = useNavigate()

  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantCategory, setRestaurantCategory] = useState('')
  const [restaurantCity, setRestaurantCity] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
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
        data: {
          is_restaurant_owner: true,
          owner_name: ownerName.trim(),
          owner_phone: ownerPhone.trim(),
          restaurant_name: restaurantName.trim(),
          restaurant_category: restaurantCategory.trim(),
          restaurant_city: restaurantCity.trim(),
          restaurant_address: restaurantAddress.trim(),
        },
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
      navigate('/kumppani/dashboard', { replace: true })
      return
    }

    setStatus('check-email')
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <PartnerHeader />
        <main className="auth-page">
          <div className="auth-card">
            <h1>Rekisteröityminen ei ole käytössä</h1>
            <p className="auth-card__subtitle">Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="page">
      <PartnerHeader />
      <main className="auth-page">
        <div className="auth-card">
          <h1>Liity Fikon kumppaniksi</h1>
          <p className="auth-card__subtitle">
            Luo kumppanitili ja ravintolasi perustiedot. Täytät ruokalistan ja avaat ravintolan kojelaudalta.
          </p>

          {status === 'check-email' ? (
            <p className="auth-success">
              Lähetimme vahvistuslinkin osoitteeseen {email}. Vahvista sähköpostisi, niin voit kirjautua sisään ja
              alkaa täyttää ravintolasi tietoja.
            </p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {errorMessage && <p className="auth-error">{errorMessage}</p>}

              <div className="auth-field">
                <label htmlFor="owner-name">Yhteyshenkilön nimi</label>
                <input
                  id="owner-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="owner-phone">Puhelinnumero</label>
                <input
                  id="owner-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
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

              <div className="auth-field">
                <label htmlFor="restaurant-name">Ravintolan nimi</label>
                <input
                  id="restaurant-name"
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="restaurant-category">Kategoria</label>
                <input
                  id="restaurant-category"
                  type="text"
                  placeholder="Esim. Pizza, Sushi, Kotiruoka"
                  required
                  value={restaurantCategory}
                  onChange={(e) => setRestaurantCategory(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="restaurant-city">Kaupunki</label>
                <input
                  id="restaurant-city"
                  type="text"
                  required
                  value={restaurantCity}
                  onChange={(e) => setRestaurantCity(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="restaurant-address">Osoite</label>
                <input
                  id="restaurant-address"
                  type="text"
                  required
                  value={restaurantAddress}
                  onChange={(e) => setRestaurantAddress(e.target.value)}
                />
              </div>

              <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Luodaan tiliä...' : 'Luo kumppanitili'}
              </button>
            </form>
          )}

          <p className="auth-footer">
            Onko sinulla jo kumppanitili? <Link to="/kumppani/kirjaudu">Kirjaudu sisään</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default PartnerRegister
