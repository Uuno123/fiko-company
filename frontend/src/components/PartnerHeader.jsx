import { Link } from 'react-router-dom'
import { usePartnerAuth } from '../lib/PartnerAuthContext.jsx'
import './PartnerHeader.css'

function PartnerHeader() {
  const { isOwner, signOut } = usePartnerAuth()

  return (
    <header className="partner-header">
      <div className="partner-header__inner">
        <Link to="/kumppanina" className="partner-header__brand">
          <span className="partner-header__wordmark">Fiko</span>
          <span className="partner-header__sublabel">Kumppanit</span>
        </Link>

        <nav className="partner-header__nav">
          {isOwner ? (
            <>
              <Link to="/kumppani/dashboard" className="partner-header__link">
                Kojelauta
              </Link>
              <button type="button" className="partner-header__link partner-header__link-button" onClick={() => signOut()}>
                Kirjaudu ulos
              </button>
            </>
          ) : (
            <>
              <Link to="/kumppani/kirjaudu" className="partner-header__link">
                Kirjaudu
              </Link>
              <Link to="/kumppani/rekisteroidy" className="partner-header__cta">
                Jätä hakemus
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default PartnerHeader
