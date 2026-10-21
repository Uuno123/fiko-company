import { useEffect, useRef, useState } from 'react'
import { haversineKm, hasCoords } from '../../../frontend/src/lib/deliveryTime'
import { supabase } from './supabase'
import { colors } from '../theme'

// Alueen kysyntä palvelimelta (migraatio 0047): tilaukset 30 min aikana ja
// online-kuljettajat samalla alueella, jolta keikat jaetaan (8 km).
const REFRESH_MS = 60_000
// Uusi haku heti, kun on liikuttu näin paljon (alue vaihtuu).
const MOVE_KM = 1

export const DEMAND_LEVELS = {
  quiet: { label: 'Hiljaista', color: colors.gray400 },
  normal: { label: 'Normaali', color: colors.open },
  busy: { label: 'Kiireinen', color: colors.orange },
  very_busy: { label: 'Erittäin kiireinen', color: colors.danger },
}

// "4 tilausta / 30 min · 2 kuljettajaa online"
export function demandDetail(demand) {
  const orders = demand.orders_30min === 1 ? '1 tilaus' : `${demand.orders_30min} tilausta`
  const couriers = demand.couriers_online === 1 ? '1 kuljettaja' : `${demand.couriers_online} kuljettajaa`
  return `${orders} / 30 min · ${couriers} online`
}

// { level, orders_30min, waiting, couriers_online, radius_km } tai null
// (ei sijaintia tai palvelimen päivitys puuttuu).
export function useAreaDemand(position, enabled) {
  const [demand, setDemand] = useState(null)
  const fetchedAt = useRef(null)
  const latest = useRef(position)
  latest.current = position

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    const load = async () => {
      const point = latest.current
      if (!hasCoords(point)) return
      fetchedAt.current = point
      const { data, error } = await supabase.rpc('courier_area_demand', { p_lat: point.lat, p_lng: point.lng })
      if (!cancelled && !error) setDemand(data ?? null)
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [enabled])

  // Ensimmäinen sijainti tai pitkä siirtymä: haetaan heti.
  useEffect(() => {
    if (!enabled || !hasCoords(position)) return
    const last = fetchedAt.current
    if (last && haversineKm(last, position) < MOVE_KM) return
    fetchedAt.current = position
    supabase.rpc('courier_area_demand', { p_lat: position.lat, p_lng: position.lng }).then(({ data, error }) => {
      if (!error) setDemand(data ?? null)
    })
  }, [enabled, position?.lat, position?.lng])

  return demand
}
