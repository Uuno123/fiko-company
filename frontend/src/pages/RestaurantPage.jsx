import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Spinner from '../components/Spinner.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import { getRestaurantById } from '../lib/api.js'
import { useCart } from '../lib/CartContext.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { isRestaurantFavorited, addFavorite, removeFavorite } from '../lib/favorites.js'
import { formatPrice } from '../lib/format.js'
import { getTodayHours, formatHoursRange } from '../lib/openingHours.js'
import {
  getOptionGroups,
  getDefaultSelection,
  isGroupValid,
  areAllGroupsValid,
  computeTotalDeltaCents,
  buildSelectedOptionsPayload,
} from '../lib/menuOptions.js'
import './RestaurantPage.css'

function groupByCategory(items) {
  const groups = new Map()
  for (const item of items) {
    const key = item.category || 'Ruokalista'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return Array.from(groups.entries())
}

function categoryId(category) {
  return 'menu-' + category.toLowerCase().replace(/\s+/g, '-')
}

// Fikolla ei ole vielä oikeaa arvostelujärjestelmää (ei arvostelutaulua tietokannassa) -
// tämä on visuaalinen placeholder käyttäjän hyväksymänä ("lisää visuaalinen placeholder"),
// korvataan oikealla arvostelumäärällä kun arvostelut joskus rakennetaan. Deterministinen
// ravintolan id:stä, jotta luku ei vaihdu joka renderöinnillä eikä ole sama joka ravintolalla.
function pseudoReviewCount(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return 40 + (hash % 460)
}

const MENU_TABS = [
  { key: 'all', label: 'Kaikki tuotteet' },
  { key: 'popular', label: 'Suosituimmat' },
  { key: 'offers', label: 'Tarjoukset' },
]

// Sama placeholder-periaate kuin pseudoReviewCount: ei oikeaa per-tuote arvostelutietoa
// tietokannassa, joten luku lasketaan deterministisesti tuotteen id:stä (pysyy samana joka
// renderöinnillä, vaihtelee tuotteittain).
function pseudoItemRating(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 13 + id.charCodeAt(i)) >>> 0
  }
  const rating = 3.8 + (hash % 13) / 10
  const count = 5 + (hash % 55)
  return { rating: rating.toFixed(1), count }
}

function RestaurantPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const { customer, isAuthenticated } = useAuth()
  const [restaurant, setRestaurant] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [menuQuery, setMenuQuery] = useState('')
  const [menuTab, setMenuTab] = useState('all')
  const [reviewsTapped, setReviewsTapped] = useState(false)
  const [activeCategory, setActiveCategory] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [optionSelections, setOptionSelections] = useState({})
  const [headerSearch, setHeaderSearch] = useState('')
  const [isFavorited, setIsFavorited] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const sectionRefs = useRef(new Map())

  const menuCategories = useMemo(
    () => Array.from(new Set((restaurant?.menu_items ?? []).map((item) => item.category || 'Ruokalista'))),
    [restaurant],
  )

  const todayHoursLabel = useMemo(
    () => formatHoursRange(getTodayHours(restaurant?.opening_hours)),
    [restaurant],
  )

  const restaurantClosed = restaurant?.is_open === false

  const selectedItemGroups = useMemo(() => getOptionGroups(selectedItem ?? {}), [selectedItem])
  const optionsDeltaCents = useMemo(
    () => computeTotalDeltaCents(selectedItemGroups, optionSelections),
    [selectedItemGroups, optionSelections],
  )
  const optionsValid = useMemo(
    () => areAllGroupsValid(selectedItemGroups, optionSelections),
    [selectedItemGroups, optionSelections],
  )

  const currentGroup = restaurant ? cart.groups.find((g) => g.restaurantId === restaurant.id) : null
  const currentGroupCount = currentGroup?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0
  const currentGroupTotalCents =
    currentGroup?.lines.reduce((sum, line) => sum + line.quantity * (line.unitPriceCents ?? line.item.price_cents), 0) ?? 0
  const otherGroupsCount = cart.count - currentGroupCount

  const normalizedMenuQuery = menuQuery.trim().toLowerCase()
  const filteredMenuItems = (restaurant?.menu_items ?? []).filter(
    (item) =>
      !normalizedMenuQuery ||
      item.name.toLowerCase().includes(normalizedMenuQuery) ||
      item.description?.toLowerCase().includes(normalizedMenuQuery),
  )
  const groupedMenu = groupByCategory(filteredMenuItems)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setIsFavorited(false)

    getRestaurantById(id)
      .then((data) => {
        if (cancelled) return
        setRestaurant(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!isAuthenticated || !customer) {
      setIsFavorited(false)
      return undefined
    }
    let cancelled = false
    isRestaurantFavorited(customer.id, id).then((favorited) => {
      if (!cancelled) setIsFavorited(favorited)
    })
    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated, customer])

  async function toggleFavorite() {
    if (!isAuthenticated || !customer) {
      navigate('/login', { state: { from: `/ravintola/${id}` } })
      return
    }
    const next = !isFavorited
    setIsFavorited(next)
    const ok = next ? await addFavorite(customer.id, id) : await removeFavorite(customer.id, id)
    if (!ok) setIsFavorited(!next)
  }

  // navigator.share puuttuu useimmilta työpöytäselaimilta - kopioidaan linkki leikepöydälle
  // sen sijaan ja näytetään hetkeksi kuittaus, ettei nappi tunnu tekevän mitään.
  async function shareRestaurant() {
    const shareData = { title: restaurant.name, url: window.location.href }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // Käyttäjä perui jakamisen - ei tehdä mitään.
      }
      return
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url)
      setLinkCopied(true)
    }
  }

  useEffect(() => {
    if (menuCategories.length === 0) return undefined

    setActiveCategory((current) => (menuCategories.includes(current) ? current : menuCategories[0]))

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActiveCategory(visible.target.dataset.category)
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    )

    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [menuCategories])

  useEffect(() => {
    if (!selectedItem) return undefined
    document.body.style.overflow = 'hidden'
    function handleKeyDown(e) {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedItem])

  useEffect(() => {
    if (!justAdded) return undefined
    const timer = setTimeout(() => closeModal(), 700)
    return () => clearTimeout(timer)
  }, [justAdded])

  useEffect(() => {
    if (!linkCopied) return undefined
    const timer = setTimeout(() => setLinkCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [linkCopied])

  useEffect(() => {
    if (!reviewsTapped) return undefined
    const timer = setTimeout(() => setReviewsTapped(false), 1800)
    return () => clearTimeout(timer)
  }, [reviewsTapped])

  function scrollToCategory(category) {
    document.getElementById(categoryId(category))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openItem(item) {
    setSelectedItem(item)
    setQuantity(1)
    setJustAdded(false)
    const groups = getOptionGroups(item)
    const initial = {}
    groups.forEach((group) => {
      initial[group.id] = getDefaultSelection(group)
    })
    setOptionSelections(initial)
  }

  function closeModal() {
    setSelectedItem(null)
    setJustAdded(false)
  }

  function toggleOption(group, optionId) {
    setOptionSelections((current) => {
      const selected = current[group.id] ?? []
      if (group.selection_type === 'single') {
        const next = selected[0] === optionId && group.min_selections === 0 ? [] : [optionId]
        return { ...current, [group.id]: next }
      }
      const max = group.max_selections ?? Infinity
      if (selected.includes(optionId)) {
        return { ...current, [group.id]: selected.filter((id) => id !== optionId) }
      }
      if (selected.length >= max) return current
      return { ...current, [group.id]: [...selected, optionId] }
    })
  }

  function addSelectedToCart() {
    if (selectedItem.is_available === false || restaurant.is_open === false || !optionsValid) return
    const selectedOptions = buildSelectedOptionsPayload(selectedItemGroups, optionSelections)
    const unitPriceCents = selectedItem.price_cents + optionsDeltaCents
    cart.addItem(restaurant, selectedItem, quantity, { selectedOptions, unitPriceCents })
    setJustAdded(true)
  }

  function quickAdd(e, item) {
    e.stopPropagation()
    if (item.is_available === false || restaurant.is_open === false) return
    const groups = getOptionGroups(item)
    if (groups.some((g) => g.min_selections > 0)) {
      openItem(item)
      return
    }
    cart.addItem(restaurant, item, 1)
  }

  function handleCardKeyDown(e, item) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openItem(item)
    }
  }

  return (
    <div className="page">
      <div className={`restaurant-hero-wrap${restaurant?.image_url ? ' restaurant-hero-wrap--overlay' : ''}`}>
        <Header
          back
          variant={restaurant?.image_url ? 'overlay' : undefined}
          search={{
            value: headerSearch,
            onChange: setHeaderSearch,
            onSubmit: (q) => navigate(`/?q=${encodeURIComponent(q)}`),
            placeholder: 'Hae delivosta...',
          }}
          citySelector={
            restaurant?.city
              ? {
                  value: restaurant.city,
                  options: [restaurant.city],
                  onChange: (city) => navigate(`/?city=${encodeURIComponent(city)}`),
                }
              : null
          }
        />

        {status === 'ready' && restaurant && (
          <div className="restaurant-hero">
            {restaurant.image_url ? (
              <img src={restaurant.image_url} alt={restaurant.name} />
            ) : (
              <RestaurantAvatarPlaceholder name={restaurant.name} size="hero" />
            )}
          </div>
        )}

        {status === 'ready' && restaurant && (
          <div className="restaurant-info-card-wrap">
            <div className="restaurant-info-card">
              <div className="restaurant-info-card__avatar">
                {restaurant.image_url ? (
                  <img src={restaurant.image_url} alt="" />
                ) : (
                  <RestaurantAvatarPlaceholder name={restaurant.name} size="card" />
                )}
              </div>

              <div className="restaurant-info-card__text">
                <h1>{restaurant.name}</h1>
                <div className="restaurant-info-card__meta">
                  <span className="category-tag">{restaurant.category}</span>
                  {restaurant.rating != null && (
                    <span className="restaurant-info-card__rating">
                      <Star size={14} fill="currentColor" aria-hidden="true" />
                      {Number(restaurant.rating).toFixed(1)}
                      <span className="restaurant-info-card__review-count">
                        ({pseudoReviewCount(restaurant.id)}+)
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    className="restaurant-info-card__reviews-btn"
                    onClick={() => setReviewsTapped(true)}
                  >
                    {reviewsTapped ? 'Tulossa pian' : 'Katso arvostelut'}
                  </button>
                </div>
              </div>

              <div className="restaurant-info-card__actions">
                <button
                  type="button"
                  className="favorite-button"
                  aria-label={linkCopied ? 'Linkki kopioitu' : 'Jaa ravintola'}
                  onClick={shareRestaurant}
                >
                  {linkCopied ? (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="m5 10 3.5 3.5L15 6.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="15" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="5" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="15" cy="15" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M6.9 8.9 13.1 5.9M6.9 11.1 13.1 14.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className={`favorite-button${isFavorited ? ' favorite-button--active' : ''}`}
                  aria-pressed={isFavorited}
                  aria-label={isFavorited ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
                  onClick={toggleFavorite}
                >
                  <svg viewBox="0 0 20 20" fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true">
                    <path
                      d="M10 17.5S3 13.4 3 8.6A3.6 3.6 0 0 1 10 6a3.6 3.6 0 0 1 7 2.6c0 4.8-7 8.9-7 8.9Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <main className={`restaurant-page${currentGroupCount > 0 ? ' restaurant-page--with-cart-bar' : ''}`}>
        {status === 'loading' && <Spinner label="Ladataan ravintolaa" />}
        {status === 'error' && (
          <p className="state-message state-message--error">Ravintolaa ei löytynyt: {errorMessage}</p>
        )}

        {status === 'ready' && restaurant && (
          <article className="restaurant-detail">
            <div className="restaurant-detail__body">
              {restaurantClosed && (
                <p className="restaurant-closed-notice">
                  Ravintola on juuri nyt suljettu, eikä tilaaminen ole mahdollista.
                  {todayHoursLabel ? ` Tänään avoinna ${todayHoursLabel}.` : ''}
                </p>
              )}
            </div>

            {restaurant.menu_items?.length > 0 ? (
              <>
                <div className="restaurant-menu-tabs" role="tablist" aria-label="Tuotenäkymä">
                  {MENU_TABS.map((tab) => (
                    <button
                      type="button"
                      key={tab.key}
                      role="tab"
                      aria-selected={menuTab === tab.key}
                      className={`restaurant-menu-tabs__btn${menuTab === tab.key ? ' restaurant-menu-tabs__btn--active' : ''}`}
                      onClick={() => setMenuTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                  {menuTab === 'all' &&
                    menuCategories.map((category) => (
                      <button
                        type="button"
                        key={category}
                        className={`restaurant-menu-tabs__btn${activeCategory === category ? ' restaurant-menu-tabs__btn--active' : ''}`}
                        onClick={() => scrollToCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                </div>

                {menuTab !== 'all' && (
                  <div className="restaurant-detail__body">
                    <p className="state-message">
                      {menuTab === 'popular' ? 'Suosituimmat tuotteet' : 'Erikoistarjoukset'} tulossa pian.
                    </p>
                  </div>
                )}

                {menuTab === 'all' && (
                  <>
                <div className="menu-section-heading">
                  <h2>Kaikki tuotteet</h2>
                  <p>Kattava valikoima ravintolan {restaurant.name} tuotteita.</p>
                </div>

                <div className="menu-nav">
                  <div className="menu-nav__search">
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input
                      type="search"
                      aria-label={`Etsi ruokalistalta: ${restaurant.name}`}
                      placeholder="Etsi ruokalistalta..."
                      value={menuQuery}
                      onChange={(e) => setMenuQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="restaurant-detail__body restaurant-detail__body--menu">
                  {groupedMenu.length > 0 ? (
                    <div className="menu">
                      {groupedMenu.map(([category, items]) => (
                        <section
                          className="menu-section"
                          id={categoryId(category)}
                          data-category={category}
                          key={category}
                          ref={(el) => {
                            if (el) sectionRefs.current.set(category, el)
                            else sectionRefs.current.delete(category)
                          }}
                        >
                          <h2 className="menu-section__title">{category}</h2>
                          <ul className="menu-grid">
                            {items.map((item) => (
                              <li key={item.id}>
                                <div
                                  className={`menu-card${item.is_available === false ? ' menu-card--unavailable' : ''}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openItem(item)}
                                  onKeyDown={(e) => handleCardKeyDown(e, item)}
                                >
                                  <div className="menu-card__media-wrap">
                                    <div className="menu-card__media">
                                      {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} />
                                      ) : (
                                        <RestaurantAvatarPlaceholder name={item.name} size="thumb" />
                                      )}
                                    </div>
                                    {item.is_available !== false && !restaurantClosed && (
                                      <button
                                        type="button"
                                        className="menu-card__add"
                                        aria-label={`Lisää ${item.name} ostoskoriin`}
                                        onClick={(e) => quickAdd(e, item)}
                                      >
                                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                          <path
                                            d="M10 4v12M4 10h12"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                          />
                                        </svg>
                                      </button>
                                    )}
                                  </div>

                                  <div className="menu-card__info">
                                    <span className="menu-card__name">{item.name}</span>
                                    {item.is_available !== false && (
                                      <span className="menu-card__rating">
                                        <Star size={12} fill="currentColor" aria-hidden="true" />
                                        {pseudoItemRating(item.id).rating}
                                        <span className="menu-card__rating-count">
                                          ({pseudoItemRating(item.id).count}+)
                                        </span>
                                      </span>
                                    )}
                                    {item.description && (
                                      <span className="menu-card__description">{item.description}</span>
                                    )}
                                    {item.tags?.length > 0 && (
                                      <div className="menu-card__tag-list">
                                        {item.tags.slice(0, 3).map((tag) => (
                                          <span className="menu-card__tag-chip" key={tag}>
                                            {tag}
                                          </span>
                                        ))}
                                        {item.tags.length > 3 && (
                                          <span className="menu-card__tag-chip menu-card__tag-chip--more">
                                            +{item.tags.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {item.is_available === false ? (
                                      <span className="menu-card__sold-out">Loppu valikoimasta</span>
                                    ) : (
                                      <span className="menu-card__price">{formatPrice(item.price_cents)}</span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <p className="state-message">Ei tuloksia haulle "{menuQuery}".</p>
                  )}
                </div>
                  </>
                )}
              </>
            ) : (
              <div className="restaurant-detail__body">
                <div className="coming-soon">
                  <p>Ruokalista tulossa pian.</p>
                </div>
              </div>
            )}
          </article>
        )}
      </main>

      <Footer />

      {selectedItem && (
        <div className="item-modal__backdrop" onClick={closeModal}>
          <div className="item-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="item-modal__close" aria-label="Sulje" onClick={closeModal}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            <div className="item-modal__media">
              {selectedItem.image_url ? (
                <img src={selectedItem.image_url} alt={selectedItem.name} />
              ) : (
                <RestaurantAvatarPlaceholder name={selectedItem.name} size="hero" />
              )}
            </div>

            <div className="item-modal__body">
              <h2>{selectedItem.name}</h2>
              {selectedItem.description && <p className="item-modal__description">{selectedItem.description}</p>}
              {selectedItem.tags?.length > 0 && (
                <div className="item-modal__tag-list">
                  {selectedItem.tags.map((tag) => (
                    <span className="item-modal__tag-chip" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="item-modal__price">{formatPrice(selectedItem.price_cents)}</p>

              {selectedItemGroups.map((group) => {
                const selected = optionSelections[group.id] ?? []
                const max = group.max_selections ?? Infinity
                return (
                  <div className="option-group" key={group.id}>
                    <div className="option-group__header">
                      <span className="option-group__name">{group.name}</span>
                      <span className="option-group__hint">
                        {group.selection_type === 'single'
                          ? group.min_selections > 0
                            ? 'Valitse yksi'
                            : 'Valitse yksi (valinnainen)'
                          : group.max_selections
                            ? `Valitse ${group.min_selections}-${group.max_selections}`
                            : group.min_selections > 0
                              ? `Valitse vähintään ${group.min_selections}`
                              : 'Valitse haluamasi'}
                        {group.free_selections > 0 ? ` · ${group.free_selections} ilmaiseksi` : ''}
                      </span>
                    </div>
                    <div className="option-group__options">
                      {group.menu_item_options.map((option) => {
                        const isSelected = selected.includes(option.id)
                        const disabled =
                          !isSelected && group.selection_type === 'multi' && selected.length >= max
                        return (
                          <button
                            type="button"
                            key={option.id}
                            className={`option-row${isSelected ? ' option-row--selected' : ''}`}
                            disabled={disabled}
                            onClick={() => toggleOption(group, option.id)}
                          >
                            <span className="option-row__name">
                              {option.name}
                              {option.price_delta_cents > 0 && (
                                <span className="option-row__price">+{formatPrice(option.price_delta_cents)}</span>
                              )}
                            </span>
                            <span
                              className={`option-row__control${group.selection_type === 'single' ? ' option-row__control--radio' : ''}${isSelected ? ' option-row__control--checked' : ''}`}
                              aria-hidden="true"
                            >
                              {isSelected && group.selection_type !== 'single' && (
                                <svg viewBox="0 0 16 16" fill="none">
                                  <path
                                    d="m3.5 8.5 2.8 2.8 6.2-6.6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {!isGroupValid(group, selected) && (
                      <p className="option-group__error">
                        {group.min_selections > 0 ? `Valitse vähintään ${group.min_selections}` : ''}
                      </p>
                    )}
                  </div>
                )
              })}

              {selectedItem.is_available === false ? (
                <div className="item-modal__actions">
                  <button type="button" className="item-modal__add item-modal__add--soldout" disabled>
                    Loppu valikoimasta
                  </button>
                </div>
              ) : restaurantClosed ? (
                <div className="item-modal__actions">
                  <button type="button" className="item-modal__add item-modal__add--soldout" disabled>
                    Ravintola on suljettu
                  </button>
                </div>
              ) : (
                <div className="item-modal__actions">
                  <div className="quantity-stepper">
                    <button
                      type="button"
                      aria-label="Vähennä määrää"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span>{quantity}</span>
                    <button type="button" aria-label="Lisää määrää" onClick={() => setQuantity((q) => q + 1)}>
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`item-modal__add${justAdded ? ' item-modal__add--added' : ''}`}
                    onClick={addSelectedToCart}
                    disabled={justAdded || !optionsValid}
                  >
                    {justAdded ? (
                      <>
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="m5 10 3.5 3.5L15 6.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Lisätty ostoskoriin
                      </>
                    ) : (
                      `Lisää ostoskoriin · ${formatPrice((selectedItem.price_cents + optionsDeltaCents) * quantity)}`
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentGroupCount > 0 && (
        <div className="cart-bar">
          <span>
            {currentGroupCount} {currentGroupCount === 1 ? 'tuote' : 'tuotetta'} · {formatPrice(currentGroupTotalCents)}
            {otherGroupsCount > 0 && (
              <span className="cart-bar__extra"> · +{otherGroupsCount} muualta</span>
            )}
          </span>
          <button type="button" className="cart-bar__clear" onClick={() => cart.clearRestaurant(restaurant.id)}>
            Tyhjennä
          </button>
          <Link to="/ostoskori" className="cart-bar__checkout">
            Siirry kassalle
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}

export default RestaurantPage
