import { useEffect, useState } from 'react'
import { CalendarX, Copy, Flame, Pause, Play, Plus, Power, Trash2 } from 'lucide-react'
import { DEMO_EXCEPTIONS } from '../demo.js'
import { useDashboard } from '../context.js'
import { Badge, Card, ErrorNote, Field, PageHeader, Toggle } from '../ui.jsx'
import { WEEKDAYS, formatDate, formatTime, normalizeOpeningHours } from '../utils.js'

function StatusCard() {
  const { storeStatus, toast } = useDashboard()
  const [busy, setBusy] = useState(false)

  async function run(action, message) {
    setBusy(true)
    const error = await action()
    setBusy(false)
    toast(error ? 'Tilan vaihto epäonnistui' : message, error ? 'error' : 'default')
  }

  const label = {
    open: { title: 'Auki tilauksille', text: 'Asiakkaat voivat tilata juuri nyt.', tone: 'success' },
    paused: { title: 'Tauolla', text: `Tilaukset jatkuvat automaattisesti klo ${storeStatus.pause ? formatTime(storeStatus.pause.until) : ''}.`, tone: 'warning' },
    closed: { title: 'Suljettu', text: 'Asiakkaat eivät voi tilata ennen kuin avaat.', tone: 'neutral' },
  }[storeStatus.state]

  return (
    <Card title="Tila nyt" className="pd-avail-status">
      <div className="pd-avail-status__head">
        <Badge tone={label.tone}>{label.title}</Badge>
        <p>{label.text}</p>
      </div>
      <div className="pd-button-row">
        {storeStatus.state !== 'open' && (
          <button type="button" className="pd-btn pd-btn--primary" disabled={busy} onClick={() => run(storeStatus.open, 'Ravintola avattu')}>
            <Play size={16} aria-hidden="true" /> Avaa tilauksille
          </button>
        )}
        {[15, 30, 60].map((minutes) => (
          <button
            key={minutes}
            type="button"
            className="pd-btn pd-btn--secondary"
            disabled={busy}
            onClick={() => run(() => storeStatus.startPause(minutes), `Tauko ${minutes} min`)}
          >
            <Pause size={16} aria-hidden="true" /> Tauko {minutes} min
          </button>
        ))}
        {storeStatus.state !== 'closed' && (
          <button type="button" className="pd-btn pd-btn--ghost" disabled={busy} onClick={() => run(storeStatus.closeForDay, 'Ravintola suljettu')}>
            <Power size={16} aria-hidden="true" /> Sulje
          </button>
        )}
      </div>
      <div className="pd-form-row">
        <div>
          <strong>
            <Flame size={16} aria-hidden="true" /> Kiireinen keittiö
          </strong>
          <p className="pd-muted">
            {storeStatus.busy
              ? `Valmistusaikaa pidennetty ${storeStatus.busy.extra} min - asiakkaat näkevät pidemmän arvion.`
              : 'Pidennä asiakkaille näkyvää valmistusaikaa ruuhkan ajaksi.'}
          </p>
        </div>
        <div className="pd-button-row">
          {[10, 20].map((extra) => (
            <button
              key={extra}
              type="button"
              className={`pd-chip${storeStatus.busy?.extra === extra ? ' is-active' : ''}`}
              disabled={busy}
              onClick={() => run(() => storeStatus.startBusy(extra), `Valmistusaikaa +${extra} min`)}
            >
              +{extra} min
            </button>
          ))}
          {storeStatus.busy && (
            <button type="button" className="pd-chip" disabled={busy} onClick={() => run(storeStatus.stopBusy, 'Kiire ohi')}>
              Kiire ohi
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

function OpeningHoursCard() {
  const { restaurant, patchRestaurant, toast } = useDashboard()
  const [hours, setHours] = useState(() => normalizeOpeningHours(restaurant.opening_hours))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Riippuvuus sisällöstä eikä olion identiteetistä: ravintolan päivitys (esim. tauko)
  // tuo uuden olion, eikä se saa pyyhkiä tallentamattomia muutoksia.
  const savedHoursKey = JSON.stringify(restaurant.opening_hours ?? null)
  useEffect(() => {
    setHours(normalizeOpeningHours(JSON.parse(savedHoursKey)))
  }, [restaurant.id, savedHoursKey])

  function setDay(key, patch) {
    setHours((h) => ({ ...h, [key]: { ...h[key], ...patch } }))
  }

  function copyMondayToWeekdays() {
    setHours((h) => {
      const next = { ...h }
      for (const day of ['tue', 'wed', 'thu', 'fri']) next[day] = { ...h.mon }
      return next
    })
  }

  async function save() {
    for (const day of WEEKDAYS) {
      const d = hours[day.key]
      if (!d.closed && d.open >= d.close && d.close !== '00:00') {
        setError(`${day.label}: sulkemisajan pitää olla avaamisen jälkeen`)
        return
      }
    }
    setSaving(true)
    setError('')
    const err = await patchRestaurant({ opening_hours: hours })
    setSaving(false)
    if (err) setError('Tallennus epäonnistui. Yritä uudelleen.')
    else toast('Aukioloajat tallennettu')
  }

  return (
    <Card
      title="Aukioloajat"
      subtitle="Näkyvät asiakkaille ravintolan sivulla"
      action={
        <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={copyMondayToWeekdays}>
          <Copy size={15} aria-hidden="true" /> Maanantai kaikille arkipäiville
        </button>
      }
    >
      <div className="pd-hours">
        {WEEKDAYS.map((day) => {
          const d = hours[day.key]
          return (
            <div key={day.key} className={`pd-hours__row${d.closed ? ' is-closed' : ''}`}>
              <span className="pd-hours__day">{day.label}</span>
              <Toggle checked={!d.closed} label={`${day.label} auki`} onChange={(open) => setDay(day.key, { closed: !open })} />
              {d.closed ? (
                <span className="pd-muted">Suljettu</span>
              ) : (
                <span className="pd-hours__times">
                  <input type="time" className="pd-input pd-input--time" value={d.open} onChange={(e) => setDay(day.key, { open: e.target.value })} aria-label={`${day.label} avautuu`} />
                  <span aria-hidden="true">–</span>
                  <input type="time" className="pd-input pd-input--time" value={d.close} onChange={(e) => setDay(day.key, { close: e.target.value })} aria-label={`${day.label} sulkeutuu`} />
                </span>
              )}
            </div>
          )
        })}
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="pd-card__foot">
        <button type="button" className="pd-btn pd-btn--primary" onClick={save} disabled={saving}>
          {saving ? 'Tallennetaan...' : 'Tallenna aukioloajat'}
        </button>
      </div>
    </Card>
  )
}

function PrepTimeCard() {
  const { restaurant, patchRestaurant, storeStatus, toast } = useDashboard()
  const [minutes, setMinutes] = useState(String(restaurant.pickup_estimate_minutes ?? 20))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMinutes(String(restaurant.pickup_estimate_minutes ?? 20))
  }, [restaurant.pickup_estimate_minutes])

  async function save() {
    const value = Number(minutes)
    if (!value || value < 5 || value > 120) {
      toast('Anna aika väliltä 5-120 minuuttia', 'error')
      return
    }
    setSaving(true)
    const error = await patchRestaurant({ pickup_estimate_minutes: value })
    setSaving(false)
    toast(error ? 'Tallennus epäonnistui' : 'Valmistusaika tallennettu', error ? 'error' : 'default')
  }

  return (
    <Card title="Tavallinen valmistusaika" subtitle="Asiakkaan näkemä arvio noudolle - kuljetukseen lisätään ajomatka">
      <div className="pd-chips">
        {[10, 15, 20, 25, 30, 40].map((m) => (
          <button key={m} type="button" className={`pd-chip${Number(minutes) === m ? ' is-active' : ''}`} onClick={() => setMinutes(String(m))}>
            {m} min
          </button>
        ))}
        <input className="pd-input pd-input--short" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Valmistusaika minuutteina" />
      </div>
      {storeStatus.busy && <p className="pd-muted">Kiireinen tila päällä - arvoon sisältyy tällä hetkellä +{storeStatus.busy.extra} min.</p>}
      <div className="pd-card__foot">
        <button type="button" className="pd-btn pd-btn--primary" onClick={save} disabled={saving}>
          {saving ? 'Tallennetaan...' : 'Tallenna'}
        </button>
      </div>
    </Card>
  )
}

function MethodsCard() {
  const [delivery, setDelivery] = useState(true)
  const [pickup, setPickup] = useState(true)
  return (
    <Card title="Toimitustavat" subtitle="Ota kotiinkuljetus tai nouto pois käytöstä hetkeksi" demo>
      <div className="pd-form-row">
        <div>
          <strong>Kotiinkuljetus</strong>
          <p className="pd-muted">delivon kuljettajat toimittavat tilaukset</p>
        </div>
        <Toggle checked={delivery} label="Kotiinkuljetus" onChange={setDelivery} />
      </div>
      <div className="pd-form-row">
        <div>
          <strong>Nouto</strong>
          <p className="pd-muted">Asiakas noutaa tilauksen ravintolasta</p>
        </div>
        <Toggle checked={pickup} label="Nouto" onChange={setPickup} />
      </div>
    </Card>
  )
}

function ExceptionsCard() {
  const { toast } = useDashboard()
  const [exceptions, setExceptions] = useState(DEMO_EXCEPTIONS)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ date: '', label: '', closed: true, open: '12:00', close: '18:00' })

  function add() {
    if (!draft.date) {
      toast('Valitse päivämäärä', 'error')
      return
    }
    setExceptions((prev) =>
      [...prev, { ...draft, id: `x${Date.now()}`, date: new Date(draft.date).toISOString(), label: draft.label || 'Poikkeusaukiolo' }].sort(
        (a, b) => new Date(a.date) - new Date(b.date),
      ),
    )
    setAdding(false)
    setDraft({ date: '', label: '', closed: true, open: '12:00', close: '18:00' })
  }

  return (
    <Card
      title="Poikkeusaukiolot"
      subtitle="Pyhät, lomat ja muut poikkeavat päivät"
      demo
      action={
        !adding && (
          <button type="button" className="pd-btn pd-btn--secondary pd-btn--sm" onClick={() => setAdding(true)}>
            <Plus size={15} aria-hidden="true" /> Lisää
          </button>
        )
      }
    >
      <ul className="pd-list">
        {exceptions.map((ex) => (
          <li key={ex.id}>
            <span>
              <strong>{ex.label}</strong>
              <span className="pd-muted">
                {formatDate(ex.date)} · {ex.closed ? 'Suljettu' : `${ex.open}–${ex.close}`}
              </span>
            </span>
            <button type="button" className="pd-icon-btn" aria-label={`Poista ${ex.label}`} onClick={() => setExceptions((prev) => prev.filter((e) => e.id !== ex.id))}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
        {exceptions.length === 0 && (
          <li className="pd-muted">
            <CalendarX size={16} aria-hidden="true" /> Ei poikkeuksia
          </li>
        )}
      </ul>
      {adding && (
        <div className="pd-subform">
          <div className="pd-form-grid">
            <Field label="Päivä">
              <input type="date" className="pd-input" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
            </Field>
            <Field label="Nimi">
              <input className="pd-input" placeholder="Esim. Juhannus" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
            </Field>
          </div>
          <div className="pd-form-row">
            <strong>Suljettu koko päivän</strong>
            <Toggle checked={draft.closed} label="Suljettu koko päivän" onChange={(closed) => setDraft((d) => ({ ...d, closed }))} />
          </div>
          {!draft.closed && (
            <span className="pd-hours__times">
              <input type="time" className="pd-input pd-input--time" value={draft.open} onChange={(e) => setDraft((d) => ({ ...d, open: e.target.value }))} aria-label="Avautuu" />
              <span aria-hidden="true">–</span>
              <input type="time" className="pd-input pd-input--time" value={draft.close} onChange={(e) => setDraft((d) => ({ ...d, close: e.target.value }))} aria-label="Sulkeutuu" />
            </span>
          )}
          <div className="pd-button-row">
            <button type="button" className="pd-btn pd-btn--ghost" onClick={() => setAdding(false)}>
              Peruuta
            </button>
            <button type="button" className="pd-btn pd-btn--primary" onClick={add}>
              Lisää poikkeus
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function AvailabilityView() {
  return (
    <div className="pd-view">
      <PageHeader title="Saatavuus" description="Milloin ja miten asiakkaat voivat tilata ravintolastasi." />
      <div className="pd-two-col">
        <div className="pd-stack">
          <StatusCard />
          <OpeningHoursCard />
        </div>
        <div className="pd-stack">
          <PrepTimeCard />
          <MethodsCard />
          <ExceptionsCard />
        </div>
      </div>
    </div>
  )
}
