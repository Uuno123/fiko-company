import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { BadgePercent, Bike, ChevronRight, CircleArrowRight, Clock, Heart, MapPin, Plus, Search, Star, X } from 'lucide-react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Spinner from '../components/Spinner.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import MenuSearch, { matchesMenuQuery } from '../components/MenuSearch.jsx'
import ReviewsModal from '../components/ReviewsModal.jsx'
import { getRestaurantById } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { addFavorite, isRestaurantFavorited, removeFavorite } from '../lib/favorites.js'
import { useCart } from '../lib/CartContext.jsx'
import { DELIVERY_PRICE_RANGE, formatEtaRange } from '../lib/delivery.js'
import { formatDistance, restaurantDistanceKm, useDeliveryAddress } from '../lib/deliveryAddress.js'
import { formatDisplayAddress, formatPrice } from '../lib/format.js'
import { MCDONALDS_DEMO_MENU } from '../lib/demoRestaurants.js'
import { getDemoReviews } from '../lib/demoReviews.js'
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

// "Kuumana nyt" -merkki vain esittelyravintolalle (lib/demoRestaurants.js).
// Aiemmin sekä merkki että nimi "McDonald's" oli pakotettu KAIKILLE
// ravintoloille - oikealle ravintolalle merkki olisi keksitty väite.
const DEMO_TAGLINE = 'Kuumana nyt'

// TILAPÄINEN: sama id:t kuin supabase/migrations/0039_remove_burger_talli_placeholder_items.sql -
// piilotetaan täältä heti esikatselua varten kunnes käyttäjä ajaa migraation Supabasessa.
// Poista tämä kun rivit on oikeasti poistettu tietokannasta.
const TEMP_HIDDEN_MENU_ITEM_IDS = new Set([
  '6323dff7-216d-4c58-942c-e0ff3ae0f0b1', // Fiko Cheeseburger
  '93ef890b-f052-4642-af0f-5367f4ede37d', // Bacon Burger
])

// TILAPÄINEN: sama sisältö kuin supabase/migrations/0038_add_burger_talli_mcdonalds_items.sql,
// näytetään täältä heti esikatselua varten kunnes käyttäjä ajaa migraation Supabasessa.
// Poista tämä kun oikeat rivit ovat tietokannassa (muuten tuotteet näkyvät kahteen kertaan).
// Esittelyravintolalla (lib/demoRestaurants.js) samat tuotteet ovat jo omana menuna.
const TEMP_EXTRA_MENU_ITEMS = MCDONALDS_DEMO_MENU

// Lisukkeet viimeiseksi aina, muut kategoriat säilyttävät datan oman järjestyksen -
// sivulliset kuuluvat pääruokien jälkeen, ei niiden sekaan.
function groupByCategory(items) {
  const groups = new Map()
  for (const item of items) {
    const key = item.category || 'Ruokalista'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === 'Lisukkeet') return 1
    if (b === 'Lisukkeet') return -1
    return 0
  })
}

function categoryId(category) {
  return 'menu-' + category.toLowerCase().replace(/\s+/g, '-')
}

// Osion yläreunan etäisyys ikkunan yläreunasta, kun osioon on vieritetty:
// header (--site-header-height) + kiinnittyvä välilehtirivi + pieni väli.
// Sama luku on RestaurantPage.css:n .menu-section scroll-margin-topissa.
const SECTION_OFFSET_PX = 136

// Fikolla ei ole vielä oikeaa arvostelujärjestelmää (ei arvostelutaulua tietokannassa) -
// tämä on visuaalinen placeholder käyttäjän hyväksymänä ("lisää visuaalinen placeholder"),
// korvataan oikealla arvostelutiedolla kun arvostelut joskus rakennetaan. Deterministinen
// ravintolan id:stä, jotta luku ei vaihdu joka renderöinnillä eikä ole sama joka ravintolalla.
function pseudoReviewCount(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return 40 + (hash % 460)
}

// Sama placeholder-periaate kuin yllä: ei oikeaa per-tuote arvostelutietoa
// tietokannassa, joten luku lasketaan deterministisesti tuotteen id:stä (pysyy
// samana joka renderöinnillä, vaihtelee tuotteittain).
function pseudoItemRating(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 13 + id.charCodeAt(i)) >>> 0
  }
  const rating = 3.8 + (hash % 13) / 10
  const count = 5 + (hash % 55)
  return { rating: rating.toFixed(1), count }
}

// Sama raja kuin RestaurantPage.css:n Wolt-tyylisellä mobiiliasettelulla (780px).
const COMPACT_QUERY = '(max-width: 780px)'

function useCompactLayout() {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches)
  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY)
    const update = (event) => setCompact(event.matches)
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  return compact
}

function RestaurantPage() {
  const { id } = useParams()
  const cart = useCart()
  // Kapealla näytöllä sivu on Woltin/Uber Eatsin mallinen: kuva reunasta reunaan
  // ylhäällä ja header läpinäkyvänä sen päällä (variant="overlay"), kunnes
  // vieritetään - silloin header muuttuu valkoiseksi.
  const compactLayout = useCompactLayout()
  const [restaurant, setRestaurant] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const deliveryAddress = useDeliveryAddress()
  const [selectedItem, setSelectedItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [optionSelections, setOptionSelections] = useState({})
  const [justAdded, setJustAdded] = useState(false)
  const [offerDetailsOpen, setOfferDetailsOpen] = useState(false)
  const { customer } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isFavorite, setIsFavorite] = useState(false)
  const [menuSearchOpen, setMenuSearchOpen] = useState(false)
  const closeMenuSearch = useCallback(() => setMenuSearchOpen(false), [])
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const closeReviews = useCallback(() => setReviewsOpen(false), [])
  // Työpöydän hakukenttä suodattaa ruokalistaa suoraan sivulla (Woltin
  // verkkosivun malli). Mobiilissa haku on oma koko ruudun näkymänsä
  // (MenuSearch), joten kenttä ja sen suodatus nollataan kapealle siirryttäessä.
  const [menuQuery, setMenuQuery] = useState('')
  useEffect(() => {
    if (compactLayout) setMenuQuery('')
  }, [compactLayout])

  // Suosikkitila tietokannasta (customer_favorites). Myös esittelyravintola on
  // tietokannassa (migraatio 0043), joten sekin tallentuu suosikiksi.
  useEffect(() => {
    setIsFavorite(false)
    if (!customer?.id || !restaurant) return undefined
    let cancelled = false
    isRestaurantFavorited(customer.id, restaurant.id).then((favorited) => {
      if (!cancelled) setIsFavorite(favorited)
    })
    return () => {
      cancelled = true
    }
  }, [customer?.id, restaurant])

  async function toggleFavorite() {
    if (!customer?.id) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    const next = !isFavorite
    setIsFavorite(next)
    const ok = next ? await addFavorite(customer.id, restaurant.id) : await removeFavorite(customer.id, restaurant.id)
    if (!ok) setIsFavorite(!next)
  }

  // TILAPÄINEN yhdistelmä oikean datan ja TEMP_EXTRA_MENU_ITEMS-esikatselurivien
  // välillä - katso kommentti vakion määrittelyn kohdalla.
  const allMenuItems = useMemo(
    () => [
      ...(restaurant?.menu_items ?? []).filter((item) => !TEMP_HIDDEN_MENU_ITEM_IDS.has(item.id)),
      ...(restaurant?.isDemo ? [] : TEMP_EXTRA_MENU_ITEMS),
    ],
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


  const visibleMenuItems = menuQuery.trim()
    ? allMenuItems.filter((item) => matchesMenuQuery(item, menuQuery))
    : allMenuItems
  const groupedMenu = groupByCategory(visibleMenuItems)
  // Arvostelut: esittelyravintolalla esimerkit ja keksitty määrä
  // (lib/demoReviews.js), oikealla ravintolalla tietokannan arvosana ja määrä
  // (migraatio 0054) - arvosana näytetään vasta, kun arvosteluja on.
  const demoReviews = restaurant ? getDemoReviews(restaurant.id) : []
  const reviewTotal = restaurant?.review_count ?? 0
  const shownRating = demoReviews.length > 0 || reviewTotal > 0 ? (restaurant?.rating ?? null) : null
  const reviewCountLabel =
    demoReviews.length > 0
      ? `${pseudoReviewCount(restaurant.id)}+ arviota`
      : `${reviewTotal} ${reviewTotal === 1 ? 'arvio' : 'arviota'}`
  // Ennen ensimmäistä vieritystä korostetaan ensimmäinen osio.
  const shownCategory = activeCategory ?? groupedMenu[0]?.[0] ?? null
  const etaRange = formatEtaRange(restaurant?.pickup_estimate_minutes)
  const distance = restaurant ? formatDistance(restaurantDistanceKm(restaurant, deliveryAddress)) : null

  // Korostaa välilehden sen osion mukaan, jonka kohdalla ollaan: viimeinen osio,
  // jonka yläreuna on ohittanut headerin ja välilehtirivin.
  useEffect(() => {
    if (status !== 'ready') return undefined
    function updateActive() {
      let current = null
      document.querySelectorAll('.menu-section').forEach((section) => {
        if (section.getBoundingClientRect().top <= SECTION_OFFSET_PX + 1) current = section.dataset.category
      })
      setActiveCategory(current)
    }
    window.addEventListener('scroll', updateActive, { passive: true })
    return () => window.removeEventListener('scroll', updateActive)
  }, [status])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

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

  function scrollToCategory(category) {
    setActiveCategory(category)
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

  function handleCardKeyDown(e, item) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openItem(item)
    }
  }

  // Sydän: mobiilissa headerissa, työpöydällä tietojen tasolla hakukentän vieressä.
  const favoriteButton = (
    <button
      type="button"
      className={`site-header__round-btn${isFavorite ? ' is-active' : ''}`}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
      onClick={toggleFavorite}
    >
      <Heart size={18} strokeWidth={2} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )

  return (
    <div className="page page--restaurant">
      <Header
        back
        showAddress
        variant={compactLayout ? 'overlay' : undefined}
        // Kapealla näytöllä sydän ja haku headerissa tilivalikon tilalla (Woltin
        // malli). Työpöydällä ne ovat ravintolan tietojen tasolla oikealla
        // (hakukenttä + sydän), ja headerissa on tilivalikko.
        actions={
          compactLayout && restaurant ? (
            <div className="site-header__round-actions">
              {favoriteButton}
              <button
                type="button"
                className="site-header__round-btn"
                aria-label="Hae ruokalistasta"
                onClick={() => setMenuSearchOpen(true)}
              >
                <Search size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ) : undefined
        }
        hideAccount={compactLayout}
        cart={
          cart.count > 0
            ? {
                count: cart.count,
                totalCents: cart.totalCents,
                groups: cart.groups,
                onClear: cart.clear,
                onClearRestaurant: cart.clearRestaurant,
                formatPrice,
              }
            : null
        }
      />

      <main className="restaurant-page">
        {status === 'loading' && <Spinner label="Ladataan ravintolaa" />}
        {status === 'error' && (
          <p className="state-message state-message--error">Ravintolaa ei löytynyt: {errorMessage}</p>
        )}

        {status === 'ready' && restaurant && (
          <article className="restaurant-detail">
            {/* Woltin / Uber Eatsin malli: ravintolan kuva tämän osion yläosassa
                (CSS-muuttuja --restaurant-banner, ::before-kerros), nimi ja tiedot
                sen alla. Työpöydällä hakukenttä ja sydän tietojen oikealla puolella,
                mobiilissa headerissa. */}
            <div
              className={`restaurant-info${restaurant.image_url ? ' restaurant-info--banner' : ''}`}
              style={restaurant.image_url ? { '--restaurant-banner': `url("${restaurant.image_url}")` } : undefined}
            >
              <div className="restaurant-info__main">
                {restaurant.isDemo && <p className="restaurant-info__tagline">{DEMO_TAGLINE}</p>}
                <h1 className="restaurant-info__title">{restaurant.name}</h1>
                <ul className="restaurant-info__meta">
                  <li className="restaurant-info__rating">
                    {/* Arvosana on nappi arvosteluihin (käyttäjän pyyntö: arvostelut
                        eivät näy sivulla, vaan avautuvat omaan ikkunaansa, jossa
                        voi myös kirjoittaa oman arvostelun). */}
                    <button
                      type="button"
                      className="restaurant-info__rating-btn"
                      onClick={() => setReviewsOpen(true)}
                      aria-label={
                        shownRating != null
                          ? `Arvostelut: ${Number(shownRating).toFixed(1)} tähteä, ${reviewCountLabel}`
                          : 'Arvostelut: ei vielä arvosteluja'
                      }
                    >
                      <Star size={15} fill={shownRating != null ? 'currentColor' : 'none'} aria-hidden="true" />
                      {shownRating != null ? (
                        <>
                          <strong>{Number(shownRating).toFixed(1)}</strong>
                          <span>({reviewCountLabel})</span>
                        </>
                      ) : (
                        <span>Ei vielä arvosteluja</span>
                      )}
                      <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </li>
                  {etaRange && (
                    <li>
                      <Clock size={15} aria-hidden="true" />
                      {etaRange}
                    </li>
                  )}
                  <li className={restaurant.free_delivery ? 'restaurant-info__free' : undefined}>
                    <Bike size={15} aria-hidden="true" />
                    {restaurant.free_delivery ? 'Ilmainen toimitus' : `Toimitus ${DELIVERY_PRICE_RANGE}`}
                  </li>
                  {distance && (
                    <li>
                      <MapPin size={15} aria-hidden="true" />
                      {distance}
                    </li>
                  )}
                  {todayHoursLabel && <li>Avoinna tänään {todayHoursLabel}</li>}
                </ul>
                {restaurant.address && (
                  <p className="restaurant-info__address">{formatDisplayAddress(restaurant.address)}</p>
                )}
              </div>

              {/* Työpöytä: hakukenttä ja sydän tietojen tasolla oikealla
                  (käyttäjän pyyntö). Mobiilissa ne ovat headerissa. */}
              {!compactLayout && (
                <div className="restaurant-info__tools">
                  <label className="restaurant-menu-search">
                    <Search size={18} strokeWidth={2} aria-hidden="true" />
                    <input
                      type="search"
                      value={menuQuery}
                      onChange={(e) => setMenuQuery(e.target.value)}
                      placeholder={`Hae ravintolasta ${restaurant.name}`}
                      aria-label="Hae ruokalistasta"
                    />
                    {menuQuery && (
                      <button
                        type="button"
                        className="restaurant-menu-search__clear"
                        aria-label="Tyhjennä haku"
                        onClick={() => setMenuQuery('')}
                      >
                        <X size={15} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    )}
                  </label>
                  {favoriteButton}
                </div>
              )}
            </div>

            {restaurantClosed && (
              <p className="restaurant-closed-notice">
                Ravintola on juuri nyt suljettu, eikä tilaaminen ole mahdollista.
                {todayHoursLabel ? ` Tänään avoinna ${todayHoursLabel}.` : ''}
              </p>
            )}

            {allMenuItems.length > 0 ? (
              <>
                {/* Ruokalistan oikeat osiot - klikkaus vierittää osioon, ja vieritys
                    korostaa osion jossa ollaan. Kiinnittyy headerin alle. */}
                <nav className="restaurant-menu-tabs" aria-label="Ruokalistan osiot">
                  {groupedMenu.map(([category]) => (
                    <button
                      type="button"
                      key={category}
                      aria-current={shownCategory === category ? 'true' : undefined}
                      className={`restaurant-menu-tabs__btn${shownCategory === category ? ' restaurant-menu-tabs__btn--active' : ''}`}
                      onClick={() => scrollToCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </nav>

                {/* Järjestys käyttäjän pyynnöstä: ensin kategoriat (välilehdet), sitten
                    tarjoukset ja sitten tuotteet. Tarjous oli aiemmin kuvan päällä. */}
                <section className="restaurant-offers" aria-label="Tarjoukset">
                  <h2 className="restaurant-offers__title">Tarjoukset</h2>
                  {/* Merkki on totta: SUURTILAUS antaa kassalla oikeasti 30 % (enint. 7 €)
                      kun tilaus on vähintään 50 € - sama katto ja raja on sekä täällä
                      (Cart.jsx) että backendin payments.js:ssä, joka veloittaa summan. */}
                  {/* Woltin tarjouskortin mallin mukaan (käyttäjän referenssi): lippumainen
                      kortti lovineen, prosenttimerkki, lyhyt otsikko ja lisätietolinkki. */}
                  <div className="menu-offer-card">
                    <BadgePercent className="menu-offer-card__icon" size={34} strokeWidth={1.9} aria-hidden="true" />
                    <div className="menu-offer-card__body">
                      <p className="menu-offer-card__title">−30 % vähintään 50 € tilauksista</p>
                      <button
                        type="button"
                        className="menu-offer-card__toggle"
                        aria-expanded={offerDetailsOpen}
                        onClick={() => setOfferDetailsOpen((v) => !v)}
                      >
                        {offerDetailsOpen ? 'Piilota lisätiedot' : 'Näytä lisätiedot'}
                        <CircleArrowRight
                          size={15}
                          strokeWidth={2}
                          className={`menu-offer-card__arrow${offerDetailsOpen ? ' is-open' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                      {offerDetailsOpen && (
                        <p className="menu-offer-card__details">
                          Koodilla <strong>SUURTILAUS</strong> kassalla. Alennus lasketaan välisummasta ennen
                          toimitusmaksua, enintään 7 €.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <div className="menu">
                  {groupedMenu.length === 0 && (
                    <p className="menu-search-empty">Ei tuotteita haulle "{menuQuery.trim()}".</p>
                  )}
                  {groupedMenu.map(([category, items]) => (
                    <section className="menu-section" id={categoryId(category)} data-category={category} key={category}>
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
                                {/* Woltin/Uber Eatsin "+" kuvan kulmassa. Koko rivi avaa
                                    tuotteen, joten merkki on pelkkä vihje eikä oma nappinsa. */}
                                {item.is_available !== false && (
                                  <span className="menu-card__add" aria-hidden="true">
                                    <Plus size={18} strokeWidth={2.4} />
                                  </span>
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
              </>
            ) : (
              <div className="coming-soon">
                <p>Ruokalista tulossa pian.</p>
              </div>
            )}
          </article>
        )}
      </main>

      <Footer />

      {reviewsOpen && restaurant && (
        <ReviewsModal
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          rating={shownRating}
          reviewCount={reviewCountLabel}
          demoReviews={demoReviews}
          onSummaryChange={({ rating, count }) =>
            setRestaurant((current) => ({ ...current, rating, review_count: count }))
          }
          onClose={closeReviews}
        />
      )}

      {menuSearchOpen && restaurant && (
        <MenuSearch
          items={allMenuItems}
          restaurantName={restaurant.name}
          onPick={openItem}
          onClose={closeMenuSearch}
          modalOpen={Boolean(selectedItem)}
        />
      )}

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

    </div>
  )
}

export default RestaurantPage
