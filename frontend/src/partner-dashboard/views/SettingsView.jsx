import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Maximize, Smartphone, SunMedium, Volume2 } from 'lucide-react'
import { useDashboardApi } from '../api.js'
import { useChangeRequests } from '../changeRequests.js'
import { useDashboard } from '../context.js'
import { playChime, unlockAudio } from '../hooks.js'
import { Card, ErrorNote, Field, PageHeader, SaveBar, Segmented, Toggle } from '../ui.jsx'
import { isChanged, useUnsavedWarning } from '../forms.js'
import { restaurantPlan } from '../utils.js'
import ImageUploadField from '../ImageUploadField.jsx'
import ChangeRequestDrawer, { LockedField } from './settings/ChangeRequestDrawer.jsx'
import CompanyTab from './settings/CompanyTab.jsx'

// Vain toimivat osiot (käyttäjä: turhat osiot pois). Kuljetusmaksun ja
// -alueen päättää delivo, joten ravintolalla ei ole toimitusasetuksia.
const TABS = [
  { value: 'restaurant', label: 'Ravintola' },
  { value: 'company', label: 'Yritys ja dokumentit' },
  { value: 'device', label: 'Tilauslaite' },
]

function restaurantForm(restaurant) {
  return {
    category: restaurant.category ?? '',
    image_url: restaurant.image_url ?? '',
    logo_url: restaurant.logo_url ?? '',
  }
}

// Nimi, osoite ja kaupunki ovat lukittuja (muutos pyynnöllä ja dokumentilla,
// migraatio 0055). Kategoria ja kansikuva tallentuvat suoraan alareunan
// palkista (käyttäjä: muokkaukset olivat epäselviä).
function RestaurantTab({ changes, onRequest }) {
  const { restaurant, patchRestaurant, toast } = useDashboard()
  const api = useDashboardApi()
  const [categories, setCategories] = useState([])
  const [saved, setSaved] = useState(() => restaurantForm(restaurant))
  const [form, setForm] = useState(saved)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))
  const dirty = isChanged(form, saved)
  useUnsavedWarning(dirty)

  function discard() {
    setForm(saved)
    setError('')
  }

  useEffect(() => {
    api
      .fetchPlatformCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [api])

  async function save() {
    setSaving(true)
    setError('')
    const err = await patchRestaurant({
      category: form.category.trim(),
      image_url: form.image_url.trim() || null,
      // Logo vain muuttuessa: ennen migraatiota 0060 sarake puuttuu, eikä se
      // saa estää muiden tietojen tallennusta.
      ...(form.logo_url !== saved.logo_url ? { logo_url: form.logo_url.trim() || null } : {}),
    })
    setSaving(false)
    if (err) setError('Tallennus epäonnistui. Yritä uudelleen.')
    else {
      setSaved(form)
      toast('Ravintolan tiedot tallennettu')
    }
  }

  return (
    <>
      <div className="pd-two-col">
        <Card title="Perustiedot" subtitle="Näkyvät asiakkaille ravintolan sivulla">
          {['name', 'address', 'city'].map((field) => (
            <LockedField
              key={field}
              field={field}
              value={restaurant[field]}
              pending={changes.pendingFor(field)}
              rejected={changes.rejectedFor(field)}
              onRequest={() => onRequest(field)}
            />
          ))}
          <p className="pd-muted pd-locked-note">
            Nimi, osoite ja kaupunki muuttuvat Bidropin hyväksynnällä - liitä pyyntöön dokumentti, josta muutos näkyy.
          </p>
          <Field label="Kategoria" hint="Missä kategoriassa ravintolasi näkyy etusivulla ja haussa.">
            <select className="pd-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {[...new Set([form.category, ...categories].filter(Boolean))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <ErrorNote>{error}</ErrorNote>
        </Card>

        <Card title="Kansikuva" subtitle="Näkyy etusivulla, haussa ja ravintolan sivun ylälaidassa. Paras on vaakakuva.">
          <ImageUploadField cover kind="cover" maxSize={1800} value={form.image_url} onChange={(url) => set('image_url', url)} />
          {form.image_url !== saved.image_url && (
            <p className="pd-muted pd-image-note">Uusi kuva näkyy asiakkaille, kun tallennat muutokset alhaalta.</p>
          )}
        </Card>

        <Card title="Logo" subtitle="Näkyy asiakkaan tilauksen seurannassa. Paras on neliön muotoinen logo valkoisella tai värillisellä taustalla.">
          <ImageUploadField logo kind="logo" maxSize={512} value={form.logo_url} onChange={(url) => set('logo_url', url)} />
          {form.logo_url !== saved.logo_url && (
            <p className="pd-muted pd-image-note">Uusi logo näkyy asiakkaille, kun tallennat muutokset alhaalta.</p>
          )}
        </Card>
      </div>
      <SaveBar sticky dirty={dirty} saving={saving} onSave={save} onDiscard={discard} />
    </>
  )
}

// Tilauslaite: kaikki asetukset koskevat vain tätä laitetta (äänimerkki,
// näyttö päällä, koko näyttö) - sekä ohje kojelaudan asentamiseen sovellukseksi.
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
      <div className="pd-stack">
        <Card title="Äänimerkki uusista tilauksista" subtitle="Soi 4 sekunnin välein, kunnes uusi tilaus on hyväksytty">
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
        <Card title="Näyttö" subtitle="Asetukset koskevat vain tätä laitetta">
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
      </div>
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
  const { restaurant, toast } = useDashboard()
  // ?osio=yritys avaa suoraan yritystiedot (linkki Talous-sivulta).
  const [params] = useSearchParams()
  const [tab, setTab] = useState(() => (params.get('osio') === 'yritys' ? 'company' : 'restaurant'))
  const changes = useChangeRequests(restaurant.id)
  const [requestField, setRequestField] = useState(null)

  async function submitChange(payload) {
    const { attachmentFailed } = await changes.submit(payload)
    setRequestField(null)
    toast(
      attachmentFailed
        ? 'Pyyntö lähetettiin, mutta liitteen lataus epäonnistui - lisää liite Yritys ja dokumentit -välilehdeltä'
        : 'Muutospyyntö lähetetty - Bidrop käsittelee sen yleensä 1–2 arkipäivässä',
      attachmentFailed ? 'error' : 'default',
    )
  }

  return (
    <div className="pd-view">
      <PageHeader title="Asetukset" description="Ravintolan tiedot, yritys- ja maksutiedot sekä tilauslaite." />
      <div className="pd-tabs">
        <Segmented value={tab} onChange={setTab} options={TABS} label="Asetusten osiot" />
      </div>
      {tab === 'restaurant' && <RestaurantTab changes={changes} onRequest={setRequestField} />}
      {tab === 'company' && <CompanyTab changes={changes} onRequest={setRequestField} />}
      {tab === 'device' && <DeviceTab />}

      {requestField && (
        <ChangeRequestDrawer
          field={requestField}
          currentValue={requestField === 'plan' ? restaurantPlan(restaurant).key : restaurant[requestField]}
          onClose={() => setRequestField(null)}
          onSubmit={submitChange}
        />
      )}
    </div>
  )
}
