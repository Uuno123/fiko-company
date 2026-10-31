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

        {/* Linkit kahtena ryhmänä allekkain Uber Eatsin footerin mallin mukaan
            (käyttäjän pyyntö 31.10.2026): kumppanuudet ja tuki, sitten sivusto. */}
        <nav className="site-footer__links" aria-label="Footer">
          <div className="site-footer__group">
            <Link to="/kumppanina">Lisää ravintolasi</Link>
            <Link to="/kumppanina/kuljettajat">Ryhdy kuljettajaksi</Link>
            <a href={`mailto:${COMPANY.email}`}>Ota yhteyttä</a>
          </div>
          <div className="site-footer__group">
            <Link to="/">Ravintolat lähelläsi</Link>
            <Link to="/login">Kirjaudu</Link>
            <Link to="/register">Rekisteröidy</Link>
            <button type="button" onClick={openCookieSettings}>
              Evästeasetukset
            </button>
          </div>
        </nav>

        {/* Yritystiedot omille riveilleen (käyttäjän pyyntö 31.10.2026: kaikki
            päällekkäin, ei mitään vierekkäin). */}
        <p className="site-footer__copyright">
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          <span>
            {COMPANY.name} · Y-tunnus {COMPANY.businessId}
          </span>
          <span>{COMPANY.city}</span>
          <span>© {year}</span>
        </p>
      </div>
    </footer>
  )
}

export default Footer
