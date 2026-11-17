import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getDemoRestaurant } from '../../../frontend/src/lib/demoRestaurants'

// Yksittäinen ravintola ruokalistoineen ja valintaryhmineen, kuten verkkosivun
// getRestaurantById (lib/api.js): esittelyravintolan (McDonald's) tiedot ja
// ruokalista tulevat tiedostosta, auki/kiinni-tila tietokannasta. Muut
// suoraan Supabasesta samalla haulla kuin backendin /api/restaurants/:id.
export async function fetchRestaurant(id) {
  const demo = getDemoRestaurant(id)
  if (demo) {
    if (!supabase) return demo
    const { data } = await supabase.from('restaurants').select('is_open, opening_hours').eq('id', id).maybeSingle()
    return data ? { ...demo, is_open: data.is_open, opening_hours: data.opening_hours } : demo
  }
  if (!supabase) throw new Error('Ei yhteyttä')
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, menu_items(*, menu_item_option_groups(*, menu_item_options(*)))')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Ravintolaa ei löytynyt')
  return data
}

export function useRestaurant(id) {
  const [state, setState] = useState({ status: 'loading', restaurant: null })
  useEffect(() => {
    let cancelled = false
    if (!id) return undefined
    fetchRestaurant(String(id))
      .then((restaurant) => !cancelled && setState({ status: 'ready', restaurant }))
      .catch(() => !cancelled && setState({ status: 'error', restaurant: null }))
    return () => {
      cancelled = true
    }
  }, [id])
  return state
}
