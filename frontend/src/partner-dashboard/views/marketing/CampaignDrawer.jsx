import { useState } from 'react'
import { ArrowLeft, Bike, Euro, Percent, Tag, Ticket } from 'lucide-react'
import { Drawer, ErrorNote, Field } from '../../ui.jsx'
import { formatDate, formatPrice } from '../../utils.js'

// Uusi kampanja kahdessa vaiheessa (käyttäjä: kampanjat helpommiksi):
//   1. valitse valmis pohja (prosentti, ilmainen kuljetus, euroalennus, koodi)
//   2. säädä arvo, kohde ja kesto napeilla - esikatselu näyttää heti, mitä
//      asiakas näkee ravintolakortissa.
// Nimi ja koodi ehdotetaan valmiiksi, mutta ne voi vaihtaa.

const ALL_PRODUCTS = 'Kaikki tuotteet'

const TEMPLATES = [
  {
    type: 'percent',
    Icon: Percent,
    title: 'Prosenttialennus',
    text: 'Esim. −20 % koko listasta tai yhdestä kategoriasta.',
    values: [10, 15, 20, 25, 30],
    defaultValue: 20,
  },
  {
    type: 'free_delivery',
    Icon: Bike,
    title: 'Ilmainen kuljetus',
    text: 'Asiakas ei maksa kuljetusta - houkuttelee kotiinkuljetuksiin.',
  },
  {
    type: 'fixed',
    Icon: Euro,
    title: 'Euroalennus',
    text: 'Esim. −3 € jokaisesta tilauksesta tai tuotteesta.',
    values: [2, 3, 5, 8],
    defaultValue: 3,
  },
  {
    type: 'code',
    Icon: Ticket,
    title: 'Alennuskoodi',
    text: 'Oma koodi, jonka jaat somessa tai kanta-asiakkaille.',
    values: [10, 15, 20],
    defaultValue: 15,
  },
]

const DURATIONS = [
  { key: 'today', label: 'Tänään' },
  { key: 'weekend', label: 'Viikonloppu' },
  { key: 'week', label: '7 päivää' },
  { key: 'month', label: '30 päivää' },
  { key: 'custom', label: 'Omat päivät' },
]

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// Kesto -> alku- ja loppupäivä (paikallinen aika). Viikonloppu = tuleva (tai
// käynnissä oleva) lauantai-sunnuntai.
function durationDates(key, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (key === 'today') return { starts: isoDate(today), ends: isoDate(today) }
  if (key === 'week') return { starts: isoDate(today), ends: isoDate(addDays(today, 6)) }
  if (key === 'month') return { starts: isoDate(today), ends: isoDate(addDays(today, 29)) }
  if (key === 'weekend') {
    const day = today.getDay() // 0 = sunnuntai, 6 = lauantai
    if (day === 0) return { starts: isoDate(today), ends: isoDate(today) }
    const saturday = addDays(today, (6 - day + 7) % 7)
    return { starts: isoDate(saturday), ends: isoDate(addDays(saturday, 1)) }
  }
  return null
}

function suggestCode(restaurantName, value) {
  const letters = (restaurantName ?? '')
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 6)
  return `${letters || 'BIDROP'}${value}`
}

function offerLabel(type, value, target) {
  const scope = target && target !== ALL_PRODUCTS ? ` (${target})` : ''
  if (type === 'percent') return `−${value} %${scope}`
  if (type === 'fixed') return `−${formatPrice(value * 100)}${scope}`
  if (type === 'code') return `Koodilla −${value} %${scope}`
  return 'Ilmainen kuljetus'
}

function defaultName(type, value, target) {
  const scope = target && target !== ALL_PRODUCTS ? ` ${target.toLowerCase()}` : ''
  if (type === 'percent') return `−${value} %${scope || ' koko listasta'}`
  if (type === 'fixed') return `−${value} €${scope || ' tilauksesta'}`
  if (type === 'code') return `Koodikampanja −${value} %`
  return 'Ilmainen kuljetus'
}

export default function CampaignDrawer({ restaurant, categories, onClose, onCreate }) {
  const [template, setTemplate] = useState(null)
  const [value, setValue] = useState('')
  const [target, setTarget] = useState(ALL_PRODUCTS)
  const [duration, setDuration] = useState('week')
  const [custom, setCustom] = useState(() => durationDates('week'))
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function choose(next) {
    setTemplate(next)
    setValue(next.defaultValue != null ? String(next.defaultValue) : '')
    setTarget(ALL_PRODUCTS)
    setName('')
    setCode(next.type === 'code' ? suggestCode(restaurant?.name, next.defaultValue) : '')
    setError('')
  }

  const numericValue = Number(String(value).replace(',', '.'))
  const dates = duration === 'custom' ? custom : durationDates(duration)
  const shownName = name.trim() || (template ? defaultName(template.type, value, target) : '')
  const today = isoDate(new Date())

  function submit() {
    if (template.type !== 'free_delivery' && (!numericValue || numericValue <= 0)) return setError('Valitse alennuksen suuruus')
    if (template.type !== 'fixed' && template.type !== 'free_delivery' && numericValue > 90) return setError('Prosenttialennus voi olla enintään 90 %')
    if (template.type === 'code' && !/^[A-Z0-9]{4,16}$/.test(code)) return setError('Koodissa 4–16 merkkiä (A–Z, 0–9)')
    if (!dates?.starts || !dates?.ends || dates.ends < dates.starts) return setError('Valitse päättymispäivä aloituksen jälkeen')
    onCreate({
      id: `c${Date.now()}`,
      name: shownName,
      type: template.type,
      value: template.type === 'fixed' ? Math.round(numericValue * 100) : template.type === 'free_delivery' ? 0 : numericValue,
      code,
      target,
      status: dates.starts > today ? 'scheduled' : 'active',
      starts: new Date(`${dates.starts}T00:00`).toISOString(),
      ends: new Date(`${dates.ends}T23:59`).toISOString(),
      orders: 0,
      salesCents: 0,
    })
  }

  const step = template ? 2 : 1
  const startsLater = dates?.starts > today

  return (
    <Drawer
      wide
      title="Uusi kampanja"
      subtitle={step === 1 ? 'Vaihe 1/2 · Valitse tarjouksen tyyppi' : `Vaihe 2/2 · ${template.title}`}
      onClose={onClose}
      footer={
        step === 1 ? (
          <>
            <span className="pd-spacer" />
            <button type="button" className="pd-btn pd-btn--ghost" onClick={onClose}>
              Peruuta
            </button>
          </>
        ) : (
          <>
            <button type="button" className="pd-btn pd-btn--ghost" onClick={() => setTemplate(null)}>
              <ArrowLeft size={16} aria-hidden="true" /> Takaisin
            </button>
            <span className="pd-spacer" />
            <button type="button" className="pd-btn pd-btn--accent" onClick={submit}>
              {startsLater ? 'Ajasta kampanja' : 'Käynnistä kampanja'}
            </button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="pd-campaign-templates">
          {TEMPLATES.map((t) => (
            <button key={t.type} type="button" className="pd-campaign-template" onClick={() => choose(t)}>
              <span className="pd-campaign-template__icon">
                <t.Icon size={20} strokeWidth={2} aria-hidden="true" />
              </span>
              <strong>{t.title}</strong>
              <span>{t.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="pd-campaign-form">
          {template.values && (
            <Field label="Alennus" as="div">
              <div className="pd-chips">
                {template.values.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`pd-chip${Number(value) === v ? ' is-active' : ''}`}
                    onClick={() => {
                      setValue(String(v))
                      if (template.type === 'code') setCode(suggestCode(restaurant?.name, v))
                    }}
                  >
                    {template.type === 'fixed' ? `−${v} €` : `−${v} %`}
                  </button>
                ))}
                <label className={`pd-chip pd-chip--input${template.values.includes(Number(value)) ? '' : ' is-active'}`}>
                  Muu
                  <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d,.]/g, ''))} aria-label="Oma alennus" />
                  {template.type === 'fixed' ? '€' : '%'}
                </label>
              </div>
            </Field>
          )}

          {template.type !== 'free_delivery' && template.type !== 'code' && (
            <Field label="Mihin tuotteisiin" as="div">
              <div className="pd-chips">
                {[ALL_PRODUCTS, ...categories].map((c) => (
                  <button key={c} type="button" className={`pd-chip${target === c ? ' is-active' : ''}`} onClick={() => setTarget(c)}>
                    {c === ALL_PRODUCTS ? 'Koko ruokalista' : c}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {template.type === 'code' && (
            <Field label="Koodi" hint="Asiakas kirjoittaa tämän kassalla. Voit vaihtaa sen.">
              <input className="pd-input pd-input--code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
            </Field>
          )}

          <Field label="Kesto" as="div">
            <div className="pd-chips">
              {DURATIONS.map((d) => (
                <button key={d.key} type="button" className={`pd-chip${duration === d.key ? ' is-active' : ''}`} onClick={() => setDuration(d.key)}>
                  {d.label}
                </button>
              ))}
            </div>
            {duration === 'custom' && (
              <div className="pd-form-grid pd-form-grid--tight">
                <Field label="Alkaa">
                  <input type="date" className="pd-input" min={today} value={custom.starts} onChange={(e) => setCustom((c) => ({ ...c, starts: e.target.value }))} />
                </Field>
                <Field label="Päättyy">
                  <input type="date" className="pd-input" min={custom.starts} value={custom.ends} onChange={(e) => setCustom((c) => ({ ...c, ends: e.target.value }))} />
                </Field>
              </div>
            )}
          </Field>

          <Field label="Kampanjan nimi" hint="Näkyy vain sinulle kampanjalistassa.">
            <input className="pd-input" placeholder={defaultName(template.type, value, target)} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <section className="pd-campaign-preview" aria-label="Esikatselu">
            <span className="pd-item-preview__label">Näin asiakas näkee</span>
            <div className="pd-campaign-preview__card">
              <div className="pd-campaign-preview__media">
                {restaurant?.image_url && <img src={restaurant.image_url} alt="" />}
                <span className="pd-campaign-preview__badge">
                  <Tag size={13} strokeWidth={2.4} aria-hidden="true" />
                  {offerLabel(template.type, value || '…', target)}
                </span>
              </div>
              <strong>{restaurant?.name ?? 'Ravintolasi'}</strong>
            </div>
            <p className="pd-campaign-preview__summary">
              {dates?.starts && dates?.ends
                ? dates.starts === dates.ends
                  ? `Voimassa ${formatDate(`${dates.starts}T12:00`)}`
                  : `Voimassa ${formatDate(`${dates.starts}T12:00`)} – ${formatDate(`${dates.ends}T12:00`)}`
                : 'Valitse kesto'}
              {template.type === 'code' && code ? ` · koodi ${code}` : ''}
            </p>
          </section>

          <p className="pd-muted pd-campaign-note">
            Kampanjat ovat vielä esimerkkitilassa: ne tallentuvat tähän listaan, mutta eivät vielä näy asiakkaille.
          </p>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Drawer>
  )
}
