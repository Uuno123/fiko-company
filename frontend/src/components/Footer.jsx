import { Link } from 'react-router-dom'
import { COMPANY } from '../lib/company.js'
import { openCookieSettings } from '../lib/cookieConsent.js'
import DelivoLogo from './DelivoLogo.jsx'
import './Footer.css'

// Vaalea sarakefooter (käyttäjän valinta 2.11.2026): logo ja iskulause
// vasemmalla, linkit kolmessa otsikoidussa sarakkeessa ja alarivillä
// yritystiedot. Puhelimella sarakkeet allekkain.
const COLUMNS = [
  {
    title: 'Bidrop',
    links: [
      { to: '/', label: 'Etusivu' },
      { href: `mailto:${COMPANY.email}`, label: 'Ota yhteyttä' },
      { onClick: openCookieSettings, label: 'Evästeasetukset' },
    ],
  },
  {
    title: 'Kumppanit',
    links: [
      { to: '/kumppanina', label: 'Ravintoloille' },
      { to: '/kumppanina/kuljettajat', label: 'Kuljettajaksi' },
    ],
  },
  {
    title: 'Tili',
    links: [
      { to: '/login', label: 'Kirjaudu' },
      { to: '/register', label: 'Rekisteröidy' },
    ],
  },
]

function FooterLink({ to, href, onClick, label }) {
  if (to) return <Link to={to}>{label}</Link>
  if (href) return <a href={href}>{label}</a>
  return (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  )
}

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <span className="site-footer__logo">
              <DelivoLogo />
            </span>
            <p className="site-footer__tagline">Nouda tai tilaa kuljetuksella suoraan lähiravintoloista.</p>
          </div>

          <nav className="site-footer__columns" aria-label="Footer">
            {COLUMNS.map((column) => (
              <div key={column.title} className="site-footer__column">
                <h2>{column.title}</h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink {...link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="site-footer__bottom">
          <span>
            © {year} {COMPANY.name} · Y-tunnus {COMPANY.businessId} · {COMPANY.city}
          </span>
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
