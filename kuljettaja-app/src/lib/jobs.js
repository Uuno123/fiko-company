import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Vibration } from 'react-native'
import {
  DROPOFF_MIN,
  HANDOVER_MIN,
  coordinate,
  courierShareCents,
  hasCoords,
  haversineKm,
  rideMinutes,
  routeKm as routeLengthKm,
  travelMinutes,
} from '../../../frontend/src/lib/deliveryTime'
import { refreshGigs } from './gigs'
import { tr } from './i18n'
import { supabase } from './supabase'

// Oikeat keikat tietokannasta (migraatiot 0043-0046, 0058). Kulku:
//   1. Asiakas tilaa verkkosivulta. Kotiinkuljetuksen hinnasta sovitaan ensin:
//      kuljettajat tarjoavat hinnan (lib/bids.js) ja asiakas valitsee. Valittu
//      kuljettaja saa keikan heti (adoptJob) ja ravintola tilauksen.
//   2. Jos kuljettaja luopuu keikasta, palvelin tarjoaa sen samalla hinnalla
//      (migraatio 0046): lähin online-kuljettaja 8 km säteellä saa tarjouksen
//      yksin, 60 s aikaa. Appi kertoo palvelimelle online-tilan ja sijainnin
//      (courier_set_online, courier_heartbeat).
//   3. Kuljettajan pitää olla ravintolassa ruoan valmistuttua tai ajomatkan
//      jälkeen - kumpi on myöhemmin. Jos ravintola sanoo 40 min, aikaa on 40 min.
//   4. Nouto vaatii ravintolan noutokoodin (tai ravintolan luovutusmerkinnän),
//      toimitus kuljettajan sijainnin osoitteessa (asiakkaalla ei ole koodia,
//      migraatio 0044). Tietokanta tarkistaa todisteet ja ettei toimitus ole
//      fyysisesti liian nopea.
//   5. Keikan ajan sijainti tallentuu, jotta asiakas näkee kuljettajan kartalla.

export const OFFER_SECONDS = 60
// Ravintolan hyväksyntäaika (migraatio 0059). Asiakas valitsee kuljettajan ennen
// kuin ravintola saa tilauksen: kuljettaja odottaa vahvistusta lähtemättä.
export const RESTAURANT_ACCEPT_SECONDS = 90
export const ACTIVE_PHASES = ['awaitingRestaurant', 'toRestaurant', 'atRestaurant', 'toCustomer', 'completed']
const MOVING_PHASES = ['awaitingRestaurant', 'toRestaurant', 'atRestaurant', 'toCustomer']
const RESTAURANT_RECHECK_MS = 10_000

// Ajoajat ja -matkat: sama malli kuin asiakkaan saapumisarviossa verkkosivulla
// (frontend/src/lib/deliveryTime.js).
const LOCATION_INTERVAL_MS = 5000
const OFFER_RECHECK_MS = 10_000
// Online-tilassa sijainti palvelimelle näin usein (keikkajako käyttää vain alle
// 2 min vanhaa sijaintia), ja heti kun on liikuttu tarpeeksi.
const HEARTBEAT_MS = 30_000
const HEARTBEAT_MIN_MS = 10_000
const HEARTBEAT_MOVE_KM = 0.05
// Arvioiden yläraja: virheellinen sijainti ei saa tuottaa päivien arvioita.
const MAX_PLAN_MS = 3 * 60 * 60 * 1000

const ORDER_FIELDS =
  'id, order_number, status, delivery_method, delivery_name, delivery_phone, delivery_address, delivery_lat, delivery_lng, delivery_notes, estimated_ready_at, created_at, placed_at, courier_id, courier_status, courier_assigned_at, courier_arrive_by, delivery_eta, courier_fee_cents, delivery_price_cents, picked_up_at, restaurants(name, address, lat, lng)'

const PHASE_BY_COURIER_STATUS = { assigned: 'toRestaurant', at_restaurant: 'atRestaurant', picked_up: 'toCustomer' }

// Oman keikan vaihe: ravintolan hyväksyntää odotetaan ennen ajo-ohjetta.
function phaseForOrder(order) {
  if (order.status === 'pending' && order.courier_status === 'assigned') return 'awaitingRestaurant'
  return PHASE_BY_COURIER_STATUS[order.courier_status] ?? null
}

// Tietokantafunktioiden virhekoodit; tekstit valitulla kielellä (jobErr.*).
const ERROR_CODES = [
  'not_a_courier',
  'courier_busy',
  'order_not_available',
  'invalid_state',
  'order_cancelled',
  'order_not_found',
  'wrong_pickup_code',
  'no_location',
  'address_unknown',
  'not_at_address',
]

// "1,2 km" / "350 m"
function distanceText(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(meters / 10) * 10} m`
}

// Virhekoodi tekstiksi. too_early:N = N sekuntia liian aikaisin.
export function errorText(error) {
  const message = String(error?.message ?? error ?? '')
  const early = message.match(/too_early:(\d+)/)
  if (early) {
    const seconds = Number(early[1])
    const wait = seconds >= 90 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`
    return tr('jobErr.tooEarly', { wait })
  }
  // not_at_address:metrit = näin kaukana toimitusosoitteesta (migraatio 0044).
  const away = message.match(/not_at_address:(\d+)/)
  if (away) {
    return tr('jobErr.away', { distance: distanceText(Number(away[1])) })
  }
  const code = ERROR_CODES.find((key) => message.includes(key))
  if (code) return tr(`jobErr.${code}`)
  if (/network|fetch/i.test(message)) return tr('common.network')
  return tr('common.failed')
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
  return { street: street || tr('common.dropoffAddress'), area: area || tr('common.customer') }
}

// Tietokannan tilausrivi kuljettaja-appin keikaksi (tarjouskortti ja vaiheet).
function buildJob(order, position, vehicle) {
  const restaurant = {
    name: order.restaurants?.name ?? tr('common.restaurant'),
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
  // Ansio: kuljettajan osuus sovitusta kuljetushinnasta (migraatio 0058).
  // Uudelleen tarjotussa keikassa osuus lasketaan samasta sovitusta hinnasta.
  const total =
    order.courier_fee_cents ?? (order.delivery_price_cents != null ? courierShareCents(order.delivery_price_cents) : 0)
  const pay = { total, price: order.delivery_price_cents ?? null }

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    courierStatus: order.courier_status,
    customerName: String(order.delivery_name ?? '').split(' ')[0] || tr('common.customer'),
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
    placedAt: order.placed_at ? Date.parse(order.placed_at) : null,
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
// onForcedOffline: palvelin siirsi kuljettajan offline-tilaan (vastaamatta jääneet tarjoukset).
export function useCourierJobs({ courierId, online, position, settings, onForcedOffline }) {
  const [phase, setPhase] = useState('idle')
  const [job, setJob] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const lastPublish = useRef(0)
  const lastHeartbeat = useRef({ at: 0, point: null })
  const latest = useRef({ position, settings, phase, job, online, onForcedOffline })
  latest.current = { position, settings, phase, job, online, onForcedOffline }

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
      // Ravintolan hylkäämä tilaus ei ole enää keikka (migraatio 0059).
      .neq('status', 'cancelled')
      .order('courier_assigned_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const order = data?.[0]
        if (cancelled || !order) return
        setJob(buildJob(order, latest.current.position, latest.current.settings.vehicle))
        setPhase(phaseForOrder(order))
        loadItemCount(order.id)
      })
    return () => {
      cancelled = true
    }
  }, [courierId, loadItemCount])

  // Palvelin siirsi offline-tilaan (kaksi tarjousta jäi vastaamatta).
  const forcedOffline = useCallback(() => {
    showNotice(tr('notice.forcedOffline'))
    latest.current.onForcedOffline?.()
  }, [showNotice])

  // Online-tila palvelimelle: vain online-tilassa saa tarjouksia. Myös
  // käynnistyksessä (offline), jottei edellisen kerran tila jää voimaan.
  useEffect(() => {
    if (!courierId) return
    const point = latest.current.position
    supabase
      .rpc('courier_set_online', {
        p_online: online,
        p_lat: hasCoords(point) ? point.lat : null,
        p_lng: hasCoords(point) ? point.lng : null,
        p_vehicle: latest.current.settings.vehicle,
      })
      .then(({ error }) => {
        if (!error || !online) return
        // Pakollisia dokumentteja ei ole hyväksytty (migraatio 0053): takaisin offline-tilaan.
        if (String(error.message ?? '').includes('documents_not_approved')) {
          showNotice(tr('notice.docsNotApproved'))
          latest.current.onForcedOffline?.()
          return
        }
        showNotice(tr('notice.dispatchMissing'))
      })
    lastHeartbeat.current = { at: Date.now(), point }
  }, [courierId, online, showNotice])

  // Sijainti palvelimelle online-tilassa: 30 s välein ja kun on liikuttu.
  const heartbeat = useCallback(async () => {
    const point = latest.current.position
    lastHeartbeat.current = { at: Date.now(), point }
    const { data, error } = await supabase.rpc('courier_heartbeat', {
      p_lat: hasCoords(point) ? point.lat : null,
      p_lng: hasCoords(point) ? point.lng : null,
    })
    if (!error && data && data.online === false && latest.current.online) forcedOffline()
  }, [forcedOffline])

  useEffect(() => {
    if (!courierId || !online) return undefined
    const timer = setInterval(heartbeat, HEARTBEAT_MS)
    // Sovellus palasi näkyviin (esim. push-ilmoitusta napauttamalla): sijainti
    // palvelimelle heti, koska taustalla se ei välttämättä päivittynyt.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') heartbeat()
    })
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [courierId, online, heartbeat])

  useEffect(() => {
    if (!courierId || !online || !hasCoords(position)) return
    const { at, point } = lastHeartbeat.current
    // Ensimmäinen sijainti heti (online-tilaan mentäessä sitä ei ehkä vielä ollut).
    if (!hasCoords(point)) heartbeat()
    else if (haversineKm(point, position) > HEARTBEAT_MOVE_KM && Date.now() - at > HEARTBEAT_MIN_MS) heartbeat()
  }, [courierId, online, position?.lat, position?.lng, heartbeat])

  // Online/offline. Käynnissä oleva keikka viedään loppuun, vaikka ajastettu
  // offline laukeaisi kesken.
  useEffect(() => {
    if (online && phase === 'idle') setPhase('waiting')
    if (!online && (phase === 'waiting' || phase === 'offer')) {
      setJob(null)
      setPhase('idle')
    }
  }, [online, phase])

  // Ravintola hyväksyi tilauksen: nyt saa lähteä ravintolaan.
  const restaurantAccepted = useCallback(() => {
    if (latest.current.phase !== 'awaitingRestaurant') return
    setPhase('toRestaurant')
    showNotice(tr('notice.restaurantAccepted'))
    if (latest.current.settings.haptics) Vibration.vibrate([0, 400, 200, 400])
  }, [showNotice])

  // Asiakas valitsi tämän kuljettajan hintatarjouksen (tai kuljettaja hyväksyi
  // asiakkaan hinnan): keikka on nyt oma, ja se avataan suoraan ravintolaan-vaiheeseen.
  const adoptJob = useCallback(
    async (orderId) => {
      if (!courierId) return
      const { data: order } = await supabase.from('orders').select(ORDER_FIELDS).eq('id', orderId).maybeSingle()
      const nextPhase = order ? phaseForOrder(order) : null
      if (!order || order.courier_id !== courierId || !nextPhase) return
      if (latest.current.job?.id === order.id && ACTIVE_PHASES.includes(latest.current.phase)) return
      const { position: currentPosition, settings: currentSettings } = latest.current
      setJob(buildJob(order, currentPosition, currentSettings.vehicle))
      setPhase(nextPhase)
      loadItemCount(order.id)
      showNotice(
        nextPhase === 'awaitingRestaurant' ? tr('notice.pickedWait') : tr('notice.pickedGo'),
      )
      if (currentSettings.haptics) Vibration.vibrate([0, 400, 200, 400])
    },
    [courierId, loadItemCount, showNotice],
  )

  // Palvelimen tälle kuljettajalle tekemä voimassa oleva tarjous (migraatio 0046).
  const findOffer = useCallback(async () => {
    if (latest.current.phase !== 'waiting' || !courierId) return
    const { data: offers, error } = await supabase
      .from('courier_offers')
      .select('id, order_id, expires_at')
      .eq('courier_id', courierId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('offered_at', { ascending: false })
      .limit(1)
    const offer = offers?.[0]
    if (error || !offer || latest.current.phase !== 'waiting') return
    const { data: order } = await supabase.from('orders').select(ORDER_FIELDS).eq('id', offer.order_id).maybeSingle()
    if (!order || latest.current.phase !== 'waiting') return
    const { position: currentPosition, settings: currentSettings } = latest.current
    // Palvelimen aikaraja, mutta korkeintaan 60 s (puhelimen kello voi olla jäljessä).
    const expiresAt = Math.min(Date.parse(offer.expires_at), Date.now() + OFFER_SECONDS * 1000)
    setJob({ ...buildJob(order, currentPosition, currentSettings.vehicle), offerId: offer.id, expiresAt })
    setPhase('offer')
    // Tarjous huomataan myös taskussa: kaksi pitkää värähdystä (asetus).
    if (currentSettings.haptics) Vibration.vibrate([0, 400, 200, 400])
  }, [courierId])

  // Haku heti kun vapaana, ja varmuuden vuoksi 15 s välein (reaaliaika voi katketa).
  useEffect(() => {
    if (phase !== 'waiting') return undefined
    findOffer()
    const timer = setInterval(findOffer, 15_000)
    return () => clearInterval(timer)
  }, [phase, findOffer])

  // Uusi tarjous heti, ja tarjouksen peruutus (tilaus peruttiin tai siirtyi).
  useEffect(() => {
    if (!courierId || !online) return undefined
    const channel = supabase
      .channel(`courier-offers-${courierId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courier_offers', filter: `courier_id=eq.${courierId}` },
        (payload) => {
          const row = payload.new
          const { phase: currentPhase, job: currentJob } = latest.current
          if (row?.status === 'pending' && currentPhase === 'waiting') {
            findOffer()
            return
          }
          if (currentPhase === 'offer' && currentJob?.offerId === row?.id && row.status !== 'pending') {
            if (row.status === 'withdrawn') showNotice(tr('notice.offerWithdrawn'))
            backToSearch()
          }
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [courierId, online, findOffer, backToSearch, showNotice])

  // Reaaliaikaiset muutokset omaan keikkaan: peruutus, valmistusajan muutos ja
  // ravintolan luovutusmerkintä (nouto kuittautuu silloin automaattisesti).
  const keepListening = online || MOVING_PHASES.includes(phase)
  useEffect(() => {
    if (!courierId || !keepListening) return undefined
    const channel = supabase
      .channel(`courier-orders-${courierId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const row = payload.new
        const { job: currentJob, phase: currentPhase } = latest.current
        // Asiakas valitsi tämän kuljettajan: tilaus tulee näkyviin omana keikkana.
        if (
          !currentJob &&
          currentPhase === 'waiting' &&
          row?.courier_id === courierId &&
          (row.courier_status === 'assigned' || row.courier_status === 'at_restaurant')
        ) {
          adoptJob(row.id)
          return
        }
        // Tilaus poistettiin kokonaan (esim. testihistorian tyhjennys).
        if (payload.eventType === 'DELETE') {
          if (currentJob && payload.old?.id === currentJob.id) {
            showNotice(tr('notice.orderDeleted'))
            backToSearch()
          }
          return
        }
        if (currentJob && row?.id === currentJob.id) {
          if (row.status === 'cancelled') {
            showNotice(
              currentPhase === 'awaitingRestaurant' ? tr('notice.restaurantRejected') : tr('notice.restaurantCancelled'),
            )
            backToSearch()
            return
          }
          if (currentPhase === 'awaitingRestaurant' && row.status !== 'pending') restaurantAccepted()
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
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [courierId, keepListening, backToSearch, showNotice, adoptJob, restaurantAccepted])

  // Ravintolan vahvistusta odotettaessa tila myös kyselynä (reaaliaika voi katketa).
  useEffect(() => {
    if (phase !== 'awaitingRestaurant' || !job) return undefined
    const timer = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status, estimated_ready_at, courier_arrive_by, delivery_eta').eq('id', job.id).maybeSingle()
      if (latest.current.phase !== 'awaitingRestaurant' || latest.current.job?.id !== job.id) return
      if (!data || data.status === 'cancelled') {
        showNotice(tr('notice.restaurantRejected'))
        backToSearch()
        return
      }
      if (data.status !== 'pending') {
        setJob((current) =>
          current && current.id === job.id
            ? {
                ...current,
                status: data.status,
                foodReadyAt: data.estimated_ready_at ? Date.parse(data.estimated_ready_at) : current.foodReadyAt,
                arriveBy: data.courier_arrive_by ? Date.parse(data.courier_arrive_by) : current.arriveBy,
                deliverBy: data.delivery_eta ? Date.parse(data.delivery_eta) : current.deliverBy,
              }
            : current,
        )
        restaurantAccepted()
      }
    }, RESTAURANT_RECHECK_MS)
    return () => clearInterval(timer)
  }, [phase, job, backToSearch, showNotice, restaurantAccepted])

  // Tarjous vanhenee (palvelin siirtää sen seuraavalle ja laskee vastaamatta
  // jääneen), tai poistuu jos tilaus peruttiin. Tarkistus varmuuden vuoksi myös
  // kyselyllä, jos reaaliaikainen ilmoitus ei tullut.
  useEffect(() => {
    if (phase !== 'offer' || !job) return undefined
    const expire = setTimeout(async () => {
      backToSearch()
      showNotice(tr('notice.offerExpired'))
      const { data } = await supabase.rpc('courier_decline_offer', { p_order_id: job.id, p_timed_out: true })
      if (data && data.online === false && latest.current.online) forcedOffline()
    }, Math.max(0, job.expiresAt - Date.now()))
    const recheck = setInterval(async () => {
      if (!job.offerId) return
      const { data } = await supabase.from('courier_offers').select('status').eq('id', job.offerId).maybeSingle()
      if (latest.current.phase !== 'offer' || latest.current.job?.offerId !== job.offerId) return
      if (!data || data.status !== 'pending') {
        showNotice(tr('notice.offerGone'))
        backToSearch()
      }
    }, OFFER_RECHECK_MS)
    return () => {
      clearTimeout(expire)
      clearInterval(recheck)
    }
  }, [phase, job, backToSearch, showNotice, forcedOffline])

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

  // Hylkäys: palvelin tarjoaa keikan heti seuraavaksi lähimmälle.
  function decline() {
    const current = latest.current.job
    backToSearch()
    if (current) supabase.rpc('courier_decline_offer', { p_order_id: current.id, p_timed_out: false }).then(() => {})
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
    if (!hasCoords(latest.current.position)) return tr('jobErr.no_location')
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
    // Palvelin tarjoaa keikan seuraavalle (ei sinulle samalla kierroksella).
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
    adoptJob,
    showNotice,
    finish: backToSearch,
  }
}
