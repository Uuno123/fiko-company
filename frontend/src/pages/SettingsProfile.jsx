import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SettingsLayout from '../components/SettingsLayout.jsx'
import AddressPickerModal from '../components/AddressPickerModal.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { getFavoriteRestaurantIds } from '../lib/favorites.js'
import { getRestaurants } from '../lib/api.js'
import { formatDisplayAddress } from '../lib/format.js'
import '../pages/AuthForm.css'
import './Settings.css'

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 17s-6.5-4-6.5-8.5A3.5 3.5 0 0 1 10 6a3.5 3.5 0 0 1 6.5 2.5C16.5 13 10 17 10 17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsProfile() {
  const { customer, refreshCustomer, signOut } = useAuth()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const closeAddressModal = useCallback(() => setAddressModalOpen(false), [])

  const [favorites, setFavorites] = useState([])
  const [favoritesStatus, setFavoritesStatus] = useState('loading')

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
    }
  }, [customer])

  useEffect(() => {
    if (!customer) return undefined
    let cancelled = false
    setFavoritesStatus('loading')

    Promise.all([getFavoriteRestaurantIds(customer.id), getRestaurants()])
      .then(([favoriteIds, restaurants]) => {
        if (cancelled) return
        const idSet = new Set(favoriteIds)
        setFavorites(restaurants.filter((r) => idSet.has(r.id)))
        setFavoritesStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setFavoritesStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [customer])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  function startEditing() {
    setError('')
    setSaved(false)
    setEditing(true)
  }

  function cancelEditing() {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
    }
    setError('')
    setEditing(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setStatus('submitting')

    const { error: updateError } = await supabase
      .from('customers')
      .update({ name: name.trim(), phone: phone.trim() })
      .eq('id', customer.id)

    if (updateError) {
      setError('Tallennus epäonnistui. Yritä hetken kuluttua uudelleen.')
      setStatus('idle')
      return
    }

    await refreshCustomer()
    setStatus('idle')
    setEditing(false)
    setSaved(true)
  }

  // Osoiteikkunan vahvistus tallentaa suoraan. Virhe heitetään ikkunalle, joka
  // pysyy auki ja näyttää viestin.
  async function handleAddressSave({ address }) {
    const { error: updateError } = await supabase
      .from('customers')
      .update({ address: address.trim() || null })
      .eq('id', customer.id)

    if (updateError) throw new Error(`Tallennus epäonnistui: ${updateError.message}`)

    await refreshCustomer()
    setAddressModalOpen(false)
  }

  return (
    <SettingsLayout title="Omat tiedot" description="Yhteystietosi, toimitusosoitteesi ja tallennetut ravintolasi.">
      {saved && <p className="auth-success">Tiedot tallennettu.</p>}

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Henkilötiedot</h2>
          {!editing && (
            <button type="button" className="settings-section__action" onClick={startEditing}>
              Muokkaa
            </button>
          )}
        </div>

        {editing ? (
          <form className="settings-panel settings-panel--padded auth-form" onSubmit={handleSubmit}>
            {error && <p className="auth-error">{error}</p>}

            <div className="auth-field">
              <label htmlFor="profile-name">Nimi</label>
              <input id="profile-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="auth-field">
              <label htmlFor="profile-email">Sähköposti</label>
              <input id="profile-email" type="email" value={customer?.email || ''} disabled />
              <span className="auth-field__hint">Sähköpostin vaihto ei ole vielä tuettu täältä</span>
            </div>

            <div className="auth-field">
              <label htmlFor="profile-phone">Puhelinnumero</label>
              <input id="profile-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="profile-edit-actions">
              <button type="submit" className="auth-submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Tallennetaan...' : 'Tallenna'}
              </button>
              <button type="button" className="auth-link-button" onClick={cancelEditing}>
                Peruuta
              </button>
            </div>
          </form>
        ) : (
          <div className="settings-panel">
            <div className="settings-panel__row">
              <span className="settings-panel__label">Nimi</span>
              <span className="settings-panel__value">{customer?.name || '-'}</span>
            </div>
            <div className="settings-panel__row">
              <span className="settings-panel__label">Sähköposti</span>
              <span className="settings-panel__value">{customer?.email}</span>
            </div>
            <div className="settings-panel__row">
              <span className="settings-panel__label">Puhelinnumero</span>
              <span className="settings-panel__value">{customer?.phone || '-'}</span>
            </div>
          </div>
        )}
      </section>

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Toimitusosoite</h2>
          <button type="button" className="settings-section__action" onClick={() => setAddressModalOpen(true)}>
            {customer?.address ? 'Muuta' : 'Lisää'}
          </button>
        </div>

        <div className="settings-panel">
          <div className="settings-panel__row address-row">
            <span className="address-row__icon">
              <PinIcon />
            </span>
            <span className={`settings-panel__value${customer?.address ? '' : ' settings-panel__value--muted'}`}>
              {formatDisplayAddress(customer?.address) || 'Ei vielä lisätty. Osoite täytetään valmiiksi kassalla.'}
            </span>
          </div>
        </div>

        {addressModalOpen && (
          <AddressPickerModal
            title="Toimitusosoite"
            confirmLabel="Tallenna osoite"
            initial={customer?.address ? { address: customer.address } : null}
            onConfirm={handleAddressSave}
            onClose={closeAddressModal}
          />
        )}
      </section>

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Lempipaikat</h2>
          {favorites.length > 0 && <span className="settings-section__count">{favorites.length}</span>}
        </div>

        {favoritesStatus === 'ready' && favorites.length === 0 && (
          <div className="settings-panel settings-panel--padded favorites-empty">
            <span className="favorites-empty__icon">
              <HeartIcon />
            </span>
            <div className="settings-empty">
              <p>Ei vielä suosikkeja.</p>
              <span className="settings-empty__hint">
                Napauta sydäntä ravintolan sivulla, niin löydät sen aina täältä.
              </span>
            </div>
          </div>
        )}

        {favoritesStatus === 'error' && (
          <div className="settings-panel settings-panel--padded">
            <p className="settings-empty__hint">Suosikkien haku epäonnistui. Yritä hetken kuluttua uudelleen.</p>
          </div>
        )}

        {favorites.length > 0 && (
          <div className="favorites-list">
            {favorites.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Tili</h2>
        </div>
        <div className="settings-panel">
          <div className="settings-panel__row">
            <span className="settings-panel__label">Kirjautuminen</span>
            <span className="settings-panel__value settings-panel__value--muted">Kirjaudu ulos tältä laitteelta.</span>
            <button type="button" className="settings-panel__link" onClick={handleSignOut}>
              Kirjaudu ulos
            </button>
          </div>
          <div className="settings-panel__row">
            <span className="settings-panel__label">Tilin poistaminen</span>
            <span className="settings-panel__value settings-panel__value--muted">
              Pyyntö lähtee asiakastukeen sähköpostilla.
            </span>
            <a
              href="mailto:tuki@delivo.fi?subject=Tilin%20poistopyynt%C3%B6"
              className="settings-panel__link settings-panel__link--danger"
            >
              Pyydä poistoa
            </a>
          </div>
        </div>
      </section>
    </SettingsLayout>
  )
}

export default SettingsProfile
