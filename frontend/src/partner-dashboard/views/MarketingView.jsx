import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Plus, Rocket } from 'lucide-react'
import { DEMO_CAMPAIGNS } from '../demo.js'
import { useDashboard } from '../context.js'
import { useMenu } from '../hooks.js'
import { Badge, Card, Drawer, EmptyState, ErrorNote, Field, PageHeader, Segmented, Stat } from '../ui.jsx'
import { euroInputToCents, formatDate, formatPrice, planForCommission } from '../utils.js'

const TYPES = [
  { value: 'percent', label: 'Prosenttialennus' },
  { value: 'fixed', label: 'Euroalennus' },
  { value: 'free_delivery', label: 'Ilmainen kuljetus' },
  { value: 'code', label: 'Alennuskoodi' },
]

const STATUS = {
  active: { label: 'Käynnissä', tone: 'success' },
  scheduled: { label: 'Ajastettu', tone: 'info' },
  paused: { label: 'Keskeytetty', tone: 'warning' },
  ended: { label: 'Päättynyt', tone: 'neutral' },
}

function describe(c) {
  if (c.type === 'percent') return `−${c.value} %`
  if (c.type === 'fixed') return `−${formatPrice(c.value)}`
  if (c.type === 'code') return `Koodi ${c.code} −${c.value} %`
  return 'Ilmainen kuljetus'
}

function NewCampaignDrawer({ categories, onClose, onCreate }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ name: '', type: 'percent', value: '20', target: 'Kaikki tuotteet', starts: today, ends: '', code: '' })
  const [error, setError] = useState('')
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  function submit() {
    if (!form.name.trim()) return setError('Anna kampanjalle nimi')
    if (!form.ends || form.ends < form.starts) return setError('Valitse päättymispäivä aloituksen jälkeen')
    if (form.type === 'code' && !/^[A-Z0-9]{4,16}$/.test(form.code)) return setError('Koodissa 4-16 merkkiä (A-Z, 0-9)')
    const value = form.type === 'fixed' ? euroInputToCents(form.value) : Number(form.value)
    if (form.type !== 'free_delivery' && (!value || value <= 0)) return setError('Anna alennuksen suuruus')
    const starts = new Date(form.starts).toISOString()
    onCreate({
      id: `c${Date.now()}`,
      name: form.name.trim(),
      type: form.type,
      value: value ?? 0,
      code: form.code,
      target: form.target,
      status: form.starts > today ? 'scheduled' : 'active',
      starts,
      ends: new Date(form.ends).toISOString(),
      orders: 0,
      salesCents: 0,
    })
  }

  return (
    <Drawer
      title="Uusi kampanja"
      subtitle="Kampanja näkyy asiakkaille ravintolakortissa ja ravintolan sivulla"
      onClose={onClose}
      footer={
        <>
          <span className="pd-spacer" />
          <button type="button" className="pd-btn pd-btn--ghost" onClick={onClose}>
            Peruuta
          </button>
          <button type="button" className="pd-btn pd-btn--primary" onClick={submit}>
            Luo kampanja
          </button>
        </>
      }
    >
      <div className="pd-form-grid">
        <Field label="Nimi" className="pd-field--full">
          <input className="pd-input" placeholder="Esim. Arki-illan tarjous" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Tyyppi" className="pd-field--full" as="div">
          <Segmented size="sm" value={form.type} onChange={(v) => set('type', v)} options={TYPES} label="Kampanjan tyyppi" />
        </Field>
        {form.type !== 'free_delivery' && (
          <Field label={form.type === 'fixed' ? 'Alennus (€)' : 'Alennus (%)'}>
            <input className="pd-input" inputMode="decimal" value={form.value} onChange={(e) => set('value', e.target.value)} />
          </Field>
        )}
        {form.type === 'code' && (
          <Field label="Koodi" hint="Asiakas syöttää tämän kassalla">
            <input className="pd-input" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="TALLI20" />
          </Field>
        )}
        <Field label="Kohde" className="pd-field--full">
          <select className="pd-select" value={form.target} onChange={(e) => set('target', e.target.value)}>
            <option>Kaikki tuotteet</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Alkaa">
          <input type="date" className="pd-input" value={form.starts} onChange={(e) => set('starts', e.target.value)} />
        </Field>
        <Field label="Päättyy">
          <input type="date" className="pd-input" value={form.ends} onChange={(e) => set('ends', e.target.value)} />
        </Field>
      </div>
      <p className="pd-muted">delivo ei ota alennuksesta erillistä maksua - välityspalkkio lasketaan alennetusta hinnasta.</p>
      <ErrorNote>{error}</ErrorNote>
    </Drawer>
  )
}

export default function MarketingView() {
  const { restaurant, basePath, toast } = useDashboard()
  const menu = useMenu(restaurant.id)
  const [campaigns, setCampaigns] = useState(DEMO_CAMPAIGNS)
  const [creating, setCreating] = useState(false)
  const plan = planForCommission(restaurant.commission_rate_percent)
  const categories = [...new Set(menu.items.map((i) => i.category || 'Ruokalista'))]

  const running = campaigns.filter((c) => c.status === 'active')
  const orders = campaigns.reduce((s, c) => s + c.orders, 0)
  const sales = campaigns.reduce((s, c) => s + c.salesCents, 0)

  function setStatus(id, status) {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
  }

  return (
    <div className="pd-view">
      <PageHeader
        title="Markkinointi"
        description="Tarjoukset tuovat uusia asiakkaita ja täyttävät hiljaiset tunnit."
        actions={
          <button type="button" className="pd-btn pd-btn--primary" onClick={() => setCreating(true)}>
            <Plus size={16} aria-hidden="true" /> Uusi kampanja
          </button>
        }
      />

      <div className="pd-summary">
        <Stat label="Käynnissä olevat" value={running.length} />
        <Stat label="Tilauksia kampanjoista" value={orders} />
        <Stat label="Myynti kampanjoista" value={formatPrice(sales)} />
      </div>

      <div className="pd-two-col pd-two-col--narrow-right">
        <Card title="Kampanjat" demo padded={false}>
          {campaigns.length === 0 ? (
            <EmptyState icon={Megaphone} title="Ei kampanjoita" text="Luo ensimmäinen tarjous." />
          ) : (
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Kampanja</th>
                    <th>Voimassa</th>
                    <th>Tila</th>
                    <th className="pd-num">Tilaukset</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <span className="pd-cell-sub">
                          {describe(c)} · {c.target}
                        </span>
                      </td>
                      <td>
                        {formatDate(c.starts)} – {formatDate(c.ends)}
                      </td>
                      <td>
                        <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                      </td>
                      <td className="pd-num">
                        {c.orders}
                        <span className="pd-cell-sub">{formatPrice(c.salesCents)}</span>
                      </td>
                      <td className="pd-num">
                        {c.status === 'active' && (
                          <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={() => setStatus(c.id, 'paused')}>
                            Keskeytä
                          </button>
                        )}
                        {c.status === 'paused' && (
                          <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={() => setStatus(c.id, 'active')}>
                            Jatka
                          </button>
                        )}
                        {c.status === 'scheduled' && (
                          <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={() => setCampaigns((prev) => prev.filter((x) => x.id !== c.id))}>
                            Poista
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="pd-boost">
          <span className="pd-boost__icon">
            <Rocket size={22} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h2>Nostettu näkyvyys</h2>
          {plan.key === 'pro' || plan.key === 'business' ? (
            <>
              <p>Ravintolasi näkyy korkeammalla etusivulla ja hakutuloksissa {plan.name}-paketin ansiosta.</p>
              <Badge tone="success">Käytössä</Badge>
            </>
          ) : (
            <>
              <p>Pro-paketissa ravintolasi näkyy korkeammalla etusivulla ja haussa - ja välityspalkkio laskee 10 %:iin.</p>
              <Link to={`${basePath}/talous`} className="pd-btn pd-btn--secondary">
                Katso paketit
              </Link>
            </>
          )}
        </Card>
      </div>

      {creating && (
        <NewCampaignDrawer
          categories={categories}
          onClose={() => setCreating(false)}
          onCreate={(campaign) => {
            setCampaigns((prev) => [campaign, ...prev])
            setCreating(false)
            toast('Kampanja luotu')
          }}
        />
      )}
    </div>
  )
}
