import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { coordinate, hasCoords, routeKm } from '../../../frontend/src/lib/deliveryTime'
import { dayKey, startOfDay } from './format'
import { useAuth } from './auth'
import { supabase } from './supabase'

// Kuljettajan toimitetut keikat tietokannasta: tilaukset, joissa kuljettaja on
// minä ja toimitus on kuitattu perille (orders.courier_status = 'delivered',
// migraatio 0043). Ansiot, keikkahistoria, keikan tiedot, profiilin luvut ja
// valikon päivän luvut lasketaan näistä - ei enää esimerkkidataa.

// Kuinka monen päivän keikat haetaan (ansioissa 4 viikkoa taaksepäin).
export const HISTORY_DAYS = 28

// Ansio: kuljettajan osuus (koko hinta) sovitusta kuljetushinnasta, tallennettu
// keikalle sopimuksessa (orders.courier_fee_cents, migraatio 0058).
const GIG_FIELDS =
  'id, order_number, delivery_address, delivery_lat, delivery_lng, courier_assigned_at, picked_up_at, delivered_at, courier_fee_cents, delivery_price_cents, restaurants(name, address, lat, lng)'
// Milloin palkkio maksettiin tilille (migraatio 0064, Ansioiden pallo).
const GIG_FIELDS_WITH_PAYOUT = `${GIG_FIELDS}, courier_paid_at`

// Aiempi versio tallensi ajetut keikat puhelimeen - tieto on nyt tietokannassa.
AsyncStorage.removeItem('delivo-completed-gigs').catch(() => {})

// "Kauppakatu 18, 70100 Kuopio" -> { street: 'Kauppakatu 18', area: 'Kuopio' }
function splitAddress(address) {
  const [street, ...rest] = String(address ?? '')
    .split(',')
    .map((part) => part.trim())
  const area = rest
    .join(', ')
    .replace(/\b\d{5}\b/, '')
    .trim()
  return { street: street || 'Toimitusosoite', area: area || 'Asiakas' }
}

function orderToGig(order) {
  const fee = order.courier_fee_cents ?? 0
  const { street, area } = splitAddress(order.delivery_address)
  const restaurant = {
    name: order.restaurants?.name ?? 'Ravintola',
    address: order.restaurants?.address ?? '',
    lat: coordinate(order.restaurants?.lat),
    lng: coordinate(order.restaurants?.lng),
  }
  const dropoff = { area, address: street, lat: coordinate(order.delivery_lat), lng: coordinate(order.delivery_lng) }
  const deliveredAt = new Date(order.delivered_at)
  const acceptedAt = order.courier_assigned_at ? new Date(order.courier_assigned_at) : deliveredAt
  return {
    id: order.id,
    number: order.order_number,
    restaurant,
    dropoff,
    acceptedAt,
    pickedUpAt: order.picked_up_at ? new Date(order.picked_up_at) : deliveredAt,
    deliveredAt,
    // Ajoreitti ravintolasta perille (sama arvio kuin tarjouksessa).
    distanceKm: hasCoords(restaurant) && hasCoords(dropoff) ? routeKm(restaurant, dropoff) : 0,
    durationMin: Math.max(1, Math.round((deliveredAt - acceptedAt) / 60000)),
    // price: asiakkaan maksama kuljetushinta, total: kuljettajan osuus siitä.
    pay: { price: order.delivery_price_cents ?? null, tip: 0, total: fee },
    // null = palkkio odottaa maksua (lib/payouts.js).
    paidAt: order.courier_paid_at ? new Date(order.courier_paid_at) : null,
  }
}

// Yhteinen välimuisti: kaikki näkymät näkevät saman listan ja päivittyvät yhdessä.
let cache = []
const listeners = new Set()

export async function refreshGigs(courierId) {
  if (!courierId || !supabase) return
  const since = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString()
  const query = (fields) =>
    supabase
      .from('orders')
      .select(fields)
      .eq('courier_id', courierId)
      .eq('courier_status', 'delivered')
      .gte('delivered_at', since)
      .order('delivered_at', { ascending: false })
      .limit(500)
  let { data, error } = await query(GIG_FIELDS_WITH_PAYOUT)
  // Migraatio 0064 ajamatta: keikat ilman maksutietoa.
  if (error?.code === '42703') ({ data, error } = await query(GIG_FIELDS))
  if (error) return
  cache = (data ?? []).map(orderToGig)
  listeners.forEach((listener) => listener(cache))
}

// Toimitetut keikat uusimmasta vanhimpaan. Haetaan uudelleen aina kun näkymä
// avataan (ja keikan valmistuttua, lib/jobs.js).
export function useGigs() {
  const { courier } = useAuth()
  const courierId = courier?.id ?? null
  const [gigs, setGigs] = useState(cache)

  useEffect(() => {
    listeners.add(setGigs)
    setGigs(cache)
    refreshGigs(courierId)
    return () => {
      listeners.delete(setGigs)
    }
  }, [courierId])

  return gigs
}

export function summarize(gigs) {
  const total = gigs.reduce((sum, gig) => sum + gig.pay.total, 0)
  return {
    count: gigs.length,
    total,
    tips: gigs.reduce((sum, gig) => sum + gig.pay.tip, 0),
    km: gigs.reduce((sum, gig) => sum + gig.distanceKm, 0),
    average: gigs.length ? Math.round(total / gigs.length) : 0,
  }
}

// Keikat päivittäin ryhmiteltynä (järjestys säilyy: uusin päivä ensin).
export function groupByDay(gigs) {
  const groups = []
  for (const gig of gigs) {
    const key = dayKey(gig.deliveredAt)
    let group = groups[groups.length - 1]
    if (!group || group.key !== key) {
      group = { key, day: startOfDay(gig.deliveredAt), gigs: [] }
      groups.push(group)
    }
    group.gigs.push(gig)
  }
  return groups.map((group) => ({ ...group, summary: summarize(group.gigs) }))
}
