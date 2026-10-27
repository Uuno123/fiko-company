import { useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import { PhoneField } from './AuthInputs.jsx'
import DeliveryAddressForm from './DeliveryAddressForm.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { internationalPhone, nationalPhone, splitName } from '../lib/format.js'
import '../pages/AuthForm.css'

// Omat tiedot -sivun muokkausikkuna (käyttäjän pyyntö 27.10.2026): rivin
// painallus avaa ikkunan keskelle näyttöä (puhelimella alhaalta liukuva
// paneeli, BottomSheet), jossa tieto vaihdetaan. field: 'name' | 'phone' | 'address'.
// Nimi kysytään kuten rekisteröitymisessä etu- ja sukunimenä, puhelin
// +358-kentällä ja osoite samalla lomakkeella kuin rekisteröitymisessä
// (DeliveryAddressForm); tallennus customers-riville.
function ProfileEditSheet({ field, customer, onClose, onSaved }) {
  const { refreshCustomer } = useAuth()
  const isName = field === 'name'
  const [first, setFirst] = useState(() => splitName(customer.name).first)
  const [last, setLast] = useState(() => splitName(customer.name).last)
  const [phone, setPhone] = useState(() => nationalPhone(customer.phone))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(e, close) {
    e.preventDefault()
    setError('')

    let update
    if (isName) {
      if (!first.trim() || !last.trim()) {
        setError('Anna etu- ja sukunimi.')
        return
      }
      update = { name: `${first.trim()} ${last.trim()}` }
    } else {
      const digits = phone.replace(/\D/g, '')
      if (digits.length < 6 || digits.length > 11) {
        setError('Tarkista puhelinnumero.')
        return
      }
      update = { phone: internationalPhone(phone) }
    }

    setSaving(true)
    const { error: updateError } = await supabase.from('customers').update(update).eq('id', customer.id)
    if (updateError) {
      setError('Tallennus epäonnistui. Yritä hetken kuluttua uudelleen.')
      setSaving(false)
      return
    }

    await refreshCustomer()
    onSaved()
    close()
  }

  if (field === 'address') {
    return (
      <BottomSheet onClose={onClose} labelledBy="profile-edit-title">
        {(close) => (
          <div className="profile-edit">
            <h2 id="profile-edit-title" className="profile-edit__title">
              Toimitusosoite
            </h2>
            <DeliveryAddressForm
              customer={customer}
              userId={customer.id}
              submitLabel="Tallenna osoite"
              onDone={() => {
                onSaved()
                close()
              }}
            />
          </div>
        )}
      </BottomSheet>
    )
  }

  return (
    <BottomSheet compact onClose={onClose} labelledBy="profile-edit-title">
      {(close) => (
        <form className="auth-form profile-edit" onSubmit={(e) => save(e, close)} noValidate>
          <h2 id="profile-edit-title" className="profile-edit__title">
            {isName ? 'Muokkaa nimeä' : 'Muokkaa puhelinnumeroa'}
          </h2>
          {error && <p className="auth-error">{error}</p>}

          {isName ? (
            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="edit-first-name">Etunimi</label>
                <input
                  id="edit-first-name"
                  type="text"
                  autoComplete="given-name"
                  autoFocus
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="edit-last-name">Sukunimi</label>
                <input
                  id="edit-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="auth-field">
              <label htmlFor="edit-phone">Puhelinnumero</label>
              <PhoneField id="edit-phone" value={phone} onChange={setPhone} />
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={saving}>
            {saving ? 'Tallennetaan...' : 'Tallenna'}
          </button>
        </form>
      )}
    </BottomSheet>
  )
}

export default ProfileEditSheet
