/* TEMPORARY PREVIEW FILE - not part of the app, not routed by default, safe to delete.
   Mirrors PartnerDashboard.jsx with mock data instead of Supabase calls, so the dashboard
   can be viewed without a real backend. Keep this in sync manually when the real file changes. */
import { useState, useEffect } from 'react'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import { formatPrice } from '../lib/format.js'
import '../pages/RestaurantPage.css'
import './PartnerCommon.css'
import './PartnerDashboard.css'

const MOCK_RESTAURANT = {
  id: 'mock-1',
  name: 'Burger Talli',
  category: 'Burgerit',
  city: 'Kuopio',
  address: 'Puijonkatu 15, 70100 Kuopio',
  image_url: 'https://images.unsplash.com/photo-1636907229111-a8ac768fe6c9?auto=format&fit=crop&w=1600&q=80',
  pickup_estimate_minutes: 10,
  is_open: true,
}

const MOCK_ITEMS = [
  {
    id: 'm1',
    category: 'Burgerit',
    name: 'Talli-burgeri',
    description: 'Naudanliha, cheddar, tallikastike',
    price_cents: 1290,
    image_url: 'https://images.unsplash.com/photo-1606149059549-6042addafc5a?auto=format&fit=crop&w=800&q=80',
    is_available: true,
  },
  { id: 'm2', category: 'Burgerit', name: 'Kana-burgeri', description: 'Rapea kana, siirappi-majoneesi', price_cents: 1190, image_url: '', is_available: true },
  { id: 'm3', category: 'Lisukkeet', name: 'Ranskalaiset', description: '', price_cents: 450, image_url: '', is_available: true },
  { id: 'm4', category: 'Juomat', name: 'Coca-Cola 0,33l', description: '', price_cents: 350, image_url: '', is_available: true },
]

const EMPTY_MENU_ITEM_FORM = { name: '', description: '', category: '', price: '', image_url: '' }

const PLATFORM_CATEGORIES = ['Aasialainen', 'Burgerit', 'Italialainen', 'Kahvila', 'Kebab & Pizza', 'Kotiruoka', 'Salaatit']

function centsToEuroString(cents) {
  return (cents / 100).toFixed(2)
}

function euroStringToCents(value) {
  const normalized = value.replace(',', '.').trim()
  const euros = parseFloat(normalized)
  if (Number.isNaN(euros)) return null
  return Math.round(euros * 100)
}

function RestaurantInfoForm({ restaurant }) {
  const [form, setForm] = useState({
    name: restaurant.name || '',
    category: restaurant.category || '',
    city: restaurant.city || '',
    address: restaurant.address || '',
    image_url: restaurant.image_url || '',
    pickup_estimate_minutes: restaurant.pickup_estimate_minutes ?? '',
  })
  const [status, setStatus] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    await new Promise((r) => setTimeout(r, 400))
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <form className="partner-card partner-form" onSubmit={handleSubmit}>
      <h2>Ravintolan tiedot</h2>

      <div className="partner-field-grid">
        <div className="partner-field">
          <label htmlFor="ri-name">Nimi</label>
          <input id="ri-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="partner-field">
          <label htmlFor="ri-category">Kategoria</label>
          <CategorySelect
            value={form.category}
            categories={PLATFORM_CATEGORIES}
            onChange={(value) => setForm((f) => ({ ...f, category: value }))}
          />
        </div>

        <div className="partner-field">
          <label htmlFor="ri-city">Kaupunki</label>
          <input id="ri-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </div>

        <div className="partner-field">
          <label htmlFor="ri-address">Osoite</label>
          <input id="ri-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        </div>

        <div className="partner-field">
          <label htmlFor="ri-image">Kuvan URL</label>
          <input id="ri-image" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
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

      <p className="partner-form__hint">Ravintolan auki/kiinni-tila vaihdetaan yläpalkin kytkimestä - se vaikuttaa heti.</p>

      <button type="submit" className="partner-btn partner-btn--primary" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Tallennetaan...' : status === 'saved' ? 'Tallennettu ✓' : 'Tallenna tiedot'}
      </button>
    </form>
  )
}

const NEW_CATEGORY_VALUE = '__uusi__'

function CategorySelect({ value, categories, onChange }) {
  const [isCustom, setIsCustom] = useState(categories.length === 0 || (value !== '' && !categories.includes(value)))

  useEffect(() => {
    if (isCustom && value !== '' && categories.includes(value)) {
      setIsCustom(false)
    }
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

function MenuItemForm({ categories, onDone }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_MENU_ITEM_FORM, category: categories[0] || '' }))
  const [errorMessage, setErrorMessage] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    const priceCents = euroStringToCents(form.price)
    if (priceCents === null || priceCents < 0) {
      setErrorMessage('Anna kelvollinen hinta, esim. 9.90')
      return
    }
    onDone({
      id: 'new-' + Date.now(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || 'Ruokalista',
      price_cents: priceCents,
      image_url: form.image_url.trim() || null,
    })
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
          <CategorySelect value={form.category} categories={categories} onChange={(value) => setForm((f) => ({ ...f, category: value }))} />
        </div>

        <div className="partner-field">
          <label>Hinta (€)</label>
          <input required inputMode="decimal" placeholder="9.90" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
        </div>

        <div className="partner-field">
          <label>Kuvan URL</label>
          <input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
        </div>
      </div>

      <div className="partner-field">
        <label>Kuvaus</label>
        <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>

      <div className="partner-menu-item-form__actions">
        <button type="submit" className="partner-btn partner-btn--primary">
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
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setDraft(value)
  }, [value])

  function handleSave() {
    setErrorMessage('')
    const err = onSave(draft)
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
          <button type="button" className="partner-btn partner-btn--primary" onClick={handleSave}>
            Tallenna
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

  function handleSave() {
    onSave(draft.trim() || null)
    setEditing(false)
  }

  return (
    <div className="item-modal__media partner-editable-image">
      {src ? <img src={src} alt={alt} /> : <RestaurantAvatarPlaceholder name={alt} size="hero" />}

      {!editing && (
        <button type="button" className="partner-editable-image__edit" onClick={() => setEditing(true)} aria-label="Muokkaa kuvaa">
          <EditIcon />
        </button>
      )}

      {editing && (
        <div className="partner-editable-image__panel" onClick={(e) => e.stopPropagation()}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Kuvan URL" autoFocus />
          <div className="partner-editable__actions">
            <button type="button" className="partner-btn partner-btn--primary" onClick={handleSave}>
              Tallenna
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
              onUpdateField('name', trimmed)
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
              onUpdateField('price_cents', cents)
            }}
          />

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

function MenuItemsSection() {
  const [items, setItems] = useState(MOCK_ITEMS)
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const selectedItem = items.find((i) => i.id === selectedItemId) || null
  const categories = Array.from(new Set(items.map((i) => i.category || 'Ruokalista'))).sort((a, b) => a.localeCompare(b, 'fi'))

  function handleUpdateField(field, value) {
    if (!selectedItem) return
    setItems((prev) => prev.map((i) => (i.id === selectedItem.id ? { ...i, [field]: value } : i)))
  }

  function handleDeleteSelected() {
    if (!selectedItem) return
    if (!window.confirm('Poistetaanko tuote ruokalistalta?')) return
    setItems((prev) => prev.filter((i) => i.id !== selectedItem.id))
    setSelectedItemId(null)
  }

  function handleToggleAvailability(item) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !(item.is_available ?? true) } : i)))
  }

  const grouped = groupItemsByCategory(items)

  return (
    <div className="partner-card">
      <h2>Ruokalista</h2>
      <p className="partner-form__hint">Näin ruokalista näkyy asiakkaille. Paina tuotetta muokataksesi sitä.</p>

      {items.length === 0 && <p className="state-message">Ei vielä tuotteita. Lisää ensimmäinen alta.</p>}

      {items.length > 0 && (
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
            categories={categories}
            onDone={(created) => {
              setItems((prev) => [...prev, created])
              setShowAddForm(false)
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

function PowerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.2 6a6 6 0 1 0 7.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

function CoinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5v7M8 8.2c0-.9.9-1.7 2-1.7s2 .6 2 1.4c0 1.9-4 1-4 2.9 0 .8.9 1.4 2 1.4s2-.7 2-1.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 3.3l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6L10 3.3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const STATS_SUBSECTIONS = [
  { icon: CoinIcon, title: 'Myynti', body: 'Päivittäinen ja viikoittainen myyntisi näkyy tässä, kun ensimmäiset tilaukset on vastaanotettu.' },
  { icon: StarIcon, title: 'Suosituimmat tuotteet', body: 'Näet tässä parhaiten myyvät tuotteesi ruokalistalta heti kun tilauksia alkaa kertyä.' },
  { icon: HistoryIcon, title: 'Kiireisimmät ajat', body: 'Näet tässä, mihin kellonaikaan ja viikonpäivään tilauksia tulee eniten.' },
]

function StatsSection() {
  return (
    <div className="partner-card">
      <h2>Tilastot</h2>
      <p className="partner-form__hint">Tilastot täydentyvät sitä mukaa kun ravintolaasi tulee tilauksia.</p>

      <div className="partner-stats-grid">
        {STATS_SUBSECTIONS.map(({ icon: Icon, title, body }) => (
          <div className="partner-stats-subsection" key={title}>
            <div className="partner-stats-subsection__icon">
              <Icon />
            </div>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 7.5a10 10 0 0 1 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 10.7a6.3 6.3 0 0 1 9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 13.9a2.9 2.9 0 0 1 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="16.3" r="1" fill="currentColor" />
    </svg>
  )
}

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

function ConnectionStatus({ isOnline }) {
  return (
    <span className={`partner-connection-status${isOnline ? '' : ' partner-connection-status--offline'}`}>
      <WifiIcon />
      {isOnline ? 'Yhteydessä' : 'Ei yhteyttä'}
    </span>
  )
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

function OpenToggle({ isOpen, onToggle }) {
  return (
    <button type="button" className={`partner-open-toggle${isOpen ? ' partner-open-toggle--open' : ''}`} onClick={onToggle} aria-pressed={isOpen}>
      <PowerIcon />
      <span className="partner-open-toggle__label">{isOpen ? 'Auki' : 'Kiinni'}</span>
      <span className="partner-open-toggle__track" aria-hidden="true">
        <span className="partner-open-toggle__thumb" />
      </span>
    </button>
  )
}

const TABS = [
  { id: 'tilaukset', label: 'Tilaukset', icon: OrdersIcon },
  { id: 'historia', label: 'Historia', icon: HistoryIcon },
  { id: 'tilastot', label: 'Tilastot', icon: ChartIcon },
  { id: 'ruokalista', label: 'Ruokalista', icon: MenuListIcon },
  { id: 'asetukset', label: 'Asetukset', icon: SettingsIcon },
]

function DashboardTopBar({ activeTab, onTabChange, isOpen, onToggleOpen, isOnline }) {
  return (
    <header className="partner-dashboard-topbar">
      <div className="partner-dashboard-topbar__inner">
        <span className="partner-dashboard-topbar__brand">Ravintola</span>

        <nav className="partner-dashboard-topbar__tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                className={`partner-dashboard-topbar__tab${activeTab === tab.id ? ' partner-dashboard-topbar__tab--active' : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon />
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="partner-dashboard-topbar__right">
          <ConnectionStatus isOnline={isOnline} />
          <OpenToggle isOpen={isOpen} onToggle={onToggleOpen} />
        </div>
      </div>
    </header>
  )
}

function PlaceholderSection({ icon: Icon, title, body }) {
  return (
    <div className="partner-card partner-placeholder">
      <div className="partner-placeholder__icon">
        <Icon />
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  )
}

function PreviewDashboard() {
  const [activeTab, setActiveTab] = useState('tilaukset')
  const [isOpen, setIsOpen] = useState(true)
  const isOnline = useOnlineStatus()

  return (
    <div className="page">
      <DashboardTopBar activeTab={activeTab} onTabChange={setActiveTab} isOpen={isOpen} onToggleOpen={() => setIsOpen((v) => !v)} isOnline={isOnline} />

      {!isOnline && <OfflineOverlay />}

      <main className="partner-dashboard">
        {activeTab === 'tilaukset' && (
          <PlaceholderSection
            icon={OrdersIcon}
            title="Ei vielä tilauksia"
            body="Tilaukset näkyvät tässä heti kun asiakkaat voivat tehdä niitä - tilausten vastaanotto on vielä kehityksessä."
          />
        )}
        {activeTab === 'historia' && (
          <PlaceholderSection
            icon={HistoryIcon}
            title="Ei vielä tilaushistoriaa"
            body="Aiemmat tilaukset näkyvät tässä sitten kun ensimmäiset tilaukset on vastaanotettu."
          />
        )}
        {activeTab === 'tilastot' && <StatsSection />}

        {activeTab === 'ruokalista' && <MenuItemsSection />}

        {activeTab === 'asetukset' && <RestaurantInfoForm restaurant={MOCK_RESTAURANT} />}
      </main>
    </div>
  )
}

export default PreviewDashboard
