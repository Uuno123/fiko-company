import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { usePartnerAuth } from '../lib/PartnerAuthContext.jsx'
import DelivoLogo from './DelivoLogo.jsx'
import './PartnerHeader.css'

// Kumppanin kirjautumis- ja kojelautasivujen yläpalkki. Linkit vievät uusille
// kumppanisivuille (24.10.2026): ravintolat /kumppanina, kuljettajat omalla sivullaan.
const NAV_ITEMS = [
  { href: '/kumppanina', label: 'Ravintoloille' },
  { href: '/kumppanina#hinnat', label: 'Hinnat' },
  { href: '/kumppanina/kuljettajat', label: 'Kuljettajille' },
  { href: '/kumppanina#ukk', label: 'UKK' },
]

// Aktiivinen kohta: sama sivu ja sama #-osio (Ravintoloille ilman osiota).
function isActive(href, location) {
  const [pathname, hash = ''] = href.split('#')
  return location.pathname === pathname && location.hash === (hash ? `#${hash}` : '')
}

function PersonIcon() {
  return (
    <svg className="partner-header__link-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PartnerHeader() {
  const { isOwner, signOut } = usePartnerAuth()
  const location = useLocation()
  // Kapealla näytöllä osiolinkit ovat valikossa, joka aukeaa headerin alle.
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!menuOpen) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className={`partner-header${menuOpen ? ' partner-header--menu-open' : ''}`}>
      <div className="partner-header__inner">
        {/* Sama sanamerkki kuin asiakaspuolen headerissa (DelivoLogo). */}
        <Link to="/kumppanina" className="partner-header__brand">
          <span className="partner-header__logo">
            <DelivoLogo />
          </span>
          <span className="partner-header__sublabel">Kumppanit</span>
        </Link>

        {/* Sivun vaihto ilman uudelleenlatausta; #-osioon vierittää PartnerLanding. */}
        <nav className="partner-header__nav" aria-label="Kumppanisivut">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`partner-header__nav-link${isActive(item.href, location) ? ' is-active' : ''}`}
              aria-current={isActive(item.href, location) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="partner-header__actions">
          {isOwner ? (
            <>
              <Link to="/kumppani/dashboard" className="partner-header__ghost-btn">
                Kojelauta
              </Link>
              <button type="button" className="partner-header__pill-btn" onClick={() => signOut()}>
                Kirjaudu ulos
              </button>
            </>
          ) : (
            <>
              <Link to="/kumppani/kirjaudu" className="partner-header__ghost-btn">
                <PersonIcon />
                Kirjaudu
              </Link>
              <Link to="/kumppanina/hae" className="partner-header__pill-btn">
                Jätä hakemus
              </Link>
            </>
          )}
          <button
            type="button"
            className="partner-header__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="partner-mobile-menu"
            aria-label={menuOpen ? 'Sulje valikko' : 'Avaa valikko'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} strokeWidth={2.2} /> : <Menu size={20} strokeWidth={2.2} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <nav id="partner-mobile-menu" className="partner-header__mobile-nav" aria-label="Kumppanisivut">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} to={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link to="/kumppanina/kuljettajat/hae" className="partner-header__mobile-cta">
              Hae kuljettajaksi
            </Link>
          </nav>
          <button
            type="button"
            className="partner-header__backdrop"
            aria-label="Sulje valikko"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
          />
        </>
      )}
    </header>
  )
}

export default PartnerHeader
