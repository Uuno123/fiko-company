import { Link } from 'react-router-dom'
import PartnerHeader from '../components/PartnerHeader.jsx'
import Footer from '../components/Footer.jsx'
import './PartnerCommon.css'
import './PartnerLanding.css'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1800&q=80'
const STEPS_IMAGE = 'https://images.unsplash.com/photo-1564489563601-c53cfc451e93?auto=format&fit=crop&w=1400&q=80'
const CTA_IMAGE = 'https://images.unsplash.com/photo-1680405229153-a753d043c4ec?auto=format&fit=crop&w=1800&q=80'

const BENEFITS = [
  {
    title: 'Uusia asiakkaita lähialueelta',
    body: 'Ravintolasi näkyy Fikon etusivulla kaupunkisi asukkaille - ei erillistä markkinointibudjettia tarvita.',
    image: 'https://images.unsplash.com/photo-1600628421066-f6bda6a7b976?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Ei omaa kuljetuskalustoa',
    body: 'Asiakas voi noutaa itse, tai valita kotiinkuljetuksen - Fiko hoitaa kuljetuksen puolestasi, joten sinun ei tarvitse järjestää omia kuljettajia.',
    image: 'https://images.unsplash.com/photo-1636907229111-a8ac768fe6c9?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Hallinnoi itse, milloin haluat',
    body: 'Päivitä ruokalista, hinnat ja aukiolo omalta kojelaudaltasi - muutokset näkyvät asiakkaille heti.',
    image: 'https://images.unsplash.com/photo-1712594533988-13a401974b44?auto=format&fit=crop&w=800&q=80',
  },
]

const PLANS = [
  {
    name: 'Peruspaketti',
    price: '30 €',
    priceUnit: '/ kk',
    note: '+ 15 % välityspalkkio / tilaus',
    features: [
      'Ravintolan profiili ja ruokalista Fikossa',
      'Tilausten vastaanottoon tarvittava laite ravintolaasi sisältyy - ei omia hankintoja',
      'Oma kojelauta ruokalistan, aukiolon ja perusmyyntitilastojen hallintaan',
      'Nouto ja kotiinkuljetus asiakkaillesi - Fiko hoitaa kuljetuksen',
      'Ei sitoutumisaikaa - peruuta koska vain',
    ],
    cta: 'Aloita Peruspaketilla',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '79,99 €',
    priceUnit: '/ kk',
    note: '+ 8 % välityspalkkio / tilaus',
    features: [
      'Kaikki Peruspaketin ominaisuudet (laite ja kojelauta sisältyvät)',
      'Merkittävästi pienempi välityspalkkio',
      'Nostettu näkyvyys etusivulla ja hauissa',
      'Tarkempi myyntidata: parhaiten myyvät tuotteet, kiireisimmät ajat ja kassavirta',
    ],
    cta: 'Aloita Pro-paketilla',
    highlight: true,
  },
]

const STEPS = [
  { title: 'Luo kumppanitili', body: 'Täytä ravintolasi perustiedot ja luo tili muutamassa minuutissa.' },
  { title: 'Rakenna ruokalistasi', body: 'Lisää tuotteet, hinnat ja kuvat kojelaudan kautta.' },
  { title: 'Avaa ravintolasi', body: 'Merkitse ravintola auki, ja se ilmestyy Fikon listaukseen.' },
]

const GALLERY = [
  'https://images.unsplash.com/photo-1633436375795-12b3b339712f?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1744638628542-12578d73179b?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1567620815168-8afeeb18de17?auto=format&fit=crop&w=700&q=80',
]

function PartnerLanding() {
  return (
    <div className="page">
      <PartnerHeader />

      <main className="partner-landing">
        <section className="partner-hero" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
          <div className="partner-hero__overlay" />
          <div className="partner-hero__content">
            <h1>Tuo ravintolasi Fikoon</h1>
            <p>
              Fiko on suomalainen ruoantilausalusta. Liity kumppaniksi ja tavoita uusia asiakkaita - asiakkaasi
              voivat noutaa itse tai valita kotiinkuljetuksen, jonka Fiko hoitaa puolestasi.
            </p>
            <div className="partner-hero__actions">
              <Link to="/kumppani/rekisteroidy" className="partner-btn partner-btn--primary">
                Liity kumppaniksi
              </Link>
              <Link to="/kumppani/kirjaudu" className="partner-btn partner-btn--ghost partner-btn--on-dark">
                Onko sinulla jo tili? Kirjaudu
              </Link>
            </div>
          </div>
        </section>

        <section className="partner-section partner-section--wide">
          <h2>Miksi liittyä Fikoon?</h2>
          <div className="partner-benefit-grid">
            {BENEFITS.map((benefit) => (
              <div className="partner-benefit-card" key={benefit.title}>
                <div className="partner-benefit-card__media">
                  <img src={benefit.image} alt="" loading="lazy" />
                </div>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
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
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="m5 10 3.5 3.5L15 6.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
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

        <section className="partner-gallery">
          <h2>Nouto-ruokaa kaikkiin makuihin</h2>
          <div className="partner-gallery__grid">
            {GALLERY.map((src) => (
              <div className="partner-gallery__item" key={src}>
                <img src={src} alt="" loading="lazy" />
              </div>
            ))}
          </div>
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
              Liity kumppaniksi
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default PartnerLanding
