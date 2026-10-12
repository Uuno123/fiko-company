import { useCallback, useEffect, useRef, useState } from 'react'
import { Vibration } from 'react-native'
import {
  DROPOFF_MIN,
  HANDOVER_MIN,
  coordinate,
  hasCoords,
  rideMinutes,
  routeKm as routeLengthKm,
  travelMinutes,
} from '../../../frontend/src/lib/deliveryTime'
import { PAY, refreshGigs } from './gigs'
import { supabase } from './supabase'

// Oikeat keikat tietokannasta (migraatio 0043). Kulku:
//   1. Asiakas tilaa verkkosivulta, ravintola hyväksyy ja valitsee valmistusajan.
//   2. Online-tilassa kuljettaja saa tarjouksen hyväksytystä toimitustilauksesta
//      (reaaliajassa). Ensimmäinen hyväksyjä saa keikan (courier_claim_order).
//   3. Kuljettajan pitää olla ravintolassa ruoan valmistuttua tai ajomatkan
//      jälkeen - kumpi on myöhemmin. Jos ravintola sanoo 40 min, aikaa on 40 min.
//   4. Nouto vaatii ravintolan noutokoodin (tai ravintolan luovutusmerkinnän),
//      toimitus kuljettajan sijainnin osoitteessa (asiakkaalla ei ole koodia,
//      migraatio 0044). Tietokanta tarkistaa todisteet ja ettei toimitus ole
//      fyysisesti liian nopea.
//   5. Keikan ajan sijainti tallentuu, jotta asiakas näkee kuljettajan kartalla.

export const OFFER_SECONDS = 60
export const ACTIVE_PHASES = ['toRestaurant', 'atRestaurant', 'toCustomer', 'completed']
const MOVING_PHASES = ['toRestaurant', 'atRestaurant', 'toCustomer']

// Ajoajat ja -matkat: sama malli kuin asiakkaan saapumisarviossa verkkosivulla
// (frontend/src/lib/deliveryTime.js).
// Hylätty tilaus tarjotaan uudelleen vasta tämän jälkeen (jos kukaan muu ei ota).
const DECLINE_COOLDOWN_MS = 2 * 60_000
const LOCATION_INTERVAL_MS = 5000
const OFFER_RECHECK_MS = 10_000
// Arvioiden yläraja: virheellinen sijainti ei saa tuottaa päivien arvioita.
const MAX_PLAN_MS = 3 * 60 * 60 * 1000

const ORDER_FIELDS =
  'id, order_number, status, delivery_method, delivery_name, delivery_phone, delivery_address, delivery_lat, delivery_lng, delivery_notes, estimated_ready_at, created_at, courier_id, courier_status, courier_assigned_at, courier_arrive_by, delivery_eta, courier_fee_cents, picked_up_at, restaurants(name, address, lat, lng)'

const PHASE_BY_COURIER_STATUS = { assigned: 'toRestaurant', at_restaurant: 'atRestaurant', picked_up: 'toCustomer' }

const ERROR_TEXTS = {
  not_a_courier: 'Tiliäsi ei ole hyväksytty kuljettajaksi.',
  courier_busy: 'Sinulla on jo keikka kesken.',
  order_not_available: 'Keikka ehti mennä toiselle kuljettajalle.',
  invalid_state: 'Keikan tila ehti muuttua.',
  order_cancelled: 'Ravintola perui tilauksen.',
  order_not_found: 'Keikkaa ei löytynyt.',
  wrong_pickup_code: 'Väärä noutokoodi. Kysy koodi ravintolan henkilökunnalta.',
  no_location: 'Sijaintiasi ei saatu. Salli sijainti delivo kuljettajalle ja yritä uudelleen.',
  address_unknown:
    'Toimitusosoitteen sijaintia ei ole kartalla, joten toimitusta ei voi vahvistaa. Ota yhteyttä tukeen.',
  not_at_address: 'Et ole vielä toimitusosoitteessa. Toimitus vahvistetaan, kun olet perillä.',
}

// "1,2 km" / "350 m"
function distanceText(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(meters / 10) * 10} m`
}

// Tietokantafunktioiden virhekoodit suomeksi. too_early:N = N sekuntia liian aikaisin.
export function errorText(error) {
  const message = String(error?.message ?? error ?? '')
  const early = message.match(/too_early:(\d+)/)
  if (early) {
    const seconds = Number(early[1])
    const wait = seconds >= 90 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`
    return `Toimitus ei voi olla vielä perillä - matka ravintolasta vie vähintään tämän ajan. Yritä ${wait} päästä.`
  }
  // not_at_address:metrit = näin kaukana toimitusosoitteesta (migraatio 0044).
  const away = message.match(/not_at_address:(\d+)/)
  if (away) {
    return `Olet noin ${distanceText(Number(away[1]))} päässä toimitusosoitteesta. Toimitus vahvistetaan, kun olet perillä (alle 250 m).`
  }
  const code = Object.keys(ERROR_TEXTS).find((key) => message.includes(key))
  if (code) return ERROR_TEXTS[code]
  if (/network|fetch/i.test(message)) return 'Ei yhteyttä. Tarkista verkkoyhteys.'
  return 'Toiminto epäonnistui. Yritä uudelleen.'
}

export { hasCoords }

function roundKm(km) {
  return Math.round(km * 10) / 10
}

function ceilToMinute(ms) {
  return new Date(Math.ceil(ms / 60000) * 60000)
}

// "Kauppakatu 18, 70100 Kuopio" -> { street: 'Kauppakatu 18', area: 'Kuopio' }
function splitAddress(address) {
  const [street, ...rest] = String(address ?? '').split(',').map((part) => part.trim())
  const area = rest.join(', ').replace(/\b\d{5}\b/, '').trim()
  return { street: street || 'Toimitusosoite', area: area || 'Asiakas' }
}

// Tietokannan tilausrivi kuljettaja-appin keikaksi (tarjouskortti ja vaiheet).
function buildJob(order, position, vehicle) {
  const restaurant = {
    name: order.restaurants?.name ?? 'Ravintola',
    address: order.restaurants?.address ?? '',
    lat: coordinate(order.restaurants?.lat),
    lng: coordinate(order.restaurants?.lng),
  }
  const { street, area } = splitAddress(order.delivery_address)
  const dropoff = {
    address: street,
    area,
    fullAddress: order.delivery_address ?? '',
    lat: coordinate(order.delivery_lat),
    lng: coordinate(order.delivery_lng),
  }
  const approachKnown = hasCoords(position) && hasCoords(restaurant)
  const deliveryKnown = hasCoords(restaurant) && hasCoords(dropoff)
  const approachKm = approachKnown ? routeLengthKm(position, restaurant) : 0
  const deliveryKm = deliveryKnown ? routeLengthKm(restaurant, dropoff) : 0
  const routeKm = roundKm(approachKm + deliveryKm)
  const approachMin = approachKnown ? travelMinutes(approachKm, vehicle, 2) : 5
  const rideMin = rideMinutes(restaurant, dropoff, vehicle)
  const foodReadyAt = order.estimated_ready_at ? Date.parse(order.estimated_ready_at) : Date.now()
  const untilReadyMin = Math.max(0, Math.round((foodReadyAt - Date.now()) / 60000))
  const minMinutes = Math.max(approachMin, untilReadyMin) + HANDOVER_MIN + rideMin + DROPOFF_MIN
  const distanceCents = Math.round(routeKm * PAY.perKmCents)
  const pay =
    order.courier_fee_cents != null
      ? { base: PAY.baseCents, distance: Math.max(0, order.courier_fee_cents - PAY.baseCents), total: order.courier_fee_cents }
      : { base: PAY.baseCents, distance: distanceCents, total: PAY.baseCents + distanceCents }

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    courierStatus: order.courier_status,
    customerName: String(order.delivery_name ?? '').split(' ')[0] || 'Asiakas',
    customerPhone: order.delivery_phone ?? null,
    instructions: order.delivery_notes || null,
    restaurant,
    dropoff,
    start: approachKnown ? position : restaurant,
    approachKnown,
    deliveryKnown,
    approachKm,
    deliveryKm,
    routeKm,
    approachMin,
    rideMin,
    foodReadyAt,
    minMinutes,
    maxMinutes: minMinutes + 5,
    pay,
    acceptedAt: order.courier_assigned_at ? Date.parse(order.courier_assigned_at) : null,
    arriveBy: order.courier_arrive_by ? Date.parse(order.courier_arrive_by) : null,
    deliverBy: order.delivery_eta ? Date.parse(order.delivery_eta) : null,
    pickedUpAt: order.picked_up_at ? Date.parse(order.picked_up_at) : null,
    itemCount: null,
  }
}

// Aikataulu, jos tarjous hyväksytään nyt: ravintolaan ajomatkan jälkeen, mutta ei
// ennen kuin ruoka on valmis; toimitus noudon, ajon ja luovutuksen jälkeen.
export function plannedSchedule(job, now = Date.now()) {
  const arriveBy = Math.min(Math.max(now + (job.approachMin + 1) * 60000, job.foodReadyAt), now + MAX_PLAN_MS)
  const deliverBy = arriveBy + (HANDOVER_MIN + job.rideMin + DROPOFF_MIN) * 60000
  return { arriveBy: ceilToMinute(arriveBy), foodReadyAt: ceilToMinute(job.foodReadyAt), deliverBy: ceilToMinute(deliverBy) }
}

// Hyväksytyn keikan aikataulu: tietokantaan tallennetut ajat, muuten suunnitelma.
// Ennen noutoa ruokaa ei saa ennen kuin se on valmis: jos ravintola lisää
// valmistusaikaa, nouto ja toimitus siirtyvät yhtä paljon (tietokanta tekee
// saman, migraatio 0044 - tämä pitää ajat oikeina jo ennen päivitystä).
export function jobSchedule(job) {
  const reference = job.acceptedAt ?? Date.now()
  const planned = plannedSchedule(job, reference)
  // Tallennettu aika kelpaa vain järkevänä (vanha virhe tallensi päivien arvion).
  const sane = (ms) => Number.isFinite(ms) && ms - reference < MAX_PLAN_MS
  let arriveBy = sane(job.arriveBy) ? job.arriveBy : planned.arriveBy.getTime()
  let deliverBy = sane(job.deliverBy) ? job.deliverBy : planned.deliverBy.getTime()
  const readyAt = planned.foodReadyAt.getTime()
  if (!job.pickedUpAt && readyAt > arriveBy) {
    deliverBy += readyAt - arriveBy
    arriveBy = readyAt
  }
  return { arriveBy: new Date(arriveBy), foodReadyAt: planned.foodReadyAt, deliverBy: new Date(deliverBy) }
}

// phase: 'idle' (offline) | 'waiting' | 'offer' | 'toRestaurant' | 'atRestaurant'
// | 'toCustomer' | 'completed'. notice: lyhyt ilmoitus näytön yläreunaan.
export function useCourierJobs({ courierId, online, position, settings }) {
  const [phase, setPhase] = useState('idle')
  const [job, setJob] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const declined = useRef(new Map())
  const lastPublish = useRef(0)
  const latest = useRef({ position, settings, phase, job, online })
  latest.current = { position, settings, phase, job, online }

  const showNotice = useCallback((text) => setNotice({ text, at: Date.now() }), [])

  // Ilmoitus häviää itsestään.
  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const backToSearch = useCallback(() => {
    setJob(null)
    setPhase(latest.current.online ? 'waiting' : 'idle')
  }, [])

  // Sijainti asiakkaan kartalle keikan ajan (ja aina ennen noutoa/toimitusta).
  const publishLocation = useCallback(
    async (force = false) => {
      const point = latest.current.position
      if (!courierId || !hasCoords(point)) return
      const now = Date.now()
      if (!force && now - lastPublish.current < LOCATION_INTERVAL_MS) return
      lastPublish.current = now
      await supabase
        .from('courier_locations')
        .upsert({ courier_id: courierId, lat: point.lat, lng: point.lng, updated_at: new Date(now).toISOString() })
    },
    [courierId],
  )

  useEffect(() => {
    if (MOVING_PHASES.includes(phase)) publishLocation(false)
  }, [phase, position?.lat, position?.lng, publishLocation])

  // Tuotteiden määrä noudettavaksi (näkyy vasta kun keikka on oma, RLS).
  const loadItemCount = useCallback(async (orderId) => {
    const { data } = await supabase.from('order_items').select('quantity').eq('order_id', orderId)
    if (!data) return
    const count = data.reduce((sum, row) => sum + (row.quantity ?? 0), 0)
    setJob((current) => (current?.id === orderId ? { ...current, itemCount: count } : current))
  }, [])

  // Kesken jäänyt keikka jatkuu, kun sovellus avataan uudelleen.
  useEffect(() => {
    if (!courierId) return undefined
    let cancelled = false
    supabase
      .from('orders')
      .select(ORDER_FIELDS)
      .eq('courier_id', courierId)
      .in('courier_status', ['assigned', 'at_restaurant', 'picked_up'])
      .order('courier_assigned_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const order = data?.[0]
        if (cancelled || !order) return
        setJob(buildJob(order, latest.current.position, latest.current.settings.vehicle))
        setPhase(PHASE_BY_COURIER_STATUS[order.courier_status])
        loadItemCount(order.id)
      })
    return () => {
      cancelled = true
    }
  }, [courierId, loadItemCount])

  // Online/offline. Käynnissä oleva keikka viedään loppuun, vaikka ajastettu
  // offline laukeaisi kesken.
  useEffect(() => {
    if (online && phase === 'idle') setPhase('waiting')
    if (!online && (phase === 'waiting' || phase === 'offer')) {
      setJob(null)
      setPhase('idle')
    }
  }, [online, phase])

  // Etsii vanhimman tarjolla olevan tilauksen, jota ei ole juuri hylätty.
  const findOffer = useCallback(async () => {
    if (latest.current.phase !== 'waiting' || !courierId) return
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_FIELDS)
      .is('courier_id', null)
      .eq('delivery_method', 'delivery')
      .in('status', ['confirmed', 'preparing', 'ready'])
      .order('created_at', { ascending: true })
      .limit(20)
    if (error || latest.current.phase !== 'waiting') return
    const now = Date.now()
    const next = (data ?? []).find((order) => {
      const declinedAt = declined.current.get(order.id)
      return !declinedAt || now - declinedAt > DECLINE_COOLDOWN_MS
    })
    if (!next) return
    const { position: currentPosition, settings: currentSettings } = latest.current
    setJob({ ...buildJob(next, currentPosition, currentSettings.vehicle), expiresAt: now + OFFER_SECONDS * 1000 })
    setPhase('offer')
    // Tarjous huomataan myös taskussa: kaksi pitkää värähdystä (asetus).
    if (currentSettings.haptics) Vibration.vibrate([0, 400, 200, 400])
  }, [courierId])

  // Haku heti kun vapaana, ja varmuuden vuoksi puolen minuutin välein.
  useEffect(() => {
    if (phase !== 'waiting') return undefined
    findOffer()
    const timer = setInterval(findOffer, 30_000)
    return () => clearInterval(timer)
  }, [phase, findOffer])

  // Reaaliaikaiset muutokset: uudet tilaukset tarjolle, oman keikan peruutus ja
  // ravintolan luovutusmerkintä (nouto kuittautuu silloin automaattisesti).
  const keepListening = online || MOVING_PHASES.includes(phase)
  useEffect(() => {
    if (!courierId || !keepListening) return undefined
    const channel = supabase
      .channel(`courier-orders-${courierId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const row = payload.new
        const { phase: currentPhase, job: currentJob } = latest.current
        // Tilaus poistettiin kokonaan (esim. testihistorian tyhjennys).
        if (payload.eventType === 'DELETE') {
          if (currentJob && payload.old?.id === currentJob.id) {
            showNotice('Tilaus poistettiin.')
            backToSearch()
          }
          return
        }
        if (currentJob && row?.id === currentJob.id) {
          if (row.status === 'cancelled') {
            showNotice('Ravintola perui tilauksen.')
            backToSearch()
            return
          }
          // Ravintolan valmistusaika voi muuttua; oman keikan nouto- ja
          // toimitusajat siirtyvät silloin tietokannassa (migraatio 0044).
          const own = row.courier_id === courierId
          setJob((current) =>
            current && current.id === row.id
              ? {
                  ...current,
                  status: row.status,
                  foodReadyAt: row.estimated_ready_at ? Date.parse(row.estimated_ready_at) : current.foodReadyAt,
                  arriveBy: own && row.courier_arrive_by ? Date.parse(row.courier_arrive_by) : current.arriveBy,
                  deliverBy: own && row.delivery_eta ? Date.parse(row.delivery_eta) : current.deliverBy,
                }
              : current,
          )
          return
        }
        if (currentPhase === 'waiting') findOffer()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [courierId, keepListening, findOffer, backToSearch, showNotice])

  // Tarjous vanhenee, tai poistuu jos toinen kuljettaja ehti ottaa sen.
  useEffect(() => {
    if (phase !== 'offer' || !job) return undefined
    const expire = setTimeout(() => {
      declined.current.set(job.id, Date.now())
      backToSearch()
    }, Math.max(0, job.expiresAt - Date.now()))
    const recheck = setInterval(async () => {
      const { data } = await supabase.from('orders').select('id, courier_id, status').eq('id', job.id).maybeSingle()
      if (latest.current.phase !== 'offer' || latest.current.job?.id !== job.id) return
      if (!data || data.courier_id || data.status === 'cancelled') {
        showNotice('Keikka ehti mennä toiselle kuljettajalle.')
        backToSearch()
      }
    }, OFFER_RECHECK_MS)
    return () => {
      clearTimeout(expire)
      clearInterval(recheck)
    }
  }, [phase, job, backToSearch, showNotice])

  // Ravintola merkitsi tilauksen luovutetuksi: nouto kuittautuu ilman koodia.
  useEffect(() => {
    if ((phase === 'toRestaurant' || phase === 'atRestaurant') && job?.status === 'completed' && !busy) {
      pickUp(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, job?.status])

  async function run(rpc, params) {
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc(rpc, params)
      if (error) return { error: errorText(error) }
      return { data }
    } catch (err) {
      return { error: errorText(err) }
    } finally {
      setBusy(false)
    }
  }

  async function accept() {
    const current = latest.current.job
    if (!current || busy) return
    const schedule = plannedSchedule(current)
    await publishLocation(true)
    const { error } = await run('courier_claim_order', {
      p_order_id: current.id,
      p_arrive_by: schedule.arriveBy.toISOString(),
      p_delivery_eta: schedule.deliverBy.toISOString(),
      p_fee_cents: current.pay.total,
    })
    if (error) {
      declined.current.set(current.id, Date.now())
      showNotice(error)
      backToSearch()
      return
    }
    setJob({
      ...current,
      acceptedAt: Date.now(),
      arriveBy: schedule.arriveBy.getTime(),
      deliverBy: schedule.deliverBy.getTime(),
      courierStatus: 'assigned',
    })
    setPhase('toRestaurant')
    loadItemCount(current.id)
  }

  function decline() {
    const current = latest.current.job
    if (current) declined.current.set(current.id, Date.now())
    backToSearch()
  }

  async function arrivedAtRestaurant() {
    const current = latest.current.job
    if (!current || busy) return
    await publishLocation(true)
    const { error } = await run('courier_arrived_at_restaurant', { p_order_id: current.id })
    if (error) {
      showNotice(error)
      return
    }
    setPhase('atRestaurant')
  }

  // Palauttaa virhetekstin tai null kun nouto onnistui.
  async function pickUp(code) {
    const current = latest.current.job
    if (!current) return null
    await publishLocation(true)
    const deliverBy = ceilToMinute(Date.now() + (current.rideMin + DROPOFF_MIN) * 60000)
    const { error } = await run('courier_pick_up_order', {
      p_order_id: current.id,
      p_code: code ?? null,
      p_delivery_eta: deliverBy.toISOString(),
    })
    if (error) return error
    setJob((value) => (value ? { ...value, pickedUpAt: Date.now(), deliverBy: deliverBy.getTime(), courierStatus: 'picked_up' } : value))
    setPhase('toCustomer')
    return null
  }

  // Palauttaa virhetekstin tai null kun toimitus onnistui. Todisteena on
  // kuljettajan tuore sijainti toimitusosoitteessa (tietokanta tarkistaa).
  async function deliver() {
    const current = latest.current.job
    if (!current || busy) return null
    if (!hasCoords(latest.current.position)) return ERROR_TEXTS.no_location
    await publishLocation(true)
    // p_code on enää vain tietokantafunktion parametri (toimituskoodia ei ole).
    const { error } = await run('courier_deliver_order', { p_order_id: current.id, p_code: null })
    if (error) return error
    const deliveredAt = Date.now()
    // Keikkahistoria ja ansiot päivittyvät tietokannasta.
    refreshGigs(courierId)
    setJob({ ...current, deliveredAt, tip: 0, courierStatus: 'delivered' })
    setPhase('completed')
    return null
  }

  async function release() {
    const current = latest.current.job
    if (!current || busy) return
    const { error } = await run('courier_release_order', { p_order_id: current.id })
    if (error) {
      showNotice(error)
      return
    }
    declined.current.set(current.id, Date.now())
    backToSearch()
  }

  return {
    phase,
    job,
    busy,
    notice,
    accept,
    decline,
    arrivedAtRestaurant,
    pickUp,
    deliver,
    release,
    finish: backToSearch,
  }
}
