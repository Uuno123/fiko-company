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

function ChevronIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="account-menu__row-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
      <>
        {/* Desktop/tablet: erilliset Kirjaudu/Rekisteröidy-napit suoraan näkyvissä. */}
        <div className="site-header__auth site-header__auth--wide">
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

        {/* Mobiili: kompakti avatar+chevron, avaa pudotusvalikon jossa samat linkit. */}
        <div className="account-menu account-menu--narrow" ref={menuRef}>
          <button
            type="button"
            className="account-menu__trigger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Tili"
          >
            <span className="account-menu__avatar account-menu__avatar--guest">
              <PersonIcon />
            </span>
            <ChevronIcon className={`account-menu__trigger-chevron${open ? ' account-menu__trigger-chevron--open' : ''}`} />
          </button>

          {open && (
            <div className="account-menu__dropdown" role="menu">
              <Link
                to="/login"
                state={{ from: currentPath }}
                className="account-menu__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Kirjaudu
              </Link>
              <Link
                to="/register"
                state={{ from: currentPath }}
                className="account-menu__item"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Rekisteröidy
              </Link>
              <div className="account-menu__divider" />
              <Link to="/kumppanina" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
                Ravintoloille
              </Link>
            </div>
          )}
        </div>
      </>
    )
  }

  const firstName = customer?.name?.split(' ')[0] || 'Tili'
  const nameParts = customer?.name?.trim().split(/\s+/).filter(Boolean) ?? []
  const initial =
    nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : (nameParts[0]?.[0] || customer?.email?.[0] || '?').toUpperCase()

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Tili: ${firstName}`}
      >
        <span className="account-menu__avatar">{initial}</span>
        <ChevronIcon className={`account-menu__trigger-chevron${open ? ' account-menu__trigger-chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="account-menu__dropdown" role="menu">
          <Link to="/asetukset/tiedot" className="account-menu__profile-row" onClick={() => setOpen(false)}>
            <span className="account-menu__avatar account-menu__avatar--large">{initial}</span>
            <div className="account-menu__identity">
              <span className="account-menu__display-name">{customer?.name || 'Tili'}</span>
              <span className="account-menu__email">Profiili</span>
            </div>
            <ChevronRightIcon />
          </Link>

          <div className="account-menu__divider" />

          <Link to="/omat-tilaukset" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Tilaukset
          </Link>

          <Link to="/asetukset" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            Asetukset
          </Link>

          <div className="account-menu__divider" />

          <button
            type="button"
            className="account-menu__item account-menu__item--danger"
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
