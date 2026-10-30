import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, CreditCard, Lock, MapPin, MessageCircle, Receipt, User } from 'lucide-react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { formatDisplayAddress } from '../lib/format.js'
import './Settings.css'
import './AccountHub.css'

// Mobiilin tilisivu "Pikalaatat + lista" -mallilla (käyttäjän valinta
// 31.10.2026), frontend-design-skillin periaattein: ei korttipakkaa, varjoja
// eikä otsikkolappuja. Ainoa korostus on kolme harmaata pikalaattaa; rivien
// kuvaus kertoo mitä alasivulla on. Alasivuilta palataan tänne yläpalkin
// nuolella. Työpöydällä /asetukset ohjautuu suoraan Omiin tietoihin (Settings.jsx).
const QUICK_TILES = [
  { to: '/omat-tilaukset', label: 'Tilaukset', Icon: Receipt },
  { to: '/asetukset/maksutavat', label: 'Maksutavat', Icon: CreditCard },
  // Toimitusosoitetta muokataan Omien tietojen osoitelomakkeessa.
  { to: '/asetukset/tiedot', label: 'Osoite', Icon: MapPin },
]

// Ryhmät erotetaan välillä, ei otsikoilla.
const GROUPS = [
  [
    { to: '/asetukset/tiedot', label: 'Omat tiedot', hint: 'Nimi, puhelin ja toimitusosoite', Icon: User },
    { to: '/asetukset/salasana', label: 'Salasana', Icon: Lock },
    { to: '/asetukset/ilmoitukset', label: 'Ilmoitukset', hint: 'Tilausten tila ja sähköpostit', Icon: Bell },
  ],
  [{ href: 'mailto:tuki@bidrop.fi', label: 'Ota yhteyttä', Icon: MessageCircle }],
]

function HubRow({ to, href, label, hint, Icon }) {
  const body = (
    <>
      <Icon className="hub-row__icon" size={20} strokeWidth={1.8} aria-hidden="true" />
      <span className="hub-row__text">
        <span className="hub-row__label">{label}</span>
        {hint && <span className="hub-row__hint">{hint}</span>}
      </span>
      <ChevronRight className="hub-row__chevron" size={18} strokeWidth={1.8} aria-hidden="true" />
    </>
  )
  return to ? (
    <Link to={to} className="hub-row">
      {body}
    </Link>
  ) : (
    <a href={href} className="hub-row">
      {body}
    </a>
  )
}

function AccountHub() {
  const { customer, signOut } = useAuth()
  const navigate = useNavigate()
  const initial = (customer?.name?.trim()?.[0] || customer?.email?.[0] || '?').toUpperCase()
  const address = customer?.address ? formatDisplayAddress(customer.address) : null

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <SettingsLayout title="Tili" variant="hub">
      <Link to="/asetukset/tiedot" className="hub-profile">
        <span className="hub-profile__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="hub-profile__who">
          <span className="hub-profile__name">{customer?.name || 'Oma tili'}</span>
          {customer?.email && <span className="hub-profile__line">{customer.email}</span>}
          {address && <span className="hub-profile__line">{address}</span>}
        </span>
      </Link>

      <nav className="hub-tiles" aria-label="Pikalinkit">
        {QUICK_TILES.map(({ to, label, Icon }) => (
          <Link key={label} to={to} className="hub-tile">
            <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {GROUPS.map((rows) => (
        <section key={rows[0].label} className="hub-group">
          {rows.map((row) => (
            <HubRow key={row.label} {...row} />
          ))}
        </section>
      ))}

      <button type="button" className="hub-signout" onClick={handleSignOut}>
        Kirjaudu ulos
      </button>
    </SettingsLayout>
  )
}

export default AccountHub
