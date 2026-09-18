import { Link } from 'react-router-dom'
import { useStaffAuth } from '../lib/StaffAuthContext.jsx'
import './StaffHeader.css'

function StaffHeader() {
  const { isStaff, signOut } = useStaffAuth()

  return (
    <header className="staff-header">
      <div className="staff-header__inner">
        <span className="staff-header__brand">
          <span className="staff-header__wordmark">Fiko</span>
          <span className="staff-header__sublabel">Henkilökunta</span>
        </span>

        {isStaff && (
          <nav className="staff-header__nav">
            <Link to="/henkilokunta/dashboard" className="staff-header__link">
              Kojelauta
            </Link>
            <button type="button" className="staff-header__link staff-header__link-button" onClick={() => signOut()}>
              Kirjaudu ulos
            </button>
          </nav>
        )}
      </div>
    </header>
  )
}

export default StaffHeader
