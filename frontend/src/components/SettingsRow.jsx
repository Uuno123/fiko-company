import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

// Asetusten ryhmitellyn listan rakennuspalat (käyttäjän valinta 27.10.2026,
// "ryhmitellyt listat" kuten Woltissa ja iPhonen asetuksissa). Ryhmä on
// .settings-section + .settings-panel (pages/Settings.css), rivit tätä.

// Rivi: ikoni harmaassa neliössä, teksti ja oikealla nuoli tai oma elementti.
//   value: pieni otsikko (label) ja sen alla arvo; ilman sitä label on rivin otsikko
//   hint: lisärivi(t) harmaalla, merkkijono tai taulukko
//   to / href / onClick: rivi on linkki tai nappi ja saa nuolen
//   trailing: oma elementti nuolen tilalle (esim. kytkin)
//   danger: punainen (tilin poisto)
export function SettingsRow({ icon: Icon, label, value, hint, to, href, onClick, trailing, danger = false }) {
  const interactive = Boolean(to || href || onClick)
  const hints = (Array.isArray(hint) ? hint : [hint]).filter(Boolean)
  const className = `srow${Icon ? ' srow--icon' : ''}${interactive ? ' srow--action' : ''}${danger ? ' srow--danger' : ''}`

  const body = (
    <>
      {Icon && (
        <span className="srow__icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
      )}
      <span className="srow__text">
        {value != null ? (
          <>
            <span className="srow__label">{label}</span>
            <span className="srow__value">{value}</span>
          </>
        ) : (
          <span className="srow__title">{label}</span>
        )}
        {hints.map((text) => (
          <span key={text} className="srow__hint">
            {text}
          </span>
        ))}
      </span>
      {trailing ??
        (interactive && !danger && (
          <ChevronRight className="srow__chevron" size={18} strokeWidth={1.8} aria-hidden="true" />
        ))}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}

// Profiilin yläkortti: iso nimikirjain, nimi ja sähköposti. to: koko kortti linkkinä.
export function ProfileCard({ customer, to }) {
  const initial = (customer?.name?.trim()?.[0] || customer?.email?.[0] || '?').toUpperCase()
  const body = (
    <>
      <span className="profile-card__avatar" aria-hidden="true">
        {initial}
      </span>
      <span className="profile-card__who">
        <strong>{customer?.name || 'Nimetön'}</strong>
        <span>{customer?.email}</span>
      </span>
      {to && <ChevronRight className="srow__chevron" size={20} strokeWidth={1.8} aria-hidden="true" />}
    </>
  )
  return to ? (
    <Link to={to} className="profile-card profile-card--link">
      {body}
    </Link>
  ) : (
    <div className="profile-card">{body}</div>
  )
}
