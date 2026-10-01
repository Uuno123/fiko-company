import { Link } from 'react-router-dom'
import { usePartnerAuth } from '../lib/PartnerAuthContext.jsx'
import './PartnerHeader.css'

const NAV_ITEMS = [
  { href: '/kumppanina#alkuun', label: 'Näin se toimii' },
  { href: '/kumppanina#ominaisuudet', label: 'Ominaisuudet' },
  { href: '/kumppanina#hinnoittelu', label: 'Hinnoittelu' },
  { href: '/kumppanina#ukk', label: 'UKK' },
]

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

  return (
    <header className="partner-header">
      <div className="partner-header__inner">
        <Link to="/kumppanina" className="partner-header__brand">
          <span className="partner-header__wordmark">delivo</span>
          <span className="partner-header__divider" aria-hidden="true" />
          <span className="partner-header__sublabel">Kumppanit</span>
        </Link>

        {/* Tavalliset <a>-linkit eikä <Link>: React Router ei vieritä #-ankkuriin,
            selain tekee sen itse - samalla sivulla ilman uudelleenlatausta. */}
        <nav className="partner-header__nav" aria-label="Kumppanisivun osiot">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="partner-header__nav-link">
              {item.label}
            </a>
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
              <Link to="/kumppani/rekisteroidy" className="partner-header__pill-btn">
                Jätä hakemus
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default PartnerHeader
