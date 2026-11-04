import { getDemoRestaurant } from './demoRestaurants.js'
import { supabase } from './supabaseClient.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function request(path, options) {
  const res = await fetch(`${API_URL}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Pyyntö epäonnistui (${res.status})`)
  }
  return res.json()
}

export function getRestaurants() {
  return request('/api/restaurants')
}

export async function getRestaurantById(id) {
  // Esittelyravintolan (lib/demoRestaurants.js) tiedot ja ruokalista tulevat
  // tiedostosta, mutta auki/kiinni-tila tietokannasta: ravintola voi sulkeutua
  // dashboardista, eikä suljettuun saa voida tilata.
  const demo = getDemoRestaurant(id)
  if (!demo) return request(`/api/restaurants/${id}`)
  if (!supabase) return demo
  const { data } = await supabase.from('restaurants').select('is_open, opening_hours').eq('id', id).maybeSingle()
  return data ? { ...demo, is_open: data.is_open, opening_hours: data.opening_hours } : demo
}

// Kirjautuneen asiakkaan token mukaan: backend tarkistaa sillä ensimmäisen
// tilauksen koodin (TERVETULOA, 4.11.2026).
export async function createPaymentIntent(payload) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: null }
  const token = data?.session?.access_token
  return request('/api/payments/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  })
}
