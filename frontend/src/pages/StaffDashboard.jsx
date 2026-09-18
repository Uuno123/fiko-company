import { Fragment, useEffect, useMemo, useState } from 'react'
import StaffHeader from '../components/StaffHeader.jsx'
import { useStaffAuth } from '../lib/StaffAuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { formatPrice } from '../lib/format.js'
import { orderStatusLabel } from '../lib/orderStatus.js'
import './StaffCommon.css'
import './StaffDashboard.css'

// --- Muotoilu- ja aikahelperit -------------------------------------------------------------
// Pieni tarkoituksellinen kopio PartnerDashboard.jsx:n vastaavista funktioista (eri istunto
// muokkaa sitä tiedostoa aktiivisesti rinnalla) - sama malli kuin PartnerDashboard.jsx:ssä on jo
// muutamassa kohtaa perusteltu: erillinen pieni funktio on turvallisempi kuin jaettu riippuvuus
// tiedostoon jota ei omista.

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

function ordersInRange(orders, start, end) {
  return orders.filter((o) => {
    const created = new Date(o.created_at)
    return created >= start && created < end
  })
}

function restaurantShareCents(order) {
  return order.subtotal_cents - order.discount_cents
}

function sumCents(orders, field = 'total_cents') {
  return orders.reduce((sum, o) => sum + (o[field] ?? 0), 0)
}

function commissionCents(order, restaurantsById) {
  const restaurant = restaurantsById.get(order.restaurant_id)
  const rate = restaurant?.commission_rate_percent ?? 15
  return Math.round((restaurantShareCents(order) * rate) / 100)
}

// Fikon arvioitu tulo per tilaus: ravintolan komissio-osuus + toimitus-/palvelumaksut. Nämä
// jälkimmäiset eivät ole puhdasta katetta (osa menisi oikeassa kuljetusjärjestelmässä kuskille),
// mutta Fikolla ei ole (vielä) oikeaa kuskien maksujärjestelmää - ks. driver_applications (0027).
function fikoRevenueCents(order, restaurantsById) {
  return commissionCents(order, restaurantsById) + order.delivery_fee_cents + order.service_fee_cents
}

const VEHICLE_TYPE_LABELS = {
  polkupyora: 'Polkupyörä',
  sahkopyora: 'Sähköpyörä',
  mopo: 'Mopo',
  auto: 'Auto',
}

const APPLICATION_STATUS_LABELS = {
  pending: 'Odottaa',
  approved: 'Hyväksytty',
  rejected: 'Hylätty',
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

// --- Pienet kaaviokomponentit ---------------------------------------------------------------

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

function computeAxisTicks(maxValue) {
  if (maxValue <= 0) return [1, 0]
  const step = niceAxisStep(maxValue / 4)
  const count = Math.max(1, Math.ceil(maxValue / step))
  const ticks = []
  for (let i = count; i >= 0; i--) ticks.push(step * i)
  return ticks
}

function VerticalBarChart({ items, formatValue, maxLabels, axisUnit = '€', axisScale = 100 }) {
  const dataMax = Math.max(1, ...items.map((i) => i.value))
  const labelStep = maxLabels && items.length > maxLabels ? Math.ceil(items.length / maxLabels) : 1
  const axisTicks = computeAxisTicks(dataMax / axisScale)
  const max = axisTicks[0] * axisScale

  return (
    <div className="staff-chart-wrap">
      <div className="staff-chart-axis">
        {axisTicks.map((tick) => (
          <span key={tick} className="staff-chart-axis__tick">
            {tick}
            {axisUnit ? <span className="staff-chart-axis__unit"> {axisUnit}</span> : null}
          </span>
        ))}
      </div>
      <div className="staff-chart">
        {items.map((item, i) => (
          <div className="staff-chart__col" key={`${item.label}-${i}`}>
            <div className="staff-chart__track">
              <div
                className="staff-chart__bar"
                style={{ height: `${Math.max(2, (item.value / max) * 100)}%` }}
                title={formatValue ? formatValue(item.value) : String(item.value)}
              />
            </div>
            <span className="staff-chart__label">{i % labelStep === 0 ? item.label : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HorizontalBarList({ items, formatValue }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (items.length === 0) return <p className="staff-hint">Ei vielä dataa.</p>
  return (
    <div className="staff-hbar-list">
      {items.map((item) => (
        <div className="staff-hbar-list__row" key={item.label}>
          <div className="staff-hbar-list__top">
            <span className="staff-hbar-list__label">{item.label}</span>
            <span className="staff-hbar-list__value">{formatValue ? formatValue(item.value) : item.value}</span>
          </div>
          <div className="staff-hbar-list__track">
            <div className="staff-hbar-list__fill" style={{ width: `${Math.min(94, Math.max(2, (item.value / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CollapsibleSection({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="staff-collapsible">
      <button type="button" className="staff-collapsible__header" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="staff-collapsible__heading">
          <span className="staff-collapsible__title">{title}</span>
          {subtitle && <span className="staff-collapsible__subtitle">{subtitle}</span>}
        </span>
        <span className={`staff-collapsible__chevron${open ? ' staff-collapsible__chevron--open' : ''}`}>
          <ChevronIcon />
        </span>
      </button>
      {open && <div className="staff-collapsible__body">{children}</div>}
    </div>
  )
}

// --- Ikonit ----------------------------------------------------------------------------------

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function OverviewIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 9.5 10 4l6.5 5.5M5.5 8v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 12h3l1.5 2h3l1.5-2h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6M4 12v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function HandshakeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2.5 8.5 6 6l3 2.2L12 6l3.5 2.5M2.5 8.5 6.5 14a1.4 1.4 0 0 0 2 .2l.4-.35a1.2 1.2 0 0 1 1.6 0l.3.28a1.4 1.4 0 0 0 2 0l.3-.3a1.2 1.2 0 0 1 1.6-.05l.2.18a1.3 1.3 0 0 0 1.9-.2L17.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BikeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="5" cy="14.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="15" cy="14.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 14.5 8 8h5l2 6.5M8 8 7 5.5H5.5M8 8l2.5 3.5h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 8.5 3.8 4h12.4l.8 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.3 8.5a1.8 1.8 0 0 0 3.5.5 1.8 1.8 0 0 0 3.5 0 1.8 1.8 0 0 0 3.5 0 1.8 1.8 0 0 0 3.5-.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 9v6.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16.5V13a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

const TABS = [
  { id: 'yleiskatsaus', label: 'Yleiskatsaus', icon: OverviewIcon },
  { id: 'tilaukset', label: 'Tilaukset', icon: OrdersIcon },
  { id: 'tilastot', label: 'Tilastot', icon: ChartIcon },
  { id: 'kumppanuushakemukset', label: 'Kumppanuushakemukset', icon: HandshakeIcon },
  { id: 'kuljettajat', label: 'Kuljettajat', icon: BikeIcon },
  { id: 'ravintolat', label: 'Ravintolat', icon: StoreIcon },
]

function StaffSidebar({ activeTab, onTabChange, badges }) {
  return (
    <nav className="staff-sidebar">
      <div className="staff-sidebar__tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const badge = badges[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              className={`staff-sidebar__tab${activeTab === tab.id ? ' staff-sidebar__tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
            >
              <Icon />
              <span className="staff-sidebar__tab-label">{tab.label}</span>
              {badge > 0 && <span className="staff-sidebar__tab-badge">{badge}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// --- Data-haku ---------------------------------------------------------------------------

const ORDERS_SELECT = '*, order_items(*), restaurants(id, name, city, category)'

function useStaffData() {
  const [restaurants, setRestaurants] = useState([])
  const [orders, setOrders] = useState([])
  const [partnerApplications, setPartnerApplications] = useState([])
  const [driverApplications, setDriverApplications] = useState([])
  const [status, setStatus] = useState('loading')

  async function reloadPartnerApplications() {
    const { data } = await supabase.from('partner_applications').select('*').order('created_at', { ascending: false })
    setPartnerApplications(data ?? [])
  }

  async function reloadDriverApplications() {
    const { data } = await supabase.from('driver_applications').select('*').order('created_at', { ascending: false })
    setDriverApplications(data ?? [])
  }

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setStatus('loading')
      const [restaurantsRes, ordersRes, partnerRes, driverRes] = await Promise.all([
        supabase.from('restaurants').select('*').order('name', { ascending: true }),
        supabase.from('orders').select(ORDERS_SELECT).order('created_at', { ascending: false }).limit(500),
        supabase.from('partner_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('driver_applications').select('*').order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      if (restaurantsRes.error || ordersRes.error || partnerRes.error || driverRes.error) {
        setStatus('error')
        return
      }
      setRestaurants(restaurantsRes.data ?? [])
      setOrders(ordersRes.data ?? [])
      setPartnerApplications(partnerRes.data ?? [])
      setDriverApplications(driverRes.data ?? [])
      setStatus('ready')
    }

    loadAll()

    // Kaikkien ravintoloiden tilaukset (ei restaurant_id-filtteriä, toisin kuin
    // PartnerDashboard.jsx:n omalla kanavalla) - is_staff()-RLS-politiikka (0030) rajaa
    // Supabase Realtimen lähettämät rivit joka tapauksessa vain henkilökunnalle näkyviin.
    const ordersChannel = supabase
      .channel('staff-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const { data } = await supabase.from('orders').select(ORDERS_SELECT).eq('id', payload.new.id).single()
        if (cancelled || !data) return
        setOrders((prev) => (prev.some((o) => o.id === data.id) ? prev : [data, ...prev]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o)))
      })
      .subscribe()

    const applicationsChannel = supabase
      .channel('staff-applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_applications' }, () => {
        if (!cancelled) reloadPartnerApplications()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_applications' }, () => {
        if (!cancelled) reloadDriverApplications()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(applicationsChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateApplicationStatus(table, id, nextStatus, setLocal) {
    const { error } = await supabase.from(table).update({ status: nextStatus }).eq('id', id)
    if (!error) {
      setLocal((prev) => prev.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)))
    }
    return error
  }

  async function setPartnerApplicationStatus(id, nextStatus) {
    return updateApplicationStatus('partner_applications', id, nextStatus, setPartnerApplications)
  }

  async function setDriverApplicationStatus(id, nextStatus) {
    return updateApplicationStatus('driver_applications', id, nextStatus, setDriverApplications)
  }

  async function toggleRestaurantOpen(restaurant) {
    const { error } = await supabase.from('restaurants').update({ is_open: !restaurant.is_open }).eq('id', restaurant.id)
    if (!error) {
      setRestaurants((prev) => prev.map((r) => (r.id === restaurant.id ? { ...r, is_open: !restaurant.is_open } : r)))
    }
    return error
  }

  async function updateCommissionRate(restaurant, rate) {
    const { error } = await supabase.from('restaurants').update({ commission_rate_percent: rate }).eq('id', restaurant.id)
    if (!error) {
      setRestaurants((prev) => prev.map((r) => (r.id === restaurant.id ? { ...r, commission_rate_percent: rate } : r)))
    }
    return error
  }

  return {
    restaurants,
    orders,
    partnerApplications,
    driverApplications,
    status,
    setPartnerApplicationStatus,
    setDriverApplicationStatus,
    toggleRestaurantOpen,
    updateCommissionRate,
  }
}

// --- Yleiskatsaus ------------------------------------------------------------------------

function StatCard({ label, value, hint, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} className={`staff-stat-card${onClick ? ' staff-stat-card--clickable' : ''}`} onClick={onClick}>
      <span className="staff-stat-card__label">{label}</span>
      <strong className="staff-stat-card__value">{value}</strong>
      {hint && <span className="staff-stat-card__hint">{hint}</span>}
    </Tag>
  )
}

const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

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
    if (bucket) bucket.value += order.total_cents
  }
  return buckets.map((b) => ({ label: b.date.toLocaleDateString('fi-FI', { day: '2-digit', month: '2-digit' }), value: b.value }))
}

function computeTopRestaurants(completedOrders, restaurantsById, limit = 6) {
  const totals = new Map()
  for (const order of completedOrders) {
    const restaurant = restaurantsById.get(order.restaurant_id)
    const name = restaurant?.name ?? order.restaurants?.name ?? 'Tuntematon ravintola'
    totals.set(name, (totals.get(name) ?? 0) + order.total_cents)
  }
  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function OverviewSection({ orders, restaurants, partnerApplications, driverApplications, onNavigate }) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const completed = orders.filter((o) => o.status === 'completed')
  const restaurantsById = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants])

  const ordersToday = ordersInRange(orders, todayStart, now).filter((o) => o.status !== 'cancelled')
  const revenueToday = sumCents(ordersInRange(completed, todayStart, now))
  const activeOrders = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status))
  const openRestaurants = restaurants.filter((r) => r.is_open).length
  const pendingPartnerApps = partnerApplications.filter((a) => a.status === 'pending').length
  const pendingDriverApps = driverApplications.filter((a) => a.status === 'pending').length

  const dailyRevenue = computeDailyRevenue(completed, 14)
  const topRestaurants = computeTopRestaurants(completed, restaurantsById)

  return (
    <div className="staff-card">
      <h2>Yleiskatsaus</h2>
      <p className="staff-hint">Koko alustan tilanne juuri nyt - kaikki ravintolat yhdessä näkymässä.</p>

      <div className="staff-stat-grid">
        <StatCard label="Tilauksia tänään" value={ordersToday.length} />
        <StatCard label="Liikevaihto tänään" value={formatPrice(revenueToday)} hint="Valmiit tilaukset" />
        <StatCard label="Aktiivisia tilauksia" value={activeOrders.length} hint="Ei vielä valmis/peruttu" onClick={() => onNavigate('tilaukset')} />
        <StatCard label="Avoimia ravintoloita" value={`${openRestaurants} / ${restaurants.length}`} onClick={() => onNavigate('ravintolat')} />
        <StatCard
          label="Uusia kumppanuushakemuksia"
          value={pendingPartnerApps}
          onClick={() => onNavigate('kumppanuushakemukset')}
        />
        <StatCard label="Uusia kuljettajahakemuksia" value={pendingDriverApps} onClick={() => onNavigate('kuljettajat')} />
      </div>

      <div className="staff-overview-grid">
        <div className="staff-chart-block">
          <h3>Liikevaihto viimeiseltä 14 päivältä</h3>
          <VerticalBarChart items={dailyRevenue} formatValue={formatPrice} />
        </div>

        <div className="staff-chart-block">
          <h3>Parhaiten myyvät ravintolat</h3>
          <HorizontalBarList items={topRestaurants} formatValue={formatPrice} />
        </div>
      </div>
    </div>
  )
}

// --- Tilaukset -----------------------------------------------------------------------------

const ORDER_STATUS_OPTIONS = [
  { value: 'all', label: 'Kaikki tilat' },
  { value: 'pending', label: 'Odottaa vahvistusta' },
  { value: 'confirmed', label: 'Hyväksytty' },
  { value: 'preparing', label: 'Valmistuu' },
  { value: 'ready', label: 'Valmis/matkalla' },
  { value: 'completed', label: 'Noudettu' },
  { value: 'cancelled', label: 'Peruttu' },
]

function OrderDetailRow({ order }) {
  return (
    <tr className="staff-table__detail-row">
      <td colSpan={9}>
        <div className="staff-order-detail">
          <div className="staff-order-detail__col">
            <span className="staff-order-detail__label">Toimitustiedot</span>
            <span>{order.delivery_name} · {order.delivery_phone}</span>
            {order.delivery_method === 'delivery' && order.delivery_address && <span>{order.delivery_address}</span>}
            {order.delivery_notes && <span className="staff-order-detail__notes">{order.delivery_notes}</span>}
            {order.promo_code && <span>Koodi: {order.promo_code}</span>}
          </div>
          <div className="staff-order-detail__col">
            <span className="staff-order-detail__label">Rivit</span>
            <ul className="staff-order-detail__lines">
              {order.order_items.map((line) => (
                <li key={line.id}>
                  <span>
                    {line.quantity} × {line.name}
                    {line.selected_options?.length > 0 && (
                      <span className="staff-order-detail__notes"> ({line.selected_options.map((o) => o.name).join(', ')})</span>
                    )}
                  </span>
                  <span>{formatPrice((line.unit_price_cents ?? line.price_cents) * line.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="staff-order-detail__col">
            <span className="staff-order-detail__label">Summat</span>
            <span>Väliosa: {formatPrice(order.subtotal_cents)}</span>
            <span>Rahti: {order.delivery_fee_cents > 0 ? formatPrice(order.delivery_fee_cents) : '–'}</span>
            <span>Palvelumaksu: {order.service_fee_cents > 0 ? formatPrice(order.service_fee_cents) : '–'}</span>
            {order.discount_cents > 0 && <span>Alennus: −{formatPrice(order.discount_cents)}</span>}
            <span>Yhteensä: {formatPrice(order.total_cents)}</span>
          </div>
        </div>
      </td>
    </tr>
  )
}

function OrdersSection({ orders, restaurants }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [restaurantFilter, setRestaurantFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (restaurantFilter !== 'all' && o.restaurant_id !== restaurantFilter) return false
    if (methodFilter !== 'all' && o.delivery_method !== methodFilter) return false
    if (search.trim()) {
      const needle = search.trim().toLowerCase()
      const haystack = `${o.order_number} ${o.delivery_name}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })

  function handleExport() {
    const rows = [
      ['Aika', 'Tilaus', 'Ravintola', 'Asiakas', 'Tapa', 'Tila', 'Rahti (€)', 'Yhteensä (€)'],
      ...filtered.map((o) => [
        formatDateTime(o.created_at),
        o.order_number,
        o.restaurants?.name ?? '',
        o.delivery_name,
        o.delivery_method === 'delivery' ? 'Kotiinkuljetus' : 'Nouto',
        orderStatusLabel(o.status, o.delivery_method),
        (o.delivery_fee_cents / 100).toFixed(2),
        (o.total_cents / 100).toFixed(2),
      ]),
    ]
    downloadCsv('fiko-tilaukset.csv', rows)
  }

  return (
    <div className="staff-card">
      <h2>Tilaukset</h2>
      <p className="staff-hint">Kaikki alustan tilaukset reaaliaikaisesti, kaikista ravintoloista.</p>

      <div className="staff-filter-row">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {ORDER_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select value={restaurantFilter} onChange={(e) => setRestaurantFilter(e.target.value)}>
          <option value="all">Kaikki ravintolat</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="all">Nouto ja kotiinkuljetus</option>
          <option value="pickup">Vain nouto</option>
          <option value="delivery">Vain kotiinkuljetus</option>
        </select>

        <input
          type="search"
          placeholder="Hae tilausnumerolla tai nimellä..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="staff-filter-row__search"
        />

        <button type="button" className="staff-btn staff-btn--ghost staff-btn--small" onClick={handleExport}>
          Vie CSV:nä
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="staff-state-message">Ei tilauksia valituilla suodattimilla.</p>
      ) : (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Aika</th>
                <th>Tilaus</th>
                <th>Ravintola</th>
                <th>Asiakas</th>
                <th>Tapa</th>
                <th>Tila</th>
                <th>Rahti</th>
                <th>Yhteensä</th>
                <th>Valmis arviolta</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <Fragment key={order.id}>
                  <tr
                    className="staff-table__row-clickable"
                    onClick={() => setExpandedId((id) => (id === order.id ? null : order.id))}
                  >
                    <td>{formatDateTime(order.created_at)}</td>
                    <td>{order.order_number}</td>
                    <td>{order.restaurants?.name ?? '–'}</td>
                    <td>{order.delivery_name}</td>
                    <td>
                      <span className={`staff-method-badge staff-method-badge--${order.delivery_method}`}>
                        {order.delivery_method === 'delivery' ? 'Kotiinkuljetus' : 'Nouto'}
                      </span>
                    </td>
                    <td>
                      <span className={`staff-status-badge staff-status-badge--${order.status}`}>
                        {orderStatusLabel(order.status, order.delivery_method)}
                      </span>
                    </td>
                    <td>{order.delivery_fee_cents > 0 ? formatPrice(order.delivery_fee_cents) : '–'}</td>
                    <td>{formatPrice(order.total_cents)}</td>
                    <td>{order.estimated_ready_at ? formatTime(order.estimated_ready_at) : '–'}</td>
                  </tr>
                  {expandedId === order.id && <OrderDetailRow order={order} />}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Tilastot --------------------------------------------------------------------------------

const WEEKDAY_SHORT_LABELS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']

function computeBusiestWeekdays(orders) {
  const counts = new Array(7).fill(0)
  for (const order of orders) {
    const day = (new Date(order.created_at).getDay() + 6) % 7
    counts[day] += 1
  }
  return WEEKDAY_SHORT_LABELS.map((label, i) => ({ label, value: counts[i] }))
}

function computeBusiestHours(orders) {
  const counts = new Array(12).fill(0)
  for (const order of orders) {
    const hour = new Date(order.created_at).getHours()
    counts[Math.floor(hour / 2)] += 1
  }
  return counts.map((value, i) => {
    const start = i * 2
    const end = (start + 2) % 24
    return { label: `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`, value }
  })
}

function computeAverageFulfillmentMinutes(completedOrders) {
  if (completedOrders.length === 0) return null
  const totalMinutes = completedOrders.reduce((sum, o) => {
    const minutes = (new Date(o.updated_at) - new Date(o.created_at)) / 60000
    return sum + Math.max(0, minutes)
  }, 0)
  return Math.round(totalMinutes / completedOrders.length)
}

function StatsSection({ orders, restaurants }) {
  const restaurantsById = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants])
  const completed = orders.filter((o) => o.status === 'completed')
  const cancelled = orders.filter((o) => o.status === 'cancelled')

  const dailyRevenue = computeDailyRevenue(completed, 14)
  const topRestaurants = computeTopRestaurants(completed, restaurantsById, 8)
  const busiestDays = computeBusiestWeekdays(completed)
  const busiestHours = computeBusiestHours(completed)
  const avgFulfillment = computeAverageFulfillmentMinutes(completed)

  const totalRevenue = sumCents(completed)
  const totalDeliveryFees = sumCents(completed, 'delivery_fee_cents')
  const totalServiceFees = sumCents(completed, 'service_fee_cents')
  const totalCommission = completed.reduce((sum, o) => sum + commissionCents(o, restaurantsById), 0)
  const totalFikoRevenue = completed.reduce((sum, o) => sum + fikoRevenueCents(o, restaurantsById), 0)
  const averageOrderValue = completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0

  const deliveryOrders = completed.filter((o) => o.delivery_method === 'delivery')
  const pickupOrders = completed.filter((o) => o.delivery_method === 'pickup')

  const statusCounts = ORDER_STATUS_OPTIONS.filter((o) => o.value !== 'all').map((opt) => ({
    label: opt.label,
    value: orders.filter((o) => o.status === opt.value).length,
  }))

  if (completed.length === 0) {
    return (
      <div className="staff-card">
        <h2>Tilastot</h2>
        <p className="staff-state-message">Tilastot täydentyvät sitä mukaa kun tilauksia merkitään noudetuksi.</p>
      </div>
    )
  }

  return (
    <div className="staff-card">
      <h2>Tilastot</h2>
      <p className="staff-hint">Lasketaan valmiiksi merkityistä tilauksista koko alustalla ({completed.length} kpl).</p>

      <div className="staff-chart-block">
        <h3>Liikevaihto viimeiseltä 14 päivältä</h3>
        <VerticalBarChart items={dailyRevenue} formatValue={formatPrice} />
      </div>

      <div className="staff-stat-grid">
        <StatCard label="Keskiostos" value={formatPrice(averageOrderValue)} />
        <StatCard label="Rahtituotot yhteensä" value={formatPrice(totalDeliveryFees)} />
        <StatCard label="Palvelumaksut yhteensä" value={formatPrice(totalServiceFees)} />
        <StatCard label="Fikon komissio yhteensä" value={formatPrice(totalCommission)} />
        <StatCard label="Fikon arvioitu tulo yhteensä" value={formatPrice(totalFikoRevenue)} hint="Komissio + rahti + palvelumaksu" />
        <StatCard label="Keskim. valmistumisaika" value={avgFulfillment !== null ? `${avgFulfillment} min` : '–'} hint="Tilauksesta noudetuksi" />
        <StatCard label="Peruutuksia" value={cancelled.length} />
      </div>

      <div className="staff-extra">
        <CollapsibleSection title="Parhaiten myyvät ravintolat" subtitle={`${topRestaurants.length} ravintolaa`} defaultOpen>
          <HorizontalBarList items={topRestaurants} formatValue={formatPrice} />
        </CollapsibleSection>

        <CollapsibleSection title="Nouto vs. kotiinkuljetus" subtitle={`${pickupOrders.length} / ${deliveryOrders.length}`}>
          <HorizontalBarList
            items={[
              { label: 'Nouto', value: pickupOrders.length },
              { label: 'Kotiinkuljetus', value: deliveryOrders.length },
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Tilausten tilajakauma" subtitle="Kaikki tilaukset">
          <HorizontalBarList items={statusCounts} />
        </CollapsibleSection>

        <CollapsibleSection title="Kiireisimmät päivät" subtitle="Ma-Su">
          <VerticalBarChart items={busiestDays} axisUnit="" axisScale={1} />
        </CollapsibleSection>

        <CollapsibleSection title="Kiireisimmät kellonajat" subtitle="2 tunnin jaksoissa">
          <VerticalBarChart items={busiestHours} axisUnit="" axisScale={1} />
        </CollapsibleSection>
      </div>
    </div>
  )
}

// --- Kumppanuushakemukset ----------------------------------------------------------------

const APPLICATION_FILTERS = [
  { key: 'pending', label: 'Odottavat' },
  { key: 'approved', label: 'Hyväksytyt' },
  { key: 'rejected', label: 'Hylätyt' },
  { key: 'all', label: 'Kaikki' },
]

function ApplicationActions({ status, busy, onApprove, onReject }) {
  if (status !== 'pending') {
    return <span className={`staff-status-badge staff-status-badge--${status === 'approved' ? 'completed' : 'cancelled'}`}>{APPLICATION_STATUS_LABELS[status]}</span>
  }
  return (
    <div className="staff-application-actions">
      <button type="button" className="staff-btn staff-btn--primary staff-btn--small" disabled={busy} onClick={onApprove}>
        Hyväksy
      </button>
      <button type="button" className="staff-btn staff-btn--danger staff-btn--small" disabled={busy} onClick={onReject}>
        Hylkää
      </button>
    </div>
  )
}

function PartnerApplicationsSection({ applications, onSetStatus }) {
  const [filter, setFilter] = useState('pending')
  const [busyId, setBusyId] = useState(null)
  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter)

  async function handleSetStatus(id, status) {
    setBusyId(id)
    await onSetStatus(id, status)
    setBusyId(null)
  }

  return (
    <div className="staff-card">
      <h2>Kumppanuushakemukset</h2>
      <p className="staff-hint">
        Hyväksyntä merkitsee hakemuksen tilan - ravintolan ja omistajan tilin luonti tehdään toistaiseksi erikseen
        Supabase Studiosta (kutsu sähköpostilla).
      </p>

      <div className="staff-filter-tabs">
        {APPLICATION_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`staff-filter-tabs__btn${filter === f.key ? ' staff-filter-tabs__btn--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'pending' && applications.filter((a) => a.status === 'pending').length > 0 && (
              <span className="staff-filter-tabs__count">{applications.filter((a) => a.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="staff-state-message">Ei hakemuksia tässä näkymässä.</p>
      ) : (
        <div className="staff-application-list">
          {filtered.map((app) => (
            <div className="staff-application-card" key={app.id}>
              <div className="staff-application-card__header">
                <div>
                  <strong>{app.restaurant_name}</strong>
                  <span className="staff-hint" style={{ margin: 0 }}>
                    {app.restaurant_category} · {app.restaurant_city}
                  </span>
                </div>
                <ApplicationActions
                  status={app.status}
                  busy={busyId === app.id}
                  onApprove={() => handleSetStatus(app.id, 'approved')}
                  onReject={() => handleSetStatus(app.id, 'rejected')}
                />
              </div>

              <div className="staff-application-card__grid">
                <span><b>Yritys:</b> {app.legal_name} ({app.business_id})</span>
                <span><b>Osoite:</b> {app.restaurant_address}, {app.restaurant_postal_code} {app.restaurant_city}</span>
                <span><b>Yhteyshenkilö:</b> {app.owner_name}</span>
                <span><b>Puhelin:</b> {app.owner_phone}</span>
                <span><b>Sähköposti:</b> {app.owner_email}</span>
                {app.website && (
                  <span>
                    <b>Verkkosivu:</b> {app.website}
                  </span>
                )}
                <span><b>Jätetty:</b> {formatDateTime(app.created_at)}</span>
              </div>

              {app.restaurant_description && <p className="staff-application-card__description">{app.restaurant_description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Kuljettajat -------------------------------------------------------------------------

function DriverApplicationsSection({ applications, onSetStatus }) {
  const [filter, setFilter] = useState('pending')
  const [busyId, setBusyId] = useState(null)
  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter)

  async function handleSetStatus(id, status) {
    setBusyId(id)
    await onSetStatus(id, status)
    setBusyId(null)
  }

  return (
    <div className="staff-card">
      <h2>Kuljettajat</h2>
      <p className="staff-hint">
        Fikolla ei ole vielä oikeaa kuljettajajärjestelmää (kuskitilejä tai kuljetusten yhdistämistä) - tämä on lista
        /kuljettajille-sivun kautta kiinnostuksensa jättäneiden yhteystiedoista jatkokäsittelyä varten.
      </p>

      <div className="staff-filter-tabs">
        {APPLICATION_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`staff-filter-tabs__btn${filter === f.key ? ' staff-filter-tabs__btn--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'pending' && applications.filter((a) => a.status === 'pending').length > 0 && (
              <span className="staff-filter-tabs__count">{applications.filter((a) => a.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="staff-state-message">Ei hakemuksia tässä näkymässä.</p>
      ) : (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Nimi</th>
                <th>Kaupunki</th>
                <th>Kulkuneuvo</th>
                <th>Yhteystiedot</th>
                <th>Viesti</th>
                <th>Jätetty</th>
                <th>Tila</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id}>
                  <td>{app.full_name}</td>
                  <td>{app.city}</td>
                  <td>{VEHICLE_TYPE_LABELS[app.vehicle_type] ?? app.vehicle_type}</td>
                  <td>
                    {app.phone}
                    <br />
                    {app.email}
                  </td>
                  <td className="staff-table__wrap-cell">{app.message || '–'}</td>
                  <td>{formatDateTime(app.created_at)}</td>
                  <td>
                    <ApplicationActions
                      status={app.status}
                      busy={busyId === app.id}
                      onApprove={() => handleSetStatus(app.id, 'approved')}
                      onReject={() => handleSetStatus(app.id, 'rejected')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Ravintolat --------------------------------------------------------------------------

function CommissionEditor({ restaurant, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(restaurant.commission_rate_percent ?? 15))
  const [saving, setSaving] = useState(false)

  if (!editing) {
    return (
      <button type="button" className="staff-inline-edit" onClick={() => setEditing(true)}>
        {restaurant.commission_rate_percent ?? 15} %
      </button>
    )
  }

  async function handleSave() {
    const rate = parseFloat(draft.replace(',', '.'))
    if (Number.isNaN(rate) || rate < 0) return
    setSaving(true)
    await onSave(rate)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="staff-inline-edit-form">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        inputMode="decimal"
        className="staff-inline-edit-form__input"
        autoFocus
      />
      <button type="button" className="staff-btn staff-btn--primary staff-btn--small" disabled={saving} onClick={handleSave}>
        OK
      </button>
      <button type="button" className="staff-btn staff-btn--ghost staff-btn--small" onClick={() => setEditing(false)}>
        Peruuta
      </button>
    </div>
  )
}

function RestaurantsSection({ restaurants, orders, onToggleOpen, onUpdateCommission }) {
  const [togglingId, setTogglingId] = useState(null)

  const statsByRestaurant = useMemo(() => {
    const map = new Map()
    for (const order of orders) {
      if (order.status !== 'completed') continue
      const entry = map.get(order.restaurant_id) ?? { count: 0, revenue: 0 }
      entry.count += 1
      entry.revenue += order.total_cents
      map.set(order.restaurant_id, entry)
    }
    return map
  }, [orders])

  async function handleToggle(restaurant) {
    setTogglingId(restaurant.id)
    await onToggleOpen(restaurant)
    setTogglingId(null)
  }

  return (
    <div className="staff-card">
      <h2>Ravintolat</h2>
      <p className="staff-hint">{restaurants.length} ravintolaa alustalla. Palkkio % vaikuttaa kumppanin Talous-välilehden laskelmaan.</p>

      {restaurants.length === 0 ? (
        <p className="staff-state-message">Ei vielä ravintoloita.</p>
      ) : (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Nimi</th>
                <th>Kaupunki</th>
                <th>Kategoria</th>
                <th>Tila</th>
                <th>Palkkio</th>
                <th>Tilauksia</th>
                <th>Liikevaihto</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((restaurant) => {
                const stats = statsByRestaurant.get(restaurant.id) ?? { count: 0, revenue: 0 }
                return (
                  <tr key={restaurant.id}>
                    <td>{restaurant.name}</td>
                    <td>{restaurant.city || '–'}</td>
                    <td>{restaurant.category || '–'}</td>
                    <td>
                      <button
                        type="button"
                        className={`staff-open-pill${restaurant.is_open ? ' staff-open-pill--open' : ''}`}
                        onClick={() => handleToggle(restaurant)}
                        disabled={togglingId === restaurant.id}
                      >
                        <span className="staff-open-pill__dot" aria-hidden="true" />
                        {restaurant.is_open ? 'Auki' : 'Kiinni'}
                      </button>
                    </td>
                    <td>
                      <CommissionEditor restaurant={restaurant} onSave={(rate) => onUpdateCommission(restaurant, rate)} />
                    </td>
                    <td>{stats.count}</td>
                    <td>{formatPrice(stats.revenue)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Päänäkymä ---------------------------------------------------------------------------

function StaffDashboard() {
  const { staffAccount } = useStaffAuth()
  const [activeTab, setActiveTab] = useState('yleiskatsaus')
  const {
    restaurants,
    orders,
    partnerApplications,
    driverApplications,
    status,
    setPartnerApplicationStatus,
    setDriverApplicationStatus,
    toggleRestaurantOpen,
    updateCommissionRate,
  } = useStaffData()

  const badges = {
    tilaukset: orders.filter((o) => o.status === 'pending').length,
    kumppanuushakemukset: partnerApplications.filter((a) => a.status === 'pending').length,
    kuljettajat: driverApplications.filter((a) => a.status === 'pending').length,
  }

  return (
    <div className="page">
      <StaffHeader />

      <div className="staff-dashboard-shell">
        <StaffSidebar activeTab={activeTab} onTabChange={setActiveTab} badges={badges} />

        <div className="staff-dashboard-content">
          <main className="staff-dashboard">
            <div className="staff-welcome-row">
              <h1 className="staff-welcome">Tervetuloa{staffAccount?.full_name ? `, ${staffAccount.full_name}` : ''}</h1>
            </div>

            {status === 'loading' && <p className="staff-state-message">Ladataan...</p>}
            {status === 'error' && <p className="staff-error">Tietojen haku epäonnistui. Yritä päivittää sivu.</p>}

            {status === 'ready' && (
              <>
                {activeTab === 'yleiskatsaus' && (
                  <OverviewSection
                    orders={orders}
                    restaurants={restaurants}
                    partnerApplications={partnerApplications}
                    driverApplications={driverApplications}
                    onNavigate={setActiveTab}
                  />
                )}

                {activeTab === 'tilaukset' && <OrdersSection orders={orders} restaurants={restaurants} />}

                {activeTab === 'tilastot' && <StatsSection orders={orders} restaurants={restaurants} />}

                {activeTab === 'kumppanuushakemukset' && (
                  <PartnerApplicationsSection applications={partnerApplications} onSetStatus={setPartnerApplicationStatus} />
                )}

                {activeTab === 'kuljettajat' && (
                  <DriverApplicationsSection applications={driverApplications} onSetStatus={setDriverApplicationStatus} />
                )}

                {activeTab === 'ravintolat' && (
                  <RestaurantsSection
                    restaurants={restaurants}
                    orders={orders}
                    onToggleOpen={toggleRestaurantOpen}
                    onUpdateCommission={updateCommissionRate}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default StaffDashboard
