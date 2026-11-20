import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { COURIER_ACTIVE_STATUSES } from '../../../frontend/src/lib/orderStatus'

// Kuljettajan sijainti seurannan kartalle - sama kuin verkkosivun
// lib/courierTracking.js (courier_locations, migraatio 0043; RLS näyttää sen
// vain tilauksen asiakkaalle ja vain toimituksen aikana).
export function courierHasFood(order) {
  return order?.delivery_method === 'delivery' && ['picked_up', 'delivered'].includes(order?.courier_status)
}

export function useCourierPosition(order) {
  const courierId = order?.courier_id ?? null
  const active = Boolean(courierId) && COURIER_ACTIVE_STATUSES.includes(order?.courier_status)
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (!active || !supabase) return undefined
    let cancelled = false
    const apply = (row) => {
      if (!cancelled && row && Number.isFinite(row.lat) && Number.isFinite(row.lng)) {
        setPosition({ lat: row.lat, lng: row.lng })
      }
    }
    supabase
      .from('courier_locations')
      .select('lat, lng')
      .eq('courier_id', courierId)
      .maybeSingle()
      .then(({ data }) => apply(data))
    const channel = supabase
      .channel(`courier-location-${courierId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courier_locations', filter: `courier_id=eq.${courierId}` },
        (payload) => apply(payload.new),
      )
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [active, courierId])

  return active ? position : null
}
