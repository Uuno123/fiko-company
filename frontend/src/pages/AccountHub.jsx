import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, CreditCard, Lock, LogOut, MessageCircle, Receipt, User } from 'lucide-react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import './AccountHub.css'

// Mobiilin tilisivu Spotifyn tilisivun mallin mukaan (käyttäjän referenssi):
// yläreunassa tilikortti, sen alla ryhmitellyt kortit, joissa jokainen rivi
// (ikoni, nimi, nuoli) vie omalle sivulleen. Korvaa mobiilissa aiemman
// pilleririvin - alasivuilta palataan tänne yläpalkin nuolella.
// Työpöydällä /asetukset ohjautuu edelleen suoraan Omiin tietoihin (Settings.jsx).
const GROUPS = [
  {
    title: 'Tili',
    rows: [
      { to: '/asetukset/tiedot', label: 'Omat tiedot', Icon: User },
      { to: '/asetukset/salasana', label: 'Salasana', Icon: Lock },
      { to: '/asetukset/ilmoitukset', label: 'Ilmoitukset', Icon: Bell },
    ],
  },
  {
    title: 'Tilaukset ja maksaminen',
    rows: [
      { to: '/omat-tilaukset', label: 'Tilaushistoria', Icon: Receipt },
      { to: '/asetukset/maksutavat', label: 'Maksutavat', Icon: CreditCard },
    ],
  },
]

function HubRow({ Icon, label, children }) {
  return (
    <>
      <span className="account-hub__row-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="account-hub__row-label">{label}</span>
      {children ?? <ChevronRight className="account-hub__row-chevron" size={20} strokeWidth={1.75} aria-hidden="true" />}
    </>
  )
}

function AccountHub() {
  const { customer, signOut } = useAuth()
  const navigate = useNavigate()
  const initial = (customer?.name?.trim()?.[0] || customer?.email?.[0] || '?').toUpperCase()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <SettingsLayout title="Tili" variant="hub">
      <div className="account-hub">
        <Link to="/asetukset/tiedot" className="account-hub__card account-hub__profile">
          <span className="account-hub__tag">Tilisi</span>
          <span className="account-hub__avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="account-hub__who">
            <strong>{customer?.name || 'Nimetön'}</strong>
            <span>{customer?.email}</span>
          </span>
          <ChevronRight className="account-hub__row-chevron" size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>

        {GROUPS.map((group) => (
          <section key={group.title} className="account-hub__card" aria-label={group.title}>
            <h2 className="account-hub__title">{group.title}</h2>
            <ul className="account-hub__rows">
              {group.rows.map((row) => (
                <li key={row.to}>
                  <Link to={row.to} className="account-hub__row">
                    <HubRow Icon={row.Icon} label={row.label} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="account-hub__card" aria-label="Tuki">
          <h2 className="account-hub__title">Tuki</h2>
          <ul className="account-hub__rows">
            <li>
              <a href="mailto:tuki@bidrop.fi" className="account-hub__row">
                <HubRow Icon={MessageCircle} label="Ota yhteyttä" />
              </a>
            </li>
            <li>
              <button type="button" className="account-hub__row" onClick={handleSignOut}>
                <HubRow Icon={LogOut} label="Kirjaudu ulos" />
              </button>
            </li>
          </ul>
        </section>
      </div>
    </SettingsLayout>
  )
}

export default AccountHub
