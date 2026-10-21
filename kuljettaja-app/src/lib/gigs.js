import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COURIER_PAY, coordinate } from '../../../frontend/src/lib/deliveryTime'
import { dayKey, startOfDay } from './format'
import { useAuth } from './auth'
import { supabase } from './supabase'

// Kuljettajan toimitetut keikat tietokannasta: tilaukset, joissa kuljettaja on
// minä ja toimitus on kuitattu perille (orders.courier_status = 'delivered',
// migraatio 0043). Ansiot, keikkahistoria, keikan tiedot, profiilin luvut ja
// valikon päivän luvut lasketaan näistä - ei enää esimerkkidataa.

// Kuinka monen päivän keikat haetaan (ansioissa 4 viikkoa taaksepäin).
export const HISTORY_DAYS = 28

// Palkkiomalli: perusmaksu + matkalisä kilometreistä. Sama kuin kuljettaja-app
// laskee tarjoukseen ja tallentaa keikalle (orders.courier_fee_cents).
export const PAY = COURIER_PAY

const GIG_FIELDS =
  'id, order_number, delivery_address, delivery_lat, delivery_lng, courier_assigned_at, picked_up_at, delivered_at, courier_fee_cents, restaurants(name, address, lat, lng)'

// Aiempi versio tallensi ajetut keikat puhelimeen - tieto on nyt tietokannassa.
AsyncStorage.removeItem('delivo-completed-gigs').catch(() => {})

// "Kauppakatu 18, 70100 Kuopio" -> { street: 'Kauppakatu 18', area: 'Kuopio' }
function splitAddress(address) {
  const [street, ...rest] = String(address ?? '').split(',').map((part) => part.trim())
  const area = rest.join(', ').replace(/\b\d{5}\b/, '').trim()
  return { street: street || 'Toimitusosoite', area: area || 'Asiakas' }
}

function orderToGig(order) {
  const fee = order.courier_fee_cents ?? PAY.baseCents
  const distance = Math.max(0, fee - PAY.baseCents)
  const { street, area } = splitAddress(order.delivery_address)
  const deliveredAt = new Date(order.delivered_at)
  const acceptedAt = order.courier_assigned_at ? new Date(order.courier_assigned_at) : deliveredAt
  return {
    id: order.id,
    number: order.order_number,
    restaurant: {
      name: order.restaurants?.name ?? 'Ravintola',
      address: order.restaurants?.address ?? '',
      lat: coordinate(order.restaurants?.lat),
      lng: coordinate(order.restaurants?.lng),
    },
    dropoff: { area, address: street, lat: coordinate(order.delivery_lat), lng: coordinate(order.delivery_lng) },
    acceptedAt,
    pickedUpAt: order.picked_up_at ? new Date(order.picked_up_at) : deliveredAt,
    deliveredAt,
    // Matkalisä on laskettu kilometreistä, joten matka saadaan siitä takaisin.
    distanceKm: Math.round((distance / PAY.perKmCents) * 10) / 10,
    durationMin: Math.max(1, Math.round((deliveredAt - acceptedAt) / 60000)),
    pay: { base: fee - distance, distance, tip: 0, total: fee },
  }
}

// Yhteinen välimuisti: kaikki näkymät näkevät saman listan ja päivittyvät yhdessä.
let cache = []
const listeners = new Set()

export async function refreshGigs(courierId) {
  if (!courierId || !supabase) return
  const since = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString()
  const { data, error } = await supabase
    .from('orders')
    .select(GIG_FIELDS)
    .eq('courier_id', courierId)
    .eq('courier_status', 'delivered')
    .gte('delivered_at', since)
    .order('delivered_at', { ascending: false })
    .limit(500)
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
