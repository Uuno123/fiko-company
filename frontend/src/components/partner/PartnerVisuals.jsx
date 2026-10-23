import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BellRing, Bike, House, Smartphone, Store } from 'lucide-react'
import DelivoLogo from '../DelivoLogo.jsx'
import './PartnerVisuals.css'

// Kumppanisivun kuvitukset ja eläväiset osat: tilauslaite, tilauksen matka
// kartalla, ruokanauha ja käsin piirretyt nuolet. Kaikki piirretty koodilla, animaatiot CSS:llä ja SVG:llä; ne
// pysähtyvät, jos käyttäjä on pyytänyt vähemmän liikettä.

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Sisältö liukuu esiin, kun se vieritetään näkyviin. Ilman IntersectionObserveria,
// liikettä vähentäessä tai jo näkyvissä olevalle sisällölle ei animaatiota.
// Lapset saavat luokan pv-reveal--shown myös, jotta piirrokset voivat piirtyä.
export function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const ref = useRef(null)
  const [state, setState] = useState('static')

  // Ennen ensimmäistä piirtoa, ettei sisältö tai piirros välähdä valmiina.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return undefined
    if (element.getBoundingClientRect().top < window.innerHeight * 0.85) {
      setState('shown')
      return undefined
    }
    setState('hidden')
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('shown')
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`pv-reveal pv-reveal--${state}${className ? ` ${className}` : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}

// ── Käsin piirretyt merkinnät ────────────────────────────────────────────
// Piirtyvät näkyviin (stroke-dashoffset), kun ympäröivä Reveal tulee näkyviin.

export function DoodleArrow({ className = '', flip = false }) {
  return (
    <svg
      className={`pv-doodle pv-doodle--arrow${flip ? ' pv-doodle--flip' : ''} ${className}`}
      viewBox="0 0 120 70"
      fill="none"
      aria-hidden="true"
    >
      <path className="pv-draw" pathLength="1" d="M6 10 C 30 4, 70 8, 92 44" />
      <path className="pv-draw pv-draw--late" pathLength="1" d="M78 40 L 93 47 L 97 30" />
    </svg>
  )
}

export function DoodleUnderline({ className = '' }) {
  return (
    <svg className={`pv-doodle pv-doodle--underline ${className}`} viewBox="0 0 300 24" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path className="pv-draw" pathLength="1" d="M4 15 C 70 4, 160 6, 296 12 M30 20 C 110 13, 190 14, 270 18" />
    </svg>
  )
}

export function DoodleSparkle({ className = '' }) {
  return (
    <svg className={`pv-doodle pv-doodle--sparkle ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path className="pv-draw" pathLength="1" d="M24 4 V16 M24 32 V44 M4 24 H16 M32 24 H44 M10 10 L17 17 M31 31 L38 38 M38 10 L31 17 M17 31 L10 38" />
    </svg>
  )
}

// Käsinkirjoitettu huomautus (Caveat-fontti).
export function Note({ children, className = '' }) {
  return <span className={`pv-note ${className}`}>{children}</span>
}

// ── Ruokanauha ───────────────────────────────────────────────────────────

// Oikeita ruokakuvia Unsplashista (ilmainen lisenssi), kuvaajat: Erik Odiin,
// Aurélien Lemasson-Théobald, Vinicius Benedit, Anima Visual, Huyen Bui,
// Jeswin Thomas, Kobby Mendez ja Anna Pelzer.
const MARQUEE_ITEMS = [
  { label: 'Burgerit', image: '/partner/food-burger.jpg' },
  { label: 'Pizzat', image: '/partner/food-pizza.jpg' },
  { label: 'Sushit', image: '/partner/food-sushi.jpg' },
  { label: 'Kebabit', image: '/partner/food-kebab.jpg' },
  { label: 'Ramenit', image: '/partner/food-ramen.jpg' },
  { label: 'Tacot', image: '/partner/food-tacos.jpg' },
  { label: 'Jälkiruoat', image: '/partner/food-dessert.jpg' },
  { label: 'Salaatit', image: '/partner/food-salad.jpg' },
]

// Vieriä ruokakategorioita: sama sisältö kahdesti, jotta silmukka on saumaton.
export function FoodMarquee() {
  const row = MARQUEE_ITEMS.map((item) => (
    <span className="pv-marquee__item" key={item.label}>
      <img src={item.image} alt="" loading="lazy" />
      {item.label}
    </span>
  ))
  return (
    <div className="pv-marquee" aria-label="Ruokakategorioita Bidropissa: burgerit, pizzat, sushit, kebabit, ramenit, tacot, jälkiruoat ja salaatit">
      <div className="pv-marquee__track" aria-hidden="true">
        <div className="pv-marquee__row">{row}</div>
        <div className="pv-marquee__row">{row}</div>
      </div>
    </div>
  )
}

// ── Tilauksen matka ──────────────────────────────────────────────────────

const JOURNEY_PATH = 'M70 150 C 170 40, 260 40, 330 120 S 520 220, 600 120 S 790 30, 930 130'
const JOURNEY_STOPS = [
  { x: 70, y: 150, Icon: Smartphone, label: 'Asiakas tilaa' },
  { x: 330, y: 120, Icon: Store, label: 'Ravintola hyväksyy' },
  { x: 600, y: 120, Icon: Bike, label: 'Lähin kuljettaja noutaa' },
  { x: 930, y: 130, Icon: House, label: 'Perillä' },
]

// Tilauksen reitti piirrettynä: kuljettaja-pallo kulkee asiakkaalta ravintolan
// ja kuljettajan kautta perille. Tekstit ovat HTML:nä kuvan alla (JourneySteps).
export function JourneyMap() {
  const [animate, setAnimate] = useState(false)
  useEffect(() => setAnimate(!prefersReducedMotion()), [])

  return (
    <svg className="pv-journey" viewBox="0 0 1000 230" role="img" aria-label="Tilauksen reitti: asiakas, ravintola, kuljettaja ja perillä">
      <path d={JOURNEY_PATH} className="pv-journey__road" />
      <path d={JOURNEY_PATH} className="pv-journey__dash" />
      {JOURNEY_STOPS.map(({ x, y, Icon, label }) => (
        <g key={label} transform={`translate(${x - 28} ${y - 28})`}>
          <circle cx="28" cy="28" r="28" className="pv-journey__stop" />
          <Icon x="16" y="16" width="24" height="24" strokeWidth={2} color="#14150f" />
        </g>
      ))}
      {animate && (
        <g className="pv-journey__rider">
          <circle r="11" fill="#f4501e" />
          <circle r="4" fill="#ffffff" />
          <animateMotion dur="9s" repeatCount="indefinite" path={JOURNEY_PATH} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
        </g>
      )}
    </svg>
  )
}

// ── Ravintolan tilauslaite ───────────────────────────────────────────────

const DEMO_ORDERS = [
  { number: '#0042', state: 'new', label: 'Uusi', items: '2 × Bacon Burger, Ranskalaiset', meta: 'Kotiinkuljetus · valmis 18.25' },
  { number: '#0041', state: 'cooking', label: 'Valmistuu', items: 'Pizza Margherita, Coca-Cola', meta: 'Nouto · 18.15' },
  { number: '#0040', state: 'courier', label: 'Kuljettaja tulossa', items: 'Kana-wrap, Salaatti', meta: 'Kuljettaja saapuu 18.08' },
]

const SALES_BARS = [34, 52, 41, 68, 58, 86, 74]

// Ravintolan tilauslaite: tilaukset tulevat reaaliajassa, myynti näkyy alla.
export function OrdersMockup() {
  return (
    <div className="pv-tablet" aria-hidden="true">
      <div className="pv-tablet__screen">
        <div className="pv-tablet__bar">
          <span className="pv-logo">
            <DelivoLogo />
          </span>
          <span className="pv-tablet__title">Tilaukset</span>
          <span className="pv-tablet__open">
            <span className="pv-dot" /> Auki
          </span>
          <span className="pv-tablet__bell">
            <BellRing size={15} strokeWidth={2.2} />
          </span>
        </div>

        <div className="pv-orders">
          {DEMO_ORDERS.map((order, index) => (
            <div
              className={`pv-order pv-order--${order.state}`}
              key={order.number}
              style={{ animationDelay: `${0.25 + index * 0.18}s` }}
            >
              <div className="pv-order__top">
                <strong>{order.number}</strong>
                <span className={`pv-chip pv-chip--${order.state}`}>
                  {order.state === 'courier' && <Bike size={11} strokeWidth={2.4} />}
                  {order.label}
                </span>
              </div>
              <p className="pv-order__items">{order.items}</p>
              <div className="pv-order__bottom">
                <span>{order.meta}</span>
                {order.state === 'new' && <span className="pv-order__accept">Hyväksy</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="pv-sales">
          <div className="pv-sales__head">
            <span>Myynti tänään</span>
            <strong>1 284 €</strong>
          </div>
          <div className="pv-sales__bars">
            {SALES_BARS.map((height, index) => (
              <span key={index} style={{ height: `${height}%`, animationDelay: `${0.5 + index * 0.08}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
