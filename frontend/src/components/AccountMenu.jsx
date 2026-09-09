import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import './AccountMenu.css'

function PersonIcon() {
  return (
    <svg className="account-menu__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg className="account-menu__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AccountMenu({ currentPath, variant }) {
  const { isAuthenticated, customer, status, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  if (status === 'loading') {
    return <div className="site-header__auth" aria-hidden="true" />
  }

  if (!isAuthenticated) {
    return (
      <div className="site-header__auth">
        <Link
          to="/login"
          state={{ from: currentPath }}
          className={`auth-ghost-btn${variant === 'overlay' ? ' auth-ghost-btn--overlay' : ''}`}
        >
          <PersonIcon />
          Kirjaudu
        </Link>
        <Link to="/register" state={{ from: currentPath }} className="auth-pill-btn">
          Rekisteröidy
        </Link>
      </div>
    )
  }

  const firstName = customer?.name?.split(' ')[0] || 'Tili'

  return (
    <div className="account-menu" ref={menuRef}>
      <button type="button" className="account-menu__trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <PersonIcon />
        <span className="account-menu__name">{firstName}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="account-menu__dropdown" role="menu">
          <button
            type="button"
            className="account-menu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
          >
            Kirjaudu ulos
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
