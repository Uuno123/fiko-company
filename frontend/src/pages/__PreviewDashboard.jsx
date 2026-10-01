/* TEMPORARY PREVIEW FILE - not part of the app, not linked from anywhere, safe to delete.
   Renders the real partner dashboard (src/partner-dashboard) with a fake login and an
   in-memory data layer instead of Supabase, so every view can be clicked through and
   reviewed without an owner account. Writes change only this page's memory. */
import { useMemo, useState } from 'react'
import PartnerDashboard from '../partner-dashboard/PartnerDashboard.jsx'
import { DashboardApiContext } from '../partner-dashboard/api.js'
import { PartnerAuthContext } from '../lib/PartnerAuthContext.jsx'

const IMG = (id) => `https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/${id}.png?w=960`

const MOCK_RESTAURANT = {
  id: 'preview-restaurant',
  name: 'Burger Talli',
  category: 'Burgerit',
  city: 'Kuopio',
  address: 'Puijonkatu 15, 70100 Kuopio',
  lat: 62.8942,
  lng: 27.6794,
  image_url: '/burger.jpg',
  pickup_estimate_minutes: 15,
  is_open: true,
  commission_rate_percent: 10,
  opening_hours: null,
}

const MOCK_MENU = [
  { id: 'm1', category: 'Burgerit', name: 'Maple BBQ & Bacon Quarter Pounder®', description: 'Iso 100 % naudanlihapihvi, cheddar, pekoni ja Maple BBQ -kastike.', price_cents: 995, image_url: IMG('ca842538-affb-11f1-984a-fe269514dbf4_fi3177'), tags: ['Naudanliha', 'Pekoni'], is_available: true },
  { id: 'm2', category: 'Burgerit', name: 'Maple BBQ & Bacon Double Quarter Pounder®', description: 'Kaksi isoa naudanlihapihviä, pekonia ja Maple BBQ -kastiketta.', price_cents: 1265, image_url: IMG('ca81f3ee-affb-11f1-984a-fe269514dbf4_fi3180'), tags: ['Naudanliha'], is_available: true },
  { id: 'm3', category: 'Burgerit', name: 'Kasvisburgeri', description: '', price_cents: 1090, image_url: null, tags: ['Kasvis', 'Laktoositon'], is_available: true },
  { id: 'm4', category: 'Ateriat', name: 'Maple BBQ & Bacon Quarter Pounder® -ateria', description: 'Ateriaan kuuluu ranskalaiset ja juoma.', price_cents: 1495, image_url: IMG('ca855516-affb-11f1-984a-fe269514dbf4_fi3178'), tags: [], is_available: true },
  { id: 'm5', category: 'Ateriat', name: 'Double -ateria', description: 'Ateriaan kuuluu ranskalaiset ja juoma.', price_cents: 1900, image_url: IMG('ca830c16-affb-11f1-984a-fe269514dbf4_fi3181'), tags: [], is_available: false },
  { id: 'm6', category: 'Lisukkeet', name: 'Ranskalaiset', description: 'Isoannos, talon kastike', price_cents: 490, image_url: null, tags: ['Gluteeniton', 'Vegaaninen'], is_available: true },
  { id: 'm7', category: 'Juomat', name: 'Coca-Cola 0,5 l', description: '', price_cents: 390, image_url: null, tags: [], is_available: true },
]

const NAMES = ['Aino Korhonen', 'Mikko Lahti', 'Sanna Peltonen', 'Juho Virtanen', 'Emilia Rantanen', 'Ville Tuominen', 'Laura Nieminen', 'Otto Heikkinen']

function makeOrders() {
  const orders = []
  let n = 120
  const now = Date.now()
  // Deterministinen "satunnaisuus", jotta esikatselu näyttää joka kerta samalta.
  let seed = 7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  function order(createdAt, status, extra = {}) {
    const lines = []
    const count = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < count; i++) {
      const item = MOCK_MENU[Math.floor(rand() * MOCK_MENU.length)]
      lines.push({ id: `l${n}-${i}`, menu_item_id: item.id, name: item.name, price_cents: item.price_cents, unit_price_cents: item.price_cents, quantity: 1 + Math.floor(rand() * 2), selected_options: [] })
    }
    const subtotal = lines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0)
    const delivery = rand() > 0.4
    const name = NAMES[Math.floor(rand() * NAMES.length)]
    n += 1
    return {
      id: `o${n}`,
      order_number: `DLV-${String(n).padStart(4, '0')}`,
      customer_id: `c${Math.floor(rand() * 30)}`,
      status,
      delivery_method: delivery ? 'delivery' : 'pickup',
      delivery_name: name,
      delivery_phone: '040 123 4567',
      delivery_address: delivery ? '18, Puijonkatu, Multimäki, Kuopio, 70110, Suomi' : null,
      delivery_notes: rand() > 0.8 ? 'Ovikoodi 1234, 3. kerros' : null,
      subtotal_cents: subtotal,
      discount_cents: 0,
      delivery_fee_cents: delivery ? 599 : 0,
      service_fee_cents: 49,
      total_cents: subtotal + (delivery ? 599 : 0) + 49,
      estimated_ready_at: null,
      created_at: new Date(createdAt).toISOString(),
      order_items: lines,
      ...extra,
    }
  }
  for (let day = 45; day >= 1; day--) {
    const perDay = 4 + Math.floor(rand() * 9)
    for (let i = 0; i < perDay; i++) {
      const hour = 11 + Math.floor(rand() * 10)
      const t = new Date(now - day * 86_400_000)
      t.setHours(hour, Math.floor(rand() * 60), 0, 0)
      orders.push(order(t.getTime(), rand() > 0.07 ? 'completed' : 'cancelled'))
    }
  }
  const todayMorning = new Date()
  todayMorning.setHours(11, 0, 0, 0)
  for (let i = 0; i < 6; i++) orders.push(order(todayMorning.getTime() + i * 25 * 60_000, 'completed'))
  orders.push(order(now - 22 * 60_000, 'ready', { estimated_ready_at: new Date(now - 2 * 60_000).toISOString() }))
  orders.push(order(now - 14 * 60_000, 'preparing', { estimated_ready_at: new Date(now + 6 * 60_000).toISOString() }))
  orders.push(order(now - 6 * 60_000, 'confirmed', { estimated_ready_at: new Date(now + 14 * 60_000).toISOString() }))
  orders.push(order(now - 40_000, 'pending'))
  orders.push(order(now - 95_000, 'pending', { delivery_notes: 'Ei sipulia, kiitos!' }))
  return orders.reverse()
}

function useMockApi() {
  return useMemo(() => {
    let orders = makeOrders()
    let menu = MOCK_MENU.map((i) => ({ ...i }))
    const groups = {
      m1: [
        {
          id: 'g1',
          menu_item_id: 'm1',
          name: 'Lisätäytteet',
          selection_type: 'multi',
          min_selections: 0,
          max_selections: null,
          free_selections: 0,
          display_order: 0,
          options: [
            { id: 'go1', name: 'Pekoni', price_delta_cents: 150, is_default: false, display_order: 0 },
            { id: 'go2', name: 'Cheddar', price_delta_cents: 100, is_default: false, display_order: 1 },
          ],
        },
      ],
    }
    const wait = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 150))
    return {
      fetchOrders: () => wait(orders),
      fetchOrder: (id) => wait(orders.find((o) => o.id === id)),
      subscribeOrders: () => () => {},
      updateOrder: (id, fields) => {
        orders = orders.map((o) => (o.id === id ? { ...o, ...fields } : o))
        return wait()
      },
      updateRestaurant: () => wait(),
      fetchPlatformCategories: () => wait(['Aasialainen', 'Burgerit', 'Italialainen', 'Kahvila', 'Kebab & Pizza', 'Kotiruoka', 'Salaatit']),
      fetchMenu: () => wait(menu),
      createMenuItem: (_restaurantId, fields) => {
        const row = { ...fields, id: `m${Date.now()}` }
        menu = [...menu, row]
        return wait(row)
      },
      updateMenuItem: (id, fields) => {
        menu = menu.map((i) => (i.id === id ? { ...i, ...fields } : i))
        return wait()
      },
      deleteMenuItem: (id) => {
        menu = menu.filter((i) => i.id !== id)
        return wait()
      },
      fetchOptionGroups: (menuItemId) => wait(groups[menuItemId] ?? []),
      createOptionGroup: (menuItemId, group, options) => {
        groups[menuItemId] = [
          ...(groups[menuItemId] ?? []),
          { ...group, id: `g${Date.now()}`, menu_item_id: menuItemId, options: options.map((o, i) => ({ ...o, id: `go${Date.now()}${i}` })) },
        ]
        return wait()
      },
      saveOptionGroup: (groupId, fields, options) => {
        for (const key of Object.keys(groups)) {
          groups[key] = groups[key].map((g) =>
            g.id === groupId ? { ...g, ...fields, options: options.map((o, i) => ({ ...o, id: o.id ?? `go${Date.now()}${i}` })) } : g,
          )
        }
        return wait()
      },
      deleteOptionGroup: (groupId) => {
        for (const key of Object.keys(groups)) groups[key] = groups[key].filter((g) => g.id !== groupId)
        return wait()
      },
    }
  }, [])
}

function PreviewDashboard() {
  const api = useMockApi()
  const [restaurants] = useState([MOCK_RESTAURANT])
  const auth = {
    session: { user: { id: 'preview-owner' } },
    restaurants,
    isAuthenticated: true,
    isOwner: true,
    status: 'ready',
    signOut: async () => {},
    refreshRestaurants: async () => {},
  }
  return (
    <PartnerAuthContext.Provider value={auth}>
      <DashboardApiContext.Provider value={api}>
        <PartnerDashboard basePath="/__preview-dashboard" />
      </DashboardApiContext.Provider>
    </PartnerAuthContext.Provider>
  )
}

export default PreviewDashboard
