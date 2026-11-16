import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'

export * from './rankingCore.js'

// Suosio (tilaukset 30 päivässä, 0-1) tietokannasta, migraatio 0050. Haetaan kerran
// sivulatauksella - järjestyksen ei tarvitse päivittyä minuutin tarkkuudella.
let popularityPromise = null
function loadPopularity() {
  if (!supabase) return Promise.resolve(new Map())
  popularityPromise ??= supabase
    .rpc('restaurant_popularity')
    .then(({ data, error }) => {
      if (error) throw error
      return new Map((data ?? []).map((row) => [row.restaurant_id, Number(row.popularity) || 0]))
    })
    .catch(() => {
      popularityPromise = null
      return new Map()
    })
  return popularityPromise
}

export function useRankingSignals() {
  const [popularity, setPopularity] = useState(null)
  useEffect(() => {
    let cancelled = false
    loadPopularity().then((map) => {
      if (!cancelled) setPopularity(map)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return { popularity }
}

