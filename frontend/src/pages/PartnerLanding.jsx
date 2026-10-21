import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  BellRing,
  Bike,
  BriefcaseBusiness,
  Clock,
  MapPin,
  Smartphone,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import DelivoLogo from '../components/DelivoLogo.jsx'
import Footer from '../components/Footer.jsx'
import PartnerHeader from '../components/PartnerHeader.jsx'
import {
  DoodleArrow,
  DoodleSparkle,
  DoodleUnderline,
  FoodMarquee,
  JourneyMap,
  Note,
  OrdersMockup,
  Reveal,
} from '../components/partner/PartnerVisuals.jsx'
import { COURIER_PAY } from '../lib/deliveryTime.js'
import { formatPrice } from '../lib/format.js'
import {
  COMMITMENT_MONTHS,
  DEVICE_SETUP_CENTS,
  EXTRA_DELIVERY_CENTS,
  PARTNER_PLANS,
  findPlan,
  formatWholePrice,
  planOrdersLabel,
} from '../lib/partnerPlans.js'
import './PartnerLanding.css'

const JOURNEY_STEPS = [
  { title: 'Asiakas tilaa', body: 'Tilaus tulee delivosta suoraan ravintolan tilauslaitteelle.' },
  { title: 'Ravintola hyväksyy', body: 'Valitset valmistusajan, ja asiakas näkee sen heti.' },
  { title: 'Lähin kuljettaja noutaa', body: 'Keikka tarjotaan ensin lähimmälle kuljettajalle 8 km säteellä.' },
  { title: 'Perillä', body: 'Asiakas seuraa kuljettajaa kartalla koko matkan.' },
]

const RESTAURANT_POINTS = [
  { Icon: BellRing, text: 'Tilaukset reaaliajassa tilauslaitteelle ja kojelaudalle' },
  { Icon: UtensilsCrossed, text: 'Ruokalista, hinnat ja aukiolot omissa käsissäsi' },
  { Icon: TrendingUp, text: 'Myynti ja arvioitu tilitys jokaisesta tilauksesta' },
  { Icon: Bike, text: 'Kotiinkuljetus ilman omia kuljettajia' },
]

const ONBOARDING = [
  { title: 'Jätä hakemus', body: 'Yrityksesi ja ravintolasi tiedot muutamassa minuutissa.' },
  { title: 'Hyväksyntä', body: 'Käsittelemme hakemuksen ja olemme yhteydessä sähköpostitse.' },
  { title: 'Asennus ja avaus', body: 'Tilauslaite asennetaan, lisäät ruokalistan ja tilaukset voivat alkaa.' },
]

const FEATURED_PLAN = 'kuljetus'

const PICKUP_PLAN = findPlan('nouto')
const DELIVERY_PLAN = findPlan('kuljetus')
const LARGE_PLAN = findPlan('iso')
// Kuukausitilausmäärä, josta Iso ravintola tulee Kuljetus-pakettia edullisemmaksi (50:n tarkkuudella).
const LARGE_PLAN_FROM =
  Math.round(
    (DELIVERY_PLAN.includedDeliveries + (LARGE_PLAN.priceCents - DELIVERY_PLAN.priceCents) / EXTRA_DELIVERY_CENTS) / 50,
  ) * 50

const COURIER_BENEFITS = [
  { Icon: Clock, title: 'Omat työajat', body: 'Mene online-tilaan silloin kun sopii.' },
  { Icon: MapPin, title: 'Keikat lähelläsi', body: 'Lähin kuljettaja saa tarjouksen ensin ja 60 s aikaa päättää.' },
  { Icon: Wallet, title: 'Ansio etukäteen', body: 'Näet keikan ansion ennen kuin hyväksyt.' },
  { Icon: Smartphone, title: 'Kaikki sovelluksessa', body: 'Nouto koodilla, toimitus kuitataan sijainnilla.' },
]

// Valokuvat: Unsplash (ilmainen lisenssi). Pizzauuni Fabrizio Pullara, mopolähetti
// Rowan Freeman, pyörälähetti Patrick Connor Klopf, tilauslaput mediha ekici,
// annostelu Ruben Mavarez ja kokki Tommaso Ubezio. Ei kilpailijoiden logoja.
const POLAROIDS = [
  { image: '/partner/order-tickets.jpg', caption: 'uusi tilaus 18.42' },
  { image: '/partner/plating.jpg', caption: 'annostelu käynnissä' },
  { image: '/partner/chef.jpg', caption: 'valmis lähtöön!' },
]

const FAQ_ITEMS = [
  {
    q: 'Paljonko delivo maksaa ravintolalle?',
    a: `Vain kiinteän kuukausimaksun, provisiota tilauksista ei ole: ${PICKUP_PLAN.name} ${formatPrice(PICKUP_PLAN.priceCents)}/kk (vain noutotilaukset), ${DELIVERY_PLAN.name} ${formatPrice(DELIVERY_PLAN.priceCents)}/kk (sisältää ${DELIVERY_PLAN.includedDeliveries} kuljetustilausta kuukaudessa) tai ${LARGE_PLAN.name} ${formatPrice(LARGE_PLAN.priceCents)}/kk (sisältää ${LARGE_PLAN.includedDeliveries.toLocaleString('fi-FI')} kuljetustilausta). Lisäksi tilauslaite ja sen asennus maksavat kertaalleen ${formatWholePrice(DEVICE_SETUP_CENTS)}. Kaikki hinnat + alv.`,
  },
  {
    q: 'Entä jos kuljetustilauksia tulee yli paketin?',
    a: `Paketin ylittävistä kuljetustilauksista peritään ${formatPrice(EXTRA_DELIVERY_CENTS)} kappaleelta, ei prosenttia. Jos kuljetustilauksia tulee säännöllisesti yli ${LARGE_PLAN_FROM} kuukaudessa, ${LARGE_PLAN.name} -paketti tulee edullisemmaksi.`,
  },
  {
    q: 'Onko sopimuksessa sitoutumisaikaa?',
    a: `Kyllä, sitoutumisaika on ${COMMITMENT_MONTHS} kuukautta. Pakettia voit vaihtaa kojelaudalta sopimuksen aikana.`,
  },
  {
    q: 'Miten haen ravintolana mukaan?',
    a: 'Täytä kumppanuushakemus yritys- ja ravintolatiedoillasi, mukaan lukien Y-tunnus. Käsittelemme hakemuksen ja olemme sinuun yhteydessä sähköpostitse.',
  },
  {
    q: 'Hoidatteko kuljetuksen puolestani?',
    a: 'Kyllä, Kuljetus- ja Iso ravintola -paketeissa. Asiakas valitsee noudon tai kotiinkuljetuksen, ja kuljetuksen hoitaa delivon kuljettaja. Omia kuljettajia ei tarvita.',
  },
  {
    q: 'Paljonko kuljettaja tienaa?',
    a: `Jokaisesta keikasta ${formatPrice(COURIER_PAY.baseCents)} perusmaksu ja ${formatPrice(COURIER_PAY.perKmCents)} jokaiselta kilometriltä, jonka ajat ravintolaan ja sieltä perille. Esimerkiksi 4 km keikka on ${formatPrice(COURIER_PAY.baseCents + 4 * COURIER_PAY.perKmCents)}.`,
  },
  {
    q: 'Pitääkö kuljettajalla olla yritys?',
    a: 'Kyllä. Kuljettajana toimit yrittäjänä omalla Y-tunnuksella tai kevytyrittäjänä laskutuspalvelun kautta.',
  },
  {
    q: 'Miten keikat jaetaan kuljettajille?',
    a: 'Keikka tarjotaan lähimmälle vapaalle kuljettajalle 8 km säteellä, ja hänellä on 60 sekuntia aikaa hyväksyä. Jos hän ei ota keikkaa, se siirtyy seuraavaksi lähimmälle.',
  },
]

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Usein kysytyt keskusteluna: kysymys napista, delivo "kirjoittaa" vastauksen.
function ChatFaq() {
  const [asked, setAsked] = useState([])
  const [typing, setTyping] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  function ask(index) {
    if (typing !== null) return
    setAsked((list) => [...list, index])
    if (prefersReducedMotion()) return
    setTyping(index)
    timer.current = setTimeout(() => setTyping(null), 750)
  }

  const remaining = FAQ_ITEMS.map((_, index) => index).filter((index) => !asked.includes(index))

  return (
    <div className="pl-chat">
      <div className="pl-chat__log" aria-live="polite">
        <div className="pl-bubble pl-bubble--delivo">
          <span className="pl-bubble__avatar" aria-hidden="true">
            d
          </span>
          <p>Hei! Mitä haluaisit tietää? Valitse kysymys alta.</p>
        </div>
        {asked.map((index) => (
          <Fragment key={index}>
            <div className="pl-bubble pl-bubble--you">
              <p>{FAQ_ITEMS[index].q}</p>
            </div>
            <div className="pl-bubble pl-bubble--delivo">
              <span className="pl-bubble__avatar" aria-hidden="true">
                d
              </span>
              {typing === index ? (
                <p className="pl-bubble__typing" aria-label="delivo kirjoittaa">
                  <span />
                  <span />
                  <span />
                </p>
              ) : (
                <p>{FAQ_ITEMS[index].a}</p>
              )}
            </div>
          </Fragment>
        ))}
      </div>

      <div className="pl-chat__chips">
        {remaining.length > 0 ? (
          remaining.map((index) => (
            <button type="button" key={index} onClick={() => ask(index)} disabled={typing !== null}>
              {FAQ_ITEMS[index].q}
            </button>
          ))
        ) : (
          <button type="button" onClick={() => setAsked([])}>
            Aloita alusta
          </button>
        )}
      </div>
    </div>
  )
}

// delivon kumppanisivu ravintoloille ja kuljettajille. Tarkoituksella vaihteleva:
// jaettu kuvahero, liikkuva ruokanauha, piirretty tilauksen reitti, käsin
// kirjoitetut huomautukset, hinnasto ruokalistana polaroideineen, tiivis musta
// kuljettajaosio kuittilaskurilla ja kysymykset keskusteluna. Oranssi on pieni
// korostus, pinnat valkoisia, mustia ja oikeita valokuvia.
const HERO_SIDES = ['Ravintoloille', 'Kuljettajille']

function PartnerLanding() {
  // Puhelimella heron puoliskot ovat vierekkäin pyyhkäistävinä kortteina.
  const splitRef = useRef(null)
  const [heroSide, setHeroSide] = useState(0)

  function handleHeroScroll() {
    const el = splitRef.current
    const max = el.scrollWidth - el.clientWidth
    if (max > 0) setHeroSide(el.scrollLeft > max / 2 ? 1 : 0)
  }

  function showHeroSide(index) {
    const el = splitRef.current
    el.scrollTo({ left: index === 0 ? 0 : el.scrollWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <div className="page">
      <PartnerHeader />

      <main className="pl">
        <h1 className="pl-sr-only">delivo kumppanit – ravintoloille ja kuljettajille</h1>

        <section className="ph">
          <div className="ph__intro">
            <p className="ph__brand">
              <DelivoLogo className="ph__logo" /> <span>kumppanit</span>
            </p>
            <Reveal as="p" className="ph__pick">
              <Note>valitse puolesi</Note>
              <DoodleArrow className="ph__pick-arrow" />
            </Reveal>
            <div className="ph__switch" aria-hidden="true">
              {HERO_SIDES.map((label, index) => (
                <button
                  type="button"
                  tabIndex={-1}
                  key={label}
                  className={heroSide === index ? 'is-active' : ''}
                  onClick={() => showHeroSide(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="ph__split" ref={splitRef} onScroll={handleHeroScroll}>
            <article className="ph__half ph__half--restaurant">
              <img className="ph__img" src="/partner/pizza-oven.jpg" alt="" />
              <div className="ph__text">
                <span className="ph__label">Ravintoloille</span>
                <h2>
                  Sinun keittiösi.
                  <br />
                  Meidän kyytimme.
                </h2>
                <p>Uudet asiakkaat, tilaukset suoraan omalle laitteelle ja kotiinkuljetus ilman omia kuljettajia.</p>
                <div className="ph__actions">
                  <Link to="/kumppani/rekisteroidy" className="ph-btn">
                    Jätä hakemus
                  </Link>
                  <a href="#ravintoloille" className="ph-link">
                    Lue lisää <ArrowDown size={16} strokeWidth={2.4} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <span className="ph-sticker ph-sticker--orange">
                <strong>0 %</strong>
                provisiota, vain kuukausimaksu
              </span>
            </article>

            <article className="ph__half ph__half--courier">
              <img className="ph__img" src="/partner/scooter-courier.jpg" alt="" />
              <div className="ph__text">
                <span className="ph__label">Kuljettajille</span>
                <h2>
                  Sinun aikasi.
                  <br />
                  Sinun keikkasi.
                </h2>
                <p>Aja silloin kun sinulle sopii. Lähin kuljettaja saa keikan ensin, ja ansion näet etukäteen.</p>
                <div className="ph__actions">
                  <Link to="/kumppani/kuljettajaksi" className="ph-btn">
                    Hae kuljettajaksi
                  </Link>
                  <a href="#kuljettajille" className="ph-link">
                    Lue lisää <ArrowDown size={16} strokeWidth={2.4} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <span className="ph-sticker ph-sticker--white">
                <strong>{formatPrice(COURIER_PAY.baseCents)}</strong>+ {formatPrice(COURIER_PAY.perKmCents)} / km
              </span>
            </article>
          </div>
        </section>

        <FoodMarquee />

        <section className="pl-journey" id="nain-se-toimii">
          <div className="pl-container">
            <Reveal className="pl-journey__head">
              <h2 className="pl-title">Näin tilaus kulkee</h2>
              <Note className="pl-journey__note">kaikki reaaliajassa!</Note>
              <DoodleSparkle className="pl-journey__sparkle" />
            </Reveal>
            <Reveal className="pl-journey__map">
              <JourneyMap />
            </Reveal>
            <ol className="pl-journey__steps">
              {JOURNEY_STEPS.map((step, index) => (
                <Reveal as="li" delay={index * 110} key={step.title}>
                  <span className="pl-journey__num">{index + 1}</span>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="pl-section" id="ravintoloille">
          <div className="pl-container pl-resto">
            <Reveal className="pl-resto__device">
              <OrdersMockup />
              <span className="pl-annot pl-annot--order">
                <Note>uusi tilaus kilahtaa</Note>
                <DoodleArrow className="pl-annot__arrow" />
              </span>
              <span className="pl-annot pl-annot--sales">
                <DoodleArrow className="pl-annot__arrow" flip />
                <Note>myynti näkyy heti</Note>
              </span>
            </Reveal>

            <Reveal className="pl-resto__text" delay={120}>
              <span className="pl-kicker">Ravintoloille</span>
              <h2 className="pl-title">
                Enemmän tilauksia,{' '}
                <span className="pl-mark">
                  ei provisiota
                  <DoodleUnderline className="pl-mark__line" />
                </span>
                .
              </h2>
              <p className="pl-lead">
                delivo on suomalainen tilausalusta. Asiakkaat löytävät ravintolasi, tilaukset tulevat suoraan
                laitteelle ja kotiinkuljetus hoituu delivon kuljettajilla.
              </p>
              <ul className="pl-points">
                {RESTAURANT_POINTS.map(({ Icon, text }) => (
                  <li key={text}>
                    <span className="pl-points__icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <Link to="/kumppani/rekisteroidy" className="pl-btn">
                Jätä hakemus
              </Link>
            </Reveal>
          </div>

          <div className="pl-container">
            <ol className="pl-onboard">
              {ONBOARDING.map((step, index) => (
                <Reveal as="li" delay={index * 120} key={step.title}>
                  <span className="pl-onboard__num">0{index + 1}</span>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="pl-section pl-section--menu" id="hinnoittelu">
          <div className="pl-container pl-menu-wrap">
            <Reveal className="pl-menu">
              <div className="pl-menu__head">
                <span className="pl-kicker">Hinnasto</span>
                <h2>Ravintolan paketit</h2>
                <Note className="pl-menu__note">ei provisiota, vain kuukausimaksu!</Note>
              </div>

              <ul className="pl-menu__items">
                {PARTNER_PLANS.map((plan) => {
                  const featured = plan.key === FEATURED_PLAN
                  return (
                    <li className={`pl-menu__item${featured ? ' pl-menu__item--featured' : ''}`} key={plan.key}>
                      <div className="pl-menu__row">
                        <span className="pl-menu__name">
                          {plan.name}
                          {featured && <span className="pl-menu__tag">suosituin</span>}
                        </span>
                        <span className="pl-menu__dots" aria-hidden="true" />
                        <span className="pl-menu__price">
                          {formatPrice(plan.priceCents)}
                          <small> / kk + alv</small>
                        </span>
                      </div>
                      <p className="pl-menu__fee">{planOrdersLabel(plan)}</p>
                      <p className="pl-menu__desc">{plan.features.join(' · ')}</p>
                    </li>
                  )
                })}
              </ul>

              <div className="pl-menu__extras">
                <div className="pl-menu__row">
                  <span>Kuljetustilaukset yli paketin</span>
                  <span className="pl-menu__dots" aria-hidden="true" />
                  <span className="pl-menu__price">{formatPrice(EXTRA_DELIVERY_CENTS)} / kpl</span>
                </div>
                <div className="pl-menu__row">
                  <span>Aloitus: tilauslaite + asennus</span>
                  <span className="pl-menu__dots" aria-hidden="true" />
                  <span className="pl-menu__price">{formatWholePrice(DEVICE_SETUP_CENTS)}</span>
                </div>
                <div className="pl-menu__row">
                  <span>Sitoutumisaika</span>
                  <span className="pl-menu__dots" aria-hidden="true" />
                  <span className="pl-menu__price">{COMMITMENT_MONTHS} kk</span>
                </div>
              </div>

              <p className="pl-menu__included">
                Kaikissa paketeissa: ravintolan profiili ja ruokalista delivossa, oma kojelauta ja tilauslaite. Koko
                tilauksen summa jää ravintolalle. Kaikki hinnat + alv.
              </p>
              <Link to="/kumppani/rekisteroidy" className="pl-btn">
                Jätä hakemus
              </Link>
            </Reveal>

            <div className="pl-menu__photos" aria-hidden="true">
              {POLAROIDS.map((photo, index) => (
                <figure className={`pl-polaroid pl-polaroid--${'abc'[index]}`} key={photo.image}>
                  <img src={photo.image} alt="" loading="lazy" />
                  <figcaption>
                    <Note>{photo.caption}</Note>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="pl-dark" id="kuljettajille">
          <div className="pl-container pl-courier">
            <Reveal className="pl-courier__media">
              <img
                className="pl-courier__photo"
                src="/partner/bike-courier.jpg"
                alt="Lähetti polkupyörällä ruokalaukku selässä kaupungin kadulla"
                loading="lazy"
              />
            </Reveal>

            <Reveal className="pl-courier__body" delay={120}>
              <span className="pl-kicker pl-kicker--light">Kuljettajille</span>
              <h2 className="pl-title">Aja silloin kun sinulle sopii.</h2>
              <Note className="pl-courier__note">ei vuorolistoja!</Note>

              <ul className="pl-courier__benefits">
                {COURIER_BENEFITS.map(({ Icon, title, body }) => (
                  <li key={title}>
                    <Icon size={22} strokeWidth={2} aria-hidden="true" />
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </li>
                ))}
              </ul>

              <p className="pl-courier__entrepreneur">
                <BriefcaseBusiness size={20} strokeWidth={2} aria-hidden="true" />
                <span>
                  Kuljettajana toimit <strong>yrittäjänä</strong> omalla Y-tunnuksella tai{' '}
                  <strong>kevytyrittäjänä</strong> laskutuspalvelun kautta.
                </span>
              </p>

              <div className="pl-courier__cta">
                <Link to="/kumppani/kuljettajaksi" className="ph-btn">
                  Hae kuljettajaksi
                </Link>
                <p>Lisäksi vähintään 18 v, älypuhelin ja polkupyörä, sähköpyörä, mopo tai auto.</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="pl-section" id="ukk">
          <div className="pl-container pl-container--narrow">
            <Reveal className="pl-chat-head">
              <h2 className="pl-title">Kysy meiltä</h2>
              <Note className="pl-chat-head__note">vastaamme heti</Note>
            </Reveal>
            <ChatFaq />
          </div>
        </section>

        <section className="pl-final">
          <Link to="/kumppani/rekisteroidy" className="pl-final__half">
            <span>Ravintola?</span>
            <strong>
              Jätä hakemus <ArrowRight size={36} strokeWidth={2.2} aria-hidden="true" />
            </strong>
          </Link>
          <Link to="/kumppani/kuljettajaksi" className="pl-final__half">
            <span>Kuljettaja?</span>
            <strong>
              Hae kuljettajaksi <ArrowRight size={36} strokeWidth={2.2} aria-hidden="true" />
            </strong>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default PartnerLanding
