import { Router } from 'express'
import { supabase, isSupabaseConfigured } from '../supabaseClient.js'
import { seedRestaurants } from '../data/seedRestaurants.js'
import { seedMenuItems } from '../data/seedMenuItems.js'

const router = Router()

router.get('/', async (req, res) => {
  if (!isSupabaseConfigured) {
    const withMenuItems = seedRestaurants.map((restaurant) => ({
      ...restaurant,
      menu_items: seedMenuItems
        .filter((item) => item.restaurant_id === restaurant.id)
        .map((item) => ({ price_cents: item.price_cents, image_url: item.image_url })),
    }))
    return res.json(withMenuItems)
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('*, menu_items(price_cents, image_url)')
    .order('name', { ascending: true })

  if (error) {
    console.error('[delivo-backend] Ravintoloiden haku epäonnistui:', error.message)
    return res.status(500).json({ error: 'Ravintoloiden haku epäonnistui.' })
  }

  res.json(data)
})

router.get('/:id', async (req, res) => {
  const { id } = req.params

  if (!isSupabaseConfigured) {
    const restaurant = seedRestaurants.find((r) => r.id === id)
    if (!restaurant) {
      return res.status(404).json({ error: 'Ravintolaa ei löytynyt.' })
    }
    const menuItems = seedMenuItems.filter((item) => item.restaurant_id === id)
    return res.json({ ...restaurant, menu_items: menuItems })
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('*, menu_items(*, menu_item_option_groups(*, menu_item_options(*)))')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[delivo-backend] Ravintolan haku epäonnistui:', error.message)
    return res.status(500).json({ error: 'Ravintolan haku epäonnistui.' })
  }

  if (!data) {
    return res.status(404).json({ error: 'Ravintolaa ei löytynyt.' })
  }

  res.json(data)
})

export default router
