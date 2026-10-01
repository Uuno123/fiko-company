/* TEMPORARY PREVIEW FILE - not part of the app, not linked from anywhere, safe to delete.
   Renders OrderTrackingModal with a mocked order so the tracking view can be reviewed
   without a real login and a real active order. Same pattern as __PreviewCart.jsx. */
import OrderTrackingModal from '../components/OrderTrackingModal.jsx'
import ActiveOrderBubble from '../components/ActiveOrderBubble.jsx'
import { AuthContext } from '../lib/AuthContext.jsx'

const MOCK_ORDER = {
  id: 'mock-order-1',
  order_number: 'DELIVO-0015',
  status: 'pending',
  delivery_method: 'delivery',
  created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  estimated_ready_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
  delivery_address: 'Kauppakatu 25, 70100 Kuopio',
  delivery_lat: 62.8924,
  delivery_lng: 27.677,
  total_cents: 9178,
  restaurants: {
    name: 'Burger Talli',
    address: 'Puijonkatu 23, 70100 Kuopio',
    lat: 62.8975,
    lng: 27.6782,
  },
  order_items: [
    { id: 'l1', quantity: 3, name: 'Bacon Burger', unit_price_cents: 1390, selected_options: [] },
    { id: 'l2', quantity: 3, name: 'delivo Cheeseburger', unit_price_cents: 1290, selected_options: [] },
    { id: 'l3', quantity: 1, name: 'Ranskalaiset', unit_price_cents: 490, selected_options: [] },
  ],
}

// ?bubble=1: näytä "Seuraa tilausta" -kupla valekirjautumisella (localStorageen
// tallennettu simuloitu tilaus avaimella delivo-demo-order-mock-customer-1).
const MOCK_AUTH_VALUE = {
  session: { user: { id: 'mock-customer-1' } },
  customer: { id: 'mock-customer-1', name: 'Uuno Testaaja' },
  isAuthenticated: true,
  status: 'ready',
}

function PreviewTracking() {
  if (new URLSearchParams(window.location.search).has('bubble')) {
    return (
      <AuthContext.Provider value={MOCK_AUTH_VALUE}>
        <ActiveOrderBubble />
      </AuthContext.Provider>
    )
  }
  return <OrderTrackingModal order={MOCK_ORDER} onClose={() => {}} />
}

export default PreviewTracking
