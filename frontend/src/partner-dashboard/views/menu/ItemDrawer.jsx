import { useState } from 'react'
import { ImageOff, Plus } from 'lucide-react'
import { INGREDIENT_TAG_GROUPS, ALL_PREDEFINED_TAGS } from '../../../lib/ingredientTags.js'
import { Badge, Drawer, ErrorNote, Field, Toggle } from '../../ui.jsx'
import { isChanged } from '../../forms.js'
import { centsToEuroInput, euroInputToCents, formatPrice } from '../../utils.js'
import ImageUploadField from '../../ImageUploadField.jsx'
import OptionGroups from './OptionGroups.jsx'

const DIET_GROUP = INGREDIENT_TAG_GROUPS.find((g) => g.label === 'Ruokavaliot')
const INGREDIENT_GROUPS = INGREDIENT_TAG_GROUPS.filter((g) => g.label !== 'Ruokavaliot')
const NEW_CATEGORY = '__new'

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

// Esikatselu ylimpänä: ravintola näkee heti, miltä tuote näyttää asiakkaalle.
function ItemPreview({ form }) {
  const [broken, setBroken] = useState('')
  const priceCents = euroInputToCents(form.price)
  const diets = form.tags.filter((t) => DIET_GROUP?.tags.includes(t))
  return (
    <section className="pd-item-preview" aria-label="Esikatselu">
      <span className="pd-item-preview__label">Näin asiakas näkee tuotteen</span>
      <div className={`pd-item-preview__card${form.is_available ? '' : ' is-soldout'}`}>
        <div className="pd-item-preview__text">
          <strong>{form.name.trim() || 'Tuotteen nimi'}</strong>
          <p>{form.description.trim() || 'Kuvaus näkyy tässä.'}</p>
          <span className="pd-item-preview__meta">
            <span className="pd-item-preview__price">{priceCents != null ? formatPrice(priceCents) : '– €'}</span>
            {!form.is_available && <Badge tone="danger">Loppu</Badge>}
            {diets.map((d) => (
              <Badge key={d} tone="success">
                {d}
              </Badge>
            ))}
          </span>
        </div>
        <div className="pd-item-preview__img">
          {form.image_url && broken !== form.image_url ? (
            <img src={form.image_url} alt="" onError={() => setBroken(form.image_url)} />
          ) : (
            <ImageOff size={22} strokeWidth={1.5} aria-hidden="true" />
          )}
        </div>
      </div>
    </section>
  )
}

// Tuotteen lisäys ja muokkaus. Tallennus vain kun jotain on muuttunut, ja
// tallentamattomia muutoksia ei voi hukata huomaamatta (käyttäjä: muokkaukset
// olivat epäselviä).
export default function ItemDrawer({ item, categories, defaultCategory, onClose, onSave, onDelete }) {
  const [saved] = useState(() => initialForm(item, defaultCategory))
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [customTag, setCustomTag] = useState('')
  const [newCategory, setNewCategory] = useState(() => Boolean(saved.category) && !categories.includes(saved.category))
  const isNew = !item
  const dirty = isChanged(form, saved)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleTag(tag) {
    set('tags', form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag])
  }

  function requestClose() {
    if (dirty && !window.confirm('Sinulla on tallentamattomia muutoksia. Suljetaanko ilman tallennusta?')) return
    onClose()
  }

  async function submit() {
    const nextErrors = {}
    const priceCents = euroInputToCents(form.price)
    if (!form.name.trim()) nextErrors.name = 'Anna tuotteelle nimi'
    if (priceCents == null || priceCents < 0) nextErrors.price = 'Anna hinta euroina, esim. 12,90'
    if (newCategory && !form.category.trim()) nextErrors.category = 'Anna uudelle kategorialle nimi'
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
      title={isNew ? 'Uusi tuote' : 'Muokkaa tuotetta'}
      subtitle={isNew ? 'Tuote näkyy asiakkaille heti tallennuksen jälkeen' : item.name}
      onClose={requestClose}
      footer={
        <>
          {!isNew && (
            <button type="button" className="pd-btn pd-btn--ghost pd-btn--danger-text" onClick={onDelete}>
              Poista tuote
            </button>
          )}
          <span className="pd-spacer" />
          {dirty && !isNew && (
            <span className="pd-savebar__note pd-drawer__dirty">
              <span className="pd-savebar__dot" aria-hidden="true" />
              Tallentamattomia muutoksia
            </span>
          )}
          <button type="button" className="pd-btn pd-btn--ghost" onClick={requestClose}>
            Peruuta
          </button>
          <button type="button" className="pd-btn pd-btn--primary" onClick={submit} disabled={saving || (!isNew && !dirty)}>
            {saving ? 'Tallennetaan...' : isNew ? 'Lisää tuote' : 'Tallenna muutokset'}
          </button>
        </>
      }
    >
      <div className="pd-item-form">
        <ItemPreview form={form} />

        <section className="pd-form-section">
          <h3>Perustiedot</h3>
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
            <Field label="Kategoria" error={errors.category}>
              <select
                className="pd-select"
                value={newCategory ? NEW_CATEGORY : form.category}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY) {
                    setNewCategory(true)
                    set('category', '')
                  } else {
                    setNewCategory(false)
                    set('category', e.target.value)
                  }
                }}
              >
                {categories.length === 0 && <option value="">Ruokalista</option>}
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ Uusi kategoria…</option>
              </select>
              {newCategory && (
                <input
                  className="pd-input pd-input--below"
                  autoFocus
                  placeholder="Uuden kategorian nimi, esim. Jälkiruoat"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                />
              )}
            </Field>
          </div>
        </section>

        <section className="pd-form-section">
          <h3>Kuva</h3>
          <p className="pd-muted pd-form-section__hint">Lataa kuva puhelimesta tai tietokoneelta - esikatselu yllä päivittyy heti.</p>
          <ImageUploadField kind="menu" maxSize={1200} value={form.image_url} onChange={(url) => set('image_url', url)} />
        </section>

        <div className="pd-form-row pd-form-row--boxed">
          <div>
            <strong>{form.is_available ? 'Myynnissä' : 'Loppu'}</strong>
            <p className="pd-muted">
              {form.is_available ? 'Asiakkaat voivat tilata tuotetta.' : 'Tuote näkyy asiakkaille loppuneena eikä sitä voi tilata.'}
            </p>
          </div>
          <Toggle checked={form.is_available} label="Myynnissä" onChange={(v) => set('is_available', v)} />
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
            <>
              <p className="pd-muted pd-form-section__hint">Valintaryhmät tallentuvat erikseen ryhmän omasta Tallenna-napista.</p>
              <OptionGroups menuItemId={item.id} />
            </>
          )}
        </section>

        <ErrorNote>{saveError}</ErrorNote>
      </div>
    </Drawer>
  )
}
