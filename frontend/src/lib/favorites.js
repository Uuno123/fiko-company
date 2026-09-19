import { supabase } from './supabaseClient.js'

export async function getFavoriteRestaurantIds(customerId) {
  const { data, error } = await supabase
    .from('customer_favorites')
    .select('restaurant_id')
    .eq('customer_id', customerId)

  if (error) {
    console.error('[delivo-frontend] Suosikkien haku epäonnistui:', error.message)
    return []
  }
  return data.map((row) => row.restaurant_id)
}

export async function isRestaurantFavorited(customerId, restaurantId) {
  const { data, error } = await supabase
    .from('customer_favorites')
    .select('restaurant_id')
    .eq('customer_id', customerId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  if (error) {
    console.error('[delivo-frontend] Suosikkitilan haku epäonnistui:', error.message)
    return false
  }
  return Boolean(data)
}

export async function addFavorite(customerId, restaurantId) {
  const { error } = await supabase
    .from('customer_favorites')
    .insert({ customer_id: customerId, restaurant_id: restaurantId })

  if (error) console.error('[delivo-frontend] Suosikkiin lisäys epäonnistui:', error.message)
  return !error
}

export async function removeFavorite(customerId, restaurantId) {
  const { error } = await supabase
    .from('customer_favorites')
    .delete()
    .eq('customer_id', customerId)
    .eq('restaurant_id', restaurantId)

  if (error) console.error('[delivo-frontend] Suosikista poisto epäonnistui:', error.message)
  return !error
}
