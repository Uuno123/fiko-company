import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { WEBSITE_URL } from './links'

// Ravintolat suoraan Supabasesta (sama taulu kuin verkkosivun backendin
// /api/restaurants). Julkinen luku, RLS rajaa näkyvät rivit.
export async function fetchRestaurants() {
  if (!supabase) return []
  const { data, error } = await supabase.from('restaurants').select('*').order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Lista + lataustila + päivitys (vedä alas päivittääksesi).
export function useRestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [status, setStatus] = useState('loading')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const data = await fetchRestaurants()
      setRestaurants(data)
      setStatus('ready')
    } catch {
      setStatus((current) => (current === 'ready' ? current : 'error'))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchRestaurants()
      .then((data) => {
        if (cancelled) return
        setRestaurants(data)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [])

  return { restaurants, status, refreshing, refresh: () => load(true) }
}

// Verkkosivun kuvat ovat osittain sen omia tiedostoja (/category-*.webp):
// sovellus lataa ne verkkosivulta.
export function imageUri(url) {
  if (!url) return null
  return url.startsWith('/') ? `${WEBSITE_URL}${url}` : url
}
