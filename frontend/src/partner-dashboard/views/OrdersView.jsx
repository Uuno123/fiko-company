import { useState } from 'react'
import { Bike, ChefHat, Inbox, PackageCheck, ShoppingBag } from 'lucide-react'
import { nextOrderActionLabel, nextOrderStatus, orderStatusLabel } from '../../lib/orderStatus.js'
import { useDashboard } from '../context.js'
import { useNow } from '../hooks.js'
import OrderDetail, { DueLabel, PendingCountdown } from '../OrderDetail.jsx'
import { EmptyState, PageHeader, Segmented } from '../ui.jsx'
import { formatPrice, itemCount, restaurantShareCents, shortAddress } from '../utils.js'

const COLUMNS = [
  { key: 'new', title: 'Uudet', statuses: ['pending'], icon: Inbox, empty: 'Uudet tilaukset ilmestyvät tähän ja soittavat äänimerkin.' },
  { key: 'kitchen', title: 'Keittiössä', statuses: ['confirmed', 'preparing'], icon: ChefHat, empty: 'Hyväksytyt tilaukset odottavat valmistusta täällä.' },
  { key: 'ready', title: 'Valmiina', statuses: ['ready'], icon: PackageCheck, empty: 'Valmiit tilaukset odottavat noutoa täällä.' },
]

function minutesSince(value, now) {
  return Math.max(Math.floor((now - new Date(value).getTime()) / 60_000), 0)
}

function OrderTicket({ order, onOpen, onAdvance, busy }) {
  const now = useNow(30_000)
  const isDelivery = order.delivery_method === 'delivery'
  const actionLabel = order.status === 'pending' ? 'Avaa ja hyväksy' : nextOrderActionLabel(order.status)
  const firstLines = (order.order_items ?? []).slice(0, 3)
  const more = (order.order_items ?? []).length - firstLines.length

  return (
    <article className={`pd-ticket pd-ticket--${order.status}`}>
      <button type="button" className="pd-ticket__body" onClick={onOpen}>
        <div className="pd-ticket__top">
          <strong className="pd-ticket__number">{order.order_number}</strong>
          <span className="pd-ticket__age">{minutesSince(order.created_at, now)} min sitten</span>
        </div>
        <div className="pd-ticket__meta">
          <span className="pd-ticket__method">
            {isDelivery ? <Bike size={14} aria-hidden="true" /> : <ShoppingBag size={14} aria-hidden="true" />}
            {isDelivery ? 'Kuljetus' : 'Nouto'}
          </span>
          <span>{order.delivery_name?.split(' ')[0] || 'Asiakas'}</span>
          {isDelivery && order.delivery_address && <span className="pd-ticket__addr">{shortAddress(order.delivery_address)}</span>}
        </div>
        <ul className="pd-ticket__lines">
          {firstLines.map((line) => (
            <li key={line.id}>
              <span>{line.quantity}×</span> {line.name}
            </li>
          ))}
          {more > 0 && <li className="pd-ticket__more">+ {more} muuta tuotetta</li>}
        </ul>
        {order.delivery_notes && <p className="pd-ticket__note">{order.delivery_notes}</p>}
        <div className="pd-ticket__foot">
          <span>
            {itemCount(order)} tuotetta · {formatPrice(restaurantShareCents(order))}
          </span>
          {order.status === 'pending' ? <PendingCountdown createdAt={order.created_at} compact /> : <DueLabel order={order} />}
        </div>
      </button>
      {actionLabel && (
        <button
          type="button"
          className={`pd-btn pd-btn--${order.status === 'pending' ? 'accent' : 'secondary'} pd-ticket__action`}
          disabled={busy}
          onClick={order.status === 'pending' ? onOpen : onAdvance}
        >
          {actionLabel}
        </button>
      )}
    </article>
  )
}

export default function OrdersView() {
  const { ordersState, toast } = useDashboard()
  const { orders, status, updateOrder } = ordersState
  const [selectedId, setSelectedId] = useState(null)
  const [mobileColumn, setMobileColumn] = useState('new')
  const [busyId, setBusyId] = useState(null)

  const selected = orders.find((o) => o.id === selectedId) ?? null
  const byColumn = Object.fromEntries(
    COLUMNS.map((column) => [
      column.key,
      orders
        .filter((o) => column.statuses.includes(o.status))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    ]),
  )

  async function advance(order) {
    const next = nextOrderStatus(order.status)
    setBusyId(order.id)
    const error = await updateOrder(order.id, { status: next })
    setBusyId(null)
    toast(error ? 'Päivitys epäonnistui. Yritä uudelleen.' : orderStatusLabel(next, order.delivery_method), error ? 'error' : 'default')
  }

  return (
    <div className="pd-view pd-view--orders">
      <PageHeader
        title="Tilaukset"
        description="Uudet tilaukset tulevat tähän reaaliajassa. Hyväksy 3 minuutin kuluessa."
      />

      <div className="pd-board-switch">
        <Segmented
          label="Tilausten vaihe"
          value={mobileColumn}
          onChange={setMobileColumn}
          options={COLUMNS.map((c) => ({ value: c.key, label: c.title, count: byColumn[c.key].length }))}
        />
      </div>

      {status === 'error' && (
        <EmptyState icon={Inbox} title="Tilauksia ei voitu hakea" text="Tarkista yhteys - lista päivittyy automaattisesti kun yhteys palaa." />
      )}

      {status !== 'error' && (
        <div className="pd-board">
          {COLUMNS.map((column) => {
            const Icon = column.icon
            const list = byColumn[column.key]
            return (
              <section
                key={column.key}
                className={`pd-board__col pd-board__col--${column.key}${mobileColumn === column.key ? ' is-current' : ''}${
                  column.key === 'new' && list.length > 0 ? ' is-alert' : ''
                }`}
              >
                <header className="pd-board__head">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  <h2>{column.title}</h2>
                  <span className="pd-board__count">{list.length}</span>
                </header>
                <div className="pd-board__list">
                  {status === 'loading' && <div className="pd-skeleton pd-skeleton--ticket" />}
                  {status === 'ready' && list.length === 0 && <p className="pd-board__empty">{column.empty}</p>}
                  {list.map((order) => (
                    <OrderTicket
                      key={order.id}
                      order={order}
                      busy={busyId === order.id}
                      onOpen={() => setSelectedId(order.id)}
                      onAdvance={() => advance(order)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {selected && <OrderDetail order={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
