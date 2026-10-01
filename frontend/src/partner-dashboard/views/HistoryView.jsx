import { useMemo, useState } from 'react'
import { Download, Search, SearchX } from 'lucide-react'
import { orderStatusLabel } from '../../lib/orderStatus.js'
import { useDashboard } from '../context.js'
import OrderDetail, { STATUS_TONE } from '../OrderDetail.jsx'
import { Badge, Card, EmptyState, PageHeader, Segmented, Stat } from '../ui.jsx'
import {
  ACTIVE_STATUSES,
  daysAgo,
  formatDateTime,
  formatPrice,
  itemCount,
  restaurantShareCents,
  startOfDay,
  sumSales,
} from '../utils.js'

const RANGES = [
  { value: 'today', label: 'Tänään' },
  { value: '7', label: '7 pv' },
  { value: '30', label: '30 pv' },
  { value: 'all', label: 'Kaikki' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'Kaikki tilat' },
  { value: 'completed', label: 'Valmiit' },
  { value: 'active', label: 'Käynnissä' },
  { value: 'cancelled', label: 'Hylätyt ja perutut' },
]

const PAGE_SIZE = 25

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const euros = (cents) => ((cents ?? 0) / 100).toFixed(2).replace('.', ',')

export default function HistoryView() {
  const { ordersState, restaurant } = useDashboard()
  const { orders, status } = ordersState
  const [range, setRange] = useState('7')
  const [statusFilter, setStatusFilter] = useState('all')
  const [method, setMethod] = useState('all')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState(null)

  const filtered = useMemo(() => {
    const from = range === 'all' ? null : range === 'today' ? startOfDay() : daysAgo(Number(range) - 1)
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (from && new Date(o.created_at) < from) return false
      if (statusFilter === 'completed' && o.status !== 'completed') return false
      if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false
      if (statusFilter === 'active' && !ACTIVE_STATUSES.includes(o.status)) return false
      if (method !== 'all' && o.delivery_method !== method) return false
      if (q) {
        const haystack = [o.order_number, o.delivery_name, o.delivery_phone].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [orders, range, statusFilter, method, query])

  const valid = filtered.filter((o) => o.status !== 'cancelled')
  const sales = sumSales(valid)
  const selected = orders.find((o) => o.id === selectedId) ?? null

  function exportCsv() {
    const header = ['Tilaus', 'Aika', 'Tila', 'Tapa', 'Asiakas', 'Tuotteita', 'Tuotteet €', 'Alennus €', 'Ravintolalle €', 'Asiakas maksoi €']
    const rows = filtered.map((o) => [
      o.order_number,
      formatDateTime(o.created_at),
      orderStatusLabel(o.status, o.delivery_method),
      o.delivery_method === 'delivery' ? 'Kotiinkuljetus' : 'Nouto',
      o.delivery_name,
      itemCount(o),
      euros(o.subtotal_cents),
      euros(o.discount_cents),
      euros(restaurantShareCents(o)),
      euros(o.total_cents),
    ])
    downloadCsv(`${restaurant.name}-tilaukset-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
  }

  return (
    <div className="pd-view">
      <PageHeader
        title="Historia"
        description="Kaikki tilaukset haettavissa ja ladattavissa kirjanpitoa varten."
        actions={
          <button type="button" className="pd-btn pd-btn--secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} aria-hidden="true" /> Lataa CSV
          </button>
        }
      />

      <div className="pd-filters">
        <label className="pd-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Hae tilausnumerolla, nimellä tai puhelimella"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setVisible(PAGE_SIZE)
            }}
          />
        </label>
        <Segmented label="Aikaväli" value={range} onChange={(v) => { setRange(v); setVisible(PAGE_SIZE) }} options={RANGES} />
        <select className="pd-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Tila">
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select className="pd-select" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Toimitustapa">
          <option value="all">Nouto ja kuljetus</option>
          <option value="delivery">Kotiinkuljetus</option>
          <option value="pickup">Nouto</option>
        </select>
      </div>

      <div className="pd-summary">
        <Stat label="Tilauksia" value={filtered.length} />
        <Stat label="Myynti (ravintolalle)" value={formatPrice(sales)} />
        <Stat label="Keskiostos" value={formatPrice(valid.length ? Math.round(sales / valid.length) : 0)} />
        <Stat label="Hylätyt ja perutut" value={filtered.length - valid.length} />
      </div>

      <Card padded={false}>
        {status === 'ready' && filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="Ei tilauksia näillä ehdoilla" text="Kokeile pidempää aikaväliä tai tyhjennä haku." />
        ) : (
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Tilaus</th>
                  <th>Aika</th>
                  <th>Asiakas</th>
                  <th>Tapa</th>
                  <th>Tila</th>
                  <th className="pd-num">Ravintolalle</th>
                </tr>
              </thead>
              <tbody>
                {status === 'loading' &&
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <div className="pd-skeleton pd-skeleton--line" />
                      </td>
                    </tr>
                  ))}
                {filtered.slice(0, visible).map((o) => (
                  <tr key={o.id} className="pd-table__row" tabIndex={0} onClick={() => setSelectedId(o.id)} onKeyDown={(e) => e.key === 'Enter' && setSelectedId(o.id)}>
                    <td className="pd-strong">{o.order_number}</td>
                    <td>{formatDateTime(o.created_at)}</td>
                    <td>{o.delivery_name || '-'}</td>
                    <td>{o.delivery_method === 'delivery' ? 'Kuljetus' : 'Nouto'}</td>
                    <td>
                      <Badge tone={STATUS_TONE[o.status]}>{orderStatusLabel(o.status, o.delivery_method)}</Badge>
                    </td>
                    <td className="pd-num">{formatPrice(restaurantShareCents(o))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > visible && (
          <div className="pd-table-more">
            <button type="button" className="pd-btn pd-btn--ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Näytä lisää ({filtered.length - visible})
            </button>
          </div>
        )}
      </Card>

      <p className="pd-footnote">Näkymä kattaa viimeisimmät 500 tilausta.</p>

      {selected && <OrderDetail order={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
