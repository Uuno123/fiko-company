import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Yksittäisen tilauksen seuranta (17.11.2026): tilausrivi ravintolan tietoineen
// ja tuotteineen, päivittyy reaaliajassa ja varmuuden vuoksi 15 s välein -
// samat kentät kuin verkkosivun seurantanäkymä (OrderTrackingModal) käyttää.
const FIELDS =
  '*, restaurants(name, image_url, lat, lng, address), order_items(id, name, quantity, price_cents, unit_price_cents, selected_options)'

export function useTrackedOrder(orderId) {
  const [state, setState] = useState({ status: 'loading', order: null })

  const load = useCallback(async () => {
    if (!orderId || !supabase) return
    const { data, error } = await supabase.from('orders').select(FIELDS).eq('id', orderId).maybeSingle()
    if (error) setState((s) => (s.order ? s : { status: 'error', order: null }))
    else if (!data) setState({ status: 'error', order: null })
    else setState({ status: 'ready', order: data })
  }, [orderId])

  useEffect(() => {
    if (!orderId || !supabase) return undefined
    let cancelled = false
    const run = () => {
      if (!cancelled) load()
    }
    run()
    const channel = supabase
      .channel(`order-tracking-${orderId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, run)
      .subscribe()
    const timer = setInterval(run, 15_000)
    return () => {
      cancelled = true
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [orderId, load])

  return { ...state, refresh: load }
}
