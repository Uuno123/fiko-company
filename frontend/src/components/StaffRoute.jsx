import { Navigate, useLocation } from 'react-router-dom'
import StaffHeader from './StaffHeader.jsx'
import { useStaffAuth } from '../lib/StaffAuthContext.jsx'
import '../pages/StaffCommon.css'

function NotStaffNotice() {
  const { signOut } = useStaffAuth()

  return (
    <div className="page">
      <StaffHeader />
      <main className="staff-dashboard">
        <div className="staff-card">
          <h2>Tämä tili ei ole henkilökuntatili</h2>
          <p>
            Kirjauduit sisään, mutta tähän tiliin ei ole liitetty henkilökuntapääsyä. Jos kirjauduit vahingossa
            asiakas- tai kumppanitilillä, kirjaudu ulos ja käytä henkilökunnan omia tunnuksia. Henkilökuntatilit
            luodaan toistaiseksi käsin - ota yhteyttä pääkäyttäjään jos tarvitset pääsyn.
          </p>
          <div>
            <button type="button" className="staff-btn staff-btn--ghost" onClick={() => signOut()}>
              Kirjaudu ulos
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function StaffRoute({ children }) {
  const { isAuthenticated, isStaff, status } = useStaffAuth()
  const location = useLocation()

  if (status === 'loading') return null

  if (!isAuthenticated) {
    return <Navigate to="/henkilokunta/kirjaudu" state={{ from: location.pathname }} replace />
  }

  // Sessio on olemassa mutta ei kuulu staff_accounts-tauluun - esim. asiakas- tai kumppanitili
  // samalla Supabase-sessiolla. Ei riittävä henkilökuntapääsyyn, vaikka on kirjautunut jonnekin.
  if (!isStaff) {
    return <NotStaffNotice />
  }

  return children
}

export default StaffRoute
