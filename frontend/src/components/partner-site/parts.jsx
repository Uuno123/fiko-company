import { Link } from 'react-router-dom'
import { ArrowRight, Bike, Check, Clock, Percent, Receipt, Tag, Users, Wallet } from 'lucide-react'

// Kumppanisivujen pienet rakennuspalat: osion otsikko, tarkistuslista,
// selainkehys ja puhelinkehys kuvakaappauksille sekä hyötykortit.

const ICONS = { percent: Percent, bike: Bike, users: Users, wallet: Wallet, clock: Clock, tag: Tag, receipt: Receipt }

export function SectionHead({ kicker, title, lead, center = false }) {
  return (
    <div className={`ps-head${center ? ' ps-head--center' : ''}`} data-reveal>
      {kicker ? <p className="ps-kicker">{kicker}</p> : null}
      <h2 className="ps-h2">{title}</h2>
      {lead ? <p className="ps-lead">{lead}</p> : null}
    </div>
  )
}

export function Checks({ items, className = '' }) {
  return (
    <ul className={`ps-checks ${className}`}>
      {items.map((item) => (
        <li key={item}>
          <Check size={18} strokeWidth={2.6} aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

// Kojelaudan kuvakaappaus selainikkunassa.
export function BrowserFrame({ src, alt, eager = false }) {
  return (
    <div className="ps-frame">
      <div className="ps-frame__bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <img src={src} alt={alt} width="1440" height="900" loading={eager ? 'eager' : 'lazy'} />
    </div>
  )
}

// Kuljettajasovelluksen kuvakaappaus puhelimessa.
export function PhoneFrame({ src, alt, eager = false }) {
  return (
    <div className="ps-phone">
      <img src={src} alt={alt} width="780" height="1688" loading={eager ? 'eager' : 'lazy'} />
    </div>
  )
}

export function BenefitGrid({ items }) {
  return (
    <div className="ps-benefits">
      {items.map(({ icon, title, body }, index) => {
        const Icon = ICONS[icon] ?? Check
        return (
          // Avain järjestyksestä: kielen vaihtuessa kortti pysyy samana (esiintulo säilyy).
          <article key={index} className="ps-benefit" data-reveal>
            <span className="ps-benefit__icon" aria-hidden="true">
              <Icon size={22} strokeWidth={2.2} />
            </span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        )
      })}
    </div>
  )
}

export function Steps({ steps, columns = 4 }) {
  return (
    <ol className={`ps-steps ps-steps--${columns}`}>
      {steps.map((step, index) => (
        <li key={index} data-reveal>
          <span className="ps-steps__num">{index + 1}</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>
      ))}
    </ol>
  )
}

// Pääsivujen loppukaista: lyhyt kehotus ja nappi erilliselle hakusivulle.
export function ApplyBand({ title, body, to, label }) {
  return (
    <section className="ps-band">
      <div className="ps-container ps-band__inner">
        <div>
          <h2 className="ps-h2">{title}</h2>
          <p>{body}</p>
        </div>
        <Link to={to} className="ps-btn ps-btn--orange ps-btn--lg">
          {label} <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
