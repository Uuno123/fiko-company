import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Flame, Pause, Play, Power } from 'lucide-react'
import { formatTime, storageGet, storageSet } from './utils.js'
import { useNow } from './hooks.js'
import { useToast } from './ui.jsx'

const PAUSE_OPTIONS = [15, 30, 60]
const BUSY_OPTIONS = [10, 20]

// Tauko ja kiireinen tila toimivat oikeasti olemassa olevilla sarakkeilla:
// tauko = is_open false + paluuaika tällä laitteella (kojelauta avaa ravintolan
// automaattisesti ajan täyttyessä), kiire = pickup_estimate_minutes korotetaan ja
// alkuperäinen arvo palautetaan kun kiire päättyy.
export function useStoreStatus(restaurant, patchRestaurant) {
  const pauseKey = `pd-pause-${restaurant.id}`
  const busyKey = `pd-busy-${restaurant.id}`
  const [pause, setPause] = useState(() => storageGet(pauseKey, null))
  const [busy, setBusy] = useState(() => storageGet(busyKey, null))
  const now = useNow(15_000)

  useEffect(() => {
    setPause(storageGet(pauseKey, null))
    setBusy(storageGet(busyKey, null))
  }, [pauseKey, busyKey])

  const pauseActive = Boolean(pause && !restaurant.is_open && new Date(pause.until).getTime() > now)

  // Tauon päättyessä ravintola avataan uudelleen (vain jos se on yhä suljettu).
  useEffect(() => {
    if (!pause) return
    if (new Date(pause.until).getTime() <= now) {
      storageSet(pauseKey, null)
      setPause(null)
      if (!restaurant.is_open) patchRestaurant({ is_open: true })
    }
  }, [pause, now, pauseKey, restaurant.is_open, patchRestaurant])

  async function open() {
    storageSet(pauseKey, null)
    setPause(null)
    return patchRestaurant({ is_open: true })
  }

  async function startPause(minutes) {
    const error = await patchRestaurant({ is_open: false })
    if (error) return error
    const next = { until: new Date(Date.now() + minutes * 60_000).toISOString() }
    storageSet(pauseKey, next)
    setPause(next)
    return null
  }

  async function closeForDay() {
    storageSet(pauseKey, null)
    setPause(null)
    return patchRestaurant({ is_open: false })
  }

  async function startBusy(extra) {
    const baseline = busy?.baseline ?? restaurant.pickup_estimate_minutes ?? 20
    const error = await patchRestaurant({ pickup_estimate_minutes: baseline + extra })
    if (error) return error
    const next = { extra, baseline }
    storageSet(busyKey, next)
    setBusy(next)
    return null
  }

  async function stopBusy() {
    if (!busy) return null
    const error = await patchRestaurant({ pickup_estimate_minutes: busy.baseline })
    if (error) return error
    storageSet(busyKey, null)
    setBusy(null)
    return null
  }

  const state = restaurant.is_open ? 'open' : pauseActive ? 'paused' : 'closed'
  return { state, pause: pauseActive ? pause : null, busy, open, startPause, closeForDay, startBusy, stopBusy }
}

const STATE_LABEL = { open: 'Auki tilauksille', paused: 'Tauolla', closed: 'Suljettu' }

export default function StoreStatus({ status }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef(null)
  const toast = useToast()

  useEffect(() => {
    if (!menuOpen) return undefined
    function handleClick(e) {
      if (!ref.current?.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function run(action, message) {
    setMenuOpen(false)
    const error = await action()
    toast(error ? 'Tilan vaihto epäonnistui. Yritä uudelleen.' : message, error ? 'error' : 'default')
  }

  return (
    <div className="pd-status" ref={ref}>
      <button
        type="button"
        className={`pd-status__trigger pd-status__trigger--${status.state}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className="pd-status__dot" aria-hidden="true" />
        <span className="pd-status__text">
          <strong>{STATE_LABEL[status.state]}</strong>
          {status.pause && <span>jatkuu klo {formatTime(status.pause.until)}</span>}
          {!status.pause && status.busy && <span>kiire +{status.busy.extra} min</span>}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {menuOpen && (
        <div className="pd-menu pd-status__menu" role="menu">
          {status.state !== 'open' && (
            <button type="button" role="menuitem" onClick={() => run(status.open, 'Ravintola on auki tilauksille')}>
              <Play size={16} aria-hidden="true" /> Avaa tilauksille
            </button>
          )}
          <span className="pd-menu__label">Tauko tilauksiin</span>
          {PAUSE_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              role="menuitem"
              onClick={() => run(() => status.startPause(minutes), `Tauko ${minutes} min - avautuu automaattisesti`)}
            >
              <Pause size={16} aria-hidden="true" /> {minutes} minuuttia
            </button>
          ))}
          {status.state !== 'closed' && (
            <button type="button" role="menuitem" onClick={() => run(status.closeForDay, 'Ravintola suljettu')}>
              <Power size={16} aria-hidden="true" /> Sulje toistaiseksi
            </button>
          )}
          <span className="pd-menu__label">Kiireinen keittiö</span>
          {BUSY_OPTIONS.map((extra) => (
            <button
              key={extra}
              type="button"
              role="menuitem"
              className={status.busy?.extra === extra ? 'is-active' : ''}
              onClick={() => run(() => status.startBusy(extra), `Valmistusaikaa pidennetty ${extra} min`)}
            >
              <Flame size={16} aria-hidden="true" /> +{extra} min valmistusaikaan
            </button>
          ))}
          {status.busy && (
            <button type="button" role="menuitem" onClick={() => run(status.stopBusy, 'Kiireinen tila pois')}>
              <Flame size={16} aria-hidden="true" /> Kiire ohi
            </button>
          )}
          <p className="pd-menu__note">Tauko avautuu itsestään, kun kojelauta on auki tällä laitteella.</p>
        </div>
      )}
    </div>
  )
}
