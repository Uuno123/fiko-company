import { Link, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, CreditCard, Lock, LogOut, MessageCircle, Receipt, User } from 'lucide-react'
import Header from './Header.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { useIsMobile } from '../lib/useIsMobile.js'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'
import './SettingsLayout.css'

const NAV = [
  { to: '/asetukset/tiedot', label: 'Omat tiedot', Icon: User },
  { to: '/omat-tilaukset', label: 'Tilaukset', Icon: Receipt },
  { to: '/asetukset/maksutavat', label: 'Maksutavat', Icon: CreditCard },
  { to: '/asetukset/ilmoitukset', label: 'Ilmoitukset', Icon: Bell },
  { to: '/asetukset/salasana', label: 'Salasana', Icon: Lock },
]

// Mobiilissa navigaatio on tilisivu (variant="hub", pages/AccountHub.jsx):
// alasivuilla ei ole pilleririviä, vaan yläpalkin nuoli vie takaisin tilisivulle.
// Tilisivulta nuoli vie etusivulle. Työpöydällä sivupalkki kuten ennenkin.
function SettingsLayout({ title, description, children, variant }) {
  const { isAuthenticated, status, customer, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isHub = variant === 'hub'

  if (!isSupabaseConfigured || status === 'loading') {
    return (
      <div className="page">
        <Header />
      </div>
    )
  }

  if (!isAuthenticated) {
    // overHome: kirjautumispaneelin taustalla etusivu, ei tämä sivu (joka ohjaisi taas tänne).
    return <Navigate to="/login" state={{ from: '/asetukset', overHome: true }} replace />
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const firstName = customer?.name?.trim().split(/\s+/)[0]

  return (
    <div className="page">
      {isMobile ? (
        <div className="settings-topbar">
          <Link
            to={isHub ? '/' : '/asetukset'}
            className="settings-topbar__back"
            aria-label={isHub ? 'Takaisin etusivulle' : 'Takaisin tilisivulle'}
          >
            <ArrowLeft size={22} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <span className="settings-topbar__title">{title}</span>
          <span aria-hidden="true" />
        </div>
      ) : (
        <Header />
      )}

      <div className={`account${isMobile ? ' account--mobile' : ''}${isMobile && isHub ? ' account--hub' : ''}`}>
        {!isMobile && (
          <aside className="account-side">
            {/* Tervehdys ilman profiilikuvaa, kuten puhelimen tilisivulla
                (käyttäjän pyyntö 31.10.2026: ei oranssia). */}
            <div className="account-side__identity">
              <span className="account-side__name">{firstName ? `Hei, ${firstName}!` : 'Hei!'}</span>
              <span className="account-side__email">{customer?.email}</span>
            </div>

            <nav className="account-nav" aria-label="Tilin osiot">
              {NAV.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `account-nav__link${isActive ? ' account-nav__link--active' : ''}`}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="account-side__footer">
              <a href="mailto:tuki@bidrop.fi" className="account-side__action">
                <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
                Ota yhteyttä
              </a>
              <button type="button" className="account-side__action" onClick={handleSignOut}>
                <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
                Kirjaudu ulos
              </button>
            </div>
          </aside>
        )}

        <main className="settings-page">
          {/* Mobiilissa otsikko on jo yläpalkissa, joten isoa otsikkoa ei toisteta -
              alasivuilla näkyy vain kuvausteksti, tilisivulla ei kumpaakaan. */}
          {title && !isMobile && (
            <header className="settings-page__head">
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </header>
          )}
          {isMobile && !isHub && description && (
            <header className="settings-page__head">
              <p>{description}</p>
            </header>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

export default SettingsLayout
