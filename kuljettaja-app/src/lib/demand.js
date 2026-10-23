import { useEffect, useRef, useState } from 'react'
import { haversineKm, hasCoords } from '../../../frontend/src/lib/deliveryTime'
import { supabase } from './supabase'
import { colors } from '../theme'

// Alueen kysyntä palvelimelta (migraatio 0047): tilaukset 30 min aikana ja
// online-kuljettajat samalla alueella, jolta keikat jaetaan (8 km).
const REFRESH_MS = 60_000
// Uusi haku heti, kun on liikuttu näin paljon (alue vaihtuu).
const MOVE_KM = 1

// Tason nimi käännöksistä: t(level.labelKey).
export const DEMAND_LEVELS = {
  quiet: { labelKey: 'demand.quiet', color: colors.gray400 },
  normal: { labelKey: 'demand.normal', color: colors.open },
  busy: { labelKey: 'demand.busy', color: colors.orange },
  very_busy: { labelKey: 'demand.veryBusy', color: colors.danger },
}

// "4 tilausta / 30 min · 2 kuljettajaa online" valitulla kielellä (t = useT()).
export function demandDetail(demand, t) {
  const orders =
    demand.orders_30min === 1 ? t('demand.orders.one') : t('demand.orders.other', { count: demand.orders_30min })
  const couriers =
    demand.couriers_online === 1 ? t('demand.couriers.one') : t('demand.couriers.other', { count: demand.couriers_online })
  return t('demand.detail', { orders, couriers })
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
