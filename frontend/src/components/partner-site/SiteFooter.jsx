import { Link } from 'react-router-dom'
import DelivoLogo from '../DelivoLogo.jsx'
import { COMPANY } from '../../lib/company.js'
import { PARTNER_EMAIL, sharedCopy } from './copy.js'

// Kumppanisivujen alatunniste: yhteystieto, kumppanilinkit ja paluu kuluttajasivulle.
function SiteFooter({ lang }) {
  const t = sharedCopy(lang)
  return (
    <footer className="ps-footer">
      <div className="ps-container ps-footer__inner">
        <div className="ps-footer__brand">
          <DelivoLogo className="ps-footer__logo" />
          <p>{t.footer.tagline}</p>
        </div>
        <div>
          <h2>{t.footer.contactTitle}</h2>
          <a href={`mailto:${PARTNER_EMAIL}`}>{PARTNER_EMAIL}</a>
          <p>
            {COMPANY.name}, {COMPANY.city}
          </p>
        </div>
        <div>
          <h2>{t.footer.linksTitle}</h2>
          <ul>
            <li>
              <Link to="/kumppanina">{t.nav.restaurants}</Link>
            </li>
            <li>
              <Link to="/kumppanina/kuljettajat">{t.nav.couriers}</Link>
            </li>
            <li>
              <Link to="/kumppanina/ehdot">{t.footer.terms}</Link>
            </li>
            <li>
              <Link to="/kumppani/kirjaudu">{t.footer.login}</Link>
            </li>
            <li>
              <Link to="/">{t.footer.orderFood}</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
