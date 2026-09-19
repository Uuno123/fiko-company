import { useEffect, useState } from 'react'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import AddressMapPicker from '../components/AddressMapPicker.jsx'
import { usePartnerAuth } from '../lib/PartnerAuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { formatPrice } from '../lib/format.js'
import { orderStatusLabel, nextOrderStatus, nextOrderActionLabel, isOrderCancellable } from '../lib/orderStatus.js'
import { INGREDIENT_TAG_GROUPS, ALL_PREDEFINED_TAGS } from '../lib/ingredientTags.js'
import { OPTION_GROUP_TEMPLATES } from '../lib/optionGroupTemplates.js'
import '../pages/RestaurantPage.css'
import './PartnerCommon.css'
import './PartnerDashboard.css'

const EMPTY_MENU_ITEM_FORM = { name: '', description: '', category: '', price: '', image_url: '', tags: [] }

function centsToEuroString(cents) {
  return (cents / 100).toFixed(2)
}

function euroStringToCents(value) {
  const normalized = value.replace(',', '.').trim()
  const euros = parseFloat(normalized)
  if (Number.isNaN(euros)) return null
  return Math.round(euros * 100)
}

const WEEKDAYS = [
  { key: 'mon', label: 'Maanantai' },
  { key: 'tue', label: 'Tiistai' },
  { key: 'wed', label: 'Keskiviikko' },
  { key: 'thu', label: 'Torstai' },
  { key: 'fri', label: 'Perjantai' },
  { key: 'sat', label: 'Lauantai' },
  { key: 'sun', label: 'Sunnuntai' },
]

function defaultOpeningHours() {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day.key] = { open: '11:00', close: '21:00', closed: false }
    return acc
  }, {})
}

function normalizeOpeningHours(value) {
  const defaults = defaultOpeningHours()
  if (!value || typeof value !== 'object') return defaults
  const merged = {}
  for (const day of WEEKDAYS) {
    merged[day.key] = { ...defaults[day.key], ...(value[day.key] || {}) }
  }
  return merged
}

function RestaurantInfoForm({ restaurant, onSaved }) {
  const [form, setForm] = useState({
    name: restaurant.name || '',
    category: restaurant.category || '',
    city: restaurant.city || '',
    address: restaurant.address || '',
    image_url: restaurant.image_url || '',
    pickup_estimate_minutes: restaurant.pickup_estimate_minutes ?? '',
    opening_hours: normalizeOpeningHours(restaurant.opening_hours),
  })
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    setForm({
      name: restaurant.name || '',
      category: restaurant.category || '',
      city: restaurant.city || '',
      address: restaurant.address || '',
      image_url: restaurant.image_url || '',
      pickup_estimate_minutes: restaurant.pickup_estimate_minutes ?? '',
      opening_hours: normalizeOpeningHours(restaurant.opening_hours),
    })
    // Vain kun aktiivinen ravintola vaihtuu (usean ravintolan omistaja) - ei joka kentän muutoksesta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id])

  function updateDayHours(dayKey, patch) {
    setForm((f) => ({
      ...f,
      opening_hours: { ...f.opening_hours, [dayKey]: { ...f.opening_hours[dayKey], ...patch } },
    }))
  }

  useEffect(() => {
    let cancelled = false
    supabase
      .from('restaurants')
      .select('category')
      .then(({ data, error }) => {
        if (cancelled || error) return
        const distinct = Array.from(new Set((data ?? []).map((r) => r.category).filter(Boolean))).sort((a, b) =>
          a.localeCompare(b, 'fi'),
        )
        setCategories(distinct)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    setStatus('submitting')

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: form.name.trim(),
        category: form.category.trim(),
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        image_url: form.image_url.trim() || null,
        pickup_estimate_minutes: form.pickup_estimate_minutes === '' ? null : Number(form.pickup_estimate_minutes),
        opening_hours: form.opening_hours,
      })
      .eq('id', restaurant.id)

    if (error) {
      setErrorMessage('Tallennus epäonnistui: ' + error.message)
      setStatus('idle')
      return
    }

    setStatus('saved')
    await onSaved()
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <form className="partner-card partner-form" onSubmit={handleSubmit}>
      <h2>Ravintolan tiedot</h2>
      {errorMessage && <p className="partner-error">{errorMessage}</p>}

      <div className="partner-field-grid">
        <div className="partner-field">
          <label htmlFor="ri-name">Nimi</label>
          <input
            id="ri-name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="partner-field">
          <label htmlFor="ri-category">Kategoria</label>
          <CategorySelect
            value={form.category}
            categories={categories}
            onChange={(value) => setForm((f) => ({ ...f, category: value }))}
          />
        </div>

        <div className="partner-field">
          <label htmlFor="ri-city">Kaupunki</label>
          <input
            id="ri-city"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>

        <div className="partner-field">
          <label htmlFor="ri-image">Kuvan URL</label>
          <input
            id="ri-image"
            value={form.image_url}
            onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
          />
        </div>

        <div className="partner-field">
          <label htmlFor="ri-pickup">Noutoarvio (min)</label>
          <input
            id="ri-pickup"
            type="number"
            min="0"
            value={form.pickup_estimate_minutes}
            onChange={(e) => setForm((f) => ({ ...f, pickup_estimate_minutes: e.target.value }))}
          />
        </div>
      </div>

      <div className="partner-field">
        <label htmlFor="ri-address">Osoite</label>
        <AddressMapPicker
          id="ri-address"
          value={form.address}
          onChange={(address) => setForm((f) => ({ ...f, address }))}
        />
      </div>

      <div className="partner-opening-hours">
        <h3>Aukioloajat</h3>
        <p className="partner-form__hint">
          Nämä näkyvät asiakkaille ravintolasi sivulla. Ravintolan auki/kiinni-tila juuri nyt vaihdetaan
          yläpalkin kytkimestä.
        </p>

        <div className="partner-opening-hours__rows">
          {WEEKDAYS.map((day) => {
            const dayHours = form.opening_hours[day.key]
            return (
              <div className="partner-opening-hours__row" key={day.key}>
                <span className="partner-opening-hours__day">{day.label}</span>

                <label className="partner-checkbox partner-opening-hours__closed">
                  <input
                    type="checkbox"
                    checked={dayHours.closed}
                    onChange={(e) => updateDayHours(day.key, { closed: e.target.checked })}
                  />
                  Kiinni
                </label>

                <div className="partner-opening-hours__times">
                  <input
                    type="time"
                    aria-label={`${day.label}: avaa`}
                    value={dayHours.open}
                    disabled={dayHours.closed}
                    onChange={(e) => updateDayHours(day.key, { open: e.target.value })}
                  />
                  <span>–</span>
                  <input
                    type="time"
                    aria-label={`${day.label}: sulkee`}
                    value={dayHours.close}
                    disabled={dayHours.closed}
                    onChange={(e) => updateDayHours(day.key, { close: e.target.value })}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <button type="submit" className="partner-btn partner-btn--primary" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Tallennetaan...' : status === 'saved' ? 'Tallennettu ✓' : 'Tallenna tiedot'}
      </button>
    </form>
  )
}

function MenuItemForm({ restaurantId, categories, onDone }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_MENU_ITEM_FORM, category: categories[0] || '' }))
  const [errorMessage, setErrorMessage] = useState('')
  const [status, setStatus] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')

    const priceCents = euroStringToCents(form.price)
    if (priceCents === null || priceCents < 0) {
      setErrorMessage('Anna kelvollinen hinta, esim. 9.90')
      return
    }

    setStatus('submitting')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || 'Ruokalista',
      price_cents: priceCents,
      image_url: form.image_url.trim() || null,
      tags: form.tags,
    }

    const { error } = await supabase.from('menu_items').insert({ ...payload, restaurant_id: restaurantId })

    if (error) {
      setErrorMessage('Tallennus epäonnistui: ' + error.message)
      setStatus('idle')
      return
    }

    setForm({ ...EMPTY_MENU_ITEM_FORM, category: categories[0] || '' })
    setStatus('idle')
    onDone()
  }

  return (
    <form className="partner-menu-item-form" onSubmit={handleSubmit}>
      {errorMessage && <p className="partner-error">{errorMessage}</p>}

      <div className="partner-field-grid">
        <div className="partner-field">
          <label>Nimi</label>
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="partner-field">
          <label>Kategoria (osio ruokalistassa)</label>
          <CategorySelect
            value={form.category}
            categories={categories}
            onChange={(value) => setForm((f) => ({ ...f, category: value }))}
          />
        </div>

        <div className="partner-field">
          <label>Hinta (€)</label>
          <input
            required
            inputMode="decimal"
            placeholder="9.90"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>

        <div className="partner-field">
          <label>Kuvan URL</label>
          <input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
        </div>
      </div>

      <div className="partner-field">
        <label>Kuvaus</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div className="partner-field">
        <label>Ainesosat / tagit (valinnainen)</label>
        <TagPicker selectedTags={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
      </div>

      <div className="partner-menu-item-form__actions">
        <button type="submit" className="partner-btn partner-btn--primary" disabled={status === 'submitting'}>
          Lisää tuote
        </button>
      </div>
    </form>
  )
}

function groupItemsByCategory(items) {
  const groups = new Map()
  for (const item of items) {
    const key = item.category || 'Ruokalista'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return Array.from(groups.entries())
}

const NEW_CATEGORY_VALUE = '__uusi__'

function CategorySelect({ value, categories, onChange }) {
  const [isCustom, setIsCustom] = useState(categories.length === 0 || (value !== '' && !categories.includes(value)))

  useEffect(() => {
    if (isCustom && value !== '' && categories.includes(value)) {
      setIsCustom(false)
    }
    // Vaihtaa pois vapaan syötön tilasta, jos kategorialista latautuu myöhemmin ja sisältää nykyisen arvon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories])

  if (isCustom) {
    return (
      <div className="partner-category-select">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Uuden kategorian nimi" autoFocus />
        {categories.length > 0 && (
          <button
            type="button"
            className="partner-category-select__back"
            onClick={() => {
              setIsCustom(false)
              onChange(categories[0])
            }}
          >
            ← Valitse olemassa olevista
          </button>
        )}
      </div>
    )
  }

  return (
    <select
      className="partner-category-select__select"
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW_CATEGORY_VALUE) {
          setIsCustom(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
    >
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
      <option value={NEW_CATEGORY_VALUE}>+ Uusi kategoria...</option>
    </select>
  )
}

function TagPicker({ selectedTags, onChange }) {
  const [customInput, setCustomInput] = useState('')
  const customTags = selectedTags.filter((tag) => !ALL_PREDEFINED_TAGS.includes(tag))

  function toggleTag(tag) {
    onChange(selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag])
  }

  function addCustomTag() {
    const trimmed = customInput.trim()
    if (!trimmed || selectedTags.includes(trimmed)) {
      setCustomInput('')
      return
    }
    onChange([...selectedTags, trimmed])
    setCustomInput('')
  }

  return (
    <div className="tag-picker">
      {INGREDIENT_TAG_GROUPS.map((group) => (
        <div className="tag-picker__group" key={group.label}>
          <span className="tag-picker__group-label">{group.label}</span>
          <div className="tag-picker__chips">
            {group.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-picker__chip${selectedTags.includes(tag) ? ' tag-picker__chip--active' : ''}`}
                aria-pressed={selectedTags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ))}

      {customTags.length > 0 && (
        <div className="tag-picker__group">
          <span className="tag-picker__group-label">Omat lisäykset</span>
          <div className="tag-picker__chips">
            {customTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="tag-picker__chip tag-picker__chip--active"
                aria-pressed="true"
                onClick={() => toggleTag(tag)}
              >
                {tag} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tag-picker__add">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Lisää oma tagi..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustomTag()
            }
          }}
        />
        <button type="button" className="partner-btn partner-btn--ghost tag-picker__add-btn" onClick={addCustomTag}>
          + Lisää
        </button>
      </div>
    </div>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.4 3.6a1.5 1.5 0 0 1 2.1 2.1L6.5 14.7l-3 .8.8-3 9.1-9.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditableField({ value, placeholder, type = 'text', renderDisplay, renderEditor, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setDraft(value)
  }, [value])

  async function handleSave() {
    setSaving(true)
    setErrorMessage('')
    const err = await onSave(draft)
    setSaving(false)
    if (err) {
      setErrorMessage(err)
      return
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="partner-editable partner-editable--editing">
        {errorMessage && <p className="partner-error">{errorMessage}</p>}
        {renderEditor ? (
          renderEditor(draft, setDraft)
        ) : type === 'textarea' ? (
          <textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
        ) : (
          <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
        )}
        <div className="partner-editable__actions">
          <button type="button" className="partner-btn partner-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Tallennetaan...' : 'Tallenna'}
          </button>
          <button
            type="button"
            className="partner-btn partner-btn--ghost"
            onClick={() => {
              setDraft(value)
              setErrorMessage('')
              setEditing(false)
            }}
          >
            Peruuta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="partner-editable">
      {renderDisplay ? renderDisplay(value) : <span>{value || placeholder}</span>}
      <button type="button" className="partner-editable__edit" onClick={() => setEditing(true)} aria-label="Muokkaa">
        <EditIcon />
      </button>
    </div>
  )
}

function EditableImage({ src, alt, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(src || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(draft.trim() || null)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="item-modal__media partner-editable-image">
      {src ? <img src={src} alt={alt} /> : <RestaurantAvatarPlaceholder name={alt} size="hero" />}

      {!editing && (
        <button
          type="button"
          className="partner-editable-image__edit"
          onClick={() => setEditing(true)}
          aria-label="Muokkaa kuvaa"
        >
          <EditIcon />
        </button>
      )}

      {editing && (
        <div className="partner-editable-image__panel" onClick={(e) => e.stopPropagation()}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Kuvan URL" autoFocus />
          <div className="partner-editable__actions">
            <button type="button" className="partner-btn partner-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Tallennetaan...' : 'Tallenna'}
            </button>
            <button
              type="button"
              className="partner-btn partner-btn--ghost"
              onClick={() => {
                setDraft(src || '')
                setEditing(false)
              }}
            >
              Peruuta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuickAddOptions({ existingNames, onAdd }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [price, setPrice] = useState('1.99')

  function toggle(name) {
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]))
  }

  function handleAdd() {
    const cents = euroStringToCents(price)
    if (cents === null || selected.length === 0) return
    onAdd(selected.map((name) => ({ name, price: centsToEuroString(cents), is_default: false })))
    setSelected([])
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className="partner-btn partner-btn--ghost" onClick={() => setOpen(true)}>
        + Lisää useita yleisiä kerralla
      </button>
    )
  }

  const suggestions = ALL_PREDEFINED_TAGS.filter((name) => !existingNames.includes(name))

  return (
    <div className="option-group-card__quick-add">
      <p className="partner-form__hint">Valitse haluamasi, anna niille yhteinen hinta ja lisää kerralla.</p>
      <div className="tag-picker__chips">
        {suggestions.map((name) => (
          <button
            key={name}
            type="button"
            className={`tag-picker__chip${selected.includes(name) ? ' tag-picker__chip--active' : ''}`}
            onClick={() => toggle(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="option-group-card__quick-add-row">
        <input
          className="option-group-card__option-price"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button
          type="button"
          className="partner-btn partner-btn--primary"
          onClick={handleAdd}
          disabled={selected.length === 0}
        >
          Lisää{selected.length > 0 ? ` (${selected.length})` : ''}
        </button>
        <button type="button" className="partner-btn partner-btn--ghost" onClick={() => setOpen(false)}>
          Peruuta
        </button>
      </div>
    </div>
  )
}

function OptionGroupForm({ group, onSaved, onDeleted }) {
  function toDraft(g) {
    return {
      name: g.name,
      selection_type: g.selection_type,
      min_selections: String(g.min_selections),
      max_selections: g.max_selections === null ? '' : String(g.max_selections),
      free_selections: String(g.free_selections),
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        price: centsToEuroString(o.price_delta_cents),
        is_default: o.is_default,
      })),
    }
  }

  const [draft, setDraft] = useState(() => toDraft(group))
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setDraft(toDraft(group))
    // Nollataan draft vain kun tämän saman ryhmän id muuttuu (ei koskaan normaalisti) - ei
    // joka kerta kun vanhempi lataa ryhmälistan uudelleen, ettei keskeneräinen muokkaus katoa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id])

  function updateOption(index, field, value) {
    setDraft((d) => ({ ...d, options: d.options.map((o, i) => (i === index ? { ...o, [field]: value } : o)) }))
  }

  function setDefaultOption(index) {
    setDraft((d) => ({ ...d, options: d.options.map((o, i) => ({ ...o, is_default: i === index })) }))
  }

  function addOption() {
    setDraft((d) => ({ ...d, options: [...d.options, { id: null, name: '', price: '0.00', is_default: false }] }))
  }

  function removeOptionAt(index) {
    setDraft((d) => ({ ...d, options: d.options.filter((_, i) => i !== index) }))
  }

  async function handleSave() {
    const name = draft.name.trim()
    if (!name) {
      setErrorMessage('Anna ryhmälle nimi.')
      return
    }
    if (draft.options.some((o) => !o.name.trim())) {
      setErrorMessage('Vaihtoehdolla pitää olla nimi.')
      return
    }
    const parsedOptions = []
    for (const option of draft.options) {
      const cents = euroStringToCents(option.price)
      if (cents === null) {
        setErrorMessage(`Tarkista vaihtoehdon "${option.name}" hinta.`)
        return
      }
      parsedOptions.push({ ...option, price_delta_cents: cents })
    }

    setErrorMessage('')
    setStatus('submitting')

    const { error: groupError } = await supabase
      .from('menu_item_option_groups')
      .update({
        name,
        selection_type: draft.selection_type,
        min_selections: Number(draft.min_selections) || 0,
        max_selections: draft.max_selections === '' ? null : Number(draft.max_selections),
        free_selections: Number(draft.free_selections) || 0,
      })
      .eq('id', group.id)

    if (groupError) {
      setErrorMessage('Tallennus epäonnistui: ' + groupError.message)
      setStatus('idle')
      return
    }

    const keptIds = parsedOptions.filter((o) => o.id).map((o) => o.id)
    const removedIds = group.options.filter((o) => !keptIds.includes(o.id)).map((o) => o.id)
    if (removedIds.length > 0) {
      const { error } = await supabase.from('menu_item_options').delete().in('id', removedIds)
      if (error) {
        setErrorMessage('Vaihtoehdon poisto epäonnistui: ' + error.message)
        setStatus('idle')
        return
      }
    }

    for (const [index, option] of parsedOptions.entries()) {
      const payload = {
        name: option.name.trim(),
        price_delta_cents: option.price_delta_cents,
        is_default: Boolean(option.is_default),
        display_order: index,
      }
      const { error } = option.id
        ? await supabase.from('menu_item_options').update(payload).eq('id', option.id)
        : await supabase.from('menu_item_options').insert({ ...payload, group_id: group.id })

      if (error) {
        setErrorMessage(`Vaihtoehdon "${option.name}" tallennus epäonnistui: ` + error.message)
        setStatus('idle')
        await onSaved()
        return
      }
    }

    setStatus('saved')
    await onSaved()
    setTimeout(() => setStatus('idle'), 1500)
  }

  return (
    <div className="option-group-card">
      {errorMessage && <p className="partner-error">{errorMessage}</p>}

      <div className="partner-field-grid">
        <div className="partner-field">
          <label>Ryhmän nimi</label>
          <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </div>

        <div className="partner-field">
          <label>Tyyppi</label>
          <select
            className="partner-category-select__select"
            value={draft.selection_type}
            onChange={(e) => setDraft((d) => ({ ...d, selection_type: e.target.value }))}
          >
            <option value="single">Yksi valittavissa</option>
            <option value="multi">Useita valittavissa</option>
          </select>
        </div>
      </div>

      <div className="partner-field-grid">
        <div className="partner-field">
          <label>Vähimmäismäärä</label>
          <input
            type="number"
            min="0"
            value={draft.min_selections}
            onChange={(e) => setDraft((d) => ({ ...d, min_selections: e.target.value }))}
          />
        </div>
        <div className="partner-field">
          <label>Enimmäismäärä (tyhjä = rajaton)</label>
          <input
            type="number"
            min="0"
            value={draft.max_selections}
            onChange={(e) => setDraft((d) => ({ ...d, max_selections: e.target.value }))}
          />
        </div>
        <div className="partner-field">
          <label>Ilmaisia ensimmäisiä</label>
          <input
            type="number"
            min="0"
            value={draft.free_selections}
            onChange={(e) => setDraft((d) => ({ ...d, free_selections: e.target.value }))}
          />
        </div>
      </div>
      <p className="partner-form__hint">
        Vähimmäismäärä 1 (tyyppi "Yksi valittavissa") = pakollinen valinta. "Ilmaisia ensimmäisiä" vaikuttaa vain
        tilauksen hinnoitteluun - tarkka logiikka rakennetaan ostoskoripuolella.
      </p>

      <div className="option-group-card__options">
        <span className="tag-picker__group-label">Vaihtoehdot</span>
        {draft.options.map((option, index) => (
          <div className="option-group-card__option-row" key={option.id ?? `new-${index}`}>
            <input
              className="option-group-card__option-name"
              value={option.name}
              placeholder="Nimi"
              onChange={(e) => updateOption(index, 'name', e.target.value)}
            />
            <input
              className="option-group-card__option-price"
              inputMode="decimal"
              value={option.price}
              placeholder="0.00"
              onChange={(e) => updateOption(index, 'price', e.target.value)}
            />
            {draft.selection_type === 'single' ? (
              <label className="partner-checkbox">
                <input type="radio" name={`default-${group.id}`} checked={option.is_default} onChange={() => setDefaultOption(index)} />
                Oletus
              </label>
            ) : (
              <label className="partner-checkbox">
                <input
                  type="checkbox"
                  checked={option.is_default}
                  onChange={(e) => updateOption(index, 'is_default', e.target.checked)}
                />
                Oletus
              </label>
            )}
            <button
              type="button"
              className="option-group-card__option-remove"
              aria-label="Poista vaihtoehto"
              onClick={() => removeOptionAt(index)}
            >
              ✕
            </button>
          </div>
        ))}

        <div className="option-group-card__option-actions">
          <button type="button" className="partner-btn partner-btn--ghost" onClick={addOption}>
            + Lisää vaihtoehto
          </button>
          {draft.selection_type === 'multi' && (
            <QuickAddOptions
              existingNames={draft.options.map((o) => o.name)}
              onAdd={(newOptions) =>
                setDraft((d) => ({ ...d, options: [...d.options, ...newOptions.map((o) => ({ id: null, ...o }))] }))
              }
            />
          )}
        </div>
      </div>

      <div className="partner-editable__actions">
        <button type="button" className="partner-btn partner-btn--primary" onClick={handleSave} disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Tallennetaan...' : status === 'saved' ? 'Tallennettu ✓' : 'Tallenna ryhmä'}
        </button>
        <button type="button" className="partner-btn partner-btn--danger" onClick={onDeleted}>
          Poista ryhmä
        </button>
      </div>
    </div>
  )
}

function OptionGroupsSection({ menuItemId }) {
  const [groups, setGroups] = useState([])
  const [status, setStatus] = useState('loading')
  const [actionError, setActionError] = useState('')

  async function loadGroups() {
    setStatus('loading')
    const { data, error } = await supabase
      .from('menu_item_option_groups')
      .select('*, menu_item_options(*)')
      .eq('menu_item_id', menuItemId)
      .order('display_order', { ascending: true })

    if (error) {
      setStatus('error')
      return
    }
    setGroups(
      (data ?? []).map((g) => ({
        ...g,
        options: [...g.menu_item_options].sort((a, b) => a.display_order - b.display_order),
      })),
    )
    setStatus('ready')
  }

  useEffect(() => {
    loadGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItemId])

  async function reloadOneGroup(groupId) {
    const { data, error } = await supabase
      .from('menu_item_option_groups')
      .select('*, menu_item_options(*)')
      .eq('id', groupId)
      .single()
    if (error || !data) return
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...data, options: [...data.menu_item_options].sort((a, b) => a.display_order - b.display_order) }
          : g,
      ),
    )
  }

  async function handleAddBlankGroup() {
    setActionError('')
    const { error } = await supabase.from('menu_item_option_groups').insert({
      menu_item_id: menuItemId,
      name: 'Uusi valintaryhmä',
      selection_type: 'single',
      min_selections: 0,
      max_selections: 1,
      free_selections: 0,
      display_order: groups.length,
    })
    if (error) {
      setActionError('Ryhmän lisäys epäonnistui: ' + error.message)
      return
    }
    await loadGroups()
  }

  async function handleAddGroupFromTemplate(template) {
    setActionError('')
    const { data: groupRow, error: groupError } = await supabase
      .from('menu_item_option_groups')
      .insert({
        menu_item_id: menuItemId,
        name: template.label,
        selection_type: template.selection_type,
        min_selections: template.min_selections,
        max_selections: template.max_selections,
        free_selections: template.free_selections,
        display_order: groups.length,
      })
      .select()
      .single()

    if (groupError || !groupRow) {
      setActionError('Ryhmän lisäys epäonnistui: ' + (groupError?.message ?? 'tuntematon virhe'))
      return
    }

    const { error: optionsError } = await supabase.from('menu_item_options').insert(
      template.options.map((option, index) => ({
        group_id: groupRow.id,
        name: option.name,
        price_delta_cents: euroStringToCents(option.price) ?? 0,
        is_default: option.is_default,
        display_order: index,
      })),
    )

    if (optionsError) {
      setActionError('Vaihtoehtojen lisäys epäonnistui: ' + optionsError.message)
    }

    await loadGroups()
  }

  async function handleDeleteGroup(groupId) {
    if (!window.confirm('Poistetaanko valintaryhmä?')) return
    setActionError('')
    const { error } = await supabase.from('menu_item_option_groups').delete().eq('id', groupId)
    if (error) {
      setActionError('Poisto epäonnistui: ' + error.message)
      return
    }
    await loadGroups()
  }

  return (
    <div className="option-groups">
      <h3>Valintaryhmät</h3>
      <p className="partner-form__hint">
        Esim. koko/pohjavalinta tai täytteet. Näkyvät asiakkaalle tuotetta tilatessa kun ostoskori tukee niitä.
      </p>

      {status === 'loading' && <p className="state-message">Ladataan...</p>}
      {status === 'error' && <p className="partner-error">Valintaryhmien haku epäonnistui.</p>}
      {actionError && <p className="partner-error">{actionError}</p>}

      {status === 'ready' &&
        groups.map((group) => (
          <OptionGroupForm
            key={group.id}
            group={group}
            onSaved={() => reloadOneGroup(group.id)}
            onDeleted={() => handleDeleteGroup(group.id)}
          />
        ))}

      <div className="option-groups__templates">
        {OPTION_GROUP_TEMPLATES.map((template) => (
          <button
            key={template.key}
            type="button"
            className="partner-btn partner-btn--primary"
            onClick={() => handleAddGroupFromTemplate(template)}
          >
            + {template.label} (valmis pohja)
          </button>
        ))}
        <button type="button" className="partner-btn partner-btn--ghost" onClick={handleAddBlankGroup}>
          + Tyhjä ryhmä
        </button>
      </div>
    </div>
  )
}

function MenuItemModal({ item, categories, onClose, onUpdateField, onToggleAvailability, onDelete }) {
  const isAvailable = item.is_available ?? true
  return (
    <div className="item-modal__backdrop" onClick={onClose}>
      <div className="item-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="item-modal__close" aria-label="Sulje" onClick={onClose}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <EditableImage src={item.image_url} alt={item.name} onSave={(url) => onUpdateField('image_url', url)} />

        <div className="item-modal__body">
          <EditableField
            value={item.name}
            renderDisplay={(v) => <h2>{v}</h2>}
            onSave={(v) => {
              const trimmed = v.trim()
              if (!trimmed) return 'Nimi ei voi olla tyhjä.'
              return onUpdateField('name', trimmed)
            }}
          />

          <EditableField
            value={item.category || ''}
            placeholder="Kategoria"
            renderDisplay={(v) => <span className="category-tag">{v || 'Ruokalista'}</span>}
            renderEditor={(draft, setDraft) => <CategorySelect value={draft} categories={categories} onChange={setDraft} />}
            onSave={(v) => onUpdateField('category', v.trim() || 'Ruokalista')}
          />

          <EditableField
            value={item.description || ''}
            type="textarea"
            placeholder="Ei kuvausta"
            renderDisplay={(v) => <p className="item-modal__description">{v || 'Ei kuvausta'}</p>}
            onSave={(v) => onUpdateField('description', v.trim() || null)}
          />

          <EditableField
            value={centsToEuroString(item.price_cents)}
            renderDisplay={() => <p className="item-modal__price">{formatPrice(item.price_cents)}</p>}
            onSave={(v) => {
              const cents = euroStringToCents(v)
              if (cents === null || cents < 0) return 'Anna kelvollinen hinta, esim. 9.90'
              return onUpdateField('price_cents', cents)
            }}
          />

          <EditableField
            value={item.tags ?? []}
            renderDisplay={(tags) => (
              <div className="item-modal__tags">
                {tags.length === 0 ? (
                  <span className="item-modal__no-tags">Ei ainesosa-/ominaisuustageja</span>
                ) : (
                  tags.map((tag) => (
                    <span className="tag-chip" key={tag}>
                      {tag}
                    </span>
                  ))
                )}
              </div>
            )}
            renderEditor={(draft, setDraft) => <TagPicker selectedTags={draft} onChange={setDraft} />}
            onSave={(v) => onUpdateField('tags', v)}
          />

          <OptionGroupsSection menuItemId={item.id} />

          <button
            type="button"
            className={`partner-availability-toggle${isAvailable ? '' : ' partner-availability-toggle--sold-out'}`}
            onClick={onToggleAvailability}
          >
            {isAvailable ? 'Merkitse loppuneeksi valikoimasta' : 'Palauta valikoimaan'}
          </button>

          <button type="button" className="partner-btn partner-btn--danger partner-item-modal__delete" onClick={onDelete}>
            Poista tuote
          </button>
        </div>
      </div>
    </div>
  )
}

function MenuItemsSection({ restaurantId }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  async function loadItems() {
    setStatus('loading')
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      setStatus('error')
      return
    }
    setItems(data ?? [])
    setStatus('ready')
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  const selectedItem = items.find((i) => i.id === selectedItemId) || null
  const categories = Array.from(new Set(items.map((i) => i.category || 'Ruokalista'))).sort((a, b) =>
    a.localeCompare(b, 'fi'),
  )

  async function handleUpdateField(field, value) {
    if (!selectedItem) return 'Ei valittua tuotetta.'
    const { error } = await supabase.from('menu_items').update({ [field]: value }).eq('id', selectedItem.id)
    if (error) return 'Tallennus epäonnistui: ' + error.message
    setItems((prev) => prev.map((i) => (i.id === selectedItem.id ? { ...i, [field]: value } : i)))
    return undefined
  }

  async function handleToggleAvailability(item) {
    const nextValue = !(item.is_available ?? true)
    const { error } = await supabase.from('menu_items').update({ is_available: nextValue }).eq('id', item.id)
    if (!error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: nextValue } : i)))
    }
  }

  async function handleDeleteSelected() {
    if (!selectedItem) return
    if (!window.confirm('Poistetaanko tuote ruokalistalta?')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', selectedItem.id)
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id))
      setSelectedItemId(null)
    }
  }

  const grouped = groupItemsByCategory(items)

  return (
    <div className="partner-card">
      <h2>Ruokalista</h2>
      <p className="partner-form__hint">Näin ruokalista näkyy asiakkaille. Paina tuotetta muokataksesi sitä.</p>

      {status === 'loading' && <p className="state-message">Ladataan...</p>}
      {status === 'error' && <p className="partner-error">Ruokalistan haku epäonnistui.</p>}
      {status === 'ready' && items.length === 0 && (
        <p className="state-message">Ei vielä tuotteita. Lisää ensimmäinen alta.</p>
      )}

      {status === 'ready' && items.length > 0 && (
        <div className="menu">
          {grouped.map(([category, categoryItems]) => (
            <section className="menu-section" key={category}>
              <h3 className="menu-section__title">{category}</h3>
              <ul className="menu-grid">
                {categoryItems.map((item) => {
                  const isAvailable = item.is_available ?? true
                  return (
                    <li key={item.id}>
                      <div
                        className={`menu-card${isAvailable ? '' : ' menu-card--sold-out'}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedItemId(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedItemId(item.id)
                          }
                        }}
                      >
                        <div className="menu-card__info">
                          <span className="menu-card__name">{item.name}</span>
                          {item.description && <span className="menu-card__description">{item.description}</span>}
                          {item.tags?.length > 0 && (
                            <div className="menu-card__tags">
                              {item.tags.map((tag) => (
                                <span className="tag-chip" key={tag}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className="menu-card__price">{formatPrice(item.price_cents)}</span>
                          <button
                            type="button"
                            className={`partner-availability-toggle${isAvailable ? '' : ' partner-availability-toggle--sold-out'}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleAvailability(item)
                            }}
                          >
                            {isAvailable ? 'Merkitse loppuneeksi' : 'Palauta valikoimaan'}
                          </button>
                        </div>

                        <div className="menu-card__media">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} />
                          ) : (
                            <RestaurantAvatarPlaceholder name={item.name} size="thumb" />
                          )}
                          {!isAvailable && <span className="menu-card__sold-out-badge">Loppu</span>}
                          <span className="menu-card__add" aria-hidden="true">
                            <EditIcon />
                          </span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="partner-menu-add">
          <h3>Uusi tuote</h3>
          <MenuItemForm
            restaurantId={restaurantId}
            categories={categories}
            onDone={() => {
              setShowAddForm(false)
              loadItems()
            }}
          />
        </div>
      ) : (
        <button type="button" className="partner-btn partner-btn--primary" onClick={() => setShowAddForm(true)}>
          + Lisää tuote
        </button>
      )}

      {selectedItem && (
        <MenuItemModal
          item={selectedItem}
          categories={categories}
          onClose={() => setSelectedItemId(null)}
          onUpdateField={handleUpdateField}
          onToggleAvailability={() => handleToggleAvailability(selectedItem)}
          onDelete={handleDeleteSelected}
        />
      )}
    </div>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 9.5 10 4l6.5 5.5M5.5 8v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 12h3l1.5 2h3l1.5-2h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4 12V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6M4 12v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3.5v2M10 14.5v2M16.5 10h-2M5.5 10h-2M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4M14.6 14.6l-1.4-1.4M6.8 6.8 5.4 5.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MenuListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 16.5V8M10 16.5V3.5M16 16.5v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 16.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const TABS = [
  { id: 'koti', label: 'Koti', icon: HomeIcon },
  { id: 'tilaukset', label: 'Tilaukset', icon: OrdersIcon },
  { id: 'historia', label: 'Historia', icon: HistoryIcon },
  { id: 'tilastot', label: 'Tilastot', icon: ChartIcon },
  { id: 'talous', label: 'Talous', icon: CoinIcon },
  { id: 'ruokalista', label: 'Ruokalista', icon: MenuListIcon },
  { id: 'asetukset', label: 'Asetukset', icon: SettingsIcon },
]

function NoSignalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 7.5a10 10 0 0 1 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <path d="M5.5 10.7a6.3 6.3 0 0 1 9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <path d="M8 13.9a2.9 2.9 0 0 1 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
      <circle cx="10" cy="16.3" r="1" fill="currentColor" opacity="0.35" />
      <path d="M2.5 2.5l15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

function OfflineOverlay() {
  return (
    <div className="partner-offline-overlay">
      <div className="partner-offline-overlay__icon">
        <NoSignalIcon />
      </div>
      <h2>Ei yhteyttä</h2>
      <p>Internetyhteys on poikki. Et voi juuri nyt vastaanottaa tilauksia tai tallentaa muutoksia.</p>
    </div>
  )
}

const SIDEBAR_ICON_TABS = TABS.filter((tab) => tab.id !== 'asetukset')

function PartnerSidebar({ activeTab, onTabChange, pendingCount, restaurantName }) {
  const initials = (restaurantName || 'Fi').trim().slice(0, 2).toUpperCase()

  return (
    <nav className="partner-dashboard-sidebar">
      <div className="partner-dashboard-sidebar__tabs">
        {SIDEBAR_ICON_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className={`partner-dashboard-sidebar__tab${activeTab === tab.id ? ' partner-dashboard-sidebar__tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
              aria-label={tab.label}
            >
              <Icon />
              {tab.id === 'tilaukset' && pendingCount > 0 && (
                <span className="partner-dashboard-sidebar__tab-badge">{pendingCount}</span>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={`partner-dashboard-sidebar__avatar${activeTab === 'asetukset' ? ' partner-dashboard-sidebar__avatar--active' : ''}`}
        onClick={() => onTabChange('asetukset')}
        title="Asetukset"
        aria-label="Asetukset"
      >
        {initials}
      </button>
    </nav>
  )
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5v7M8 8.2c0-.9.9-1.7 2-1.7s2 .6 2 1.4c0 1.9-4 1-4 2.9 0 .8.9 1.4 2 1.4s2-.7 2-1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('fi-FI', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date) {
  const d = startOfDay(date)
  const mondayOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - mondayOffset)
  return d
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function ordersFromPeriod(orders, start) {
  return orders.filter((o) => new Date(o.created_at) >= start)
}

function ordersInRange(orders, start, end) {
  return orders.filter((o) => {
    const created = new Date(o.created_at)
    return created >= start && created < end
  })
}

// null (ei "-100%" tms.) kun edellisellä jaksolla ei ollut mitään vertailtavaa - muuten
// prosenttimuutos olisi harhaanjohtava, ei puuttuva vertailukohta.
function computePercentChange(current, previous) {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

// Sama kahden tunnin ryhmittely kuin computeBusiestHours, mutta yhden vuorokauden myynnille
// (Koti-välilehden myyntikatsaus) - eri käyttötarkoitus, siksi oma pieni funktio.
function computeHourlyRevenueForDay(completedOrders, dayStart) {
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const buckets = new Array(12).fill(0)
  for (const order of ordersInRange(completedOrders, dayStart, dayEnd)) {
    const hour = new Date(order.created_at).getHours()
    buckets[Math.floor(hour / 2)] += restaurantShareCents(order)
  }
  // Pelkkä aloitustunti riittää tässä akselimerkintänä (esim. "08"), koska palkkeja on 12 ja
  // ne harvennetaan joka tapauksessa VerticalBarChartin maxLabels-propilla - täysi väli
  // ("08-10") menisi liian ahtaaksi kapeassa Koti-kortissa.
  return buckets.map((value, i) => ({ label: String(i * 2).padStart(2, '0'), value }))
}

// order.total_cents sisältää toimitus-/palvelumaksun, jotka menevät kuljettajalle/delivolle -
// ravintola ei saa niistä mitään, joten kaikkialla missä ravintolalle näytetään "heidän
// osuutensa" pitää käyttää tätä, ei total_cents.
function restaurantShareCents(order) {
  return order.subtotal_cents - order.discount_cents
}

function sumCents(orders) {
  return orders.reduce((sum, o) => sum + restaurantShareCents(o), 0)
}

function summarizeOrders(orders) {
  return { count: orders.length, totalCents: sumCents(orders) }
}

// Lasketaan tilastot fetchatun tilauslistan päällä clientilla - volyymi on tässä vaiheessa
// pieni. Jos tilausmäärät kasvavat isoiksi, tämä kannattaa siirtää DB-puolen aggregaatioksi.
function computeSalesStats(completedOrders) {
  const now = new Date()
  return {
    today: summarizeOrders(ordersFromPeriod(completedOrders, startOfDay(now))),
    week: summarizeOrders(ordersFromPeriod(completedOrders, startOfWeek(now))),
    month: summarizeOrders(ordersFromPeriod(completedOrders, startOfMonth(now))),
  }
}

function computeTopProducts(completedOrders) {
  const counts = new Map()
  for (const order of completedOrders) {
    for (const line of order.order_items) {
      counts.set(line.name, (counts.get(line.name) ?? 0) + line.quantity)
    }
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

const WEEKDAY_SHORT_LABELS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']

function computeBusiestWeekdays(completedOrders) {
  const counts = new Array(7).fill(0)
  for (const order of completedOrders) {
    const day = (new Date(order.created_at).getDay() + 6) % 7
    counts[day] += 1
  }
  return WEEKDAY_SHORT_LABELS.map((label, i) => ({ label, value: counts[i] }))
}

// Kahden tunnin liukuvat "kellonaikalaatikot" (00, 02, 04, ... 22) - 24 erillistä tuntia
// olisi liian ahdas kaavio näin kapeassa kojelaudassa, 12 laatikkoa pysyy vielä luettavana.
function computeBusiestHours(completedOrders) {
  const counts = new Array(12).fill(0)
  for (const order of completedOrders) {
    const hour = new Date(order.created_at).getHours()
    counts[Math.floor(hour / 2)] += 1
  }
  // Label kertoo koko kahden tunnin välin (esim. "10-12"), ei vain aloitustuntia - pelkkä "10"
  // näytti siltä että kaikki tilaukset olisivat tulleet täsmälleen klo 10, vaikka laatikko
  // kattaa myös tunnin 11 (esim. 11:44 päätyy "10"-laatikkoon).
  return counts.map((value, i) => {
    const start = i * 2
    const end = (start + 2) % 24
    return { label: `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`, value }
  })
}

const DAILY_CHART_LABEL_FORMAT = { day: '2-digit', month: '2-digit' }

// Viimeiset `days` päivää (tästä hetkestä taaksepäin), riippumatta Talous-välilehden
// jakson valitsimesta - kaavio näyttää aina saman trendin, ei muutu period-napista.
function computeDailyRevenue(completedOrders, days) {
  const buckets = []
  const today = startOfDay(new Date())
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    buckets.push({ date, value: 0 })
  }
  for (const order of completedOrders) {
    const day = startOfDay(new Date(order.created_at)).getTime()
    const bucket = buckets.find((b) => b.date.getTime() === day)
    if (bucket) bucket.value += restaurantShareCents(order)
  }
  return buckets.map((b) => ({ label: b.date.toLocaleDateString('fi-FI', DAILY_CHART_LABEL_FORMAT), value: b.value }))
}

// Pystypalkkikaavio - käytetään sekä myyntitrendille (Talous, Tilastot) että
// viikonpäiväjakaumalle (Tilastot). items: [{label, value}].
// Pyöristää akselin askeleen "siistiksi" luvuksi (1/2/5/10 x kymmenen potenssi), jotta
// euroasteikko näyttää pyöreiltä luvuilta (20, 40, 60...) satunnaisten sentti-arvojen sijaan.
function niceAxisStep(rawStep) {
  if (rawStep <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / magnitude
  let niceResidual
  if (residual <= 1) niceResidual = 1
  else if (residual <= 2) niceResidual = 2
  else if (residual <= 5) niceResidual = 5
  else niceResidual = 10
  return Math.max(1, Math.round(niceResidual * magnitude))
}

// Y-akseli (esim. "20 € / 40 € / 60 € / 80 € / 100 €", tai kokonaislukuja tilausmäärille)
// Woltin kaavioiden tapaan - askel on "siisti" luku, ja yläraja on pienin sen monikerta joka
// vielä yltää datan huippuarvoon asti (ettei akseli venähdä turhan korkeaksi pienillä arvoilla,
// esim. yhden tilauksen päivä ei saa venyttää asteikkoa neljään).
function computeAxisTicks(maxValue) {
  if (maxValue <= 0) return [1, 0]
  const step = niceAxisStep(maxValue / 4)
  const count = Math.max(1, Math.ceil(maxValue / step))
  const ticks = []
  for (let i = count; i >= 0; i--) ticks.push(step * i)
  return ticks
}

function VerticalBarChart({ items, formatValue, maxLabels, showAxis, axisUnit = '€', axisScale = 100 }) {
  const dataMax = Math.max(1, ...items.map((i) => i.value))
  // maxLabels harventaa akselimerkinnät tasavälein kun palkkeja on enemmän kuin tila sallii
  // (esim. 12 kaksituntista palkkia kapeassa kortissa) - palkit pysyvät kaikki näkyvissä,
  // vain osa saa tekstin alle, ettei "00 02 04 06..." mene päällekkäin.
  const labelStep = maxLabels && items.length > maxLabels ? Math.ceil(items.length / maxLabels) : 1
  const axisTicks = showAxis ? computeAxisTicks(dataMax / axisScale) : null
  const max = axisTicks ? axisTicks[0] * axisScale : dataMax
  return (
    <div className="sales-chart-wrap">
      {axisTicks && (
        <div className="sales-chart-axis">
          {axisTicks.map((tick) => (
            <span key={tick} className="sales-chart-axis__tick">
              {tick}
              {axisUnit ? <span className="sales-chart-axis__unit"> {axisUnit}</span> : null}
            </span>
          ))}
        </div>
      )}
      <div className={`sales-chart${showAxis ? ' sales-chart--axis' : ''}`}>
        {items.map((item, i) => (
          <div className="sales-chart__col" key={`${item.label}-${i}`}>
            <div className="sales-chart__track">
              <div
                className="sales-chart__bar"
                style={{ height: `${Math.max(2, (item.value / max) * 100)}%` }}
                title={formatValue ? formatValue(item.value) : String(item.value)}
              />
            </div>
            <span className="sales-chart__label">{i % labelStep === 0 ? item.label : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MONTH_SHORT_LABELS = ['Tam', 'Hel', 'Maa', 'Huh', 'Tou', 'Kes', 'Hei', 'Elo', 'Syy', 'Lok', 'Mar', 'Jou']

// Viimeiset `months` kuukautta (tämä kuukausi mukaan lukien) - pidemmän aikavälin trendi,
// kootaan aina koko tilaushistoriasta riippumatta Talous-välilehden jakson valitsimesta.
function computeMonthlyRevenue(completedOrders, months) {
  const now = new Date()
  const buckets = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), value: 0 })
  }
  for (const order of completedOrders) {
    const d = new Date(order.created_at)
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth())
    if (bucket) bucket.value += restaurantShareCents(order)
  }
  return buckets.map((b) => ({ label: MONTH_SHORT_LABELS[b.month], value: b.value }))
}

// Kuluvan kuukauden muutos edelliseen kuukauteen verrattuna, laskettuna samasta
// kuukausikohtaisesta listasta - null jos ei ole vertailukelpoista dataa (esim. edellinen
// kuukausi oli 0 € - prosenttimuutos ei olisi mielekäs).
function computeMonthOverMonth(monthlyBuckets) {
  if (monthlyBuckets.length < 2) return null
  const current = monthlyBuckets[monthlyBuckets.length - 1].value
  const previous = monthlyBuckets[monthlyBuckets.length - 2].value
  if (previous <= 0) return null
  return { current, previous, deltaPercent: Math.round(((current - previous) / previous) * 100) }
}

function computeAverageOrderValue(completedOrders) {
  if (completedOrders.length === 0) return 0
  return Math.round(sumCents(completedOrders) / completedOrders.length)
}

// Yleiskäyttöinen avattava osio - kiinni oletuksena, jotta useampi lisätilasto ei tuki
// näkymää kerralla (käyttäjä avaa vain sen mitä haluaa juuri nyt katsoa).
function CollapsibleSection({ title, subtitle, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="collapsible-section">
      <button
        type="button"
        className="collapsible-section__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="collapsible-section__heading">
          <span className="collapsible-section__title">{title}</span>
          {subtitle && <span className="collapsible-section__subtitle">{subtitle}</span>}
        </span>
        <span className={`collapsible-section__chevron${open ? ' collapsible-section__chevron--open' : ''}`}>
          <ChevronIcon />
        </span>
      </button>
      {open && <div className="collapsible-section__body">{children}</div>}
    </div>
  )
}

// Vaakapalkkilista - pitkille nimille (esim. tuotenimet) parempi kuin pystypalkit, koska
// nimi mahtuu kokonaan omalle rivilleen palkin yläpuolelle sen sijaan että tiivistyisi
// kapeaan sarakeotsikkoon. items: [{label, value}].
function HorizontalBarList({ items, formatValue }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="hbar-list">
      {items.map((item) => (
        <div className="hbar-list__row" key={item.label}>
          <div className="hbar-list__top">
            <span className="hbar-list__label">{item.label}</span>
            <span className="hbar-list__value">{formatValue ? formatValue(item.value) : item.value}</span>
          </div>
          <div className="hbar-list__track">
            <div className="hbar-list__fill" style={{ width: `${Math.min(94, Math.max(2, (item.value / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function OrderDetails({ order }) {
  return (
    <>
      <div className="order-card__delivery">
        <span className={`order-method-badge order-method-badge--${order.delivery_method}`}>
          {order.delivery_method === 'delivery' ? 'Kotiinkuljetus' : 'Nouto'}
        </span>
        <span>
          {order.delivery_name} · {order.delivery_phone}
        </span>
        {order.delivery_method === 'delivery' && order.delivery_address && <span>{order.delivery_address}</span>}
        {order.delivery_notes && <span className="order-card__notes">{order.delivery_notes}</span>}
      </div>

      <ul className="order-card__lines">
        {order.order_items.map((line) => (
          <li key={line.id}>
            <span className="order-card__line-info">
              <span>
                {line.quantity} × {line.name}
              </span>
              {line.selected_options?.length > 0 && (
                <span className="order-card__line-options">{line.selected_options.map((o) => o.name).join(', ')}</span>
              )}
            </span>
            <span>{formatPrice((line.unit_price_cents ?? line.price_cents) * line.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="order-card__total">
        <div className="order-card__total-row">
          <span>Ravintolan osuus</span>
          <span>{formatPrice(restaurantShareCents(order))}</span>
        </div>
        <div className="order-card__total-row order-card__total-row--muted">
          <span>Asiakkaan maksama kokonaissumma</span>
          <span>{formatPrice(order.total_cents)}</span>
        </div>
      </div>
    </>
  )
}

const IN_PROGRESS_ORDER_STATUSES = ['confirmed', 'preparing', 'ready']

function orderUrgencyClass(status) {
  if (status === 'pending') return ' order-card--pending'
  if (IN_PROGRESS_ORDER_STATUSES.includes(status)) return ' order-card--in-progress'
  return ''
}

// Pidettävä samana kuin supabase/migrations/0028_auto_cancel_stale_pending_orders.sql:n
// pg_cron-ajastin, joka peruu kannassa pending-tilaukset tämän ajan jälkeen - tämä on vain
// näkyvä laskuri omistajalle, ei itse peruutuslogiikka.
const PENDING_AUTO_CANCEL_MINUTES = 3

function PendingCountdown({ createdAt }) {
  const deadline = new Date(createdAt).getTime() + PENDING_AUTO_CANCEL_MINUTES * 60 * 1000
  const [remainingMs, setRemainingMs] = useState(() => deadline - Date.now())

  useEffect(() => {
    const id = setInterval(() => setRemainingMs(deadline - Date.now()), 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (remainingMs <= 0) {
    return <p className="order-card__countdown order-card__countdown--expired">Peruuntuu automaattisesti hetken kuluttua</p>
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return (
    <p className="order-card__countdown">
      Hyväksy {minutes}:{String(seconds).padStart(2, '0')} kuluessa, tai tilaus perutaan automaattisesti
    </p>
  )
}

const READY_ESTIMATE_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 45, 60]

function AcceptOrderModal({ order, onConfirm, onClose, error }) {
  const [selectedMinutes, setSelectedMinutes] = useState(order.delivery_method === 'delivery' ? 30 : 15)
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    await onConfirm(selectedMinutes)
    setBusy(false)
  }

  return (
    <div className="accept-order-modal__backdrop" onClick={onClose}>
      <div className="accept-order-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Hyväksy tilaus {order.order_number}</h3>
        <p className="partner-form__hint">
          Milloin tilaus on arviolta valmis {order.delivery_method === 'delivery' ? 'toimitukseen' : 'noudettavaksi'}?
        </p>

        <div className="accept-order-modal__options">
          {READY_ESTIMATE_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`accept-order-modal__option${selectedMinutes === minutes ? ' accept-order-modal__option--active' : ''}`}
              onClick={() => setSelectedMinutes(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>

        {error && <p className="partner-error">{error}</p>}

        <div className="accept-order-modal__actions">
          <button type="button" className="partner-btn partner-btn--primary" disabled={busy} onClick={handleConfirm}>
            {busy ? 'Hyväksytään...' : `Hyväksy - valmis ${selectedMinutes} min kuluttua`}
          </button>
          <button type="button" className="partner-btn partner-btn--ghost" disabled={busy} onClick={onClose}>
            Peruuta
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order, onUpdateStatus }) {
  const [busy, setBusy] = useState(false)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [actionError, setActionError] = useState('')
  const actionLabel = nextOrderActionLabel(order.status)
  const cancellable = isOrderCancellable(order.status)

  async function handleAction(status, extraFields) {
    setBusy(true)
    setActionError('')
    const error = await onUpdateStatus(order.id, status, extraFields)
    setBusy(false)
    // Ilman tätä päivitys näytti epäonnistuessaan siltä ettei mikään tapahtunut - kortti jäi
    // vanhaan tilaan eikä käyttäjä nähnyt miksi (esim. estimated_ready_at-sarakkeen oikeudet
    // puuttuivat kannasta, migraatio 0026 ajamatta).
    if (error) setActionError('Päivitys epäonnistui. Yritä hetken kuluttua uudelleen.')
    return error
  }

  async function handleAcceptWithEstimate(minutes) {
    const estimatedReadyAt = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    const error = await handleAction('confirmed', { estimated_ready_at: estimatedReadyAt })
    if (!error) setShowAcceptModal(false)
  }

  function handlePrimaryAction() {
    // "Hyväksy tilaus" (pending -> confirmed) pyytää ensin arvion valmistumisajasta - muut
    // tilasiirtymät (aloita valmistus, merkitse valmiiksi, ...) pysyvät välittöminä kuten ennenkin.
    if (order.status === 'pending') {
      setShowAcceptModal(true)
      return
    }
    handleAction(nextOrderStatus(order.status))
  }

  return (
    <div className={`order-card${orderUrgencyClass(order.status)}`}>
      <div className="order-card__header">
        <div className="order-card__heading">
          <span className="order-card__number">{order.order_number}</span>
          <span className="order-card__time">{formatTime(order.created_at)}</span>
        </div>
        <span className={`order-status-badge order-status-badge--${order.status}`}>
          {orderStatusLabel(order.status, order.delivery_method)}
        </span>
      </div>

      {order.status === 'pending' && <PendingCountdown createdAt={order.created_at} />}

      <OrderDetails order={order} />

      {actionError && <p className="partner-error">{actionError}</p>}

      <div className="order-card__actions">
        {actionLabel && (
          <button type="button" className="partner-btn partner-btn--primary" disabled={busy} onClick={handlePrimaryAction}>
            {actionLabel}
          </button>
        )}
        {cancellable && (
          <button type="button" className="partner-btn partner-btn--ghost" disabled={busy} onClick={() => handleAction('cancelled')}>
            Peruuta
          </button>
        )}
      </div>

      {showAcceptModal && (
        <AcceptOrderModal
          order={order}
          onConfirm={handleAcceptWithEstimate}
          onClose={() => setShowAcceptModal(false)}
          error={actionError}
        />
      )}
    </div>
  )
}

// Osoite tulee usein pitkänä käänteisgeokoodattuna merkkijonona (esim.
// "2, Maljalahdenkatu, Maljalahti, Kuopio, ..."), liian pitkä statuskorttiin. Näytetään vain
// katu + numero (luonnollisessa järjestyksessä) - täysi osoite säilyy ennallaan datassa,
// tämä koskee vain tätä yhtä näyttöä.
function shortAddress(address) {
  if (!address) return ''
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (/^\d+[a-z]?$/i.test(parts[0]) && parts[1]) {
    return `${parts[1]} ${parts[0]}`
  }
  return parts[0]
}

// restaurants-taulussa ei ole omaa postinumero-saraketta - postinumero poimitaan
// käänteisgeokoodatusta osoitemerkkijonosta (Nominatim sisältää sen aina jossain
// pilkuin erotellussa osassa), kaupunki tulee jo valmiiksi omasta city-sarakkeesta.
function extractPostalCode(address) {
  const match = address?.match(/\b\d{5}\b/)
  return match ? match[0] : ''
}

function shortLocation(restaurant) {
  const street = shortAddress(restaurant.address)
  const postalCode = extractPostalCode(restaurant.address)
  const cityLine = [postalCode, restaurant.city].filter(Boolean).join(' ')
  return [street, cityLine].filter(Boolean).join(', ')
}

function HomeStatusCard({
  restaurant,
  completedToday,
  completedChange,
  cancelledToday,
  cancelledChange,
  onToggleOpen,
  togglingOpen,
}) {
  return (
    <div className="partner-card home-status-card">
      <div className="home-status-card__identity">
        <div className="home-status-card__avatar">{(restaurant.name || 'F').charAt(0).toUpperCase()}</div>
        <div className="home-status-card__identity-text">
          <h3>{restaurant.name}</h3>
          {restaurant.address && <span>{shortLocation(restaurant)}</span>}
        </div>
        <button
          type="button"
          className={`home-status-pill${restaurant.is_open ? ' home-status-pill--open' : ''}`}
          onClick={onToggleOpen}
          disabled={togglingOpen}
        >
          <span className="home-status-pill__dot" aria-hidden="true" />
          {restaurant.is_open ? 'Auki' : 'Kiinni'}
        </button>
      </div>

      <div className="home-status-card__stats">
        <div className="home-stat">
          <span className="home-stat__label">Valmiit tilaukset tänään</span>
          <strong className="home-stat__value">{completedToday}</strong>
          {completedChange !== null && (
            <span className={`finance-mom__badge${completedChange < 0 ? ' finance-mom__badge--down' : ''}`}>
              {completedChange >= 0 ? '▲' : '▼'} {Math.abs(completedChange)} % eiliseen
            </span>
          )}
        </div>
        <div className="home-stat">
          <span className="home-stat__label">Peruutukset tänään</span>
          <strong className="home-stat__value">{cancelledToday}</strong>
          {cancelledChange !== null && (
            <span className={`finance-mom__badge${cancelledChange > 0 ? ' finance-mom__badge--down' : ''}`}>
              {cancelledChange >= 0 ? '▲' : '▼'} {Math.abs(cancelledChange)} % eiliseen
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const HOME_SALES_PERIODS = [
  { key: 'today', label: 'Tänään' },
  { key: 'yesterday', label: 'Eilen' },
  { key: 'week', label: 'Viimeiset 7 päivää' },
]

function HomeSalesCard({ completed }) {
  const [period, setPeriod] = useState('today')
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const dayBeforeStart = new Date(todayStart)
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 2)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)

  let total = 0
  let change = null
  let chart = []

  if (period === 'today') {
    total = sumCents(ordersInRange(completed, todayStart, now))
    change = computePercentChange(total, sumCents(ordersInRange(completed, yesterdayStart, todayStart)))
    chart = computeHourlyRevenueForDay(completed, todayStart)
  } else if (period === 'yesterday') {
    total = sumCents(ordersInRange(completed, yesterdayStart, todayStart))
    change = computePercentChange(total, sumCents(ordersInRange(completed, dayBeforeStart, yesterdayStart)))
    chart = computeHourlyRevenueForDay(completed, yesterdayStart)
  } else {
    total = sumCents(ordersInRange(completed, weekStart, now))
    change = computePercentChange(total, sumCents(ordersInRange(completed, prevWeekStart, weekStart)))
    chart = computeDailyRevenue(completed, 7)
  }

  return (
    <div className="partner-card home-sales-card">
      <div className="home-sales-card__header">
        <h3>Myyntikatsaus</h3>
        <div className="partner-finance-period">
          {HOME_SALES_PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`partner-finance-period__btn${period === p.key ? ' partner-finance-period__btn--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="home-sales-card__total">
        <strong>{formatPrice(total)}</strong>
        {change !== null && (
          <span className={`finance-mom__badge${change < 0 ? ' finance-mom__badge--down' : ''}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)} %
          </span>
        )}
      </div>

      <VerticalBarChart items={chart} formatValue={formatPrice} maxLabels={6} showAxis />
    </div>
  )
}

const HOME_TIPS = [
  { tabId: 'ruokalista', title: 'Täydennä ruokalistasi', body: 'Lisää tuotteita ja pidä hinnat ajan tasalla.' },
  { tabId: 'asetukset', title: 'Aseta aukioloajat', body: 'Näkyy asiakkaille suoraan ravintolasi sivulla.' },
  { tabId: 'talous', title: 'Seuraa taloutta', body: 'Talous-näkymä täyttyy sitä mukaa kun tilauksia kertyy.' },
]

function HomeTipsCard({ onNavigate }) {
  return (
    <div className="partner-card home-tips-card">
      <h3>Vinkkejä alkuun</h3>
      <div className="home-tips-card__list">
        {HOME_TIPS.map((tip) => (
          <button key={tip.tabId} type="button" className="home-tip" onClick={() => onNavigate(tip.tabId)}>
            <span className="home-tip__title">{tip.title}</span>
            <span className="home-tip__body">{tip.body}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function HomeSection({ orders, status, restaurant, onNavigate, onToggleOpen, togglingOpen }) {
  const completed = orders.filter((o) => o.status === 'completed')
  const cancelled = orders.filter((o) => o.status === 'cancelled')

  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const completedToday = ordersInRange(completed, todayStart, now).length
  const completedYesterday = ordersInRange(completed, yesterdayStart, todayStart).length
  const cancelledToday = ordersInRange(cancelled, todayStart, now).length
  const cancelledYesterday = ordersInRange(cancelled, yesterdayStart, todayStart).length
  const pendingCount = orders.filter((o) => o.status === 'pending').length

  return (
    <div className="home-sections">
      <div className="home-welcome-row">
        <h2 className="home-welcome">Tervetuloa, {restaurant.name}</h2>
        {pendingCount > 0 && (
          <button type="button" className="home-welcome-badge" onClick={() => onNavigate('tilaukset')}>
            {pendingCount === 1 ? 'Uusi tilaus' : `${pendingCount} uutta tilausta`}
          </button>
        )}
      </div>

      {status === 'loading' && <p className="state-message">Ladataan...</p>}
      {status === 'error' && <p className="partner-error">Tietojen haku epäonnistui.</p>}

      {status === 'ready' && (
        <>
          <div className="home-grid">
            <HomeStatusCard
              restaurant={restaurant}
              completedToday={completedToday}
              completedChange={computePercentChange(completedToday, completedYesterday)}
              cancelledToday={cancelledToday}
              cancelledChange={computePercentChange(cancelledToday, cancelledYesterday)}
              onToggleOpen={onToggleOpen}
              togglingOpen={togglingOpen}
            />
            <HomeSalesCard completed={completed} />
          </div>

          <HomeTipsCard onNavigate={onNavigate} />
        </>
      )}
    </div>
  )
}

const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

function OrdersSection({ orders, status, onUpdateStatus }) {
  const active = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status))

  return (
    <div className="partner-card">
      <h2>Tilaukset</h2>
      <p className="partner-form__hint">Avoimet tilaukset näkyvät tässä heti kun ne saapuvat.</p>

      {status === 'loading' && <p className="state-message">Ladataan...</p>}
      {status === 'error' && <p className="partner-error">Tilausten haku epäonnistui.</p>}
      {status === 'ready' && active.length === 0 && <p className="state-message">Ei avoimia tilauksia juuri nyt.</p>}

      {status === 'ready' && active.length > 0 && (
        <div className="order-card-list">
          {active.map((order) => (
            <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HistoryOrderRow({ order }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="order-history-row">
      <button
        type="button"
        className="order-history-row__header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="order-history-row__heading">
          <span className="order-card__number">{order.order_number}</span>
          <span className="order-card__time">{formatDateTime(order.created_at)}</span>
        </div>
        <span className="order-history-row__customer">{order.delivery_name}</span>
        <span className="order-history-row__share">{formatPrice(restaurantShareCents(order))}</span>
        <span className={`order-status-badge order-status-badge--${order.status}`}>
          {orderStatusLabel(order.status, order.delivery_method)}
        </span>
        <span className={`order-history-row__chevron${open ? ' order-history-row__chevron--open' : ''}`}>
          <ChevronIcon />
        </span>
      </button>

      {open && (
        <div className="order-history-row__details">
          <OrderDetails order={order} />
        </div>
      )}
    </div>
  )
}

const PAST_ORDER_STATUSES = ['completed', 'cancelled']

const HISTORY_PERIODS = [
  { key: 'all', label: 'Kaikki' },
  { key: 'today', label: 'Tänään' },
  { key: 'yesterday', label: 'Eilen' },
  { key: 'thisWeek', label: 'Tämä viikko' },
  { key: 'thisMonth', label: 'Tämä kuukausi' },
  { key: 'thisYear', label: 'Tämä vuosi' },
]

// "Tämä viikko/kuukausi/vuosi" on kuluva kalenterijakso tähän hetkeen asti (esim. tämän
// viikon maanantaista nyt-hetkeen) - ei koko edellistä jaksoa.
function historyPeriodRange(key, now) {
  const todayStart = startOfDay(now)
  if (key === 'today') return { start: todayStart, end: now }
  if (key === 'yesterday') {
    const start = new Date(todayStart)
    start.setDate(start.getDate() - 1)
    return { start, end: todayStart }
  }
  if (key === 'thisWeek') return { start: startOfWeek(now), end: now }
  if (key === 'thisMonth') return { start: startOfMonth(now), end: now }
  if (key === 'thisYear') return { start: new Date(now.getFullYear(), 0, 1), end: now }
  return null
}

function HistorySection({ orders, status }) {
  const [period, setPeriod] = useState('all')
  const past = orders.filter((o) => PAST_ORDER_STATUSES.includes(o.status))
  const range = historyPeriodRange(period, new Date())
  const filtered = range ? ordersInRange(past, range.start, range.end) : past

  return (
    <div className="partner-card">
      <h2>Historia</h2>
      <p className="partner-form__hint">Paina tilausta nähdäksesi koko tilauksen tiedot.</p>

      <div className="partner-finance-period">
        {HISTORY_PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`partner-finance-period__btn${period === p.key ? ' partner-finance-period__btn--active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className="state-message">Ladataan...</p>}
      {status === 'error' && <p className="partner-error">Tilaushistorian haku epäonnistui.</p>}
      {status === 'ready' && past.length === 0 && <p className="state-message">Ei vielä tilaushistoriaa.</p>}
      {status === 'ready' && past.length > 0 && filtered.length === 0 && (
        <p className="state-message">Ei tilauksia valitulta ajalta.</p>
      )}

      {status === 'ready' && filtered.length > 0 && (
        <div className="order-history-list">
          {filtered.map((order) => (
            <HistoryOrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatsSection({ orders, status }) {
  const completed = orders.filter((o) => o.status === 'completed')
  const sales = computeSalesStats(completed)
  const dailyRevenue = computeDailyRevenue(completed, 14)
  const topProducts = computeTopProducts(completed)
  const busiestDays = computeBusiestWeekdays(completed)
  const busiestHours = computeBusiestHours(completed)

  return (
    <div className="partner-card">
      <h2>Tilastot</h2>

      {status === 'loading' && <p className="state-message">Ladataan...</p>}
      {status === 'error' && <p className="partner-error">Tilastojen haku epäonnistui.</p>}

      {status === 'ready' && completed.length === 0 && (
        <p className="partner-form__hint">Tilastot täydentyvät sitä mukaa kun tilauksia merkitään valmiiksi.</p>
      )}

      {status === 'ready' && completed.length > 0 && (
        <div className="stats-sections">
          <div className="finance-chart-block">
            <h3>Myynti viimeiseltä 14 päivältä</h3>
            <VerticalBarChart items={dailyRevenue} formatValue={formatPrice} showAxis />
            <div className="stats-chip-row">
              <div className="stats-chip">
                <span>Tänään</span>
                <strong>{formatPrice(sales.today.totalCents)}</strong>
                <span>{sales.today.count} tilausta</span>
              </div>
              <div className="stats-chip">
                <span>Tällä viikolla</span>
                <strong>{formatPrice(sales.week.totalCents)}</strong>
                <span>{sales.week.count} tilausta</span>
              </div>
              <div className="stats-chip">
                <span>Tässä kuussa</span>
                <strong>{formatPrice(sales.month.totalCents)}</strong>
                <span>{sales.month.count} tilausta</span>
              </div>
            </div>
          </div>

          <div className="finance-extra">
            <CollapsibleSection title="Suosituimmat tuotteet" subtitle={`${topProducts.length} tuotetta`}>
              <HorizontalBarList items={topProducts} />
            </CollapsibleSection>

            <CollapsibleSection title="Kiireisimmät päivät" subtitle="Ma-Su">
              <VerticalBarChart items={busiestDays} showAxis axisUnit="" axisScale={1} />
            </CollapsibleSection>

            <CollapsibleSection title="Kiireisimmät kellonajat" subtitle="2 tunnin jaksoissa">
              <VerticalBarChart items={busiestHours} showAxis axisUnit="" axisScale={1} />
            </CollapsibleSection>
          </div>
        </div>
      )}
    </div>
  )
}

const FINANCE_PERIODS = [
  { key: 'today', label: 'Tänään' },
  { key: 'week', label: 'Tämä viikko' },
  { key: 'month', label: 'Tämä kuukausi' },
  { key: 'all', label: 'Kaikki' },
]

function FinanceSection({ orders, status, restaurant }) {
  const [period, setPeriod] = useState('month')
  const completed = orders.filter((o) => o.status === 'completed')
  const now = new Date()
  const periodStart = period === 'today' ? startOfDay(now) : period === 'week' ? startOfWeek(now) : startOfMonth(now)
  const periodOrders = period === 'all' ? completed : ordersFromPeriod(completed, periodStart)
  const commissionRate = restaurant.commission_rate_percent ?? 15
  const gross = sumCents(periodOrders)
  const commission = Math.round((gross * commissionRate) / 100)
  const net = gross - commission

  // Pidemmän aikavälin tunnusluvut lasketaan aina koko (fetchatusta) tilaushistoriasta,
  // eivät riipu period-valitsimesta - samaan tapaan kuin 14 päivän trendikaavio yllä.
  const monthlyRevenue = computeMonthlyRevenue(completed, 12)
  const monthOverMonth = computeMonthOverMonth(monthlyRevenue)
  const averageOrderValue = computeAverageOrderValue(completed)

  function handleExport() {
    const rows = [
      ['Päivämäärä', 'Tilausnumero', 'Ravintolan osuus (€)', `Palkkio (${commissionRate} %)`, 'Netto (€)'],
      ...periodOrders.map((o) => {
        const share = restaurantShareCents(o)
        const c = Math.round((share * commissionRate) / 100)
        return [
          formatDateTime(o.created_at),
          o.order_number,
          (share / 100).toFixed(2),
          (c / 100).toFixed(2),
          ((share - c) / 100).toFixed(2),
        ]
      }),
    ]
    downloadCsv(`delivo-tilitys-${period}.csv`, rows)
  }

  return (
    <div className="partner-card">
      <h2>Talous</h2>
      <p className="partner-form__hint">
        Laskennallinen arvio olemassa olevasta tilausdatasta - delivo ei vielä välitä oikeita maksuja tai tilityksiä
        automaattisesti, joten tämä ei ole pankkitilitys.
      </p>

      <div className="partner-finance-period">
        {FINANCE_PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`partner-finance-period__btn${period === p.key ? ' partner-finance-period__btn--active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className="state-message">Ladataan...</p>}
      {status === 'error' && <p className="partner-error">Tilausdatan haku epäonnistui.</p>}

      {status === 'ready' && (
        <>
          <div className="finance-chart-block">
            <h3>Myynti viimeiseltä 14 päivältä</h3>
            <VerticalBarChart items={computeDailyRevenue(completed, 14)} formatValue={formatPrice} showAxis />
          </div>

          <div className="partner-finance-summary">
            <div>
              <span>Bruttomyynti</span>
              <strong>{formatPrice(gross)}</strong>
            </div>
            <div>
              <span>delivon palkkio ({commissionRate} %)</span>
              <strong>−{formatPrice(commission)}</strong>
            </div>
            <div className="partner-finance-summary__net">
              <span>Arvioitu tilitys</span>
              <strong>{formatPrice(net)}</strong>
            </div>
          </div>

          {gross > 0 && (
            <div className="finance-split">
              <div
                className="finance-split-bar"
                role="img"
                aria-label={`Netto ${formatPrice(net)}, delivon palkkio ${formatPrice(commission)}`}
              >
                <div className="finance-split-bar__net" style={{ width: `${(net / gross) * 100}%` }} />
                <div className="finance-split-bar__commission" style={{ width: `${(commission / gross) * 100}%` }} />
              </div>
              <div className="finance-split__legend">
                <span className="finance-split__legend-item">
                  <span className="finance-split__dot finance-split__dot--net" /> Netto
                </span>
                <span className="finance-split__legend-item">
                  <span className="finance-split__dot finance-split__dot--commission" /> delivon palkkio
                </span>
              </div>
            </div>
          )}

          {periodOrders.length === 0 ? (
            <p className="state-message">Ei tilauksia valitulla jaksolla.</p>
          ) : (
            <>
              <div className="partner-table-wrap">
                <table className="partner-table">
                  <thead>
                    <tr>
                      <th>Aika</th>
                      <th>Tilaus</th>
                      <th>Ravintolan osuus</th>
                      <th>Palkkio</th>
                      <th>Netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodOrders.map((o) => {
                      const share = restaurantShareCents(o)
                      const c = Math.round((share * commissionRate) / 100)
                      return (
                        <tr key={o.id}>
                          <td>{formatDateTime(o.created_at)}</td>
                          <td>{o.order_number}</td>
                          <td>{formatPrice(share)}</td>
                          <td>−{formatPrice(c)}</td>
                          <td>{formatPrice(share - c)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" className="partner-btn partner-btn--ghost" onClick={handleExport}>
                Vie CSV:nä
              </button>
            </>
          )}

          <div className="finance-extra">
            <CollapsibleSection title="Myynti kuukausittain" subtitle="Viimeiset 12 kuukautta">
              <VerticalBarChart items={monthlyRevenue} formatValue={formatPrice} showAxis />
              {monthOverMonth && (
                <p className="finance-mom">
                  <span className={`finance-mom__badge${monthOverMonth.deltaPercent < 0 ? ' finance-mom__badge--down' : ''}`}>
                    {monthOverMonth.deltaPercent >= 0 ? '▲' : '▼'} {Math.abs(monthOverMonth.deltaPercent)} %
                  </span>
                  edelliseen kuukauteen verrattuna
                </p>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Keskiostos" subtitle="Kaikki ajat">
              <p className="finance-stat-big">{formatPrice(averageOrderValue)}</p>
              <p className="partner-form__hint">
                Ravintolan osuuden keskiarvo per tilaus, {completed.length}{' '}
                {completed.length === 1 ? 'tilaus' : 'tilausta'} yhteensä.
              </p>
            </CollapsibleSection>
          </div>
        </>
      )}
    </div>
  )
}

function PartnerDashboard() {
  const { restaurants, refreshRestaurants, status } = usePartnerAuth()
  const [activeId, setActiveId] = useState(null)
  const [activeTab, setActiveTab] = useState('koti')
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersStatus, setOrdersStatus] = useState('loading')
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (!activeId && restaurants.length > 0) {
      setActiveId(restaurants[0].id)
    }
  }, [restaurants, activeId])

  const activeRestaurant = restaurants.find((r) => r.id === activeId) || restaurants[0]

  // Yksi keskitetty haku + realtime-tilaus per aktiivinen ravintola - kaikki neljä
  // tilauksia käyttävää välilehteä (Tilaukset/Historia/Tilastot/Talous) suodattavat
  // saman listan sen sijaan että jokainen tekisi oman kyselynsä.
  useEffect(() => {
    if (!activeRestaurant) return
    let cancelled = false
    setOrdersStatus('loading')

    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', activeRestaurant.id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setOrdersStatus('error')
          return
        }
        setOrders(data ?? [])
        setOrdersStatus('ready')
      })

    const channel = supabase
      .channel(`orders-${activeRestaurant.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${activeRestaurant.id}` },
        async (payload) => {
          const { data } = await supabase.from('orders').select('*, order_items(*)').eq('id', payload.new.id).single()
          if (cancelled || !data) return
          setOrders((prev) => (prev.some((o) => o.id === data.id) ? prev : [data, ...prev]))
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${activeRestaurant.id}` },
        (payload) => {
          setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o)))
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
    // Riippuu tarkoituksella vain id:stä, ei koko activeRestaurant-oliosta - muuten haku/tilaus
    // käynnistyisi uudelleen aina kun mikä tahansa ravintolan kenttä (esim. is_open) muuttuu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRestaurant?.id])

  async function updateOrderStatus(orderId, nextStatus, extraFields = {}) {
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus, ...extraFields })
      .eq('id', orderId)
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus, ...extraFields } : o)))
    } else {
      // Näkyy selaimen konsolissa vaikka käyttöliittymä näyttää vain yleisen virheilmoituksen -
      // esim. "permission denied for column estimated_ready_at" kertoo suoraan että migraatio
      // 0026 (owner_can_set_ready_estimate) ei ole vielä ajettu Supabase-projektiin.
      console.error('Tilauksen päivitys epäonnistui', error)
    }
    return error
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length

  async function handleToggleOpen() {
    if (!activeRestaurant) return
    setTogglingOpen(true)
    const { error } = await supabase
      .from('restaurants')
      .update({ is_open: !activeRestaurant.is_open })
      .eq('id', activeRestaurant.id)
    if (!error) await refreshRestaurants()
    setTogglingOpen(false)
  }

  const showControls = status === 'ready' && Boolean(activeRestaurant)

  return (
    <div className="page">
      {!isOnline && <OfflineOverlay />}

      <div className="partner-dashboard-shell">
        {showControls && (
          <PartnerSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingCount={pendingCount}
            restaurantName={activeRestaurant?.name}
          />
        )}

        <div className="partner-dashboard-content">
          <main className="partner-dashboard">
            {status === 'loading' && <p className="state-message">Ladataan...</p>}

            {status === 'ready' && restaurants.length === 0 && (
              <div className="partner-card">
                <h2>Tähän tiliin ei ole liitetty ravintolaa</h2>
                <p>
                  Jotain meni pieleen - tällä tilillä ei ole ravintolaa, vaikka pääsit kirjautumaan sisään. Ota
                  yhteyttä delivoon niin selvitämme asian.
                </p>
              </div>
            )}

            {status === 'ready' && restaurants.length > 0 && activeRestaurant && (
              <>
                {restaurants.length > 1 && (
                  <div className="partner-restaurant-select">
                    <label htmlFor="restaurant-select">Ravintola</label>
                    <select
                      id="restaurant-select"
                      value={activeRestaurant.id}
                      onChange={(e) => setActiveId(e.target.value)}
                    >
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab === 'koti' && (
                  <HomeSection
                    orders={orders}
                    status={ordersStatus}
                    restaurant={activeRestaurant}
                    onNavigate={setActiveTab}
                    onToggleOpen={handleToggleOpen}
                    togglingOpen={togglingOpen}
                  />
                )}

                {activeTab === 'tilaukset' && (
                  <OrdersSection orders={orders} status={ordersStatus} onUpdateStatus={updateOrderStatus} />
                )}

                {activeTab === 'historia' && <HistorySection orders={orders} status={ordersStatus} />}

                {activeTab === 'tilastot' && <StatsSection orders={orders} status={ordersStatus} />}

                {activeTab === 'talous' && (
                  <FinanceSection orders={orders} status={ordersStatus} restaurant={activeRestaurant} />
                )}

                {activeTab === 'ruokalista' && <MenuItemsSection restaurantId={activeRestaurant.id} />}

                {activeTab === 'asetukset' && (
                  <RestaurantInfoForm restaurant={activeRestaurant} onSaved={refreshRestaurants} />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default PartnerDashboard
