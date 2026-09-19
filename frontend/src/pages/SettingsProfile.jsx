import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SettingsLayout from '../components/SettingsLayout.jsx'
import AddressMapPicker from '../components/AddressMapPicker.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { getFavoriteRestaurantIds } from '../lib/favorites.js'
import { getRestaurants } from '../lib/api.js'
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

  const [editingAddress, setEditingAddress] = useState(false)
  const [address, setAddress] = useState('')
  const [addressStatus, setAddressStatus] = useState('idle')
  const [addressError, setAddressError] = useState('')

  const [favorites, setFavorites] = useState([])
  const [favoritesStatus, setFavoritesStatus] = useState('loading')

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
      setAddress(customer.address || '')
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

  function cancelAddressEditing() {
    setAddress(customer?.address || '')
    setAddressError('')
    setEditingAddress(false)
  }

  async function handleAddressSave() {
    setAddressError('')
    setAddressStatus('submitting')

    const { error: updateError } = await supabase
      .from('customers')
      .update({ address: address.trim() || null })
      .eq('id', customer.id)

    if (updateError) {
      setAddressError(`Tallennus epäonnistui: ${updateError.message}`)
      setAddressStatus('idle')
      return
    }

    await refreshCustomer()
    setAddressStatus('idle')
    setEditingAddress(false)
  }

  const initial = (customer?.name?.trim()?.[0] || customer?.email?.[0] || '?').toUpperCase()

  return (
    <SettingsLayout>
      {saved && <p className="auth-success">Tiedot tallennettu.</p>}

      {!editing && (
        <section className="auth-card profile-summary">
          <div className="profile-summary__avatar-col">
            <span className="profile-summary__avatar">{initial}</span>
            <button type="button" className="profile-summary__edit" onClick={startEditing}>
              Muokkaa
            </button>
          </div>

          <div className="profile-summary__body">
            <h2 className="profile-summary__name">{customer?.name || 'Tili'}</h2>

            <div className="profile-summary__field">
              <span className="profile-summary__label">Sähköposti</span>
              <span className="profile-summary__value">{customer?.email}</span>
            </div>

            <div className="profile-summary__field">
              <span className="profile-summary__label">Puhelinnumero</span>
              <span className="profile-summary__value">{customer?.phone || '-'}</span>
            </div>
          </div>
        </section>
      )}

      {editingAddress ? (
        <section className="auth-card">
          {addressError && <p className="auth-error">{addressError}</p>}
          <AddressMapPicker value={address} onChange={setAddress} />
          <div className="profile-edit-actions">
            <button
              type="button"
              className="auth-submit"
              onClick={handleAddressSave}
              disabled={addressStatus === 'submitting'}
            >
              {addressStatus === 'submitting' ? 'Tallennetaan...' : 'Tallenna osoite'}
            </button>
            <button type="button" className="auth-link-button" onClick={cancelAddressEditing}>
              Peruuta
            </button>
          </div>
        </section>
      ) : (
        <button type="button" className="auth-card address-card address-card--button" onClick={() => setEditingAddress(true)}>
          <span className="address-card__icon">
            <PinIcon />
          </span>
          <div className="address-card__body">
            <span className="profile-summary__label">Osoite</span>
            <span className="profile-summary__value">{customer?.address || 'Ei asetettu - paina lisätäksesi'}</span>
          </div>
        </button>
      )}

      {!editing && (
        <section className="auth-card favorites-section">
          <h2>Lempipaikat</h2>

          {favoritesStatus === 'ready' && favorites.length === 0 && (
            <div className="settings-empty favorites-empty">
              <span className="favorites-empty__icon">
                <HeartIcon />
              </span>
              <div>
                <p>Ei vielä suosikkeja.</p>
                <span className="settings-empty__hint">
                  Napauta sydän-ikonia ravintolan sivulla, niin löydät sen aina täältä nopeasti.
                </span>
              </div>
            </div>
          )}

          {favoritesStatus === 'error' && (
            <div className="settings-empty">
              <p>Suosikkien haku epäonnistui. Yritä hetken kuluttua uudelleen.</p>
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
      )}

      {editing && (
        <section className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
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
                {status === 'submitting' ? 'Tallennetaan...' : 'Tallenna tiedot'}
              </button>
              <button type="button" className="auth-link-button" onClick={cancelEditing}>
                Peruuta
              </button>
            </div>
          </form>
        </section>
      )}

      {!editing && (
        <section className="auth-card account-actions-card">
          <button type="button" className="account-actions__signout" onClick={handleSignOut}>
            Kirjaudu ulos
          </button>
          <a
            href="mailto:tuki@delivo.fi?subject=Tilin%20poistopyynt%C3%B6"
            className="account-actions__delete"
          >
            Pyydä tilin poistamista
          </a>
        </section>
      )}
    </SettingsLayout>
  )
}

export default SettingsProfile
