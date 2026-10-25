import { Link } from 'react-router-dom'
import { COMPANY } from '../lib/company.js'
import { openCookieSettings } from '../lib/cookieConsent.js'
import DelivoLogo from './DelivoLogo.jsx'
import './Footer.css'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <span className="site-footer__logo">
            <DelivoLogo />
          </span>
          <p className="site-footer__tagline">Nouda tai tilaa kuljetuksella suoraan lähiravintoloista.</p>
        </div>

        <nav className="site-footer__links" aria-label="Footer">
          <Link to="/">Etusivu</Link>
          <Link to="/kumppanina">Ravintoloille</Link>
          <Link to="/kumppanina/kuljettajat">Kuljettajaksi</Link>
          <Link to="/login">Kirjaudu</Link>
          <Link to="/register">Rekisteröidy</Link>
          <button type="button" onClick={openCookieSettings}>
            Evästeasetukset
          </button>
        </nav>

        <p className="site-footer__copyright">
          © {year} {COMPANY.name} · Y-tunnus {COMPANY.businessId} · {COMPANY.city} ·{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </p>
      </div>
    </footer>
  )
}

export default Footer
