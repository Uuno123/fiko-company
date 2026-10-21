import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import Footer from '../components/Footer.jsx'
import PartnerHeader from '../components/PartnerHeader.jsx'
import ApplicationAside from '../components/partner/ApplicationAside.jsx'
import { COURIER_PAY } from '../lib/deliveryTime.js'
import { formatPrice } from '../lib/format.js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'
import './PartnerApplication.css'

// Arvot samat kuin driver_applications.vehicle_type (migraatio 0027).
const VEHICLES = [
  { value: 'polkupyora', label: 'Polkupyörä' },
  { value: 'sahkopyora', label: 'Sähköpyörä' },
  { value: 'mopo', label: 'Mopo tai skootteri' },
  { value: 'auto', label: 'Auto' },
]

const STEPS = [
  { title: 'Lähetä hakemus', body: 'Yhteystiedot, kaupunki ja kulkuneuvo.' },
  { title: 'Otamme yhteyttä', body: 'Käymme hakemuksen läpi ja olemme yhteydessä sähköpostitse.' },
  { title: 'Aloita ajaminen', body: 'Saat tunnukset kuljettajasovellukseen ja voit mennä online-tilaan.' },
]

const FACTS = [
  { value: formatPrice(COURIER_PAY.baseCents), label: 'perusmaksu jokaisesta keikasta' },
  { value: `+${formatPrice(COURIER_PAY.perKmCents)}`, label: 'jokaiselta ajetulta kilometriltä' },
  { value: '8 km', label: 'keikat lähelläsi, lähin saa tarjouksen ensin' },
  { value: 'Y-tunnus', label: 'ajat yrittäjänä tai kevytyrittäjänä laskutuspalvelun kautta' },
]

// Kuljettajahakemus kumppanisivulta (/kumppani/kuljettajaksi). Tallentuu
// driver_applications-tauluun (0027); delivo hyväksyy kuljettajat ja lisää
// tilin couriers-tauluun käsin.
function CourierApplication() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [vehicle, setVehicle] = useState('polkupyora')
  const [message, setMessage] = useState('')
  const [adult, setAdult] = useState(false)
  const [entrepreneur, setEntrepreneur] = useState(false)
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    const { error } = await supabase.from('driver_applications').insert({
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      vehicle_type: vehicle,
      message: message.trim() || null,
    })

    if (error) {
      setErrorMessage('Hakemuksen lähetys epäonnistui. Tarkista yhteys ja yritä uudelleen.')
      setStatus('idle')
      return
    }

    setStatus('submitted')
  }

  return (
    <div className="page">
      <PartnerHeader />
      <main className="application-page">
        <div className="application-layout">
          <div className="application-card">
            <h1>Kuljettajahakemus</h1>
            <p className="application-card__subtitle">
              Aja keikkoja silloin kun sinulle sopii. Kuljettajana toimit yrittäjänä omalla Y-tunnuksella tai
              kevytyrittäjänä. Täytä tietosi, niin olemme sinuun yhteydessä sähköpostitse.
            </p>

            {!isSupabaseConfigured ? (
              <p className="application-error">
                Hakemusta ei voi lähettää: Supabase-yhteyttä ei ole määritetty (VITE_SUPABASE_URL /
                VITE_SUPABASE_ANON_KEY).
              </p>
            ) : status === 'submitted' ? (
              <div className="application-success" role="status">
                <span className="application-success__icon" aria-hidden="true">
                  <Check size={18} strokeWidth={3} />
                </span>
                <p>
                  Kiitos! Kuljettajahakemuksesi on vastaanotettu. Otamme sinuun yhteyttä osoitteeseen {email}, kun
                  hakemus on käsitelty.
                </p>
              </div>
            ) : (
              <form className="application-form" onSubmit={handleSubmit}>
                {errorMessage && <p className="application-error">{errorMessage}</p>}

                <section className="application-section">
                  <h2>Yhteystiedot</h2>
                  <div className="application-field-grid">
                    <div className="application-field">
                      <label htmlFor="courier-name">Nimi</label>
                      <input
                        id="courier-name"
                        type="text"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <div className="application-field">
                      <label htmlFor="courier-phone">Puhelinnumero</label>
                      <input
                        id="courier-phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="application-field">
                      <label htmlFor="courier-email">Sähköposti</label>
                      <input
                        id="courier-email"
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
                  <h2>Ajaminen</h2>
                  <div className="application-field-grid">
                    <div className="application-field">
                      <label htmlFor="courier-city">Kaupunki</label>
                      <input
                        id="courier-city"
                        type="text"
                        autoComplete="address-level2"
                        placeholder="Esim. Kuopio"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>

                    <div className="application-field">
                      <label htmlFor="courier-vehicle">Kulkuneuvo</label>
                      <select id="courier-vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
                        {VEHICLES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="application-field application-field--full">
                      <label htmlFor="courier-message">Kerro itsestäsi (valinnainen)</label>
                      <textarea
                        id="courier-message"
                        rows={3}
                        placeholder="Esim. milloin pystyt ajamaan ja onko sinulla kokemusta kuljetuksista."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                  </div>

                  <label className="application-check">
                    <input type="checkbox" required checked={adult} onChange={(e) => setAdult(e.target.checked)} />
                    <span>Olen vähintään 18-vuotias</span>
                  </label>

                  <label className="application-check">
                    <input
                      type="checkbox"
                      required
                      checked={entrepreneur}
                      onChange={(e) => setEntrepreneur(e.target.checked)}
                    />
                    <span>Toimin kuljettajana yrittäjänä (oma Y-tunnus) tai kevytyrittäjänä</span>
                  </label>
                </section>

                <button type="submit" className="application-submit" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Lähetetään hakemusta...' : 'Lähetä kuljettajahakemus'}
                </button>
              </form>
            )}

            <p className="application-footer">
              Ravintola? <Link to="/kumppani/rekisteroidy">Jätä ravintolan kumppanuushakemus</Link>
            </p>
          </div>

          <ApplicationAside eyebrow="delivo kuljettajille" title="Näin pääset ajamaan" steps={STEPS} facts={FACTS} />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default CourierApplication
