import { useMemo, useState } from 'react'
import { ImageOff, Percent, Plus, Search, UtensilsCrossed } from 'lucide-react'
import { INGREDIENT_TAG_GROUPS } from '../../lib/ingredientTags.js'
import { useDashboard } from '../context.js'
import { useMenu } from '../hooks.js'
import { Badge, Card, EmptyState, ErrorNote, Field, Modal, PageHeader, Segmented, Toggle } from '../ui.jsx'
import { euroInputToCents, formatPrice } from '../utils.js'
import ItemDrawer from './menu/ItemDrawer.jsx'

const DIET_TAGS = INGREDIENT_TAG_GROUPS.find((g) => g.label === 'Ruokavaliot')?.tags ?? []
const DIET_SHORT = { Gluteeniton: 'G', Laktoositon: 'L', Maidoton: 'M', Vegaaninen: 'VE', Kasvis: 'K', Pähkinätön: 'PÄ' }

const FILTERS = [
  { value: 'all', label: 'Kaikki' },
  { value: 'soldout', label: 'Loppuneet' },
  { value: 'noimage', label: 'Ilman kuvaa' },
]

function BulkPriceModal({ items, categories, onClose, onApply }) {
  const [category, setCategory] = useState('all')
  const [mode, setMode] = useState('percent')
  const [amount, setAmount] = useState('5')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const targets = items.filter((i) => category === 'all' || (i.category || 'Ruokalista') === category)
  const value = mode === 'percent' ? parseFloat(String(amount).replace(',', '.')) : euroInputToCents(amount)

  function newPrice(cents) {
    if (value == null || Number.isNaN(value)) return cents
    const next = mode === 'percent' ? Math.round(cents * (1 + value / 100)) : cents + value
    // Pyöristys lähimpään 10 senttiin, jottei hinnoista tule 12,97 €.
    return Math.max(Math.round(next / 10) * 10, 0)
  }

  async function apply() {
    if (value == null || Number.isNaN(value) || value === 0) {
      setError('Anna muutos, esim. 5 tai -10')
      return
    }
    setBusy(true)
    setError('')
    const failed = await onApply(targets.map((i) => ({ id: i.id, price_cents: newPrice(i.price_cents) })))
    setBusy(false)
    if (failed > 0) setError(`${failed} tuotteen päivitys epäonnistui. Yritä uudelleen.`)
    else onClose()
  }

  return (
    <Modal
      title="Muuta hintoja kerralla"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="pd-btn pd-btn--ghost" onClick={onClose}>
            Peruuta
          </button>
          <button type="button" className="pd-btn pd-btn--primary" onClick={apply} disabled={busy || targets.length === 0}>
            {busy ? 'Päivitetään...' : `Päivitä ${targets.length} tuotetta`}
          </button>
        </>
      }
    >
      <div className="pd-form-grid">
        <Field label="Kategoria" className="pd-field--full">
          <select className="pd-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Kaikki tuotteet</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Muutos" as="div">
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'percent', label: '%' },
              { value: 'euro', label: '€' },
            ]}
          />
        </Field>
        <Field label={mode === 'percent' ? 'Prosenttia (+/−)' : 'Euroa (+/−)'}>
          <input className="pd-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
      <ul className="pd-price-preview">
        {targets.slice(0, 5).map((i) => (
          <li key={i.id}>
            <span>{i.name}</span>
            <span className="pd-muted">{formatPrice(i.price_cents)}</span>
            <strong>{formatPrice(newPrice(i.price_cents))}</strong>
          </li>
        ))}
        {targets.length > 5 && <li className="pd-muted">+ {targets.length - 5} muuta</li>}
      </ul>
      <ErrorNote>{error}</ErrorNote>
    </Modal>
  )
}

export default function MenuView() {
  const { restaurant, toast } = useDashboard()
  const menu = useMenu(restaurant.id)
  const [category, setCategory] = useState('all')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [showBulk, setShowBulk] = useState(false)

  const categories = useMemo(
    () => [...new Set(menu.items.map((i) => i.category || 'Ruokalista'))].sort((a, b) => a.localeCompare(b, 'fi')),
    [menu.items],
  )

  const visibleItems = menu.items.filter((item) => {
    if (category !== 'all' && (item.category || 'Ruokalista') !== category) return false
    if (filter === 'soldout' && item.is_available !== false) return false
    if (filter === 'noimage' && item.image_url) return false
    const q = query.trim().toLowerCase()
    if (q && !`${item.name} ${item.description ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })

  const grouped = categories
    .map((c) => ({ category: c, items: visibleItems.filter((i) => (i.category || 'Ruokalista') === c) }))
    .filter((g) => g.items.length > 0)

  async function toggleAvailable(item) {
    const next = item.is_available === false
    const error = await menu.updateItem(item.id, { is_available: next })
    toast(error ? 'Päivitys epäonnistui' : `${item.name}: ${next ? 'saatavilla' : 'loppu'}`, error ? 'error' : 'default')
  }

  async function save(fields) {
    const error = editing === 'new' ? await menu.createItem(fields) : await menu.updateItem(editing.id, fields)
    if (!error) {
      toast(editing === 'new' ? 'Tuote lisätty ruokalistalle' : 'Muutokset tallennettu')
      setEditing(null)
    }
    return error
  }

  async function remove() {
    if (!window.confirm(`Poistetaanko "${editing.name}" ruokalistalta?`)) return
    const error = await menu.deleteItem(editing.id)
    if (error) toast('Poisto epäonnistui', 'error')
    else {
      toast('Tuote poistettu')
      setEditing(null)
    }
  }

  async function applyBulk(changes) {
    let failed = 0
    for (const change of changes) {
      const error = await menu.updateItem(change.id, { price_cents: change.price_cents })
      if (error) failed += 1
    }
    if (failed === 0) toast(`${changes.length} tuotteen hinta päivitetty`)
    return failed
  }

  const soldOutCount = menu.items.filter((i) => i.is_available === false).length

  return (
    <div className="pd-view">
      <PageHeader
        title="Ruokalista"
        description={`${menu.items.length} tuotetta · ${categories.length} kategoriaa${soldOutCount ? ` · ${soldOutCount} loppu` : ''}`}
        actions={
          <>
            <button type="button" className="pd-btn pd-btn--secondary" onClick={() => setShowBulk(true)} disabled={menu.items.length === 0}>
              <Percent size={16} aria-hidden="true" /> Muuta hintoja
            </button>
            <button type="button" className="pd-btn pd-btn--primary" onClick={() => setEditing('new')}>
              <Plus size={16} aria-hidden="true" /> Lisää tuote
            </button>
          </>
        }
      />

      <div className="pd-menu-layout">
        <nav className="pd-menu-cats" aria-label="Kategoriat">
          <button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>
            Kaikki <span>{menu.items.length}</span>
          </button>
          {categories.map((c) => (
            <button key={c} type="button" className={category === c ? 'is-active' : ''} onClick={() => setCategory(c)}>
              {c} <span>{menu.items.filter((i) => (i.category || 'Ruokalista') === c).length}</span>
            </button>
          ))}
        </nav>

        <div className="pd-menu-main">
          <div className="pd-filters">
            <label className="pd-search">
              <Search size={17} aria-hidden="true" />
              <input type="search" placeholder="Hae tuotetta" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <Segmented label="Suodatus" value={filter} onChange={setFilter} options={FILTERS} />
          </div>

          {menu.status === 'error' && <ErrorNote>Ruokalistaa ei voitu hakea. Tarkista yhteys.</ErrorNote>}
          {menu.status === 'loading' && <div className="pd-skeleton pd-skeleton--block" />}
          {menu.status === 'ready' && menu.items.length === 0 && (
            <Card>
              <EmptyState
                icon={UtensilsCrossed}
                title="Ruokalista on vielä tyhjä"
                text="Lisää ensimmäinen tuote - se näkyy asiakkaille heti."
                action={
                  <button type="button" className="pd-btn pd-btn--primary" onClick={() => setEditing('new')}>
                    <Plus size={16} aria-hidden="true" /> Lisää tuote
                  </button>
                }
              />
            </Card>
          )}
          {menu.status === 'ready' && menu.items.length > 0 && grouped.length === 0 && (
            <p className="pd-muted pd-pad">Ei tuotteita näillä ehdoilla.</p>
          )}

          {grouped.map((group) => (
            <Card key={group.category} title={group.category} subtitle={`${group.items.length} tuotetta`} padded={false}>
              <ul className="pd-items">
                {group.items.map((item) => {
                  const diets = (item.tags ?? []).filter((t) => DIET_TAGS.includes(t))
                  const available = item.is_available !== false
                  return (
                    <li key={item.id} className={`pd-item${available ? '' : ' is-soldout'}`}>
                      <button type="button" className="pd-item__main" onClick={() => setEditing(item)}>
                        <span className="pd-item__thumb">
                          {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <ImageOff size={18} strokeWidth={1.5} aria-hidden="true" />}
                        </span>
                        <span className="pd-item__text">
                          <strong>
                            {item.name}
                            {!available && <Badge tone="danger">Loppu</Badge>}
                          </strong>
                          <span>{item.description || 'Ei kuvausta'}</span>
                          {diets.length > 0 && (
                            <span className="pd-item__diets">
                              {diets.map((d) => (
                                <abbr key={d} title={d}>
                                  {DIET_SHORT[d] ?? d}
                                </abbr>
                              ))}
                            </span>
                          )}
                        </span>
                        <span className="pd-item__price">{formatPrice(item.price_cents)}</span>
                      </button>
                      <div className="pd-item__toggle">
                        <Toggle checked={available} label={`${item.name} saatavilla`} onChange={() => toggleAvailable(item)} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}

          <Card title="Aikarajatut ruokalistat" subtitle="Näytä osa tuotteista vain tiettyinä aikoina" demo>
            <ul className="pd-list">
              <li>
                <span>
                  <strong>Lounas</strong>
                  <span className="pd-muted">Ma–Pe 10.30–14.00 · 6 tuotetta</span>
                </span>
                <Badge tone="success">Käytössä</Badge>
              </li>
              <li>
                <span>
                  <strong>Aamiainen</strong>
                  <span className="pd-muted">La–Su 9.00–11.30 · 4 tuotetta</span>
                </span>
                <Badge tone="neutral">Pois päältä</Badge>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {editing && (
        <ItemDrawer
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? null : editing}
          categories={categories}
          defaultCategory={category === 'all' ? categories[0] : category}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}

      {showBulk && (
        <BulkPriceModal items={menu.items} categories={categories} onClose={() => setShowBulk(false)} onApply={applyBulk} />
      )}
    </div>
  )
}
