import { Link } from 'react-router-dom'
import { openCookieSettings } from '../lib/cookieConsent.js'
import './Footer.css'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <span className="site-footer__logo">delivo</span>
          <p className="site-footer__tagline">Nouda tai tilaa kuljetuksella suoraan lähiravintoloista.</p>
        </div>

        <nav className="site-footer__links" aria-label="Footer">
          <Link to="/">Etusivu</Link>
          <Link to="/kumppanina">Ravintoloille</Link>
          <Link to="/login">Kirjaudu</Link>
          <Link to="/register">Rekisteröidy</Link>
          <button type="button" onClick={openCookieSettings}>
            Evästeasetukset
          </button>
        </nav>

        <p className="site-footer__copyright">© {year} delivo</p>
      </div>
    </footer>
  )
}

export default Footer
