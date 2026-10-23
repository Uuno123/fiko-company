import { useRef, useState } from 'react'
import { Camera, ImageOff, ImageUp } from 'lucide-react'
import { useDashboardApi } from './api.js'
import { useDashboard } from './context.js'
import { imageErrorText, prepareImage } from './images.js'
import { ErrorNote } from './ui.jsx'

// Kuvan vaihto suoraan laitteelta (käyttäjä: kansikuvaa ei voinut vaihtaa).
// Kuva pienennetään ja ladataan julkiseen säiliöön (migraatio 0056), ja sen
// osoite annetaan onChange:lle - tallennus tapahtuu lomakkeen tavalliseen
// tapaan. Nettiosoitteen voi edelleen liittää käsin.
// cover: iso esikatselu, jota painamalla kuvan voi vaihtaa (kansikuva).
// logo: pyöreä esikatselu (ravintolan logo tilauksen seurannassa).
export default function ImageUploadField({ value, onChange, kind, cover = false, logo = false, maxSize = 1600 }) {
  const { restaurant } = useDashboard()
  const api = useDashboardApi()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [broken, setBroken] = useState('')

  async function upload(file) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const blob = await prepareImage(file, maxSize)
      onChange(await api.uploadRestaurantImage(restaurant.id, blob, kind))
    } catch (err) {
      console.error('Kuvan lataus epäonnistui', err)
      setError(imageErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  const pick = () => input.current?.click()
  const showImage = value && broken !== value

  return (
    <div className="pd-image-field">
      {cover && (
        <button type="button" className="pd-cover-preview pd-cover-preview--button" onClick={pick} disabled={busy} aria-label="Vaihda kansikuva">
          {showImage ? (
            <img src={value} alt="" onError={() => setBroken(value)} />
          ) : (
            <span>
              <ImageOff size={26} strokeWidth={1.5} aria-hidden="true" />
              {value ? 'Kuvaa ei voitu ladata' : 'Ei kansikuvaa'}
            </span>
          )}
          <span className={`pd-cover-preview__overlay${busy ? ' is-busy' : ''}`} aria-hidden="true">
            <Camera size={18} strokeWidth={2} />
            {busy ? 'Ladataan…' : value ? 'Vaihda kuva' : 'Lisää kuva'}
          </span>
        </button>
      )}

      {logo && (
        <button type="button" className="pd-logo-preview" onClick={pick} disabled={busy} aria-label="Vaihda logo">
          {showImage ? <img src={value} alt="" onError={() => setBroken(value)} /> : <ImageOff size={22} strokeWidth={1.5} aria-hidden="true" />}
          <span className={`pd-logo-preview__overlay${busy ? ' is-busy' : ''}`} aria-hidden="true">
            <Camera size={16} strokeWidth={2} />
          </span>
        </button>
      )}

      <div className="pd-image-field__actions">
        <button type="button" className="pd-btn pd-btn--secondary" onClick={pick} disabled={busy}>
          <ImageUp size={16} aria-hidden="true" />
          {busy ? 'Ladataan…' : value ? 'Vaihda kuva' : 'Lataa kuva laitteelta'}
        </button>
        {value && (
          <button type="button" className="pd-btn pd-btn--ghost pd-btn--danger-text" onClick={() => onChange('')} disabled={busy}>
            Poista kuva
          </button>
        )}
        <span className="pd-spacer" />
        <button type="button" className="pd-link" onClick={() => setShowUrl((v) => !v)}>
          {showUrl ? 'Piilota osoite' : 'Liitä kuvan osoite'}
        </button>
      </div>

      {showUrl && (
        <input
          className="pd-input"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Kuvan osoite (URL)"
        />
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}
