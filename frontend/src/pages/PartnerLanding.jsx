import { useState } from 'react'
import { Link } from 'react-router-dom'
import PartnerHeader from '../components/PartnerHeader.jsx'
import Footer from '../components/Footer.jsx'
import { supabase } from '../lib/supabaseClient.js'
import './PartnerCommon.css'
import './PartnerLanding.css'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1800&q=80'
const STEPS_IMAGE = 'https://images.unsplash.com/photo-1564489563601-c53cfc451e93?auto=format&fit=crop&w=1400&q=80'
const CTA_IMAGE = 'https://images.unsplash.com/photo-1680405229153-a753d043c4ec?auto=format&fit=crop&w=1800&q=80'
const DRIVER_HERO_IMAGE = 'https://images.unsplash.com/photo-1572195577046-2f25894c06fc?auto=format&fit=crop&w=1800&q=80'
const DRIVER_IMAGE = 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1200&q=80'

const AUDIENCE_HERO = {
  restaurants: {
    title: 'Tuo ravintolasi delivoon',
    body: 'delivo on suomalainen ruoantilausalusta. Liity kumppaniksi ja tavoita uusia asiakkaita - asiakkaasi voivat noutaa itse tai valita kotiinkuljetuksen, jonka delivo hoitaa puolestasi.',
    image: HERO_IMAGE,
  },
  drivers: {
    title: 'Aja delivolle',
    body: 'Kuljeta tilauksia kaupungissasi omilla ehdoillasi. Kuljettajaohjelmaa rakennetaan parhaillaan - pysy kuulolla.',
    image: DRIVER_HERO_IMAGE,
  },
}

const DRIVER_POINTS = [
  'Joustavat työajat - aja silloin kun sinulle sopii',
  'Tienaa lisätuloja jokaisesta toimituksesta',
  'Ei sitoumusta - aloita ja lopeta koska haluat',
]

const DRIVER_REQUIREMENTS = ['18 vuotta täyttänyt', 'Oma kulkuneuvo (polkupyörä, sähköpyörä, mopo tai auto)', 'Älypuhelin']

const VEHICLE_OPTIONS = [
  { value: 'polkupyora', label: 'Polkupyörä' },
  { value: 'sahkopyora', label: 'Sähköpyörä' },
  { value: 'mopo', label: 'Mopo' },
  { value: 'auto', label: 'Auto' },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m5 10 3.5 3.5L15 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BenefitReachIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function BenefitDeliveryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 6h9l3 4h2v4h-1M3 6v8h1m0 0a2 2 0 1 0 4 0m-4 0h4m6 0a2 2 0 1 0 4 0m-4 0h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Puhtaasti havainnollistava, ei oikeaan dataan perustuva pikkukaavio - ei väitetä olevan
// oikea kuvakaappaus tai oikeita lukuja (samaa rehellisyysperiaatetta kuin luottamuspalkissa).
function DashboardPreview() {
  const bars = [32, 58, 42, 70, 46, 84, 60]
  return (
    <div className="partner-insight-preview" aria-hidden="true">
      <div className="partner-insight-preview__chart">
        {bars.map((height, i) => (
          <div className="partner-insight-preview__bar" key={i} style={{ height: `${height}%` }} />
        ))}
      </div>
      <span className="partner-insight-preview__caption">Kojelaudan tilastonäkymä (havainnollistus)</span>
    </div>
  )
}

const TRUST_ITEMS = ['Ei sitoutumisaikaa', 'Laite ja kojelauta sisältyvät', 'Nouto ja kotiinkuljetus']

const DEEP_BENEFITS = [
  {
    title: 'Uusia asiakkaita lähialueelta',
    body: 'Ravintolasi näkyy delivon etusivulla kaupunkisi asukkaille - ei erillistä markkinointibudjettia tarvita.',
    bullets: ['Näkyvyys delivon etusivulla ja hauissa', 'Sekä nouto- että kotiinkuljetusasiakkaat'],
    visual: 'icon',
    icon: BenefitReachIcon,
  },
  {
    title: 'Näet aina mitä ravintolassasi tapahtuu',
    body: 'Kojelaudalta näet tilaukset reaaliajassa, myyntisi ja suosituimmat tuotteet - ilman erillisiä työkaluja tai exceleitä.',
    bullets: ['Tilaukset ja niiden tila reaaliajassa', 'Myynti- ja tuotetilastot', 'Arvioitu tilitys jokaisesta tilauksesta'],
    visual: 'preview',
  },
  {
    title: 'delivo hoitaa loput puolestasi',
    body: 'Ei omaa kuljetuskalustoa, ei erillisiä laitehankintoja - saat kaiken tarvittavan valmiina ja voit hallita ruokalistaa, hintoja ja aukioloa itse milloin haluat.',
    bullets: ['Tilauslaite ja kojelauta sisältyvät', 'Nouto ja kotiinkuljetus hoidettu puolestasi', 'Muutokset näkyvät asiakkaille heti'],
    visual: 'icon',
    icon: BenefitDeliveryIcon,
  },
]

const FAQ_ITEMS = [
  {
    q: 'Miten haen delivon kumppaniksi?',
    a: 'Täytä kumppanuushakemus - yritys- ja ravintolatietosi, mukaan lukien Y-tunnus - muutamassa minuutissa. Käsittelemme hakemuksen ja olemme sinuun yhteydessä sähköpostitse.',
  },
  {
    q: 'Paljonko delivon käyttö maksaa?',
    a: 'Kuukausimaksu (30 € Peruspaketti tai 79,99 € Pro) sekä välityspalkkio jokaisesta tilauksesta (15 % tai 8 % paketista riippuen). Ei muita piilokuluja.',
  },
  {
    q: 'Mitä kuukausimaksuun sisältyy?',
    a: 'Tilausten vastaanottoon tarvittava laite ja oma kojelauta ruokalistan, aukiolon ja myynnin hallintaan - et joudu hankkimaan tai asentamaan mitään itse.',
  },
  {
    q: 'Miten ja milloin saan rahani?',
    a: 'Kojelaudan Talous-näkymä näyttää arvioidun tilityksen jokaisesta tilauksesta. Tarkemmista tilityskäytännöistä sovitaan henkilökohtaisesti hakemuksen hyväksynnän yhteydessä.',
  },
  {
    q: 'Voinko vaihtaa pakettia tai lopettaa milloin vain?',
    a: 'Kyllä - ei sitoutumisaikaa. Voit vaihtaa pakettia tai perua kumppanuuden kojelaudalta koska tahansa.',
  },
  {
    q: 'Hoidatteko kuljetuksen puolestani?',
    a: 'Kyllä - asiakkaasi voivat valita noudon tai kotiinkuljetuksen, jonka delivo hoitaa puolestasi. Sinun ei tarvitse järjestää omia kuljettajia.',
  },
]

const SHARED_PLAN_FEATURES = [
  'Ravintolan profiili ja ruokalista delivossa',
  'Tilausten vastaanottoon tarvittava laite sisältyy - ei omia hankintoja',
  'Oma kojelauta ruokalistan ja aukiolon hallintaan',
  'Nouto ja kotiinkuljetus asiakkaillesi - delivo hoitaa kuljetuksen',
  'Ei sitoutumisaikaa - peruuta koska vain',
]

const PLANS = [
  {
    name: 'Peruspaketti',
    price: '30 €',
    priceUnit: '/ kk',
    note: '+ 15 % välityspalkkio / tilaus',
    features: ['Perusmyyntitilastot kojelaudalla'],
    cta: 'Hae Peruspaketilla',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '79,99 €',
    priceUnit: '/ kk',
    note: '+ 8 % välityspalkkio / tilaus',
    features: [
      'Merkittävästi pienempi välityspalkkio',
      'Nostettu näkyvyys etusivulla ja hauissa',
      'Tarkempi myyntidata: parhaiten myyvät tuotteet, kiireisimmät ajat ja kassavirta',
    ],
    cta: 'Hae Pro-paketilla',
    highlight: true,
  },
]

const STEPS = [
  { title: 'Jätä kumppanuushakemus', body: 'Täytä ravintolasi tiedot ja lähetä hakemus muutamassa minuutissa.' },
  { title: 'Odota hyväksyntää', body: 'Käsittelemme hakemuksen ja otamme sinuun yhteyttä sähköpostitse.' },
  { title: 'Rakenna ruokalistasi ja avaa ravintolasi', body: 'Hyväksynnän jälkeen saat kirjautumistunnukset kojelaudalle - lisää tuotteet ja merkitse ravintola auki.' },
]

function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null)
  return (
    <div className="partner-faq">
      {items.map((item, index) => {
        const open = openIndex === index
        return (
          <div className="partner-faq__item" key={item.q}>
            <button
              type="button"
              className="partner-faq__question"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              {item.q}
              <span className={`partner-faq__chevron${open ? ' partner-faq__chevron--open' : ''}`}>
                <ChevronDownIcon />
              </span>
            </button>
            {open && <p className="partner-faq__answer">{item.a}</p>}
          </div>
        )
      })}
    </div>
  )
}

function DriverInterestForm() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [vehicleType, setVehicleType] = useState(VEHICLE_OPTIONS[0].value)
  const [message, setMessage] = useState('')
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
      vehicle_type: vehicleType,
      message: message.trim() || null,
    })

    if (error) {
      setErrorMessage('Lähetys epäonnistui: ' + error.message)
      setStatus('idle')
      return
    }

    setStatus('submitted')
  }

  if (status === 'submitted') {
    return (
      <p className="driver-form__success">
        Kiitos kiinnostuksestasi! Otamme sinuun yhteyttä, kun kuljettajaohjelma avautuu.
      </p>
    )
  }

  return (
    <form className="driver-form" onSubmit={handleSubmit}>
      {errorMessage && <p className="driver-form__error">{errorMessage}</p>}

      <div className="driver-form__grid">
        <div className="driver-form__field">
          <label htmlFor="driver-name">Nimi</label>
          <input id="driver-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="driver-form__field">
          <label htmlFor="driver-phone">Puhelin</label>
          <input id="driver-phone" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="driver-form__field">
          <label htmlFor="driver-email">Sähköposti</label>
          <input id="driver-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="driver-form__field">
          <label htmlFor="driver-city">Kaupunki</label>
          <input id="driver-city" required value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <div className="driver-form__field">
          <label htmlFor="driver-vehicle">Kulkuneuvo</label>
          <select id="driver-vehicle" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            {VEHICLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="driver-form__field driver-form__field--full">
          <label htmlFor="driver-message">Viesti (valinnainen)</label>
          <textarea id="driver-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      </div>

      <button type="submit" className="partner-btn partner-btn--primary" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Lähetetään...' : 'Ilmoita kiinnostuksesi'}
      </button>
    </form>
  )
}

function PartnerLanding() {
  const [audience, setAudience] = useState('restaurants')
  const hero = AUDIENCE_HERO[audience]
  const isRestaurants = audience === 'restaurants'

  return (
    <div className="page">
      <PartnerHeader />

      <main className="partner-landing">
        <section className="partner-hero" style={{ backgroundImage: `url(${hero.image})` }}>
          <div className="partner-hero__overlay" />
          <div className="partner-hero__content">
            <h1>{hero.title}</h1>
            <p>{hero.body}</p>
            {isRestaurants && (
              <div className="partner-hero__actions">
                <Link to="/kumppani/rekisteroidy" className="partner-btn partner-btn--primary">
                  Jätä kumppanuushakemus
                </Link>
                <Link to="/kumppani/kirjaudu" className="partner-btn partner-btn--ghost partner-btn--on-dark">
                  Onko sinulla jo tili? Kirjaudu
                </Link>
              </div>
            )}
          </div>
        </section>

        <nav className="partner-audience-toggle" aria-label="Valitse kohderyhmä">
          <button
            type="button"
            className={`partner-audience-toggle__btn${isRestaurants ? ' partner-audience-toggle__btn--active' : ''}`}
            onClick={() => setAudience('restaurants')}
          >
            Ravintoloille
          </button>
          <button
            type="button"
            className={`partner-audience-toggle__btn${!isRestaurants ? ' partner-audience-toggle__btn--active' : ''}`}
            onClick={() => setAudience('drivers')}
          >
            Kuljettajille
          </button>
        </nav>

        {!isRestaurants && (
          <>
          <section className="driver-section">
            <div className="driver-section__media">
              <img src={DRIVER_IMAGE} alt="" loading="lazy" />
            </div>
            <div className="driver-section__content">
              <span className="driver-section__eyebrow">delivo Deliver · Tulossa myöhemmin</span>
              <h2>Kuljeta delivolle</h2>
              <p>
                Ansaitse omilla ehdoillasi kuljettamalla tilauksia kaupungissasi. Kuljettajaohjelmaa ja omaa delivo
                Deliver -sovellusta rakennetaan parhaillaan.
              </p>

              <ul className="driver-section__points">
                {DRIVER_POINTS.map((point) => (
                  <li key={point}>
                    <CheckIcon /> {point}
                  </li>
                ))}
              </ul>

              <span className="driver-section__subheading">Kelpoisuus</span>
              <ul className="driver-section__points">
                {DRIVER_REQUIREMENTS.map((point) => (
                  <li key={point}>
                    <CheckIcon /> {point}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="partner-section driver-form-section">
            <h2>Kiinnostuitko?</h2>
            <p className="partner-pricing-intro">
              Jätä yhteystietosi, niin otamme yhteyttä heti kun kuljettajaohjelma avautuu.
            </p>
            <DriverInterestForm />
          </section>
          </>
        )}

        {isRestaurants && (
        <>
        <section className="partner-trust-bar">
          {TRUST_ITEMS.map((item) => (
            <span className="partner-trust-bar__item" key={item}>
              <CheckIcon /> {item}
            </span>
          ))}
        </section>

        <section className="partner-section partner-section--wide">
          <h2>Miksi liittyä delivoon?</h2>
          <div className="partner-deep-benefits">
            {DEEP_BENEFITS.map((benefit, index) => (
              <div
                className={`partner-deep-benefit${index % 2 === 1 ? ' partner-deep-benefit--reverse' : ''}`}
                key={benefit.title}
              >
                <div className="partner-deep-benefit__text">
                  <h3>{benefit.title}</h3>
                  <p>{benefit.body}</p>
                  <ul className="partner-deep-benefit__bullets">
                    {benefit.bullets.map((bullet) => (
                      <li key={bullet}>
                        <CheckIcon /> {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="partner-deep-benefit__visual">
                  {benefit.visual === 'preview' ? (
                    <DashboardPreview />
                  ) : (
                    <div className="partner-deep-benefit__icon-badge">
                      <benefit.icon />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="partner-section partner-section--wide">
          <h2>Hinnoittelu</h2>
          <p className="partner-pricing-intro">
            Kumppanuuteen kuuluu kaikki tarvittava valmiina: saat ravintolaasi laitteen, jolla tilaukset kilahtavat
            suoraan sisään, sekä oman kojelaudan, josta näet selkeästi mitä myyt, milloin on kiireisintä ja paljonko
            rahaa on tullut kassaan - et joudu hankkimaan tai asentamaan mitään itse.
          </p>
          <div className="partner-pricing-shared">
            <span className="partner-pricing-shared__label">Sisältyy molempiin paketteihin</span>
            <ul className="partner-pricing-shared__list">
              {SHARED_PLAN_FEATURES.map((feature) => (
                <li key={feature}>
                  <CheckIcon /> {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="partner-pricing-grid">
            {PLANS.map((plan) => (
              <div
                className={`partner-pricing-card${plan.highlight ? ' partner-pricing-card--highlight' : ''}`}
                key={plan.name}
              >
                {plan.highlight && <span className="partner-pricing-card__badge">Suosituin</span>}
                <h3>{plan.name}</h3>
                <div className="partner-pricing-card__price">
                  <span className="partner-pricing-card__price-value">{plan.price}</span>
                  <span className="partner-pricing-card__price-unit">{plan.priceUnit}</span>
                </div>
                <p className="partner-pricing-card__note">{plan.note}</p>

                <ul className="partner-pricing-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/kumppani/rekisteroidy"
                  className={`partner-btn ${plan.highlight ? 'partner-btn--primary' : 'partner-btn--ghost'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="partner-pricing-footnote">Voit vaihtaa pakettia tai perua milloin vain kojelaudalta.</p>
        </section>

        <section className="partner-section">
          <h2>Usein kysyttyä</h2>
          <FaqAccordion items={FAQ_ITEMS} />
        </section>

        <section className="partner-section partner-section--wide partner-steps-section">
          <div className="partner-steps-section__media">
            <img src={STEPS_IMAGE} alt="" loading="lazy" />
          </div>
          <div className="partner-steps-section__content">
            <h2>Näin pääset alkuun</h2>
            <ol className="partner-steps">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="partner-steps__number">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="partner-cta" style={{ backgroundImage: `url(${CTA_IMAGE})` }}>
          <div className="partner-cta__overlay" />
          <div className="partner-cta__content">
            <h2>Valmis aloittamaan?</h2>
            <Link to="/kumppani/rekisteroidy" className="partner-btn partner-btn--primary">
              Jätä kumppanuushakemus
            </Link>
          </div>
        </section>
        </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default PartnerLanding
