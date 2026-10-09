import { Navigate } from 'react-router-dom'
import AccountHub from './AccountHub.jsx'
import { useIsMobile } from '../lib/useIsMobile.js'

// Mobiilissa /asetukset on tilisivu (AccountHub), josta alasivuille mennään.
// Työpöydällä sivupalkki on jo navigaatio, joten ohjataan suoraan Omiin tietoihin.
function Settings() {
  const isMobile = useIsMobile()
  if (!isMobile) return <Navigate to="/asetukset/tiedot" replace />
  return <AccountHub />
}

export default Settings
