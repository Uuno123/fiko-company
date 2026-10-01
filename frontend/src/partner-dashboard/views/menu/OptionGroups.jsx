import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { OPTION_GROUP_TEMPLATES } from '../../../lib/optionGroupTemplates.js'
import { useDashboardApi } from '../../api.js'
import { ErrorNote, Toggle, useToast } from '../../ui.jsx'
import { centsToEuroInput, euroInputToCents, formatPrice } from '../../utils.js'

function toDraft(group) {
  return {
    name: group.name,
    selection_type: group.selection_type,
    min_selections: String(group.min_selections ?? 0),
    max_selections: group.max_selections == null ? '' : String(group.max_selections),
    free_selections: String(group.free_selections ?? 0),
    options: group.options.map((o) => ({
      id: o.id,
      name: o.name,
      price: centsToEuroInput(o.price_delta_cents ?? 0),
      is_default: o.is_default,
    })),
  }
}

function GroupEditor({ group, onSaved, onDelete }) {
  const api = useDashboardApi()
  const toast = useToast()
  const [draft, setDraft] = useState(() => toDraft(group))
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(toDraft(group))
  }, [group])

  function setOption(index, field, value) {
    setDraft((d) => ({ ...d, options: d.options.map((o, i) => (i === index ? { ...o, [field]: value } : o)) }))
  }

  async function save() {
    if (!draft.name.trim()) {
      setError('Anna ryhmälle nimi')
      return
    }
    const options = []
    for (const option of draft.options) {
      if (!option.name.trim()) {
        setError('Jokaisella vaihtoehdolla pitää olla nimi')
        return
      }
      const cents = euroInputToCents(option.price || '0')
      if (cents == null) {
        setError(`Tarkista vaihtoehdon "${option.name}" hinta`)
        return
      }
      options.push({ ...option, price_delta_cents: cents })
    }
    setSaving(true)
    setError('')
    try {
      await api.saveOptionGroup(
        group.id,
        {
          name: draft.name.trim(),
          selection_type: draft.selection_type,
          min_selections: Number(draft.min_selections) || 0,
          max_selections: draft.max_selections === '' ? null : Number(draft.max_selections),
          free_selections: Number(draft.free_selections) || 0,
        },
        options,
        group.options.map((o) => o.id),
      )
      toast('Valintaryhmä tallennettu')
      setOpen(false)
      await onSaved()
    } catch (err) {
      console.error('Valintaryhmän tallennus epäonnistui', err)
      setError('Tallennus epäonnistui. Tarkista tiedot ja yritä uudelleen.')
    } finally {
      setSaving(false)
    }
  }

  const required = Number(group.min_selections) > 0

  if (!open) {
    return (
      <div className="pd-optgroup">
        <button type="button" className="pd-optgroup__summary" onClick={() => setOpen(true)}>
          <span>
            <strong>{group.name}</strong>
            <span className="pd-muted">
              {required ? 'Pakollinen' : 'Valinnainen'} · {group.selection_type === 'single' ? 'yksi valinta' : 'monivalinta'} ·{' '}
              {group.options.length} vaihtoehtoa
            </span>
          </span>
          <span className="pd-link">Muokkaa</span>
        </button>
        <p className="pd-optgroup__preview">
          {group.options.map((o) => `${o.name}${o.price_delta_cents ? ` +${formatPrice(o.price_delta_cents)}` : ''}`).join(' · ')}
        </p>
      </div>
    )
  }

  return (
    <div className="pd-optgroup is-open">
      <div className="pd-form-grid">
        <label className="pd-field pd-field--full">
          <span className="pd-field__label">Ryhmän nimi</span>
          <input className="pd-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </label>
        <label className="pd-field">
          <span className="pd-field__label">Valintatapa</span>
          <select
            className="pd-select"
            value={draft.selection_type}
            onChange={(e) => setDraft((d) => ({ ...d, selection_type: e.target.value }))}
          >
            <option value="single">Yksi vaihtoehto</option>
            <option value="multi">Useita vaihtoehtoja</option>
          </select>
        </label>
        <label className="pd-field">
          <span className="pd-field__label">Vähintään</span>
          <input className="pd-input" inputMode="numeric" value={draft.min_selections} onChange={(e) => setDraft((d) => ({ ...d, min_selections: e.target.value }))} />
        </label>
        <label className="pd-field">
          <span className="pd-field__label">Enintään</span>
          <input className="pd-input" inputMode="numeric" placeholder="Ei rajaa" value={draft.max_selections} onChange={(e) => setDraft((d) => ({ ...d, max_selections: e.target.value }))} />
        </label>
        <label className="pd-field">
          <span className="pd-field__label">Ilmaisia</span>
          <input className="pd-input" inputMode="numeric" value={draft.free_selections} onChange={(e) => setDraft((d) => ({ ...d, free_selections: e.target.value }))} />
        </label>
      </div>
      <p className="pd-muted">Vähintään 1 = asiakkaan on pakko valita. "Ilmaisia" = näin monta ensimmäistä valintaa on maksuttomia.</p>

      <div className="pd-options">
        {draft.options.map((option, index) => (
          <div key={option.id ?? `new-${index}`} className="pd-options__row">
            <input className="pd-input" placeholder="Vaihtoehto" value={option.name} onChange={(e) => setOption(index, 'name', e.target.value)} />
            <input className="pd-input pd-input--price" inputMode="decimal" placeholder="0,00" value={option.price} onChange={(e) => setOption(index, 'price', e.target.value)} />
            <label className="pd-options__default" title="Valittuna oletuksena">
              <Toggle
                checked={Boolean(option.is_default)}
                label="Oletus"
                onChange={(checked) =>
                  setDraft((d) => ({
                    ...d,
                    options: d.options.map((o, i) => ({
                      ...o,
                      is_default: i === index ? checked : d.selection_type === 'single' ? false : o.is_default,
                    })),
                  }))
                }
              />
              <span>Oletus</span>
            </label>
            <button
              type="button"
              className="pd-icon-btn"
              aria-label={`Poista ${option.name || 'vaihtoehto'}`}
              onClick={() => setDraft((d) => ({ ...d, options: d.options.filter((_, i) => i !== index) }))}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="pd-btn pd-btn--ghost pd-btn--sm"
          onClick={() => setDraft((d) => ({ ...d, options: [...d.options, { id: null, name: '', price: '0,00', is_default: false }] }))}
        >
          <Plus size={15} aria-hidden="true" /> Lisää vaihtoehto
        </button>
      </div>

      <ErrorNote>{error}</ErrorNote>
      <div className="pd-optgroup__actions">
        <button type="button" className="pd-btn pd-btn--ghost pd-btn--danger-text pd-btn--sm" onClick={onDelete}>
          Poista ryhmä
        </button>
        <span className="pd-spacer" />
        <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={() => { setDraft(toDraft(group)); setOpen(false); setError('') }}>
          Peruuta
        </button>
        <button type="button" className="pd-btn pd-btn--primary pd-btn--sm" onClick={save} disabled={saving}>
          {saving ? 'Tallennetaan...' : 'Tallenna ryhmä'}
        </button>
      </div>
    </div>
  )
}

export default function OptionGroups({ menuItemId }) {
  const api = useDashboardApi()
  const toast = useToast()
  const [groups, setGroups] = useState([])
  const [status, setStatus] = useState('loading')

  async function load() {
    try {
      setGroups(await api.fetchOptionGroups(menuItemId))
      setStatus('ready')
    } catch (error) {
      console.error('Valintaryhmien haku epäonnistui', error)
      setStatus('error')
    }
  }

  useEffect(() => {
    setStatus('loading')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItemId])

  async function addFromTemplate(template) {
    try {
      await api.createOptionGroup(
        menuItemId,
        {
          name: template.label,
          selection_type: template.selection_type,
          min_selections: template.min_selections,
          max_selections: template.max_selections,
          free_selections: template.free_selections,
        },
        template.options.map((o) => ({ name: o.name, price_delta_cents: euroInputToCents(o.price) ?? 0, is_default: o.is_default })),
        groups.length,
      )
      await load()
    } catch (error) {
      console.error('Valintaryhmän lisäys epäonnistui', error)
      toast('Ryhmän lisäys epäonnistui', 'error')
    }
  }

  async function addBlank() {
    try {
      await api.createOptionGroup(
        menuItemId,
        { name: 'Uusi valintaryhmä', selection_type: 'single', min_selections: 0, max_selections: 1, free_selections: 0 },
        [],
        groups.length,
      )
      await load()
    } catch (error) {
      console.error('Valintaryhmän lisäys epäonnistui', error)
      toast('Ryhmän lisäys epäonnistui', 'error')
    }
  }

  async function remove(groupId) {
    if (!window.confirm('Poistetaanko valintaryhmä vaihtoehtoineen?')) return
    try {
      await api.deleteOptionGroup(groupId)
      await load()
    } catch (error) {
      console.error('Valintaryhmän poisto epäonnistui', error)
      toast('Poisto epäonnistui', 'error')
    }
  }

  return (
    <div className="pd-optgroups">
      {status === 'loading' && <div className="pd-skeleton pd-skeleton--row" />}
      {status === 'error' && <ErrorNote>Valintaryhmiä ei voitu hakea.</ErrorNote>}
      {status === 'ready' && groups.length === 0 && (
        <p className="pd-muted">Ei valintoja. Lisää esimerkiksi koko tai lisätäytteet.</p>
      )}
      {groups.map((group) => (
        <GroupEditor key={group.id} group={group} onSaved={load} onDelete={() => remove(group.id)} />
      ))}
      <div className="pd-chips">
        {OPTION_GROUP_TEMPLATES.map((template) => (
          <button key={template.key} type="button" className="pd-chip" onClick={() => addFromTemplate(template)}>
            <Plus size={14} aria-hidden="true" /> {template.label}
          </button>
        ))}
        <button type="button" className="pd-chip" onClick={addBlank}>
          <Plus size={14} aria-hidden="true" /> Tyhjä ryhmä
        </button>
      </div>
    </div>
  )
}
