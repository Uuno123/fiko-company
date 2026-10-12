import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'
import { COURIER_ACTIVE_STATUSES } from './orderStatus.js'

// Asiakkaan seuranta: kuljettajan sijainti kartalle (migraatio 0043). Sijainti
// näkyy vain tilauksen asiakkaalle ja vain kun toimitus on käynnissä (RLS).
// Asiakkaalla ei ole koodia: kuljettaja todistaa toimituksen sijainnillaan
// osoitteessa, ja ainoa koodi on ravintolan noutokoodi (migraatio 0044).

// Kuljettajan sijainti { lat, lng } tai null. Päivittyy reaaliajassa, kun
// kuljettaja-app tallentaa uuden sijainnin.
export function useCourierPosition(order) {
  const courierId = order?.courier_id ?? null
  const active = Boolean(courierId) && COURIER_ACTIVE_STATUSES.includes(order?.courier_status)
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (!active) {
      setPosition(null)
      return undefined
    }
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
      .channel(`courier-location-${courierId}`)
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
