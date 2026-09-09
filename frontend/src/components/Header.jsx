import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AccountMenu from './AccountMenu.jsx'
import './Header.css'

function Header({ search, citySelector, cart, variant }) {
  const location = useLocation()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCityOpen, setIsCityOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [cartBumped, setCartBumped] = useState(false)
  const searchInputRef = useRef(null)
  const cityRef = useRef(null)
  const cartRef = useRef(null)
  const prevCartCount = useRef(cart?.count ?? 0)

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus()
  }, [isSearchOpen])

  useEffect(() => {
    const current = cart?.count ?? 0
    if (current > prevCartCount.current) {
      setCartBumped(true)
      const timer = setTimeout(() => setCartBumped(false), 400)
      prevCartCount.current = current
      return () => clearTimeout(timer)
    }
    prevCartCount.current = current
    return undefined
  }, [cart?.count])

  useEffect(() => {
    if (variant !== 'overlay') return undefined

    function handleScroll() {
      setIsScrolled(window.scrollY > 40)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [variant])

  const isTransparent = variant === 'overlay' && !isScrolled

  useEffect(() => {
    if (!isCityOpen) return undefined

    function handleClickOutside(e) {
      if (cityRef.current && !cityRef.current.contains(e.target)) setIsCityOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsCityOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCityOpen])

  useEffect(() => {
    if (!isCartOpen) return undefined

    function handleClickOutside(e) {
      if (cartRef.current && !cartRef.current.contains(e.target)) setIsCartOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsCartOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCartOpen])

  function closeSearch() {
    setIsSearchOpen(false)
    search?.onChange('')
  }

  function handleSearchBlur() {
    if (!search?.value) setIsSearchOpen(false)
  }

  return (
    <header
      className={`site-header${variant === 'overlay' ? ' site-header--overlay' : ''}${
        isTransparent ? ' site-header--transparent' : ''
      }`}
    >
      <div className="site-header__inner">
        <div className="site-header__left">
          <Link to="/" className="site-header__logo">
            Fiko
          </Link>

          {search && (
            <div className={`search-field${isSearchOpen ? ' search-field--open' : ''}`}>
              <button
                type="button"
                className="search-field__toggle"
                aria-label="Avaa haku"
                onClick={() => setIsSearchOpen(true)}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              <div className="search-field__box">
                <svg className="search-field__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="search"
                  aria-label="Hae ravintoloita"
                  placeholder={search.placeholder ?? 'Hae ravintoloita...'}
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  onBlur={handleSearchBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') search.onSubmit?.(search.value)
                  }}
                />
                <button
                  type="button"
                  className="search-field__close"
                  aria-label="Sulje haku"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={closeSearch}
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {citySelector && (
            <div className="city-select" ref={cityRef}>
              <button
                type="button"
                className="city-select__trigger"
                aria-haspopup="listbox"
                aria-expanded={isCityOpen}
                onClick={() => setIsCityOpen((open) => !open)}
              >
                <span className="city-select__badge">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
                <span className="city-select__value">{citySelector.value}</span>
                <svg className="city-select__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="m6 8 4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isCityOpen && (
                <div className="city-select__panel" role="listbox" aria-label="Valitse kaupunki">
                  {citySelector.options.map((city) => (
                    <button
                      type="button"
                      key={city}
                      role="option"
                      aria-selected={citySelector.value === city}
                      className={`city-select__option${
                        citySelector.value === city ? ' city-select__option--active' : ''
                      }`}
                      onClick={() => {
                        citySelector.onChange(city)
                        setIsCityOpen(false)
                      }}
                    >
                      {city}
                      {citySelector.value === city && (
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="m5 10 3.5 3.5L15 6.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="site-header__right">
          {cart && cart.count > 0 && (
            <div className="cart-menu" ref={cartRef}>
              <button
                type="button"
                className={`cart-menu__trigger${cartBumped ? ' cart-menu__trigger--bump' : ''}`}
                aria-haspopup="true"
                aria-expanded={isCartOpen}
                onClick={() => setIsCartOpen((open) => !open)}
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 6h12l-1 9.5a1 1 0 0 1-1 .9H6a1 1 0 0 1-1-.9L4 6Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M7 6V5a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="cart-menu__badge">{cart.count}</span>
              </button>

              {isCartOpen && (
                <div className="cart-menu__panel">
                  <div className="cart-menu__groups">
                    {cart.groups.map((group) => (
                      <div className="cart-menu__group" key={group.restaurantId}>
                        <span className="cart-menu__group-name">{group.restaurantName}</span>
                        <ul className="cart-menu__lines">
                          {group.lines.map((line) => (
                            <li key={line.item.id}>
                              <span>
                                {line.quantity} × {line.item.name}
                              </span>
                              <span>{cart.formatPrice(line.quantity * line.item.price_cents)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="cart-menu__total">
                    <span>Yhteensä</span>
                    <span>{cart.formatPrice(cart.totalCents)}</span>
                  </div>
                  <Link to="/ostoskori" className="cart-menu__checkout" onClick={() => setIsCartOpen(false)}>
                    Siirry kassalle
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M8 5l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    className="cart-menu__clear"
                    onClick={() => {
                      cart.onClear()
                      setIsCartOpen(false)
                    }}
                  >
                    Tyhjennä ostoskori
                  </button>
                </div>
              )}
            </div>
          )}

          <Link
            to="/kumppanina"
            className={`site-header__partner-link${isTransparent ? ' site-header__partner-link--overlay' : ''}`}
          >
            Ravintoloille
          </Link>

          <AccountMenu currentPath={location.pathname} variant={isTransparent ? 'overlay' : undefined} />
        </div>
      </div>
    </header>
  )
}

export default Header
