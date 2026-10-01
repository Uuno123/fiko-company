import { useEffect, useState } from 'react'
import { ImageOff, Maximize, Send, Smartphone, SunMedium, Volume2 } from 'lucide-react'
import AddressMapPicker from '../../components/AddressMapPicker.jsx'
import { DEMO_DELIVERY_SETTINGS, DEMO_STAFF, STAFF_ROLES } from '../demo.js'
import { useDashboardApi } from '../api.js'
import { useDashboard } from '../context.js'
import { playChime, unlockAudio } from '../hooks.js'
import { Badge, Card, ErrorNote, Field, PageHeader, Segmented, Toggle } from '../ui.jsx'
import { centsToEuroInput, euroInputToCents, formatPrice, relativeDay } from '../utils.js'

const TABS = [
  { value: 'restaurant', label: 'Ravintola' },
  { value: 'delivery', label: 'Toimitus' },
  { value: 'users', label: 'Käyttäjät' },
  { value: 'notifications', label: 'Ilmoitukset' },
  { value: 'device', label: 'Tilauslaite' },
]

function RestaurantTab() {
  const { restaurant, patchRestaurant, toast } = useDashboard()
  const api = useDashboardApi()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(() => ({
    name: restaurant.name ?? '',
    category: restaurant.category ?? '',
    city: restaurant.city ?? '',
    address: restaurant.address ?? '',
    lat: restaurant.lat ?? null,
    lng: restaurant.lng ?? null,
    image_url: restaurant.image_url ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageBroken, setImageBroken] = useState(false)
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  useEffect(() => {
    api
      .fetchPlatformCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [api])

  async function save() {
    if (!form.name.trim()) return setError('Anna ravintolalle nimi')
    setSaving(true)
    setError('')
    const err = await patchRestaurant({
      name: form.name.trim(),
      category: form.category.trim(),
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      lat: form.lat,
      lng: form.lng,
      image_url: form.image_url.trim() || null,
    })
    setSaving(false)
    if (err) setError('Tallennus epäonnistui. Yritä uudelleen.')
    else toast('Ravintolan tiedot tallennettu')
  }

  return (
    <div className="pd-two-col">
      <Card title="Perustiedot" subtitle="Näkyvät asiakkaille ravintolan sivulla">
        <div className="pd-form-grid">
          <Field label="Ravintolan nimi" className="pd-field--full">
            <input className="pd-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Kategoria">
            <select className="pd-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {[...new Set([form.category, ...categories].filter(Boolean))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Kaupunki">
            <input className="pd-input" value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <div className="pd-field pd-field--full">
            <span className="pd-field__label">Osoite</span>
            <AddressMapPicker
              value={form.address}
              onChange={(address, coords) =>
                setForm((f) => ({ ...f, address, lat: coords?.lat ?? f.lat, lng: coords?.lng ?? f.lng }))
              }
            />
            <span className="pd-field__hint">Sijainnista lasketaan asiakkaan kuljetusmatka ja reitti.</span>
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="pd-card__foot">
          <button type="button" className="pd-btn pd-btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Tallennetaan...' : 'Tallenna muutokset'}
          </button>
        </div>
      </Card>

      <Card title="Kansikuva" subtitle="Näkyy etusivulla, haussa ja ravintolan sivun ylälaidassa">
        <div className="pd-cover-preview">
          {form.image_url && !imageBroken ? (
            <img src={form.image_url} alt="" onError={() => setImageBroken(true)} />
          ) : (
            <span>
              <ImageOff size={26} strokeWidth={1.5} aria-hidden="true" />
              {imageBroken ? 'Kuvaa ei voitu ladata' : 'Ei kansikuvaa'}
            </span>
          )}
        </div>
        <Field label="Kuvan osoite (URL)" hint="Vaakakuva, vähintään 1200 px leveä. Lataus laitteelta tulossa.">
          <input
            className="pd-input"
            placeholder="https://..."
            value={form.image_url}
            onChange={(e) => {
              set('image_url', e.target.value)
              setImageBroken(false)
            }}
          />
        </Field>
        <div className="pd-card__foot">
          <button type="button" className="pd-btn pd-btn--secondary" onClick={save} disabled={saving}>
            Tallenna kuva
          </button>
        </div>
      </Card>
    </div>
  )
}

function DeliveryTab() {
  const { toast } = useDashboard()
  const [form, setForm] = useState(() => ({
    radiusKm: DEMO_DELIVERY_SETTINGS.radiusKm,
    minOrder: centsToEuroInput(DEMO_DELIVERY_SETTINGS.minOrderCents),
    fee: centsToEuroInput(DEMO_DELIVERY_SETTINGS.feeCents),
    freeOver: centsToEuroInput(DEMO_DELIVERY_SETTINGS.freeOverCents),
  }))
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <Card title="Toimitusalue ja -maksut" subtitle="Kenelle toimitat ja millä ehdoilla" demo>
      <div className="pd-form-grid">
        <Field label={`Toimitussäde: ${form.radiusKm} km`} className="pd-field--full">
          <input type="range" min="1" max="15" step="0.5" value={form.radiusKm} onChange={(e) => set('radiusKm', Number(e.target.value))} className="pd-range" />
        </Field>
        <Field label="Vähimmäistilaus (€)">
          <input className="pd-input" inputMode="decimal" value={form.minOrder} onChange={(e) => set('minOrder', e.target.value)} />
        </Field>
        <Field label="Kuljetusmaksu (€)">
          <input className="pd-input" inputMode="decimal" value={form.fee} onChange={(e) => set('fee', e.target.value)} />
        </Field>
        <Field label="Ilmainen kuljetus yli (€)" hint="Jätä tyhjäksi, jos ei käytössä">
          <input className="pd-input" inputMode="decimal" value={form.freeOver} onChange={(e) => set('freeOver', e.target.value)} />
        </Field>
      </div>
      <p className="pd-muted">
        Asiakas näkee: kuljetus {formatPrice(euroInputToCents(form.fee) ?? 0)}
        {euroInputToCents(form.freeOver) ? `, ilmainen yli ${formatPrice(euroInputToCents(form.freeOver))}` : ''}, vähimmäistilaus{' '}
        {formatPrice(euroInputToCents(form.minOrder) ?? 0)}.
      </p>
      <div className="pd-card__foot">
        <button type="button" className="pd-btn pd-btn--primary" onClick={() => toast('Toimitusasetukset tallennettu')}>
          Tallenna
        </button>
      </div>
    </Card>
  )
}

function UsersTab() {
  const { toast } = useDashboard()
  const [staff, setStaff] = useState(DEMO_STAFF)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('kitchen')

  function invite(e) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast('Tarkista sähköpostiosoite', 'error')
      return
    }
    setStaff((prev) => [...prev, { id: `s${Date.now()}`, name: email.trim(), email: email.trim(), role, lastActive: null, invited: true }])
    setEmail('')
    toast('Kutsu lähetetty')
  }

  return (
    <div className="pd-two-col pd-two-col--narrow-right">
      <Card title="Käyttäjät" subtitle="Kuka pääsee kojelaudalle" demo padded={false}>
        <ul className="pd-list pd-list--padded">
          {staff.map((person) => (
            <li key={person.id}>
              <span className="pd-review__avatar" aria-hidden="true">
                {person.name[0].toUpperCase()}
              </span>
              <span>
                <strong>{person.name}</strong>
                <span className="pd-muted">
                  {person.invited ? 'Kutsu odottaa hyväksyntää' : person.lastActive ? `Aktiivinen ${relativeDay(person.lastActive).toLowerCase()}` : ''}
                </span>
              </span>
              {person.role === 'owner' ? (
                <Badge tone="neutral">{STAFF_ROLES.owner.label}</Badge>
              ) : (
                <select
                  className="pd-select pd-select--sm"
                  value={person.role}
                  aria-label={`${person.name} rooli`}
                  onChange={(e) => setStaff((prev) => prev.map((p) => (p.id === person.id ? { ...p, role: e.target.value } : p)))}
                >
                  {['manager', 'kitchen'].map((r) => (
                    <option key={r} value={r}>
                      {STAFF_ROLES[r].label}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <div className="pd-stack">
        <Card title="Kutsu käyttäjä" demo>
          <form className="pd-stack pd-stack--tight" onSubmit={invite}>
            <Field label="Sähköposti">
              <input className="pd-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nimi@ravintola.fi" />
            </Field>
            <Field label="Rooli">
              <select className="pd-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="manager">{STAFF_ROLES.manager.label}</option>
                <option value="kitchen">{STAFF_ROLES.kitchen.label}</option>
              </select>
            </Field>
            <button type="submit" className="pd-btn pd-btn--primary">
              <Send size={16} aria-hidden="true" /> Lähetä kutsu
            </button>
          </form>
        </Card>
        <Card title="Roolit">
          <dl className="pd-roles">
            {Object.entries(STAFF_ROLES).map(([key, r]) => (
              <div key={key}>
                <dt>{r.label}</dt>
                <dd>{r.description}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const { settings, updateSettings } = useDashboard()
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [daily, setDaily] = useState(true)

  return (
    <div className="pd-two-col">
      <Card title="Äänimerkki tällä laitteella" subtitle="Soi 4 sekunnin välein, kunnes uusi tilaus on hyväksytty">
        <div className="pd-form-row">
          <div>
            <strong>Uusien tilausten ääni</strong>
            <p className="pd-muted">Asetus koskee vain tätä laitetta</p>
          </div>
          <Toggle checked={settings.sound} label="Uusien tilausten ääni" onChange={(sound) => updateSettings({ sound })} />
        </div>
        <Field label={`Äänenvoimakkuus ${Math.round(settings.volume * 100)} %`}>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            className="pd-range"
            value={settings.volume}
            onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
          />
        </Field>
        <button
          type="button"
          className="pd-btn pd-btn--secondary"
          onClick={() => {
            unlockAudio()
            playChime(settings.volume)
          }}
        >
          <Volume2 size={16} aria-hidden="true" /> Soita testiääni
        </button>
      </Card>
      <Card title="Muut ilmoitukset" demo>
        <div className="pd-form-row">
          <div>
            <strong>Sähköposti uusista tilauksista</strong>
            <p className="pd-muted">Varmistus, jos laite on pois päältä</p>
          </div>
          <Toggle checked={email} label="Sähköposti uusista tilauksista" onChange={setEmail} />
        </div>
        <div className="pd-form-row">
          <div>
            <strong>Tekstiviesti hyväksymättömästä tilauksesta</strong>
            <p className="pd-muted">Jos tilausta ei ole hyväksytty 1 minuutissa</p>
          </div>
          <Toggle checked={sms} label="Tekstiviesti" onChange={setSms} />
        </div>
        <div className="pd-form-row">
          <div>
            <strong>Päivän yhteenveto</strong>
            <p className="pd-muted">Myynti ja tilaukset sähköpostiin joka ilta</p>
          </div>
          <Toggle checked={daily} label="Päivän yhteenveto" onChange={setDaily} />
        </div>
      </Card>
    </div>
  )
}

function DeviceTab() {
  const { settings, updateSettings, wakeLockActive } = useDashboard()
  const wakeSupported = 'wakeLock' in navigator
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement))

  useEffect(() => {
    const handle = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handle)
    return () => document.removeEventListener('fullscreenchange', handle)
  }, [])

  return (
    <div className="pd-two-col">
      <Card title="Tilauslaite" subtitle="Asetukset koskevat vain tätä laitetta">
        <div className="pd-form-row">
          <div>
            <strong>
              <SunMedium size={16} aria-hidden="true" /> Näyttö pysyy päällä
            </strong>
            <p className="pd-muted">
              {!wakeSupported
                ? 'Selain ei tue tätä - säädä laitteen näytön aikakatkaisu asetuksista.'
                : wakeLockActive
                  ? 'Päällä - näyttö ei sammu kojelaudan ollessa auki.'
                  : 'Estää näytön sammumisen, jottei tilauksia jää huomaamatta.'}
            </p>
          </div>
          <Toggle checked={settings.wakeLock} disabled={!wakeSupported} label="Näyttö pysyy päällä" onChange={(wakeLock) => updateSettings({ wakeLock })} />
        </div>
        <div className="pd-form-row">
          <div>
            <strong>
              <Maximize size={16} aria-hidden="true" /> Koko näytön tila
            </strong>
            <p className="pd-muted">Piilottaa selaimen palkit keittiön laitteella.</p>
          </div>
          <button
            type="button"
            className="pd-btn pd-btn--secondary pd-btn--sm"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}
          >
            {fullscreen ? 'Poistu' : 'Koko näyttö'}
          </button>
        </div>
      </Card>
      <Card title="Asenna sovellukseksi">
        <div className="pd-install">
          <Smartphone size={22} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <strong>iPad tai iPhone (Safari)</strong>
            <p className="pd-muted">Jaa-painike → Lisää Koti-valikkoon</p>
          </div>
        </div>
        <div className="pd-install">
          <Smartphone size={22} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <strong>Android (Chrome)</strong>
            <p className="pd-muted">Valikko ⋮ → Asenna sovellus</p>
          </div>
        </div>
        <p className="pd-muted">Kojelauta avautuu silloin omana sovelluksenaan ilman selaimen palkkeja.</p>
      </Card>
    </div>
  )
}

export default function SettingsView() {
  const [tab, setTab] = useState('restaurant')
  return (
    <div className="pd-view">
      <PageHeader title="Asetukset" description="Ravintolan tiedot, toimitus, käyttäjät ja laite." />
      <div className="pd-tabs">
        <Segmented value={tab} onChange={setTab} options={TABS} label="Asetusten osiot" />
      </div>
      {tab === 'restaurant' && <RestaurantTab />}
      {tab === 'delivery' && <DeliveryTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'device' && <DeviceTab />}
    </div>
  )
}
