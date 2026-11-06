import { NavLink, useLocation } from 'react-router-dom'
// Ikonit mallikuvan tapaan (6.11.2026): isommat, paksumpi viiva.
import { CircleUserRound, House, ReceiptText, TextSearch } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import './HomeSidebar.css'

// Työpöydän navigaatiosivupalkki etusivulla (käyttäjän valinta 6.11.2026,
// Wolt/Uber Eats -tyyliin). Näkyy vain leveällä näytöllä (HomeSidebar.css),
// puhelimella ei muutosta. Tilaukset ja tili vain kirjautuneelle; muille
// kirjautumislinkki. Kumppani-, tarjous- ja
// ilmaisen kuljetuksen linkit poistettu (käyttäjän pyynnöt 6.11.2026).
const MAIN_LINKS = [
  { to: '/', label: 'Koti', icon: House, end: true },
  // Ei tyhjälle hakusivulle (käyttäjän palaute 6.11.2026): kaikki ravintolat
  // suodattimineen, kuten Woltin/DoorDashin "Browse all".
  { to: `/haku?q=${encodeURIComponent('Kaikki ravintolat')}`, label: 'Selaa kaikkia', icon: TextSearch },
]

function SidebarLink({ to, label, icon: Icon, end }) {
  const location = useLocation()
  // Hakulinkeissä myös kysely ratkaisee, mikä on aktiivinen.
  const isQueryLink = to.includes('?')
  const queryActive = isQueryLink && `${location.pathname}${location.search}` === to
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `home-sidebar__link${(isQueryLink ? queryActive : isActive && !(to === '/haku' && location.search)) ? ' is-active' : ''}`
      }
    >
      <Icon size={21} strokeWidth={2.1} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function HomeSidebar() {
  const { isAuthenticated } = useAuth()
  return (
    <aside className="home-sidebar" aria-label="Sivunavigaatio">
      <nav className="home-sidebar__group">
        {MAIN_LINKS.map((link) => (
          <SidebarLink key={link.to} {...link} />
        ))}
      </nav>

      <nav className="home-sidebar__group" aria-label="Oma tili">
        {isAuthenticated ? (
          <>
            <SidebarLink to="/omat-tilaukset" label="Tilaukset" icon={ReceiptText} />
            <SidebarLink to="/asetukset" label="Tili" icon={CircleUserRound} />
          </>
        ) : (
          <SidebarLink to="/login" label="Kirjaudu tai liity" icon={CircleUserRound} />
        )}
      </nav>

    </aside>
  )
}
