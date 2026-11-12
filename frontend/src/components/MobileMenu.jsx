import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, CreditCard, LifeBuoy, ReceiptText, Tag, UserRound } from 'lucide-react'
import DelivoLogo from './DelivoLogo.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import './MobileMenu.css'

const LEAVE_MS = 240

const STORES = [
  {
    id: 'ios',
    sub: 'Lataa',
    label: 'App Storesta',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    id: 'android',
    sub: 'SAATAVANA',
    label: 'Google Playssa',
    // Nelivärinen Play-kolmio kuten kaupan virallisessa merkissä.
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.6 1.8 13.4 11.9 3.6 22c-.3-.2-.5-.6-.5-1V2.8c0-.4.2-.8.5-1Z" fill="#00a0ff" />
        <path d="M3.6 1.8 16.8 9.1l-3.4 2.8L3.6 1.8Z" fill="#00d95f" />
        <path d="m16.8 9.1 3.6 2c.7.4.7 1.4 0 1.8l-3.6 2-3.4-3 3.4-2.8Z" fill="#ffd500" />
        <path d="M3.6 22 13.4 11.9l3.4 3L3.6 22Z" fill="#ff3a44" />
      </svg>
    ),
  },
]

// Puhelimen hamburger-valikko etusivulla. Siisti sivupalkki käyttäjän
// mallikuvan mukaan (9.11.2026): ylhäällä isot Liity- ja Kirjaudu sisään
// -napit, alla pelkät tekstilinkit ilman ikoneita ja alareunassa
// sovellusnosto. Kirjautuneelle tervehdys ja tilin linkit.
export default function MobileMenu({ onClose, onOpenApp }) {
  const { isAuthenticated, customer, signOut } = useAuth()
  const location = useLocation()
  const [leaving, setLeaving] = useState(false)
  const close = () => setLeaving(true)

  useEffect(() => {
    if (!leaving) return undefined
    const timer = setTimeout(onClose, LEAVE_MS)
    return () => clearTimeout(timer)
  }, [leaving, onClose])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setLeaving(true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const firstName = customer?.name?.split(' ')[0]
  // Kirjautuneen ikonilista (käyttäjän mallikuva 9.11.2026).
  const accountLinks = [
    { to: '/omat-tilaukset', label: 'Tilaukset', icon: ReceiptText },
    { to: '/asetukset/maksutavat', label: 'Maksutavat', icon: CreditCard },
    { to: `/haku?q=${encodeURIComponent('Tarjoukset')}`, label: 'Tarjoukset', icon: Tag },
    { to: '/asetukset/ilmoitukset', label: 'Ilmoitukset', icon: Bell },
    { href: 'mailto:tuki@bidrop.fi', label: 'Ohje', icon: LifeBuoy },
  ]
  const links = [
    ...(isAuthenticated
      ? []
      : [{ to: `/haku?q=${encodeURIComponent('Kaikki ravintolat')}`, label: 'Selaa kaikkia ravintoloita' }]),
    // Uudet linkit vanhojen tilalle (käyttäjän pyyntö 12.11.2026): pikahaut
    // tarjouksiin, ilmaisiin kuljetuksiin ja lähimpiin sekä asiakastuki.
    { to: `/haku?q=${encodeURIComponent('Tarjoukset')}`, label: 'Tarjoukset' },
    { to: `/haku?q=${encodeURIComponent('Ilmainen kuljetus')}`, label: 'Ilmainen kuljetus' },
    { to: `/haku?q=${encodeURIComponent('Lähelläsi')}`, label: 'Lähelläsi' },
    { href: 'mailto:tuki@bidrop.fi', label: 'Asiakastuki' },
  ]

  return (
    <div className={`mobile-menu${leaving ? ' is-leaving' : ''}`}>
      <div className="mobile-menu__backdrop" onClick={close} />
      <nav className="mobile-menu__panel" aria-label="Valikko">
        {isAuthenticated ? (
          <>
            {/* Profiili: pyöreä käyttäjäikoni, nimi ja Hallinnoi tiliä -linkki. */}
            <Link to="/asetukset" className="mobile-menu__profile" onClick={close}>
              <span className="mobile-menu__avatar" aria-hidden="true">
                <UserRound size={22} strokeWidth={1.9} />
              </span>
              <span className="mobile-menu__profile-text">
                <strong>{firstName || 'Oma tili'}</strong>
                <span>Hallinnoi tiliä</span>
              </span>
            </Link>
            <ul className="mobile-menu__list mobile-menu__list--account">
              {accountLinks.map(({ to, href, label, icon: Icon }) => {
                const content = (
                  <>
                    <Icon size={20} strokeWidth={2} aria-hidden="true" />
                    {label}
                  </>
                )
                return (
                  <li key={label}>
                    {href ? (
                      <a href={href} className="mobile-menu__row" onClick={close}>
                        {content}
                      </a>
                    ) : (
                      <Link to={to} className="mobile-menu__row" onClick={close}>
                        {content}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="mobile-menu__signout"
              onClick={() => {
                close()
                signOut()
              }}
            >
              Kirjaudu ulos
            </button>
            <div className="mobile-menu__divider" />
          </>
        ) : (
          <div className="mobile-menu__auth">
            {/* Liity-napissa pelkkä Bidrop-logo (käyttäjän pyyntö 12.11.2026). */}
            <Link
              to="/register"
              state={{ from: location.pathname }}
              className="mobile-menu__join"
              aria-label="Liity Bidropiin"
              onClick={close}
            >
              <DelivoLogo className="mobile-menu__join-logo" />
            </Link>
            <Link to="/login" state={{ from: location.pathname }} className="mobile-menu__login" onClick={close}>
              Kirjaudu sisään
            </Link>
          </div>
        )}

        <ul className="mobile-menu__list">
          {links.map(({ to, href, label }) => (
            <li key={label}>
              {href ? (
                <a href={href} className="mobile-menu__link" onClick={close}>
                  {label}
                </a>
              ) : (
                <Link to={to} className="mobile-menu__link" onClick={close}>
                  {label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* Sovellusnosto alareunassa: oma kuvake, lyhyt teksti ja nappi, joka
            avaa saman sovellusikkunan kuin "Avaa sovellus". */}
        <div className="mobile-menu__app">
          <div className="mobile-menu__app-row">
            <span className="mobile-menu__app-icon" aria-hidden="true">
              <DelivoLogo />
            </span>
            <p>Sovelluksessa tilaaminen on vielä nopeampaa.</p>
          </div>
          {/* Kauppanapit (käyttäjän pyyntö 9.11.2026). Sovellus ei ole vielä
              kaupoissa, joten molemmat avaavat "tulossa pian" -ikkunan. */}
          {onOpenApp && (
            <div className="mobile-menu__stores">
              {STORES.map(({ id, label, sub, icon }) => (
                <button
                  key={id}
                  type="button"
                  className="mobile-menu__store"
                  onClick={() => {
                    close()
                    onOpenApp()
                  }}
                >
                  {icon}
                  <span>
                    <small>{sub}</small>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
