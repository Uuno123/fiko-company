import { useEffect, useState } from 'react'
import { Copy, Flame, Pause, Play, Power } from 'lucide-react'
import { useDashboard } from '../context.js'
import { Badge, Card, ErrorNote, PageHeader, SaveBar, Toggle } from '../ui.jsx'
import { isChanged, useUnsavedWarning } from '../forms.js'
import { WEEKDAYS, formatTime, normalizeOpeningHours } from '../utils.js'

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
  const dirty = isChanged(hours, normalizeOpeningHours(JSON.parse(savedHoursKey)))
  useUnsavedWarning(dirty)

  function discard() {
    setHours(normalizeOpeningHours(JSON.parse(savedHoursKey)))
    setError('')
  }

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
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={discard} saveLabel="Tallenna aukioloajat" />
    </Card>
  )
}

const PREP_CHOICES = [10, 15, 20, 25, 30, 40]

function PrepTimeCard() {
  const { restaurant, patchRestaurant, storeStatus, toast } = useDashboard()
  const savedMinutes = String(restaurant.pickup_estimate_minutes ?? 20)
  const [minutes, setMinutes] = useState(savedMinutes)
  const [saving, setSaving] = useState(false)
  const dirty = minutes !== savedMinutes
  useUnsavedWarning(dirty)

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
        {PREP_CHOICES.map((m) => (
          <button key={m} type="button" className={`pd-chip${Number(minutes) === m ? ' is-active' : ''}`} onClick={() => setMinutes(String(m))}>
            {m} min
          </button>
        ))}
        <label className={`pd-chip pd-chip--input${PREP_CHOICES.includes(Number(minutes)) ? '' : ' is-active'}`}>
          Muu
          <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} aria-label="Valmistusaika minuutteina" />
          min
        </label>
      </div>
      {storeStatus.busy && <p className="pd-muted">Kiireinen tila päällä - arvoon sisältyy tällä hetkellä +{storeStatus.busy.extra} min.</p>}
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => setMinutes(savedMinutes)} saveLabel="Tallenna valmistusaika" />
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
        </div>
      </div>
    </div>
  )
}
