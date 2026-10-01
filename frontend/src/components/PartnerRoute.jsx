import { Link, Navigate, useLocation } from 'react-router-dom'
import { Store } from 'lucide-react'
import PartnerHeader from './PartnerHeader.jsx'
import { usePartnerAuth } from '../lib/PartnerAuthContext.jsx'
import { EmptyState } from '../partner-dashboard/ui.jsx'
import '../partner-dashboard/dashboard.css'

function NotOwnerNotice() {
  const { signOut } = usePartnerAuth()

  return (
    <div className="page">
      <PartnerHeader />
      <main className="pd-loading">
        <EmptyState
          icon={Store}
          title="Tämä tili ei ole kumppanitili"
          text="Kirjauduit sisään, mutta tähän tiliin ei ole liitetty kumppaniravintolaa. Jos kirjauduit delivon asiakastilillä vahingossa, kirjaudu ulos ja käytä kumppanin omia tunnuksia."
          action={
            <div className="pd-button-row">
              <button type="button" className="pd-btn pd-btn--secondary" onClick={() => signOut()}>
                Kirjaudu ulos
              </button>
              <Link to="/kumppani/rekisteroidy" className="pd-btn pd-btn--primary">
                Jätä kumppanuushakemus
              </Link>
            </div>
          }
        />
      </main>
    </div>
  )
}

function PartnerRoute({ children }) {
  const { isAuthenticated, isOwner, status } = usePartnerAuth()
  const location = useLocation()

  if (status === 'loading') return null

  if (!isAuthenticated) {
    return <Navigate to="/kumppani/kirjaudu" state={{ from: location.pathname }} replace />
  }

  // Sessio on olemassa mutta ei kuulu restaurant_owners-tauluun - esim. asiakastili samalla
  // Supabase-sessiolla. Ei riittävä kumppanipääsyyn, vaikka on kirjautunut jonnekin.
  if (!isOwner) {
    return <NotOwnerNotice />
  }

  return children
}

export default PartnerRoute
