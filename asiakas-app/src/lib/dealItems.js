import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { dealPercent, dealPriceCents, msUntilDealsEnd } from '../../../frontend/src/lib/dailyDeals'

// Alennuksessa olevat tuotteet tarjoussivulle (käyttäjän pyyntö 17.11.2026).
// Sama päivän tarjoussääntö kuin verkkosivun ravintolasivulla ja backendin
// hinnoittelussa (frontend/src/lib/dailyDeals.js), joten näytetty hinta on se
// mikä veloitetaan. Vain oikeiden, avoinna olevien ravintoloiden saatavilla
// olevat tuotteet.
export function useDealItems(restaurants) {
  const [items, setItems] = useState([])

  const open = useMemo(
    () => restaurants.filter((r) => !r.isPlaceholder && r.is_open !== false),
    [restaurants],
  )
  const ids = useMemo(() => open.map((r) => r.id).sort().join(','), [open])

  useEffect(() => {
    if (!supabase || !ids) return undefined
    let cancelled = false
    supabase
      .from('menu_items')
      .select('id, restaurant_id, name, price_cents, image_url, is_available')
      .in('restaurant_id', ids.split(','))
      .eq('is_available', true)
      .then(({ data, error }) => {
        if (cancelled || error) return
        setItems(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [ids])

  return useMemo(() => {
    const byId = new Map(open.map((r) => [r.id, r]))
    return items
      .map((item) => ({
        ...item,
        percent: dealPercent(item.id),
        dealCents: dealPriceCents(item),
        restaurant: byId.get(item.restaurant_id),
      }))
      .filter((item) => item.percent > 0 && item.restaurant)
      .sort((a, b) => b.percent - a.percent || a.dealCents - b.dealCents)
      .slice(0, 20)
  }, [items, open])
}

// Aikaa tarjousjakson loppuun, päivittyy sekunnin välein.
export function useDealsCountdown() {
  const [ms, setMs] = useState(() => safeMsUntilEnd())
  useEffect(() => {
    const timer = setInterval(() => setMs(safeMsUntilEnd()), 1000)
    return () => clearInterval(timer)
  }, [])
  return ms
}

function safeMsUntilEnd() {
  try {
    return msUntilDealsEnd()
  } catch {
    // Intl-aikavyöhyke puuttuu: laitteen oma keskiyö.
    const now = new Date()
    const next = new Date(now)
    next.setHours(24, 0, 0, 0)
    return next - now
  }
}
