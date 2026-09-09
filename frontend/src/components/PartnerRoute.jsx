import { Navigate, useLocation } from 'react-router-dom'
import { usePartnerAuth } from '../lib/PartnerAuthContext.jsx'

function PartnerRoute({ children }) {
  const { isAuthenticated, status } = usePartnerAuth()
  const location = useLocation()

  if (status === 'loading') return null

  if (!isAuthenticated) {
    return <Navigate to="/kumppani/kirjaudu" state={{ from: location.pathname }} replace />
  }

  return children
}

export default PartnerRoute
