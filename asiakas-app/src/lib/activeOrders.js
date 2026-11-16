import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from './supabase'
import { useAuth } from './auth'

// Käynnissä olevat tilaukset (sama lista kuin verkkosivun Omat tilaukset -sivulla).
export const ACTIVE_ORDER_STATUSES = ['awaiting_courier', 'pending', 'confirmed', 'preparing', 'ready']

async function countActiveOrders(userId) {
  if (!supabase || !userId) return 0
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', userId)
    .in('status', ACTIVE_ORDER_STATUSES)
  if (error) return 0
  return count ?? 0
}

// Onko kirjautuneella asiakkaalla käynnissä tilaus (kellon oranssi pallo,
// käyttäjän pyyntö 15.11.2026). Päivittyy, kun näkymä tulee taas esiin, ja
// tilausten muuttuessa (Supabase realtime).
export function useHasActiveOrder() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [hasActive, setHasActive] = useState(false)

  const refresh = useCallback(() => {
    if (!userId) {
      setHasActive(false)
      return
    }
    countActiveOrders(userId).then((count) => setHasActive(count > 0))
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      Promise.resolve().then(refresh)
    }, [refresh]),
  )

  useEffect(() => {
    if (!supabase || !userId) return undefined
    const channel = supabase
      .channel(`active-orders-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  return hasActive
}
