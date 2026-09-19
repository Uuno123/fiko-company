import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AccountMenu from './AccountMenu.jsx'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import SearchSuggest from './SearchSuggest.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import './Header.css'

function Header({ search, citySelector, cart, variant, back }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [isCityOpen, setIsCityOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [cartBumped, setCartBumped] = useState(false)
  const [cartRestaurantImages, setCartRestaurantImages] = useState({})
  const searchInputRef = useRef(null)
  const cityRef = useRef(null)
  const cartRef = useRef(null)
  const prevCartCount = useRef(cart?.count ?? 0)

  useEffect(() => {
    const missingIds = (cart?.groups ?? [])
      .map((g) => g.restaurantId)
      .filter((id) => !(id in cartRestaurantImages))
    if (missingIds.length === 0) return undefined

    let cancelled = false
    supabase
      .from('restaurants')
      .select('id, image_url')
      .in('id', missingIds)
      .then(({ data }) => {
        if (cancelled || !data) return
        setCartRestaurantImages((current) => {
          const next = { ...current }
          data.forEach((r) => {
            next[r.id] = r.image_url ?? null
          })
          missingIds.forEach((id) => {
            if (!(id in next)) next[id] = null
          })
          return next
        })
      })
    return () => {
      cancelled = true
    }
  }, [cart?.groups, cartRestaurantImages])

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
    search?.onChange('')
    searchInputRef.current?.focus()
  }

  const accountMenuVariant = isTransparent || variant === 'dark' ? 'overlay' : undefined

  const showSuggestions = Boolean(isSearchFocused && search?.value?.trim())

  return (
    <header
      className={`site-header${variant === 'overlay' ? ' site-header--overlay' : ''}${
        variant === 'dark' ? ' site-header--dark' : ''
      }${isTransparent ? ' site-header--transparent' : ''}`}
    >
      <div className="site-header__inner">
        <div className="site-header__left">
          {back ? (
            <button
              type="button"
              className="site-header__back"
              aria-label="Takaisin"
              onClick={() => navigate(-1)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <Link to="/" className="site-header__logo">
              delivo
            </Link>
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

        {search && (
          <div className="site-header__center">
            <div className="search-field-bar" onClick={() => searchInputRef.current?.focus()}>
              <svg className="search-field-bar__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.value.trim()) {
                    searchInputRef.current?.blur()
                    setIsSearchFocused(false)
                    search.onSubmit?.(search.value)
                    navigate(`/haku?q=${encodeURIComponent(search.value.trim())}`)
                  }
                }}
              />
              {search.value && (
                <button
                  type="button"
                  className="search-field-bar__clear"
                  aria-label="Tyhjennä haku"
                  onClick={closeSearch}
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {showSuggestions && (
              <>
                <div className="search-suggest-backdrop" />
                <SearchSuggest
                  query={search.value}
                  variant="dropdown"
                  onNavigate={() => {
                    searchInputRef.current?.blur()
                    setIsSearchFocused(false)
                  }}
                />
              </>
            )}
          </div>
        )}

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
                <>
                  <div className="cart-drawer-backdrop" onClick={() => setIsCartOpen(false)} />
                  <aside className="cart-drawer" role="dialog" aria-label="Ostoskori">
                    <div className="cart-drawer__header">
                      <span className="cart-drawer__title">Ostoskorisi</span>
                      <button
                        type="button"
                        className="cart-drawer__close"
                        aria-label="Sulje ostoskori"
                        onClick={() => setIsCartOpen(false)}
                      >
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    <div className="cart-drawer__body">
                      {cart.groups.map((group) => {
                        const itemCount = group.lines.reduce((sum, line) => sum + line.quantity, 0)
                        const groupTotalCents = group.lines.reduce(
                          (sum, line) => sum + line.quantity * (line.unitPriceCents ?? line.item.price_cents),
                          0,
                        )

                        return (
                          <div className="cart-drawer-card" key={group.restaurantId}>
                            <div className="cart-drawer-card__header">
                              <div className="cart-drawer-card__identity">
                                <span className="cart-drawer-card__avatar" aria-hidden="true">
                                  {cartRestaurantImages[group.restaurantId] ? (
                                    <img src={cartRestaurantImages[group.restaurantId]} alt="" />
                                  ) : (
                                    group.restaurantName?.trim().charAt(0).toUpperCase() || '?'
                                  )}
                                </span>
                                <div className="cart-drawer-card__titles">
                                  <span className="cart-drawer-card__name">{group.restaurantName}</span>
                                  <span className="cart-drawer-card__meta">
                                    {itemCount} {itemCount === 1 ? 'tuote' : 'tuotetta'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="cart-drawer-card__remove"
                                aria-label={`Tyhjennä ${group.restaurantName} korista`}
                                onClick={() => cart.onClearRestaurant(group.restaurantId)}
                              >
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path
                                    d="M5 6h10M8.5 6V4.8a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1V6M6.3 6l.6 9a1 1 0 0 0 1 .95h4.2a1 1 0 0 0 1-.95l.6-9"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>

                            <ul className="cart-drawer-card__items">
                              {group.lines.map((line) => (
                                <li className="cart-drawer-card__item" key={line.item.id + (line.optionsKey ?? '')}>
                                  <div className="cart-drawer-card__item-media">
                                    {line.item.image_url ? (
                                      <img src={line.item.image_url} alt="" />
                                    ) : (
                                      <RestaurantAvatarPlaceholder name={line.item.name} size="thumb" />
                                    )}
                                  </div>
                                  <div className="cart-drawer-card__item-info">
                                    <span className="cart-drawer-card__item-name">
                                      <span className="cart-drawer-card__item-qty">{line.quantity}×</span>{' '}
                                      {line.item.name}
                                    </span>
                                    {line.selectedOptions?.length > 0 && (
                                      <span className="cart-drawer-card__item-options">
                                        {line.selectedOptions.map((o) => o.name).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  <span className="cart-drawer-card__item-price">
                                    {cart.formatPrice(line.quantity * (line.unitPriceCents ?? line.item.price_cents))}
                                  </span>
                                </li>
                              ))}
                            </ul>

                            <div className="cart-drawer-card__footer">
                              <span className="cart-drawer-card__subtotal">
                                Välisumma: {cart.formatPrice(groupTotalCents)}
                              </span>
                              <div className="cart-drawer-card__actions">
                                <Link
                                  to={`/ravintola/${group.restaurantId}`}
                                  className="cart-drawer-card__add"
                                  onClick={() => setIsCartOpen(false)}
                                >
                                  Lisää tuotteita
                                </Link>
                                <Link
                                  to="/ostoskori"
                                  className="cart-drawer-card__checkout"
                                  onClick={() => setIsCartOpen(false)}
                                >
                                  Siirry kassalle
                                </Link>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="cart-drawer__footer">
                      <div className="cart-drawer__total">
                        <span>Yhteensä</span>
                        <span>{cart.formatPrice(cart.totalCents)}</span>
                      </div>
                      <button
                        type="button"
                        className="cart-drawer__clear"
                        onClick={() => {
                          cart.onClear()
                          setIsCartOpen(false)
                        }}
                      >
                        Tyhjennä koko ostoskori
                      </button>
                    </div>
                  </aside>
                </>
              )}
            </div>
          )}

          {!isAuthenticated && (
            <Link
              to="/kumppanina"
              className={`site-header__partner-link${
                isTransparent || variant === 'dark' ? ' site-header__partner-link--overlay' : ''
              }`}
            >
              Ravintoloille
            </Link>
          )}

          <AccountMenu currentPath={location.pathname} variant={accountMenuVariant} />
        </div>
      </div>
    </header>
  )
}

export default Header
