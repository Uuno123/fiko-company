import { useState } from 'react'
import { ImageOff, Plus } from 'lucide-react'
import { INGREDIENT_TAG_GROUPS, ALL_PREDEFINED_TAGS } from '../../../lib/ingredientTags.js'
import { Drawer, ErrorNote, Field, Toggle } from '../../ui.jsx'
import { centsToEuroInput, euroInputToCents } from '../../utils.js'
import OptionGroups from './OptionGroups.jsx'

const DIET_GROUP = INGREDIENT_TAG_GROUPS.find((g) => g.label === 'Ruokavaliot')
const INGREDIENT_GROUPS = INGREDIENT_TAG_GROUPS.filter((g) => g.label !== 'Ruokavaliot')

function initialForm(item, defaultCategory) {
  return {
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item ? centsToEuroInput(item.price_cents) : '',
    category: item?.category ?? defaultCategory ?? '',
    image_url: item?.image_url ?? '',
    tags: item?.tags ?? [],
    is_available: item?.is_available ?? true,
  }
}

export default function ItemDrawer({ item, categories, defaultCategory, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => initialForm(item, defaultCategory))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [customTag, setCustomTag] = useState('')
  const [imageBroken, setImageBroken] = useState(false)
  const isNew = !item

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleTag(tag) {
    set('tags', form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag])
  }

  async function submit() {
    const nextErrors = {}
    const priceCents = euroInputToCents(form.price)
    if (!form.name.trim()) nextErrors.name = 'Anna tuotteelle nimi'
    if (priceCents == null || priceCents < 0) nextErrors.price = 'Anna hinta euroina, esim. 12,90'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setSaveError('')
    const error = await onSave({
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: priceCents,
      category: form.category.trim() || 'Ruokalista',
      image_url: form.image_url.trim() || null,
      tags: form.tags,
      is_available: form.is_available,
    })
    setSaving(false)
    if (error) setSaveError('Tallennus epäonnistui. Tarkista yhteys ja yritä uudelleen.')
  }

  const customTags = form.tags.filter((t) => !ALL_PREDEFINED_TAGS.includes(t))

  return (
    <Drawer
      wide
      title={isNew ? 'Uusi tuote' : form.name || 'Muokkaa tuotetta'}
      subtitle={isNew ? 'Tuote näkyy asiakkaille heti tallennuksen jälkeen' : form.category}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button type="button" className="pd-btn pd-btn--ghost pd-btn--danger-text" onClick={onDelete}>
              Poista tuote
            </button>
          )}
          <span className="pd-spacer" />
          <button type="button" className="pd-btn pd-btn--ghost" onClick={onClose}>
            Peruuta
          </button>
          <button type="button" className="pd-btn pd-btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'Tallennetaan...' : isNew ? 'Lisää tuote' : 'Tallenna muutokset'}
          </button>
        </>
      }
    >
      <div className="pd-item-form">
        <div className="pd-item-form__media">
          {form.image_url && !imageBroken ? (
            <img src={form.image_url} alt="" onError={() => setImageBroken(true)} />
          ) : (
            <span className="pd-item-form__placeholder">
              <ImageOff size={24} strokeWidth={1.5} aria-hidden="true" />
              {imageBroken ? 'Kuvaa ei voitu ladata' : 'Ei kuvaa'}
            </span>
          )}
        </div>

        <div className="pd-form-grid">
          <Field label="Nimi" error={errors.name} className="pd-field--full">
            <input className="pd-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Esim. Cheeseburger" />
          </Field>
          <Field label="Kuvaus" hint="Ainesosat, maku, koko - näkyy tuotekortissa" className="pd-field--full">
            <textarea className="pd-input pd-textarea" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="Hinta (€)" error={errors.price}>
            <input className="pd-input" inputMode="decimal" placeholder="12,90" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </Field>
          <Field label="Kategoria" hint="Valitse olemassa oleva tai kirjoita uusi">
            <input className="pd-input" list="pd-menu-categories" value={form.category} onChange={(e) => set('category', e.target.value)} />
            <datalist id="pd-menu-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Kuvan osoite (URL)" hint="Liitä kuvan linkki. Kuvan lataus suoraan laitteelta tulossa." className="pd-field--full">
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
        </div>

        <div className="pd-form-row">
          <div>
            <strong>Saatavilla</strong>
            <p className="pd-muted">Pois päältä = näkyy asiakkaille loppuneena</p>
          </div>
          <Toggle checked={form.is_available} label="Saatavilla" onChange={(v) => set('is_available', v)} />
        </div>

        <section className="pd-form-section">
          <h3>Ruokavaliot</h3>
          <div className="pd-chips">
            {DIET_GROUP?.tags.map((tag) => (
              <button key={tag} type="button" className={`pd-chip${form.tags.includes(tag) ? ' is-active' : ''}`} onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </section>

        <details className="pd-form-section pd-disclosure">
          <summary>
            <h3>Ainesosat</h3>
            <span className="pd-muted">{form.tags.filter((t) => !DIET_GROUP?.tags.includes(t)).length} valittu</span>
          </summary>
          {INGREDIENT_GROUPS.map((group) => (
            <div key={group.label} className="pd-tag-group">
              <span className="pd-tag-group__label">{group.label}</span>
              <div className="pd-chips">
                {group.tags.map((tag) => (
                  <button key={tag} type="button" className={`pd-chip pd-chip--sm${form.tags.includes(tag) ? ' is-active' : ''}`} onClick={() => toggleTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pd-tag-group">
            <span className="pd-tag-group__label">Omat</span>
            <div className="pd-chips">
              {customTags.map((tag) => (
                <button key={tag} type="button" className="pd-chip pd-chip--sm is-active" onClick={() => toggleTag(tag)}>
                  {tag} ×
                </button>
              ))}
              <form
                className="pd-inline-add"
                onSubmit={(e) => {
                  e.preventDefault()
                  const tag = customTag.trim()
                  if (tag && !form.tags.includes(tag)) set('tags', [...form.tags, tag])
                  setCustomTag('')
                }}
              >
                <input className="pd-input pd-input--sm" placeholder="Lisää oma" value={customTag} onChange={(e) => setCustomTag(e.target.value)} />
                <button type="submit" className="pd-icon-btn" aria-label="Lisää tagi">
                  <Plus size={16} aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </details>

        <section className="pd-form-section">
          <h3>Valinnat ja lisätäytteet</h3>
          {isNew ? (
            <p className="pd-muted">Tallenna tuote ensin, niin voit lisätä sille koot ja lisätäytteet.</p>
          ) : (
            <OptionGroups menuItemId={item.id} />
          )}
        </section>

        <ErrorNote>{saveError}</ErrorNote>
      </div>
    </Drawer>
  )
}
