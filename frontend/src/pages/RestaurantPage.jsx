import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronDown, Star, Tag } from 'lucide-react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Spinner from '../components/Spinner.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import { getRestaurantById } from '../lib/api.js'
import { useCart } from '../lib/CartContext.jsx'
import { formatPrice } from '../lib/format.js'
import { MCDONALDS_DEMO_MENU } from '../lib/demoRestaurants.js'
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

// TILAPÄINEN: pakotettu testikuva ja -teksti heroon, ohittaa Supabasen oman
// image_url:n/name:n (Burger Tallilla on jo Unsplash-kuva, joten || ei koskaan
// valinnut tätä). Poista nämä ja käytä restaurant.name/image_url kun testaus
// on valmis.
const TEMP_HERO_IMAGE_URL = 'https://imageproxy.wolt.com/assets/6735be5986f45b72713e2127'
const TEMP_HERO_NAME = "McDonald's"
const TEMP_HERO_TAGLINE = 'Kuumana nyt'

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

// TILAPÄINEN: samat välilehtinimet kuin McDonald'sin referenssikuvassa - vain
// "Tilatuimmat" (key 'all') näyttää oikeaa dataa, loput ovat vielä "tulossa
// pian" -paikanpitäjiä samaan tapaan kuin Suosituimmat/Tarjoukset olivat ennen.
const MENU_TABS = [
  { key: 'all', label: 'Tilatuimmat' },
  { key: 'world-menu', label: 'World Menu Mission' },
  { key: 'campaign', label: 'Kampanja-ateriat -20%' },
  { key: 'combos', label: 'Kombot' },
  { key: 'burgers', label: 'Hampurilaiset' },
  { key: 'chicken-veg', label: 'Kana & Kasvis' },
  { key: 'salads-wraps', label: 'Salaatit & McWrap®' },
  { key: 'happy-meal', label: 'Happy Meal®' },
  { key: 'more', label: 'Lisää (4)' },
]

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

function RestaurantPage() {
  const { id } = useParams()
  const cart = useCart()
  const [restaurant, setRestaurant] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [menuTab, setMenuTab] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [optionSelections, setOptionSelections] = useState({})
  const [justAdded, setJustAdded] = useState(false)
  const [offerDetailsOpen, setOfferDetailsOpen] = useState(false)

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


  const groupedMenu = groupByCategory(allMenuItems)

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

  return (
    <div className="page">
      <div className="restaurant-hero-wrap">
        <Header
          showAddress
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

        {status === 'ready' && restaurant && (
          <div className="restaurant-hero">
            <div className="restaurant-hero__image">
              <img src={TEMP_HERO_IMAGE_URL} alt={restaurant.name} />
            </div>
            <div className="restaurant-hero__text">
              <p className="restaurant-hero__tagline">{TEMP_HERO_TAGLINE}</p>
              <h1 className="restaurant-hero__title">{TEMP_HERO_NAME}</h1>
            </div>
          </div>
        )}
      </div>

      <main className="restaurant-page">
        {status === 'loading' && <Spinner label="Ladataan ravintolaa" />}
        {status === 'error' && (
          <p className="state-message state-message--error">Ravintolaa ei löytynyt: {errorMessage}</p>
        )}

        {status === 'ready' && restaurant && (
          <article className="restaurant-detail">
            {restaurantClosed && (
              <div className="restaurant-detail__body">
                <p className="restaurant-closed-notice">
                  Ravintola on juuri nyt suljettu, eikä tilaaminen ole mahdollista.
                  {todayHoursLabel ? ` Tänään avoinna ${todayHoursLabel}.` : ''}
                </p>
              </div>
            )}

            {allMenuItems.length > 0 ? (
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
                </div>

                {/* Merkki on totta: SUURTILAUS antaa kassalla oikeasti 30 % (enint. 7 €)
                    kun tilaus on vähintään 50 € - sama katto ja raja on sekä täällä
                    (Cart.jsx) että backendin payments.js:ssä, joka veloittaa summan. */}
                <div className="menu-offer-card">
                  <span className="menu-offer-card__icon" aria-hidden="true">
                    <Tag size={18} />
                  </span>
                  <div className="menu-offer-card__body">
                    <p className="menu-offer-card__title">
                      30 % alennus (enintään 7 €) tilauksille yli 50 € – koodilla SUURTILAUS kassalla
                    </p>
                    <button
                      type="button"
                      className="menu-offer-card__toggle"
                      aria-expanded={offerDetailsOpen}
                      onClick={() => setOfferDetailsOpen((v) => !v)}
                    >
                      {offerDetailsOpen ? 'Piilota tiedot' : 'Näytä lisätiedot'}
                      <ChevronDown
                        size={14}
                        className={`menu-offer-card__chevron${offerDetailsOpen ? ' menu-offer-card__chevron--open' : ''}`}
                      />
                    </button>
                    {offerDetailsOpen && (
                      <p className="menu-offer-card__details">
                        Alennus lasketaan tilauksen välisummasta ennen toimitusmaksua, enintään 7 €. Syötä koodi
                        SUURTILAUS ostoskorissa ennen kassalle siirtymistä.
                      </p>
                    )}
                  </div>
                </div>

                {menuTab !== 'all' && (
                  <div className="restaurant-detail__body">
                    <p className="state-message">
                      {MENU_TABS.find((tab) => tab.key === menuTab)?.label} tulossa pian.
                    </p>
                  </div>
                )}

                {menuTab === 'all' && (
                  <>
                    <div className="menu-section-heading">
                      <h2>Kaikki tuotteet</h2>
                      <p>Kattava valikoima ravintolan {restaurant.name} tuotteita.</p>
                    </div>

                    <div className="restaurant-detail__body restaurant-detail__body--menu">
                      <div className="menu">
                        {groupedMenu.map(([category, items]) => (
                          <section
                            className="menu-section"
                            id={categoryId(category)}
                            data-category={category}
                            key={category}
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

    </div>
  )
}

export default RestaurantPage
