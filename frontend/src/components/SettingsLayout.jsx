import { Navigate } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import SettingsTabs from './SettingsTabs.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'

function SettingsLayout({ children }) {
  const { isAuthenticated, status } = useAuth()

  if (!isSupabaseConfigured || status === 'loading') {
    return (
      <div className="page">
        <Header />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/asetukset' }} replace />
  }

  return (
    <div className="page">
      <Header />
      <SettingsTabs />
      <main className="settings-page">{children}</main>
      <Footer />
    </div>
  )
}

export default SettingsLayout
