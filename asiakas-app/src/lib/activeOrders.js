import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { supabase } from './supabase'
import { useAuth } from './auth'

// Käynnissä olevat tilaukset (sama lista kuin verkkosivun Omat tilaukset -sivulla).
export const ACTIVE_ORDER_STATUSES = ['awaiting_courier', 'pending', 'confirmed', 'preparing', 'ready']

// Uusin käynnissä oleva tilaus (id) tai null.
async function latestActiveOrderId(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', userId)
    .in('status', ACTIVE_ORDER_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) return null
  return data?.[0]?.id ?? null
}

// Onko kirjautuneella asiakkaalla käynnissä tilaus (kellon oranssi pallo,
// käyttäjän pyyntö 15.11.2026). Päivittyy, kun näkymä tulee taas esiin, ja
// tilausten muuttuessa (Supabase realtime).
// Palauttaa uusimman käynnissä olevan tilauksen id:n (tai null): kello vie
// suoraan sen seurantaan (käyttäjän pyyntö 18.11.2026).
export function useActiveOrderId() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [activeId, setActiveId] = useState(null)

  const refresh = useCallback(() => {
    if (!userId) {
      setActiveId(null)
      return
    }
    latestActiveOrderId(userId).then(setActiveId)
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      Promise.resolve().then(refresh)
    }, [refresh]),
  )

  useEffect(() => {
    if (!supabase || !userId) return undefined
    // Yksilöllinen kanavan nimi: sama nimi kahdesti (sivu avautuu uudelleen
    // ennen kuin vanha kanava on suljettu) antoi virheen "cannot add
    // postgres_changes callbacks ... after subscribe()" (17.11.2026).
    const channel = supabase
      .channel(`active-orders-${userId}-${Math.random().toString(36).slice(2, 10)}`)
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

  return activeId
}

// Vanha nimi: onko tilaus käynnissä.
export function useHasActiveOrder() {
  return Boolean(useActiveOrderId())
}
