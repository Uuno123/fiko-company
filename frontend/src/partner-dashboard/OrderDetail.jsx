import { useState } from 'react'
import { Ban, Bike, MapPin, MessageSquareText, Phone, Printer, ShoppingBag, Timer } from 'lucide-react'
import { isOrderCancellable, nextOrderActionLabel, nextOrderStatus, orderStatusLabel } from '../lib/orderStatus.js'
import { useDashboardApi } from './api.js'
import { useDashboard } from './context.js'
import { useNow } from './hooks.js'
import { Badge, DemoTag, Drawer, ErrorNote, Modal } from './ui.jsx'
import {
  PENDING_AUTO_CANCEL_MINUTES,
  formatDateTime,
  formatPrice,
  formatTime,
  lineTotalCents,
  minutesUntil,
  restaurantShareCents,
} from './utils.js'
import { printOrderTicket } from './print.js'

export const STATUS_TONE = {
  pending: 'accent',
  confirmed: 'info',
  preparing: 'info',
  ready: 'success',
  completed: 'neutral',
  cancelled: 'danger',
}

const READY_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 45, 60]
const DELAY_OPTIONS = [5, 10, 15]

const REJECT_REASONS = [
  'Tuote on loppunut',
  'Keittiössä on liian kiire',
  'Ravintola on sulkemassa',
  'Asiakas pyysi perumaan',
  'Muu syy',
]

export function PendingCountdown({ createdAt, compact = false }) {
  const now = useNow(1000)
  const remainingMs = new Date(createdAt).getTime() + PENDING_AUTO_CANCEL_MINUTES * 60_000 - now
  if (remainingMs <= 0) return <span className="pd-countdown is-expired">Peruuntuu hetkenä minä hyvänsä</span>
  const seconds = Math.floor(remainingMs / 1000)
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <span className={`pd-countdown${seconds < 60 ? ' is-urgent' : ''}`}>
      <Timer size={14} aria-hidden="true" />
      {compact ? text : `Hyväksy ${text} kuluessa, muuten tilaus peruuntuu`}
    </span>
  )
}

export function DueLabel({ order }) {
  const now = useNow(30_000)
  if (!order.estimated_ready_at) return null
  const minutes = minutesUntil(order.estimated_ready_at, now)
  const late = minutes < 0
  return (
    <span className={`pd-due${late ? ' is-late' : minutes <= 5 ? ' is-soon' : ''}`}>
      {late ? `Myöhässä ${Math.abs(minutes)} min` : `Valmis klo ${formatTime(order.estimated_ready_at)} · ${minutes} min`}
    </span>
  )
}

function RejectModal({ order, onConfirm, onClose, busy }) {
  const [reason, setReason] = useState(REJECT_REASONS[0])
  return (
    <Modal
      title={`Hylkää tilaus ${order.order_number}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="pd-btn pd-btn--ghost" onClick={onClose} disabled={busy}>
            Takaisin
          </button>
          <button type="button" className="pd-btn pd-btn--danger" onClick={() => onConfirm(reason)} disabled={busy}>
            {busy ? 'Hylätään...' : 'Hylkää tilaus'}
          </button>
        </>
      }
    >
      <p className="pd-muted">Asiakkaalle ilmoitetaan, ettei tilausta voida toimittaa. Valitse syy:</p>
      <div className="pd-radio-list">
        {REJECT_REASONS.map((option) => (
          <label key={option} className={`pd-radio${reason === option ? ' is-checked' : ''}`}>
            <input type="radio" name="reject-reason" checked={reason === option} onChange={() => setReason(option)} />
            {option}
          </label>
        ))}
      </div>
      <p className="pd-inline-demo">
        <DemoTag /> Syytä ei vielä tallenneta - itse hylkäys tallentuu oikeasti.
      </p>
    </Modal>
  )
}

export default function OrderDetail({ order, onClose }) {
  const { ordersState, restaurant, storeStatus, toast } = useDashboard()
  const api = useDashboardApi()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [readyMinutes, setReadyMinutes] = useState(() => {
    const base = order.delivery_method === 'delivery' ? 20 : 15
    return base + (storeStatus.busy?.extra ?? 0)
  })
  const [showReject, setShowReject] = useState(false)
  const [soldOut, setSoldOut] = useState([])

  const isDelivery = order.delivery_method === 'delivery'
  const actionLabel = nextOrderActionLabel(order.status)
  const active = ['confirmed', 'preparing', 'ready'].includes(order.status)

  async function update(fields, successMessage) {
    setBusy(true)
    setError('')
    const err = await ordersState.updateOrder(order.id, fields)
    setBusy(false)
    if (err) {
      setError('Päivitys epäonnistui. Tarkista yhteys ja yritä uudelleen.')
      return false
    }
    if (successMessage) toast(successMessage)
    return true
  }

  // Hyväksynnän, hylkäyksen ja vaiheen vaihdon jälkeen palataan taululle -
  // keittiössä seuraava tilaus on tärkeämpi kuin juuri käsitellyn tiedot.
  async function accept() {
    const estimated = new Date(Date.now() + readyMinutes * 60_000).toISOString()
    const ok = await update({ status: 'confirmed', estimated_ready_at: estimated }, `Tilaus hyväksytty - valmis ${readyMinutes} min kuluttua`)
    if (ok) onClose()
  }

  async function advance() {
    const next = nextOrderStatus(order.status)
    const ok = await update({ status: next }, orderStatusLabel(next, order.delivery_method))
    if (ok) onClose()
  }

  async function addTime(minutes) {
    const base = order.estimated_ready_at ? new Date(order.estimated_ready_at).getTime() : Date.now()
    const next = new Date(Math.max(base, Date.now()) + minutes * 60_000).toISOString()
    await update({ estimated_ready_at: next }, `Valmistusaikaa lisätty ${minutes} min`)
  }

  async function reject(reason) {
    const ok = await update({ status: 'cancelled' }, `Tilaus hylätty: ${reason.toLowerCase()}`)
    if (ok) {
      setShowReject(false)
      onClose()
    }
  }

  async function markSoldOut(line) {
    if (!line.menu_item_id) return
    try {
      await api.updateMenuItem(line.menu_item_id, { is_available: false })
      setSoldOut((prev) => [...prev, line.menu_item_id])
      toast(`${line.name} merkitty loppuneeksi ruokalistalta`)
    } catch (err) {
      console.error('Tuotteen merkitseminen loppuneeksi epäonnistui', err)
      toast('Tuotteen päivitys epäonnistui', 'error')
    }
  }

  const footer = (
    <div className="pd-order-actions">
      {order.status === 'pending' && (
        <>
          <button type="button" className="pd-btn pd-btn--ghost" disabled={busy} onClick={() => setShowReject(true)}>
            Hylkää
          </button>
          <button type="button" className="pd-btn pd-btn--primary pd-btn--grow" disabled={busy} onClick={accept}>
            {busy ? 'Hyväksytään...' : `Hyväksy · valmis ${readyMinutes} min`}
          </button>
        </>
      )}
      {active && actionLabel && (
        <button
          type="button"
          className="pd-btn pd-btn--primary pd-btn--grow"
          disabled={busy}
          onClick={advance}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )

  return (
    <Drawer
      title={`Tilaus ${order.order_number}`}
      subtitle={formatDateTime(order.created_at)}
      onClose={onClose}
      footer={order.status === 'pending' || active ? footer : null}
    >
      <div className="pd-order-detail">
        <div className="pd-order-detail__status">
          <Badge tone={STATUS_TONE[order.status]}>{orderStatusLabel(order.status, order.delivery_method)}</Badge>
          <Badge tone="neutral">
            {isDelivery ? <Bike size={13} aria-hidden="true" /> : <ShoppingBag size={13} aria-hidden="true" />}
            {isDelivery ? 'Kotiinkuljetus' : 'Nouto'}
          </Badge>
          {order.status === 'pending' && <PendingCountdown createdAt={order.created_at} />}
          {active && <DueLabel order={order} />}
        </div>

        {order.status === 'pending' && (
          <div className="pd-detail-block">
            <h3>Milloin tilaus on valmis?</h3>
            <div className="pd-chips">
              {READY_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={`pd-chip${readyMinutes === minutes ? ' is-active' : ''}`}
                  onClick={() => setReadyMinutes(minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            {storeStatus.busy && <p className="pd-muted">Kiireinen tila: oletusaikaan lisätty {storeStatus.busy.extra} min.</p>}
          </div>
        )}

        {active && order.status !== 'ready' && (
          <div className="pd-detail-block">
            <h3>Myöhästyykö tilaus?</h3>
            <div className="pd-chips">
              {DELAY_OPTIONS.map((minutes) => (
                <button key={minutes} type="button" className="pd-chip" disabled={busy} onClick={() => addTime(minutes)}>
                  +{minutes} min
                </button>
              ))}
            </div>
            <p className="pd-muted">Uusi valmistumisaika näkyy heti asiakkaan seurannassa.</p>
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>

        <div className="pd-detail-block">
          <h3>Asiakas</h3>
          <div className="pd-customer">
            <strong>{order.delivery_name || 'Asiakas'}</strong>
            {order.delivery_phone && (
              <a className="pd-customer__line" href={`tel:${order.delivery_phone}`}>
                <Phone size={15} aria-hidden="true" /> {order.delivery_phone}
              </a>
            )}
            {isDelivery && order.delivery_address && (
              <span className="pd-customer__line">
                <MapPin size={15} aria-hidden="true" /> {order.delivery_address}
              </span>
            )}
          </div>
          {order.delivery_notes && (
            <p className="pd-note">
              <MessageSquareText size={15} aria-hidden="true" /> {order.delivery_notes}
            </p>
          )}
        </div>

        <div className="pd-detail-block">
          <h3>Tuotteet</h3>
          <ul className="pd-lines">
            {(order.order_items ?? []).map((line) => {
              const markedSoldOut = soldOut.includes(line.menu_item_id)
              return (
                <li key={line.id}>
                  <span className="pd-lines__qty">{line.quantity}×</span>
                  <span className="pd-lines__name">
                    {line.name}
                    {line.selected_options?.length > 0 && (
                      <span className="pd-lines__options">{line.selected_options.map((o) => o.name).join(', ')}</span>
                    )}
                  </span>
                  <span className="pd-lines__price">{formatPrice(lineTotalCents(line))}</span>
                  {(order.status === 'pending' || active) && line.menu_item_id && (
                    <button
                      type="button"
                      className="pd-lines__soldout"
                      disabled={markedSoldOut}
                      onClick={() => markSoldOut(line)}
                      title="Merkitse tuote loppuneeksi ruokalistalta"
                    >
                      <Ban size={13} aria-hidden="true" /> {markedSoldOut ? 'Loppu' : 'Loppui'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="pd-totals">
            <div>
              <span>Tuotteet</span>
              <span>{formatPrice(order.subtotal_cents ?? 0)}</span>
            </div>
            {order.discount_cents > 0 && (
              <div>
                <span>Alennus{order.promo_code ? ` (${order.promo_code})` : ''}</span>
                <span>−{formatPrice(order.discount_cents)}</span>
              </div>
            )}
            <div className="pd-totals__strong">
              <span>Ravintolalle</span>
              <span>{formatPrice(restaurantShareCents(order))}</span>
            </div>
            <div className="pd-totals__muted">
              <span>Asiakas maksoi yhteensä</span>
              <span>{formatPrice(order.total_cents ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="pd-detail-actions">
          <button type="button" className="pd-btn pd-btn--secondary" onClick={() => printOrderTicket(order, restaurant.name)}>
            <Printer size={16} aria-hidden="true" /> Tulosta tilauslappu
          </button>
          {isOrderCancellable(order.status) && order.status !== 'pending' && (
            <button type="button" className="pd-btn pd-btn--ghost pd-btn--danger-text" onClick={() => setShowReject(true)}>
              Peru tilaus
            </button>
          )}
        </div>
      </div>

      {showReject && <RejectModal order={order} busy={busy} onConfirm={reject} onClose={() => setShowReject(false)} />}
    </Drawer>
  )
}
