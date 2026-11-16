import { supabase } from './supabase'
import { fetchRestaurants } from './restaurants'
import { getDemoRestaurant } from '../../../frontend/src/lib/demoRestaurants'

// Lempipaikat (customer_favorites) kuten verkkosivun lib/favorites.js ja
// FavoritesSection.jsx: suosikkien id:t ja niiden ravintolat. Esittelyravintolan
// tiedot tulevat tiedostosta kuten sen omalla sivulla.
export async function getFavoriteRestaurantIds(customerId) {
  if (!supabase || !customerId) return []
  const { data, error } = await supabase
    .from('customer_favorites')
    .select('restaurant_id')
    .eq('customer_id', customerId)
  if (error) return []
  return data.map((row) => row.restaurant_id)
}

export async function removeFavorite(customerId, restaurantId) {
  if (!supabase) return false
  const { error } = await supabase
    .from('customer_favorites')
    .delete()
    .eq('customer_id', customerId)
    .eq('restaurant_id', restaurantId)
  return !error
}

export async function loadFavoriteRestaurants(customerId) {
  const [ids, restaurants] = await Promise.all([getFavoriteRestaurantIds(customerId), fetchRestaurants()])
  const byId = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant]))
  return ids
    .map((id) => {
      const demo = getDemoRestaurant(id)
      return demo ? { ...byId.get(id), ...demo } : byId.get(id)
    })
    .filter(Boolean)
}
