import { Link, useNavigate } from 'react-router-dom'
import { Bell, CreditCard, Lock, MessageCircle, Receipt, User } from 'lucide-react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { formatDisplayAddress } from '../lib/format.js'
import './Settings.css'
import './AccountHub.css'

// Mobiilin tilisivu (käyttäjän pyynnöt 31.10.2026): ylhäällä tervehdys
// etunimellä (ei profiilikuvaketta), sen alla kaikki kohdat samanlaisina kevyinä listariveinä
// (ikoni, otsikko, tarvittaessa kuvaus) - ei laattoja eikä kortteja. Ryhmät
// erotetaan ohuella viivalla. Alasivuilta palataan tänne yläpalkin nuolella.
// Työpöydällä /asetukset ohjautuu suoraan Omiin tietoihin (Settings.jsx).
const GROUPS = [
  [
    { to: '/asetukset/tiedot', label: 'Omat tiedot', hint: 'Nimi, puhelin ja toimitusosoite', Icon: User },
    { to: '/asetukset/salasana', label: 'Salasana', Icon: Lock },
    { to: '/asetukset/ilmoitukset', label: 'Ilmoitukset', hint: 'Tilausten tila ja sähköpostit', Icon: Bell },
  ],
  [
    { to: '/omat-tilaukset', label: 'Tilaukset', hint: 'Käynnissä olevat ja aiemmat tilaukset', Icon: Receipt },
    { to: '/asetukset/maksutavat', label: 'Maksutavat', hint: 'Kortit ja muut maksutavat', Icon: CreditCard },
  ],
  [{ href: 'mailto:tuki@bidrop.fi', label: 'Ota yhteyttä', hint: 'tuki@bidrop.fi', Icon: MessageCircle }],
]

function HubRow({ to, href, label, hint, Icon }) {
  const body = (
    <>
      <Icon className="hub-row__icon" size={18} strokeWidth={1.8} aria-hidden="true" />
      <span className="hub-row__text">
        <span className="hub-row__label">{label}</span>
        {hint && <span className="hub-row__hint">{hint}</span>}
      </span>
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
  const firstName = customer?.name?.trim().split(/\s+/)[0]
  const address = customer?.address ? formatDisplayAddress(customer.address) : null

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <SettingsLayout title="Tili" variant="hub">
      <Link to="/asetukset/tiedot" className="hub-profile">
        <span className="hub-profile__who">          <span className="hub-profile__name">{firstName ? `Hei, ${firstName}!` : 'Hei!'}</span>
          {customer?.email && <span className="hub-profile__line">{customer.email}</span>}
          {address && <span className="hub-profile__line">{address}</span>}
        </span>
      </Link>

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
