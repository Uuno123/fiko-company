import { useState } from 'react'
import { Link } from 'react-router-dom'
import PartnerHeader from '../components/PartnerHeader.jsx'
import Footer from '../components/Footer.jsx'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import './PartnerApplication.css'

function PartnerRegister() {
  const [businessId, setBusinessId] = useState('')
  const [legalName, setLegalName] = useState('')
  const [website, setWebsite] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [email, setEmail] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantCategory, setRestaurantCategory] = useState('')
  const [restaurantCity, setRestaurantCity] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [restaurantPostalCode, setRestaurantPostalCode] = useState('')
  const [restaurantDescription, setRestaurantDescription] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    const { error } = await supabase.from('partner_applications').insert({
      business_id: businessId.trim(),
      legal_name: legalName.trim(),
      website: website.trim() || null,
      owner_name: ownerName.trim(),
      owner_phone: ownerPhone.trim(),
      owner_email: email.trim(),
      restaurant_name: restaurantName.trim(),
      restaurant_category: restaurantCategory.trim(),
      restaurant_city: restaurantCity.trim(),
      restaurant_address: restaurantAddress.trim(),
      restaurant_postal_code: restaurantPostalCode.trim(),
      restaurant_description: restaurantDescription.trim(),
    })

    if (error) {
      setErrorMessage('Hakemuksen lähetys epäonnistui: ' + error.message)
      setStatus('idle')
      return
    }

    setStatus('submitted')
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page">
        <PartnerHeader />
        <main className="application-page">
          <div className="application-card">
            <h1>Kumppanuushakemus ei ole käytössä</h1>
            <p className="application-card__subtitle">
              Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="page">
      <PartnerHeader />
      <main className="application-page">
        <div className="application-card">
          <h1>Kumppanuushakemus</h1>
          <p className="application-card__subtitle">
            Täytä yrityksesi ja ravintolasi tiedot alle mahdollisimman kattavasti - se nopeuttaa käsittelyä.
            Käsittelemme hakemuksen ja otamme sinuun yhteyttä sähköpostitse. Kirjautumistunnukset kojelaudalle
            saat vasta hakemuksen hyväksynnän jälkeen.
          </p>

          {status === 'submitted' ? (
            <p className="application-success">
              Kiitos! Kumppanuushakemuksesi on vastaanotettu. Otamme sinuun yhteyttä osoitteeseen {email}, kun
              hakemus on käsitelty.
            </p>
          ) : (
            <form className="application-form" onSubmit={handleSubmit}>
              {errorMessage && <p className="application-error">{errorMessage}</p>}

              <section className="application-section">
                <h2>Yrityksen tiedot</h2>
                <div className="application-field-grid">
                  <div className="application-field">
                    <label htmlFor="business-id">Y-tunnus</label>
                    <input
                      id="business-id"
                      type="text"
                      placeholder="1234567-8"
                      pattern="\d{7}-\d"
                      title="Y-tunnus muodossa 1234567-8"
                      required
                      value={businessId}
                      onChange={(e) => setBusinessId(e.target.value)}
                    />
                  </div>

                  <div className="application-field">
                    <label htmlFor="legal-name">Yrityksen virallinen nimi</label>
                    <input
                      id="legal-name"
                      type="text"
                      placeholder="Esim. Ravintola Oy"
                      required
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                    />
                  </div>

                  <div className="application-field application-field--full">
                    <label htmlFor="website">Verkkosivu tai somelinkki (valinnainen)</label>
                    <input
                      id="website"
                      type="text"
                      placeholder="https://..."
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="application-section">
                <h2>Yhteyshenkilö</h2>
                <div className="application-field-grid">
                  <div className="application-field">
                    <label htmlFor="owner-name">Nimi</label>
                    <input
                      id="owner-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                  </div>

                  <div className="application-field">
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

                  <div className="application-field">
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
                </div>
              </section>

              <section className="application-section">
                <h2>Ravintola</h2>
                <div className="application-field-grid">
                  <div className="application-field">
                    <label htmlFor="restaurant-name">Ravintolan nimi</label>
                    <input
                      id="restaurant-name"
                      type="text"
                      required
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                    />
                  </div>

                  <div className="application-field">
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

                  <div className="application-field">
                    <label htmlFor="restaurant-city">Kaupunki</label>
                    <input
                      id="restaurant-city"
                      type="text"
                      required
                      value={restaurantCity}
                      onChange={(e) => setRestaurantCity(e.target.value)}
                    />
                  </div>

                  <div className="application-field">
                    <label htmlFor="restaurant-postal-code">Postinumero</label>
                    <input
                      id="restaurant-postal-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="70100"
                      required
                      value={restaurantPostalCode}
                      onChange={(e) => setRestaurantPostalCode(e.target.value)}
                    />
                  </div>

                  <div className="application-field application-field--full">
                    <label htmlFor="restaurant-address">Osoite</label>
                    <input
                      id="restaurant-address"
                      type="text"
                      required
                      value={restaurantAddress}
                      onChange={(e) => setRestaurantAddress(e.target.value)}
                    />
                  </div>

                  <div className="application-field application-field--full">
                    <label htmlFor="restaurant-description">Kerro lyhyesti ravintolastasi</label>
                    <textarea
                      id="restaurant-description"
                      rows={4}
                      placeholder="Minkälaista ruokaa tarjoatte, minkä kokoinen ravintola on, kuinka kauan olette toimineet..."
                      required
                      value={restaurantDescription}
                      onChange={(e) => setRestaurantDescription(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <button type="submit" className="application-submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Lähetetään hakemusta...' : 'Lähetä kumppanuushakemus'}
              </button>
            </form>
          )}

          <p className="application-footer">
            Onko hakemuksesi jo hyväksytty? <Link to="/kumppani/kirjaudu">Kirjaudu sisään</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default PartnerRegister
