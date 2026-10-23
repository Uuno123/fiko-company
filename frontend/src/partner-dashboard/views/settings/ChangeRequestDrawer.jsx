import { useRef, useState } from 'react'
import { Check, FileUp, Lock } from 'lucide-react'
import AddressMapPicker from '../../../components/AddressMapPicker.jsx'
import { CHANGE_FIELDS, DOCUMENT_TYPES, changeRequestErrorText, displayValue, validateChange } from '../../changeRequests.js'
import { Badge, Drawer, ErrorNote, Field } from '../../ui.jsx'
import { PLANS, formatPrice } from '../../utils.js'
import { planOrdersLabel } from '../../../lib/partnerPlans.js'

const MAX_FILE_BYTES = 10 * 1024 * 1024

// Lukittu tieto: arvo, lukko ja "Pyydä muutosta". Avoin pyyntö ja hylkäyksen
// syy näkyvät rivillä.
export function LockedField({ field, label, value, pending, rejected, onRequest }) {
  return (
    <div className="pd-locked">
      <div className="pd-locked__text">
        <span className="pd-locked__label">
          <Lock size={12} strokeWidth={2.4} aria-hidden="true" /> {label ?? CHANGE_FIELDS[field].label}
        </span>
        <strong>{value || <span className="pd-muted">Ei asetettu</span>}</strong>
        {pending ? (
          <span className="pd-locked__status is-pending">Odottaa hyväksyntää: {displayValue(field, pending.new_value)}</span>
        ) : rejected ? (
          <span className="pd-locked__status is-rejected">
            Muutosta ei hyväksytty{rejected.admin_note ? `: ${rejected.admin_note}` : ''}
          </span>
        ) : null}
      </div>
      <button type="button" className="pd-btn pd-btn--secondary pd-btn--sm" onClick={onRequest} disabled={Boolean(pending)}>
        {pending ? 'Pyyntö lähetetty' : 'Pyydä muutosta'}
      </button>
    </div>
  )
}

// Muutospyyntö: uusi arvo, perustelu ja vaadittu dokumentti. Tieto vaihtuu
// vasta, kun delivo on hyväksynyt pyynnön.
export default function ChangeRequestDrawer({ field, currentValue, onClose, onSubmit }) {
  const meta = CHANGE_FIELDS[field]
  const fileInput = useRef(null)
  const [value, setValue] = useState('')
  const [coords, setCoords] = useState(null)
  const [reason, setReason] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const problem = validateChange(field, value)
    if (problem) return setError(field === 'plan' ? 'Valitse uusi paketti' : problem)
    if (field !== 'plan' && String(value).trim() === String(currentValue ?? '').trim()) return setError('Uusi arvo on sama kuin nykyinen')
    if (meta.doc && !file) return setError(`Liitä ${DOCUMENT_TYPES[meta.doc].toLowerCase()}`)
    if (file && file.size > MAX_FILE_BYTES) return setError('Tiedosto on liian suuri (enintään 10 Mt)')
    setBusy(true)
    setError('')
    try {
      const normalized = field === 'iban' ? value.replace(/\s/g, '').toUpperCase() : value.trim()
      await onSubmit({ field, newValue: normalized, newLat: coords?.lat, newLng: coords?.lng, reason: reason.trim(), file })
    } catch (err) {
      setError(changeRequestErrorText(err))
      setBusy(false)
    }
  }

  return (
    <Drawer
      title={`Muutospyyntö: ${meta.label}`}
      subtitle="Tieto vaihtuu, kun Bidrop on hyväksynyt pyynnön - yleensä 1–2 arkipäivässä."
      onClose={onClose}
      footer={
        <>
          <span className="pd-spacer" />
          <button type="button" className="pd-btn pd-btn--ghost" onClick={onClose} disabled={busy}>
            Peruuta
          </button>
          <button type="button" className="pd-btn pd-btn--primary" onClick={submit} disabled={busy}>
            {busy ? 'Lähetetään…' : 'Lähetä muutospyyntö'}
          </button>
        </>
      }
    >
      <div className="pd-change-form">
        <div className="pd-change-current">
          <span>Nykyinen</span>
          <strong>{displayValue(field, currentValue) || 'Ei asetettu'}</strong>
        </div>

        {field === 'plan' ? (
          <Field label="Uusi paketti" as="div">
            <div className="pd-plans">
              {PLANS.filter((plan) => plan.key !== currentValue).map((plan) => (
                <button
                  key={plan.key}
                  type="button"
                  className={`pd-plan${value === plan.key ? ' is-selected' : ''}`}
                  onClick={() => setValue(plan.key)}
                >
                  <span className="pd-plan__name">{plan.name}</span>
                  <strong>{formatPrice(plan.priceCents)} / kk + alv</strong>
                  <span className="pd-muted">{planOrdersLabel(plan)} · ei provisiota</span>
                  {value === plan.key && <Check className="pd-plan__check" size={18} aria-hidden="true" />}
                </button>
              ))}
            </div>
            <span className="pd-field__hint">Isompaan pakettiin voi siirtyä heti, pienempään seuraavan laskutuskauden alusta.</span>
          </Field>
        ) : field === 'address' ? (
          <div className="pd-field">
            <span className="pd-field__label">Uusi osoite</span>
            <AddressMapPicker
              value={value}
              modalTitle="Ravintolan uusi osoite"
              onChange={(address, nextCoords) => {
                setValue(address)
                setCoords(nextCoords ?? null)
              }}
            />
            <span className="pd-field__hint">Tarkenna sijainti kartalla - siitä lasketaan asiakkaiden kuljetusmatkat.</span>
          </div>
        ) : (
          <Field label={`Uusi ${meta.label.toLowerCase()}`}>
            <input
              className="pd-input"
              value={value}
              autoFocus
              placeholder={field === 'business_id' ? '1234567-8' : field === 'iban' ? 'FI21 1234 5600 0007 85' : ''}
              onChange={(e) => setValue(field === 'iban' ? e.target.value.toUpperCase() : e.target.value)}
            />
          </Field>
        )}

        <Field label="Perustelu (vapaaehtoinen)">
          <textarea className="pd-input pd-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Miksi tieto muuttuu?" />
        </Field>

        {meta.doc && (
          <div className="pd-field">
            <span className="pd-field__label">Liite: {DOCUMENT_TYPES[meta.doc]}</span>
            <button type="button" className={`pd-dropzone${file ? ' has-file' : ''}`} onClick={() => fileInput.current?.click()}>
              <FileUp size={20} strokeWidth={1.75} aria-hidden="true" />
              <span>
                <strong>{file ? file.name : 'Valitse tiedosto'}</strong>
                <span className="pd-muted">{file ? `${Math.max(1, Math.round(file.size / 1024))} kt · vaihda tiedosto` : 'Kuva tai PDF, enintään 10 Mt'}</span>
              </span>
              {file && <Badge tone="success">Valittu</Badge>}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setError('')
              }}
            />
            <span className="pd-field__hint">{meta.docHint}</span>
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>
      </div>
    </Drawer>
  )
}
