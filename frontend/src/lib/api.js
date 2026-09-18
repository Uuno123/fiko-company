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

export function getRestaurantById(id) {
  return request(`/api/restaurants/${id}`)
}

export function createPaymentIntent(payload) {
  return request('/api/payments/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
