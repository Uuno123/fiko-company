import { useCallback, useState } from 'react'
import { BriefcaseBusiness, Building2, ChevronRight, Hotel, House, MapPin } from 'lucide-react'
import AddressPickerModal from './AddressPickerModal.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { ADDRESS_TYPES, COURIER_INSTRUCTIONS_MAX, requiresApartment } from '../lib/customerAddress.js'
import { getDeliveryAddress, saveDeliveryAddress } from '../lib/deliveryAddress.js'
import { formatDisplayAddress } from '../lib/format.js'
import { supabase } from '../lib/supabaseClient.js'
import '../pages/AuthForm.css'
import './DeliveryAddressForm.css'

// Asiakkaan toimitusosoite kokonaisuutena: asunnon tyyppi, tarkka osoite
// kartalta, tyypin mukaiset lisätiedot ja ohjeet kuljettajalle (käyttäjän
// pyynnöt 27.10.2026). Sama lomake rekisteröitymisen osoitesivulla
// (RegisterAddress.jsx) ja Omien tietojen muokkausikkunassa (ProfileEditSheet.jsx). Tallentaa
// customers-riville (migraatio 0066) ja selaimen toimitusosoitteeksi, jotta
// etusivu näyttää lähimmät ravintolat ja kassa esitäyttää tiedot.
//   onDone(): kutsutaan onnistuneen tallennuksen jälkeen
//   preview: { onNext } vain esikatselusivulta - silloin mitään ei tallenneta

const TYPE_ICONS = {
  apartment: Building2,
  terraced: Hotel,
  house: House,
  office: BriefcaseBusiness,
  other: MapPin,
}

// Tyypin mukaan kysyttävät lisätiedot; muut jätetään tallentamatta.
const DETAIL_FIELDS = {
  apartment: ['staircase', 'floor', 'apartment', 'doorCode'],
  terraced: ['staircase', 'apartment'],
  house: [],
  office: ['company', 'floor'],
  other: [],
}

const INSTRUCTION_PLACEHOLDERS = {
  apartment: 'Esim. hissi rapun perällä, soita ovisummeria',
  terraced: 'Esim. ovi pihan puolella',
  house: 'Esim. punainen talo, ulko-ovi talon päädyssä',
  office: 'Esim. vastaanotto ensimmäisessä kerroksessa',
  other: 'Kerro, miten kuljettaja löytää perille',
}

const EMPTY_DETAILS = { staircase: '', floor: '', apartment: '', doorCode: '', company: '' }

// Alkuarvo: profiiliin tallennettu osoite, muuten ennen kirjautumista valittu
// toimitusosoite.
function initialPlace(customer) {
  if (customer.address && customer.address_lat != null && customer.address_lng != null) {
    return { address: customer.address, lat: customer.address_lat, lng: customer.address_lng }
  }
  const saved = getDeliveryAddress()
  return saved ? { address: saved.full, lat: saved.lat, lng: saved.lng } : null
}

function DeliveryAddressForm({ customer, userId, submitLabel, onDone, preview }) {
  const { refreshCustomer } = useAuth()

  const [type, setType] = useState(customer.address_type || '')
  const [place, setPlace] = useState(() => initialPlace(customer))
  const [details, setDetails] = useState(() => ({ ...EMPTY_DETAILS, ...customer.address_details }))
  const [instructions, setInstructions] = useState(customer.courier_instructions || '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const closePicker = useCallback(() => setPickerOpen(false), [])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const fields = DETAIL_FIELDS[type] ?? []

  function updateDetail(key, digitsOnly = false) {
    return (e) => {
      const value = digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value
      setDetails((current) => ({ ...current, [key]: value }))
      setErrors((current) => ({ ...current, [key]: undefined }))
    }
  }

  function chooseType(value) {
    setType(value)
    setErrors((current) => ({ ...current, type: undefined, apartment: undefined }))
  }

  function confirmPlace({ address, lat, lng }) {
    setPlace({ address, lat, lng })
    setErrors((current) => ({ ...current, place: undefined }))
    setPickerOpen(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveError('')

    const nextErrors = {}
    if (!type) nextErrors.type = 'Valitse asunnon tyyppi.'
    if (!place) nextErrors.place = 'Valitse osoite kartalta.'
    if (requiresApartment(type) && !details.apartment.trim()) nextErrors.apartment = 'Lisää asunnon numero.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (preview) {
      preview.onNext()
      return
    }

    setSaving(true)
    const addressDetails = Object.fromEntries(
      fields.map((key) => [key, details[key].trim()]).filter(([, value]) => value),
    )
    const { error } = await supabase
      .from('customers')
      .update({
        address: place.address,
        address_lat: place.lat,
        address_lng: place.lng,
        address_type: type,
        address_details: addressDetails,
        courier_instructions: instructions.trim() || null,
      })
      .eq('id', userId)

    if (error) {
      console.error('[delivo-frontend] Osoitteen tallennus epäonnistui:', error)
      setSaveError('Osoitteen tallennus epäonnistui. Yritä uudelleen.')
      setSaving(false)
      return
    }

    saveDeliveryAddress({
      label: place.address.split(',')[0].trim(),
      full: place.address,
      lat: place.lat,
      lng: place.lng,
    })
    await refreshCustomer()
    onDone()
  }

  return (
    <>
      <form className="auth-form address-form" onSubmit={handleSubmit} noValidate>
        {saveError && <p className="auth-error">{saveError}</p>}

        <fieldset className="address-form__types">
          <legend>Asunnon tyyppi</legend>
          <div className="address-form__type-grid">
            {ADDRESS_TYPES.map(({ value, label }) => {
              const Icon = TYPE_ICONS[value]
              return (
                <label key={value} className={`address-form__type${type === value ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="address-type"
                    value={value}
                    checked={type === value}
                    onChange={() => chooseType(value)}
                  />
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>
          {errors.type && <span className="address-form__error">{errors.type}</span>}
        </fieldset>

        <div className="auth-field">
          <span className="address-form__label" id="address-label">
            Osoite
          </span>
          <button
            type="button"
            className={`address-form__place${place ? '' : ' is-empty'}`}
            aria-describedby="address-label"
            onClick={() => setPickerOpen(true)}
          >
            <MapPin size={20} strokeWidth={2} aria-hidden="true" />
            <span>{place ? formatDisplayAddress(place.address) : 'Valitse osoite kartalta'}</span>
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          {errors.place && <span className="address-form__error">{errors.place}</span>}
        </div>

        {fields.length > 0 && (
          <div className="address-form__details">
            {fields.includes('company') && (
              <div className="auth-field address-form__wide">
                <label htmlFor="address-company">Yrityksen nimi</label>
                <input
                  id="address-company"
                  type="text"
                  autoComplete="organization"
                  maxLength={60}
                  value={details.company}
                  onChange={updateDetail('company')}
                />
              </div>
            )}
            {fields.includes('staircase') && (
              <div className="auth-field">
                <label htmlFor="address-staircase">{type === 'terraced' ? 'Talo tai porras' : 'Porras'}</label>
                <input
                  id="address-staircase"
                  type="text"
                  placeholder="Esim. A"
                  maxLength={5}
                  value={details.staircase}
                  onChange={updateDetail('staircase')}
                />
              </div>
            )}
            {fields.includes('floor') && (
              <div className="auth-field">
                <label htmlFor="address-floor">Kerros</label>
                <input
                  id="address-floor"
                  type="text"
                  inputMode="numeric"
                  placeholder="Esim. 3"
                  maxLength={2}
                  value={details.floor}
                  onChange={updateDetail('floor', true)}
                />
              </div>
            )}
            {fields.includes('apartment') && (
              <div className="auth-field">
                <label htmlFor="address-apartment">Asunnon numero</label>
                <input
                  id="address-apartment"
                  type="text"
                  placeholder="Esim. 12"
                  maxLength={10}
                  required
                  aria-invalid={Boolean(errors.apartment)}
                  value={details.apartment}
                  onChange={updateDetail('apartment')}
                />
                {errors.apartment && <span className="address-form__error">{errors.apartment}</span>}
              </div>
            )}
            {fields.includes('doorCode') && (
              <div className="auth-field">
                <label htmlFor="address-door-code">Ovikoodi</label>
                <input
                  id="address-door-code"
                  type="text"
                  placeholder="Jos on"
                  maxLength={12}
                  value={details.doorCode}
                  onChange={updateDetail('doorCode')}
                />
              </div>
            )}
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="courier-instructions">Ohjeet kuljettajalle</label>
          <textarea
            id="courier-instructions"
            className="address-form__instructions"
            rows={3}
            maxLength={COURIER_INSTRUCTIONS_MAX}
            placeholder={INSTRUCTION_PLACEHOLDERS[type] ?? INSTRUCTION_PLACEHOLDERS.other}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
          <span className="auth-field__hint">
            Vapaaehtoinen · {instructions.length}/{COURIER_INSTRUCTIONS_MAX}
          </span>
        </div>

        <button type="submit" className="auth-submit" disabled={saving}>
          {saving ? 'Tallennetaan...' : submitLabel}
        </button>
      </form>

      {pickerOpen && (
        <AddressPickerModal
          initial={place}
          confirmLabel="Valitse osoite"
          onConfirm={confirmPlace}
          onClose={closePicker}
        />
      )}
    </>
  )
}

export default DeliveryAddressForm
