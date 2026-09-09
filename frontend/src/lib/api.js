const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function request(path) {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Pyyntö epäonnistui (${res.status})`)
  }
  return res.json()
}

export function getRestaurants() {
  return request('/api/restaurants')
}

export function getRestaurantById(id) {
  return request(`/api/restaurants/${id}`)
}
