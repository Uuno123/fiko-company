import { useState } from 'react'
import { Link } from 'react-router-dom'
import PartnerHeader from '../components/PartnerHeader.jsx'
import './PartnerLanding.css'

const HERO_IMAGE = '/leon-seibert-LJypKPEBt4I-unsplash.jpg'

const FIGURES = [
  { value: '0 %', label: 'Välityspalkkio Business-paketissa' },
  { value: '0 €', label: 'Laitehankinnat, tilauslaite sisältyy hintaan' },
  { value: '0 kk', label: 'Sitoutumisaika' },
]

const STEPS = [
  { title: 'Jätä hakemus', body: 'Täytä ravintolasi ja yrityksesi tiedot muutamassa minuutissa.' },
  { title: 'Odota hyväksyntää', body: 'Käsittelemme hakemuksen ja olemme sinuun yhteydessä sähköpostitse.' },
  {
    title: 'Avaa ravintolasi',
    body: 'Saat tunnukset kojelaudalle. Lisää ruokalista, merkitse ravintola auki ja ensimmäiset tilaukset voivat tulla.',
  },
]

const FEATURES = [
  { title: 'Tilaukset reaaliajassa', body: 'Uudet tilaukset tulevat suoraan tilauslaitteelle ja kojelaudalle.' },
  {
    title: 'Ruokalista ja aukiolot',
    body: 'Muuta tuotteita, hintoja ja aukioloja itse. Muutokset näkyvät asiakkaille heti.',
  },
  {
    title: 'Myynti ja tilitys',
    body: 'Näet myynnin, suosituimmat tuotteet ja arvioidun tilityksen jokaisesta tilauksesta.',
  },
  {
    title: 'Nouto ja kotiinkuljetus',
    body: 'Asiakas valitsee. Kotiinkuljetuksen hoitaa delivo, joten omia kuljettajia ei tarvita.',
  },
]

const PLANS = [
  {
    name: 'Peruspaketti',
    price: '49,99 €',
    fee: '+ 25 % välityspalkkio / tilaus',
    features: ['Perusmyyntitilastot kojelaudalla'],
    featured: false,
  },
  {
    name: 'Pro',
    price: '79,99 €',
    fee: '+ 10 % välityspalkkio / tilaus',
    features: [
      'Merkittävästi pienempi välityspalkkio',
      'Nostettu näkyvyys etusivulla ja hauissa',
      'Tarkempi myyntidata: parhaiten myyvät tuotteet, kiireisimmät ajat ja kassavirta',
    ],
    featured: true,
  },
  {
    name: 'Business',
    price: '169,99 €',
    fee: 'Ei välityspalkkiota',
    features: ['Koko tilauksen summa jää ravintolalle', 'Kaikki Pro-paketin ominaisuudet'],
    featured: false,
  },
]

const SHARED_FEATURES = [
  'Ravintolan profiili ja ruokalista delivossa',
  'Tilauslaite sisältyy, ei omia hankintoja',
  'Oma kojelauta ruokalistan ja aukiolon hallintaan',
  'Nouto ja kotiinkuljetus asiakkaillesi',
]

const FAQ_ITEMS = [
  {
    q: 'Miten haen delivon kumppaniksi?',
    a: 'Täytä kumppanuushakemus yritys- ja ravintolatiedoillasi, mukaan lukien Y-tunnus. Käsittelemme hakemuksen ja olemme sinuun yhteydessä sähköpostitse.',
  },
  {
    q: 'Paljonko delivon käyttö maksaa?',
    a: 'Kuukausimaksu (49,99 € Peruspaketti, 79,99 € Pro tai 169,99 € Business) sekä Peruspaketissa ja Prossa välityspalkkio jokaisesta tilauksesta (25 % tai 10 %). Business-paketissa välityspalkkiota ei ole. Ei muita piilokuluja.',
  },
  {
    q: 'Mitä kuukausimaksuun sisältyy?',
    a: 'Tilausten vastaanottoon tarvittava laite ja oma kojelauta ruokalistan, aukiolon ja myynnin hallintaan. Sinun ei tarvitse hankkia tai asentaa mitään itse.',
  },
  {
    q: 'Miten ja milloin saan rahani?',
    a: 'Kojelaudan Talous-näkymä näyttää arvioidun tilityksen jokaisesta tilauksesta. Tarkemmista tilityskäytännöistä sovitaan hakemuksen hyväksynnän yhteydessä.',
  },
  {
    q: 'Voinko vaihtaa pakettia tai lopettaa milloin vain?',
    a: 'Kyllä. Sitoutumisaikaa ei ole, ja voit vaihtaa pakettia tai perua kumppanuuden kojelaudalta koska tahansa.',
  },
  {
    q: 'Hoidatteko kuljetuksen puolestani?',
    a: 'Kyllä. Asiakkaasi voivat valita noudon tai kotiinkuljetuksen, jonka delivo hoitaa. Omia kuljettajia ei tarvita.',
  },
]

function CheckIcon() {
  return (
    <svg className="pl-check" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m5 10 3.5 3.5L15 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Faq() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <div className="pl-faq">
      {FAQ_ITEMS.map((item, index) => {
        const open = openIndex === index
        return (
          <div className="pl-faq__item" key={item.q}>
            <button
              type="button"
              className="pl-faq__q"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              {item.q}
              <span className="pl-faq__icon" aria-hidden="true" />
            </button>
            {open && <p className="pl-faq__a">{item.a}</p>}
          </div>
        )
      })}
    </div>
  )
}

function PartnerLanding() {
  return (
    <div className="page">
      <PartnerHeader />

      <main className="pl">
        <section className="pl-hero">
          <div className="pl-container">
            <h1 className="pl-hero__title">Enemmän tilauksia, pienempi palkkio.</h1>

            <div className="pl-hero__row">
              <p className="pl-hero__lead">
                delivo on suomalainen tilausalusta ravintoloille. Nouto ja kotiinkuljetus, oma kojelauta ja
                Business-paketissa ei välityspalkkiota lainkaan.
              </p>
              <div className="pl-actions">
                <Link to="/kumppani/rekisteroidy" className="pl-btn">
                  Jätä hakemus
                </Link>
                <Link to="/kumppani/kirjaudu" className="pl-link">
                  Kirjaudu kumppanina
                </Link>
              </div>
            </div>

            <div className="pl-hero__media">
              <img src={HERO_IMAGE} alt="" />
            </div>

            <dl className="pl-figures">
              {FIGURES.map((figure) => (
                <div className="pl-figure" key={figure.label}>
                  <dt className="pl-figure__label">{figure.label}</dt>
                  <dd className="pl-figure__value">{figure.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="pl-section" id="alkuun">
          <div className="pl-container pl-section__grid">
            <h2 className="pl-section__title">Näin pääset alkuun</h2>
            <ol className="pl-steps">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="pl-steps__num">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="pl-section" id="ominaisuudet">
          <div className="pl-container pl-section__grid">
            <h2 className="pl-section__title">Kaikki yhdeltä kojelaudalta</h2>
            <div className="pl-features">
              {FEATURES.map((feature) => (
                <div className="pl-feature" key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pl-section" id="hinnoittelu">
          <div className="pl-container pl-section__grid pl-section__grid--stacked">
            <h2 className="pl-section__title">Hinnoittelu</h2>
            <div>
              <div className="pl-plans">
                {PLANS.map((plan) => (
                  <div className={`pl-plan${plan.featured ? ' pl-plan--featured' : ''}`} key={plan.name}>
                    <div className="pl-plan__head">
                      <h3 className="pl-plan__name">{plan.name}</h3>
                      {plan.featured && <span className="pl-plan__tag">Suosituin</span>}
                    </div>
                    <p className="pl-plan__price">
                      {plan.price}
                      <span> / kk</span>
                    </p>
                    <p className="pl-plan__fee">{plan.fee}</p>
                    <ul className="pl-plan__list">
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <CheckIcon />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/kumppani/rekisteroidy"
                      className={`pl-btn${plan.featured ? ' pl-btn--light' : ''}`}
                    >
                      Valitse {plan.name}
                    </Link>
                  </div>
                ))}
              </div>

              <div className="pl-shared">
                <p className="pl-shared__title">Molemmissa paketeissa</p>
                <ul className="pl-shared__list">
                  {SHARED_FEATURES.map((feature) => (
                    <li key={feature}>
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="pl-section" id="ukk">
          <div className="pl-container pl-section__grid">
            <h2 className="pl-section__title">Usein kysyttyä</h2>
            <Faq />
          </div>
        </section>

        <section className="pl-cta">
          <div className="pl-container pl-cta__inner">
            <h2>Tuo ravintolasi delivoon.</h2>
            <div className="pl-cta__side">
              <p>Hakemus vie muutaman minuutin. Sitoutumisaikaa ei ole.</p>
              <Link to="/kumppani/rekisteroidy" className="pl-btn pl-btn--light">
                Jätä hakemus
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default PartnerLanding
