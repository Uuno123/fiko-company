/* TEMPORARY PREVIEW FILE - not part of the app, not linked from anywhere, safe to delete.
   Renders the real Cart page with a mocked AuthContext value (no real Supabase session) so
   the checkout delivery-address map picker can be reviewed without a real login. Seed
   localStorage key "delivo-cart" before navigating here to have items in the cart. */
import { AuthContext } from '../lib/AuthContext.jsx'
import Cart from './Cart.jsx'

const MOCK_CUSTOMER = {
  id: 'mock-customer-1',
  name: 'Uuno Testaaja',
  email: 'uuno.tilaukset@gmail.com',
  phone: '0401234567',
  address: 'Kauppakatu 25, 70100 Kuopio',
}

const MOCK_AUTH_VALUE = {
  session: { user: { id: MOCK_CUSTOMER.id } },
  customer: MOCK_CUSTOMER,
  isAuthenticated: true,
  status: 'ready',
  signOut: async () => {},
  refreshCustomer: async () => {},
}

function PreviewCart() {
  return (
    <AuthContext.Provider value={MOCK_AUTH_VALUE}>
      <Cart />
    </AuthContext.Provider>
  )
}

export default PreviewCart
