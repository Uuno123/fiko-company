import { useNavigate } from 'react-router-dom'
import { Bell, CreditCard, Lock, LogOut, MessageCircle, Receipt, User } from 'lucide-react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import { ProfileCard, SettingsRow } from '../components/SettingsRow.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import './Settings.css'

// Mobiilin tilisivu ryhmiteltynä listana (käyttäjän valinta 27.10.2026):
// yläreunassa profiilikortti, sen alla ryhmät, joissa jokainen rivi vie omalle
// sivulleen. Sama ilme kuin työpöydän asetussivuilla (SettingsRow.jsx,
// Settings.css). Alasivuilta palataan tänne yläpalkin nuolella. Työpöydällä
// /asetukset ohjautuu edelleen suoraan Omiin tietoihin (Settings.jsx).
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

function AccountHub() {
  const { customer, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <SettingsLayout title="Tili" variant="hub">
      <ProfileCard customer={customer} to="/asetukset/tiedot" />

      {GROUPS.map((group) => (
        <section key={group.title} className="settings-section">
          <div className="settings-section__head">
            <h2>{group.title}</h2>
          </div>
          <div className="settings-panel">
            {group.rows.map((row) => (
              <SettingsRow key={row.to} icon={row.Icon} label={row.label} to={row.to} />
            ))}
          </div>
        </section>
      ))}

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Tuki</h2>
        </div>
        <div className="settings-panel">
          <SettingsRow icon={MessageCircle} label="Ota yhteyttä" href="mailto:tuki@bidrop.fi" />
          <SettingsRow icon={LogOut} label="Kirjaudu ulos" onClick={handleSignOut} />
        </div>
      </section>
    </SettingsLayout>
  )
}

export default AccountHub
