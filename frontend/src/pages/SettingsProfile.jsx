import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Mail, MapPin, Phone, Trash2, User } from 'lucide-react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import FavoritesSection from '../components/FavoritesSection.jsx'
import { SettingsRow } from '../components/SettingsRow.jsx'
import ProfileEditSheet from '../components/ProfileEditSheet.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { formatDisplayAddress, formatPhone } from '../lib/format.js'
import { savedAddressSummary } from '../lib/customerAddress.js'
import '../pages/AuthForm.css'
import './Settings.css'

// Omat tiedot ryhmiteltynä listana (käyttäjän valinta 27.10.2026): henkilötiedot,
// toimitusosoite, lempipaikat ja tili. Nimen, puhelimen ja osoitteen rivi avaa
// muokkausikkunan keskelle näyttöä (ProfileEditSheet, käyttäjän pyyntö).
function SettingsProfile() {
  const { customer, signOut } = useAuth()
  const navigate = useNavigate()
  // Avoinna oleva muokkausikkuna: 'name' | 'phone' | 'address' | null.
  const [editField, setEditField] = useState(null)
  // Viimeksi tallennettu: ilmoitus sivun ylälaitaan.
  const [savedField, setSavedField] = useState(null)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  function openEditor(field) {
    setSavedField(null)
    setEditField(field)
  }

  const addressHints = [
    savedAddressSummary(customer),
    customer?.courier_instructions && `Ohjeet: ${customer.courier_instructions}`,
  ]

  return (
    <SettingsLayout title="Omat tiedot">
      {savedField && (
        <p className="auth-success">
          {savedField === 'address' ? 'Toimitusosoite tallennettu.' : 'Tiedot tallennettu.'}
        </p>
      )}

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Henkilötiedot</h2>
        </div>

        <div className="settings-panel">
          <SettingsRow icon={User} label="Nimi" value={customer?.name || '-'} onClick={() => openEditor('name')} />
          <SettingsRow
            icon={Phone}
            label="Puhelinnumero"
            value={formatPhone(customer?.phone) || 'Lisää puhelinnumero'}
            onClick={() => openEditor('phone')}
          />
          <SettingsRow icon={Mail} label="Sähköposti" value={customer?.email || '-'} />
        </div>
      </section>

      {editField && customer && (
        <ProfileEditSheet
          field={editField}
          customer={customer}
          onClose={() => setEditField(null)}
          onSaved={() => setSavedField(editField)}
        />
      )}

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Toimitusosoite</h2>
        </div>
        <div className="settings-panel">
          {customer?.address ? (
            <SettingsRow
              icon={MapPin}
              label="Osoite"
              value={formatDisplayAddress(customer.address)}
              hint={addressHints}
              onClick={() => openEditor('address')}
            />
          ) : (
            <SettingsRow icon={MapPin} label="Lisää toimitusosoite" onClick={() => openEditor('address')} />
          )}
        </div>
      </section>

      <FavoritesSection customerId={customer?.id} />

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Tili</h2>
        </div>
        <div className="settings-panel">
          <SettingsRow icon={LogOut} label="Kirjaudu ulos" onClick={handleSignOut} />
          <SettingsRow
            icon={Trash2}
            label="Pyydä tilin poistoa"
            href="mailto:tuki@bidrop.fi?subject=Tilin%20poistopyynt%C3%B6"
            danger
          />
        </div>
      </section>
    </SettingsLayout>
  )
}

export default SettingsProfile
