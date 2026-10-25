import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import DelivoLogo from '../DelivoLogo.jsx'
import { sharedCopy } from './copy.js'

// Kumppanisivujen yläpalkki: logo, linkit osioihin, kielivalinta FI/EN ja
// päätoiminto (Hae kumppaniksi / Hae kuljettajaksi). Puhelimella valikko
// avautuu koko näytölle.
// links: [{ to, label }], cta: { to, label }.
function SiteHeader({ lang, onLangChange, links, cta }) {
  const t = sharedCopy(lang)
  const [open, setOpen] = useState(false)

  // Avoin valikko: Esc sulkee, eikä sivu vierity sen alla. Linkit sulkevat
  // valikon itse.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const langSwitch = (
    <div className="ps-lang" role="group" aria-label={t.nav.language}>
      {['fi', 'en'].map((code) => (
        <button
          key={code}
          type="button"
          className={lang === code ? 'is-active' : ''}
          aria-pressed={lang === code}
          onClick={() => onLangChange(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )

  return (
    <header className="ps-header">
      <div className="ps-container ps-header__inner">
        <Link to="/kumppanina" className="ps-header__brand" aria-label="Bidrop">
          <DelivoLogo className="ps-header__logo" />
          <span>{t.brandSuffix}</span>
        </Link>

        <nav className="ps-header__nav" aria-label={t.brandSuffix}>
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ps-header__actions">
          {langSwitch}
          <Link to={cta.to} className="ps-btn ps-btn--dark ps-header__cta">
            {cta.label}
          </Link>
          <button
            type="button"
            className="ps-header__menu-btn"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="ps-mobile-menu">
          <nav className="ps-mobile-menu__links" aria-label={t.brandSuffix}>
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          {langSwitch}
          <Link to={cta.to} className="ps-btn ps-btn--dark ps-btn--block" onClick={() => setOpen(false)}>
            {cta.label}
          </Link>
        </div>
      )}
    </header>
  )
}

export default SiteHeader
