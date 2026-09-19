import { Link, Navigate, useLocation } from 'react-router-dom'
import PartnerHeader from './PartnerHeader.jsx'
import { usePartnerAuth } from '../lib/PartnerAuthContext.jsx'

function NotOwnerNotice() {
  const { signOut } = usePartnerAuth()

  return (
    <div className="page">
      <PartnerHeader />
      <main className="partner-dashboard">
        <div className="partner-card">
          <h2>Tämä tili ei ole kumppanitili</h2>
          <p>
            Kirjauduit sisään, mutta tähän tiliin ei ole liitetty kumppaniravintolaa. Jos kirjauduit delivon
            asiakastilillä vahingossa, kirjaudu ulos ja käytä kumppanin omia tunnuksia. Jos et ole vielä jättänyt
            kumppanuushakemusta, voit tehdä sen alta.
          </p>
          <div className="partner-menu-item-form__actions">
            <button type="button" className="partner-btn partner-btn--ghost" onClick={() => signOut()}>
              Kirjaudu ulos
            </button>
            <Link to="/kumppani/rekisteroidy" className="partner-btn partner-btn--primary">
              Jätä kumppanuushakemus
            </Link>
          </div>
        </div>
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
