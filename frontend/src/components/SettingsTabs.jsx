import { NavLink } from 'react-router-dom'
import './SettingsTabs.css'

function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 10a7 7 0 1 1 3.1 5.8L3 17l1.2-3.4A6.96 6.96 0 0 1 3 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const TABS = [
  { to: '/asetukset/tiedot', label: 'Omat tiedot' },
  { to: '/asetukset/salasana', label: 'Salasana' },
  { to: '/asetukset/maksutavat', label: 'Maksutavat' },
  { to: '/omat-tilaukset', label: 'Tilaukset' },
]

function SettingsTabs() {
  return (
    <div className="settings-tabs-header">
      <div className="settings-tabs-header__top">
        <h1>Profiili</h1>
        <a href="mailto:tuki@fiko.fi" className="settings-tabs-header__support">
          <ChatIcon />
          Ota yhteyttä
        </a>
      </div>

      <nav className="settings-tabs" aria-label="Asetusten osiot">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `settings-tab${isActive ? ' settings-tab--active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default SettingsTabs
