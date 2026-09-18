/* TEMPORARY PREVIEW FILE - not part of the app, not linked from anywhere, safe to delete.
   Renders the real SettingsProfile page with a mocked AuthContext value (no real Supabase
   session) so it can be reviewed without hitting Supabase Auth. */
import { AuthContext } from '../lib/AuthContext.jsx'
import SettingsProfile from './SettingsProfile.jsx'

const MOCK_CUSTOMER = {
  id: 'mock-customer-1',
  name: 'Uuno Testaaja',
  email: 'uuno.tilaukset@gmail.com',
  phone: '0401234567',
  address: '',
}

const MOCK_AUTH_VALUE = {
  session: { user: { id: MOCK_CUSTOMER.id } },
  customer: MOCK_CUSTOMER,
  isAuthenticated: true,
  status: 'ready',
  signOut: async () => {},
  refreshCustomer: async () => {},
}

function PreviewAccount() {
  return (
    <AuthContext.Provider value={MOCK_AUTH_VALUE}>
      <SettingsProfile />
    </AuthContext.Provider>
  )
}

export default PreviewAccount
