import { Navigate, NavLink, useNavigate } from 'react-router-dom'
import { Bell, CreditCard, Lock, LogOut, MessageCircle, Receipt, User } from 'lucide-react'
import Header from './Header.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'
import './SettingsLayout.css'

const NAV = [
  { to: '/asetukset/tiedot', label: 'Omat tiedot', Icon: User },
  { to: '/omat-tilaukset', label: 'Tilaukset', Icon: Receipt },
  { to: '/asetukset/maksutavat', label: 'Maksutavat', Icon: CreditCard },
  { to: '/asetukset/ilmoitukset', label: 'Ilmoitukset', Icon: Bell },
  { to: '/asetukset/salasana', label: 'Salasana', Icon: Lock },
]

function SettingsLayout({ title, description, children }) {
  const { isAuthenticated, status, customer, signOut } = useAuth()
  const navigate = useNavigate()

  if (!isSupabaseConfigured || status === 'loading') {
    return (
      <div className="page">
        <Header />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/asetukset' }} replace />
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const initial = (customer?.name?.trim()?.[0] || customer?.email?.[0] || '?').toUpperCase()

  return (
    <div className="page">
      <Header />

      <div className="account">
        <aside className="account-side">
          <div className="account-side__identity">
            <span className="account-side__avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="account-side__who">
              <span className="account-side__name">{customer?.name || 'Tili'}</span>
              <span className="account-side__email">{customer?.email}</span>
            </div>
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
            <a href="mailto:tuki@delivo.fi" className="account-side__action">
              <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
              Ota yhteyttä
            </a>
            <button type="button" className="account-side__action" onClick={handleSignOut}>
              <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
              Kirjaudu ulos
            </button>
          </div>
        </aside>

        <main className="settings-page">
          {title && (
            <header className="settings-page__head">
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </header>
          )}
          {children}
        </main>
      </div>

    </div>
  )
}

export default SettingsLayout
