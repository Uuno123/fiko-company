import { useCallback, useEffect, useRef, useState } from 'react'
import { useDashboardApi } from './api.js'
import { storageGet, storageSet } from './utils.js'

// Tilaukset reaaliajassa. Yhteyden palatessa (tai välilehden tullessa näkyviin)
// haetaan lista uudelleen, jottei katkon aikana tulleita tilauksia jää näkymättä.
export function useOrders(restaurantId) {
  const api = useDashboardApi()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')

  const load = useCallback(async () => {
    if (!restaurantId) return
    try {
      setOrders(await api.fetchOrders(restaurantId))
      setStatus('ready')
    } catch (error) {
      console.error('Tilausten haku epäonnistui', error)
      setStatus('error')
    }
  }, [api, restaurantId])

  useEffect(() => {
    if (!restaurantId) return undefined
    let active = true
    setStatus('loading')
    load()

    const unsubscribe = api.subscribeOrders(restaurantId, {
      onInsert: async (row) => {
        try {
          const full = await api.fetchOrder(row.id)
          if (active) setOrders((prev) => (prev.some((o) => o.id === full.id) ? prev : [full, ...prev]))
        } catch (error) {
          console.error('Uuden tilauksen haku epäonnistui', error)
        }
      },
      onUpdate: (row) => setOrders((prev) => prev.map((o) => (o.id === row.id ? { ...o, ...row } : o))),
    })

    function handleVisible() {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('online', load)
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      active = false
      unsubscribe()
      window.removeEventListener('online', load)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [api, restaurantId, load])

  // Palauttaa virheen (tai null). Virhettä ei saa niellä: epäonnistunut päivitys näytti
  // aiemmin siltä ettei nappi tee mitään.
  const updateOrder = useCallback(
    async (orderId, fields) => {
      try {
        await api.updateOrder(orderId, fields)
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...fields } : o)))
        return null
      } catch (error) {
        console.error('Tilauksen päivitys epäonnistui', error)
        return error
      }
    },
    [api],
  )

  return { orders, status, updateOrder, reload: load }
}

export function useMenu(restaurantId) {
  const api = useDashboardApi()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')

  const load = useCallback(async () => {
    if (!restaurantId) return
    try {
      setItems(await api.fetchMenu(restaurantId))
      setStatus('ready')
    } catch (error) {
      console.error('Ruokalistan haku epäonnistui', error)
      setStatus('error')
    }
  }, [api, restaurantId])

  useEffect(() => {
    setStatus('loading')
    load()
  }, [load])

  async function run(action, onSuccess) {
    try {
      const result = await action()
      onSuccess?.(result)
      return null
    } catch (error) {
      console.error('Ruokalistan tallennus epäonnistui', error)
      return error
    }
  }

  return {
    items,
    status,
    reload: load,
    createItem: (fields) =>
      run(
        () => api.createMenuItem(restaurantId, fields),
        (row) => setItems((prev) => [...prev, row]),
      ),
    updateItem: (itemId, fields) =>
      run(
        () => api.updateMenuItem(itemId, fields),
        () => setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...fields } : i))),
      ),
    deleteItem: (itemId) =>
      run(
        () => api.deleteMenuItem(itemId),
        () => setItems((prev) => prev.filter((i) => i.id !== itemId)),
      ),
  }
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

// Laitekohtaiset asetukset (tilauslaite), eivät ravintolan yhteisiä.
const DEVICE_SETTINGS_KEY = 'pd-device-settings'
const DEFAULT_DEVICE_SETTINGS = { sound: true, volume: 0.6, wakeLock: true, compact: false }

export function useDeviceSettings() {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_DEVICE_SETTINGS,
    ...storageGet(DEVICE_SETTINGS_KEY, {}),
  }))
  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      storageSet(DEVICE_SETTINGS_KEY, next)
      return next
    })
  }, [])
  return [settings, update]
}

// Selain sallii äänen vasta käyttäjän eleen jälkeen - unlockAudio kutsutaan
// napin painalluksesta, ja sama konteksti soittaa hälytyksen myöhemmin.
let audioContext = null

export function unlockAudio() {
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)()
    if (audioContext.state === 'suspended') audioContext.resume()
    return audioContext.state !== 'suspended'
  } catch {
    return false
  }
}

export function isAudioUnlocked() {
  return audioContext?.state === 'running'
}

export function playChime(volume = 0.6) {
  if (!audioContext) return
  const ctx = audioContext
  const peak = Math.max(0.0002, Math.min(volume, 1) * 0.5)
  ;[0, 0.2, 0.4].forEach((offset, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const start = ctx.currentTime + offset
    osc.type = 'sine'
    osc.frequency.value = i === 2 ? 659 : 880
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.2)
  })
}

// Hälytys soi 4 sekunnin välein niin kauan kuin hyväksymättömiä tilauksia on -
// yksittäinen ääni jää keittiön melussa helposti kuulematta.
export function useOrderAlarm(pendingCount, { enabled, volume }) {
  const originalTitle = useRef(document.title)

  useEffect(() => {
    if (pendingCount === 0) {
      document.title = originalTitle.current
      return undefined
    }
    document.title = `(${pendingCount}) Uusi tilaus – delivo`
    if (!enabled) return undefined
    playChime(volume)
    const timer = setInterval(() => playChime(volume), 4000)
    return () => clearInterval(timer)
  }, [pendingCount, enabled, volume])

  useEffect(() => {
    const title = originalTitle.current
    return () => {
      document.title = title
    }
  }, [])
}

// Pitää näytön päällä tilauslaitteella (Screen Wake Lock API). Lukko vapautuu kun
// välilehti piiloutuu, joten se pyydetään uudelleen kun näkymä palaa.
export function useWakeLock(enabled) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) {
      setActive(false)
      return undefined
    }
    let lock = null
    let cancelled = false

    async function request() {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release()
          return
        }
        setActive(true)
        lock.addEventListener('release', () => setActive(false))
      } catch {
        setActive(false)
      }
    }

    function handleVisible() {
      if (document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', handleVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisible)
      lock?.release?.()
    }
  }, [enabled])
  return active
}
