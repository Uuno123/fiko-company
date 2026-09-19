import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, Trash2 } from 'lucide-react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import PromoCarousel from '../components/PromoCarousel.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import Spinner from '../components/Spinner.jsx'
import SearchSuggest from '../components/SearchSuggest.jsx'
import { getRestaurants } from '../lib/api.js'
import { categorySlug, padWithFillers } from '../lib/categories.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { getFavoriteRestaurantIds, addFavorite, removeFavorite } from '../lib/favorites.js'
import { useCart } from '../lib/CartContext.jsx'
import { formatPrice } from '../lib/format.js'
import './Home.css'

const ALL = 'Kaikki'
const FREE_DELIVERY = 'Ilmainen kuljetus'

// Mobiilin kategoriariveille ei näytetä kahvilaosiota lainkaan (käyttäjän päätös).
const HIDDEN_MOBILE_CATEGORIES = ['Kahvila']

// Kategoriapallon kuva per kategoria. Kuvat ovat frontend/publicissa. Jos
// kategorialle ei ole omaa kuvaa, käytetään emojia - näin uusi kategoria ei
// riko riviä vaan näyttää siedettävältä kunnes sille lisätään kuva.
const CATEGORY_TILE_META = {
  Burgerit: { img: '/burger.jpg' },
  'Kebab & Pizza': { img: '/pizza.jpg' },
  Salaatit: { img: '/salaatti.jpg' },
  Aasialainen: { img: '/sushi.jpg' },
  Kahvila: { img: '/kakku.jpg' },
  Italialainen: { img: '/pasta.jpg' },
  Kotiruoka: { img: '/lihapullat.jpg' },
  [FREE_DELIVERY]: { img: '/mopo.jpg' },
}
const DEFAULT_TILE_META = { emoji: '🍽️' }

// Mainokset kiertävät automaattisesti. Kaikki kolme ovat oikeita: DELIVO10 ja
// TERVETULOA löytyvät kassan PROMO_CODES-listalta ja backendin payments-reitiltä,
// ja noudossa ei tosiaan veloiteta kuljetusmaksua (ks. DELIVERY_FEE_CENTS).
const HOME_ADS = [
  {
    id: 'delivo10',
    img: '/promo-banner.png',
    code: 'DELIVO10',
    lead: 'Käytä koodia',
    title: 'Saat 10 % alennuksen tilauksestasi!',
  },
  {
    id: 'tervetuloa',
    img: '/promo-banner-gift-v2.png',
    code: 'TERVETULOA',
    lead: 'Käytä koodia',
    title: 'Saat 3 € alennuksen tilauksestasi!',
  },
  {
    id: 'nouto',
    img: '/promo-banner-shopping-bag-v2.png',
    code: null,
    lead: 'Nouda itse ravintolasta',
    title: 'Ei kuljetusmaksua — säästä 5,99 €',
  },
]
const AD_ROTATE_MS = 5000

function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const cart = useCart()
  const [restaurants, setRestaurants] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') ?? ALL)
  const [activeCity, setActiveCity] = useState(() => searchParams.get('city') ?? '')
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '')
  const [isScrolled, setIsScrolled] = useState(false)
  const [adIndex, setAdIndex] = useState(0)
  const [favoriteIds, setFavoriteIds] = useState(() => new Set())
  const [activeRowSlug, setActiveRowSlug] = useState(null)
  const [cartFabOpen, setCartFabOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { customer } = useAuth()
  const navigate = useNavigate()
  const rowsRef = useRef(null)
  const cartFabRef = useRef(null)

  // Reagoi ?q=/?city=/?category=-parametreihin myös silloin kun ollaan jo etusivulla
  // (esim. promo-karusellin kategoria-nosto navigoi tänne ilman uudelleenmounttausta,
  // jolloin useState-lazy-alkuarvo ei enää ajaisi uudelleen). Siivotaan osoiterivi heti.
  useEffect(() => {
    if (!searchParams.has('q') && !searchParams.has('city') && !searchParams.has('category')) return

    if (searchParams.has('q')) setSearchQuery(searchParams.get('q') ?? '')
    if (searchParams.has('city')) setActiveCity(searchParams.get('city') ?? '')
    if (searchParams.has('category')) setActiveCategory(searchParams.get('category') ?? ALL)
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    getRestaurants()
      .then((data) => {
        if (cancelled) return
        setRestaurants(data)
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
  }, [])

  useEffect(() => {
    if (activeCity) return
    const firstCity = restaurants[0]?.city
    if (firstCity) setActiveCity(firstCity)
  }, [restaurants, activeCity])

  const hasFreeDelivery = restaurants.some((r) => r.free_delivery)
  const categories = [
    ALL,
    ...Array.from(new Set(restaurants.map((r) => r.category))),
    ...(hasFreeDelivery ? [FREE_DELIVERY] : []),
  ]
  const cities = Array.from(new Set(restaurants.map((r) => r.city).filter(Boolean)))

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const baseFiltered = restaurants.filter((r) => {
    const matchesCity = !activeCity || r.city === activeCity
    const matchesSearch = !normalizedQuery || r.name.toLowerCase().includes(normalizedQuery)
    return matchesCity && matchesSearch
  })
  const filtered = baseFiltered.filter((r) => {
    return activeCategory === ALL || (activeCategory === FREE_DELIVERY ? r.free_delivery : r.category === activeCategory)
  })
  // Mobiilissa ei ole enää kategoriavalitsinta - näytetään sen sijaan yksi vaakarivi per
  // kategoria (samaan tapaan kuin Wolt), riippumatta activeCategory-tilasta.
  const mobileCategoryGroups = Array.from(new Set(baseFiltered.map((r) => r.category)))
    .filter((category) => !HIDDEN_MOBILE_CATEGORIES.includes(category))
    .map((category) => ({
      category,
      items: padWithFillers(
        category,
        baseFiltered.filter((r) => r.category === category),
      ),
    }))

  const freeDeliveryItems = baseFiltered.filter((r) => r.free_delivery)
  if (freeDeliveryItems.length > 0) {
    mobileCategoryGroups.push({ category: FREE_DELIVERY, items: freeDeliveryItems })
  }

  // Vieritettäessä kategoriarivi kutistuu pillereiksi, jotta headeriin kiinni
  // jäävä yläosa vie mahdollisimman vähän ruutua.
  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 64)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // adIndex riippuvuutena: ajastin nollautuu myös kun palloa painetaan, jolloin
  // käsin valittu mainos ehtii näkyä täyden ajan.
  useEffect(() => {
    const timer = setInterval(() => setAdIndex((i) => (i + 1) % HOME_ADS.length), AD_ROTATE_MS)
    return () => clearInterval(timer)
  }, [adIndex])

  // Suosikit haetaan kerralla yhdellä kyselyllä, jotta jokainen kortti ei tee omaansa.
  useEffect(() => {
    if (!customer?.id) {
      setFavoriteIds(new Set())
      return
    }
    let cancelled = false
    getFavoriteRestaurantIds(customer.id)
      .then((ids) => {
        if (!cancelled) setFavoriteIds(new Set(ids))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [customer?.id])

  // Korostaa kategoriapallon sen mukaan mikä rivi on näkyvissä, jotta aktiivinen
  // tila kertoo oikeasti sijainnin sivulla eikä ole pelkkä koriste.
  useEffect(() => {
    const sections = rowsRef.current?.querySelectorAll('.category-row')
    if (!sections?.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveRowSlug(visible.target.id.replace(/^cat-/, ''))
      },
      { rootMargin: '-150px 0px -60% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [mobileCategoryGroups.length])

  // Painallus napin ulkopuolelle sulkee sen, ettei laajennettu tila jää päälle
  // ja tee seuraavasta osumasta vahingossa navigointia.
  useEffect(() => {
    if (!cartFabOpen) return undefined
    function handleClickOutside(e) {
      if (!cartFabRef.current?.contains(e.target)) setCartFabOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [cartFabOpen])

  // Hakuehdotukset ovat datassa oikeasti esiintyviä kategorioita, yleisimmät
  // ensin - ei käsin keksittyä listaa, joka vanhenisi kun valikoima muuttuu.
  const popularSearches = useMemo(() => {
    const counts = new Map()
    for (const restaurant of restaurants) {
      if (!restaurant.category) continue
      counts.set(restaurant.category, (counts.get(restaurant.category) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category]) => category)
  }, [restaurants])

  const popularRestaurants = useMemo(() => {
    const open = restaurants.filter((r) => r.is_open !== false)
    const pool = open.length > 0 ? open : restaurants
    return [...pool].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8)
  }, [restaurants])

  async function toggleFavorite(restaurantId) {
    if (!customer?.id) return
    const isFav = favoriteIds.has(restaurantId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(restaurantId)
      else next.add(restaurantId)
      return next
    })
    try {
      if (isFav) await removeFavorite(customer.id, restaurantId)
      else await addFavorite(customer.id, restaurantId)
    } catch {
      // Palautetaan näkymä jos tallennus ei mennyt läpi.
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(restaurantId)
        else next.delete(restaurantId)
        return next
      })
    }
  }

  function scrollToCategory(e, category) {
    e.preventDefault()
    document.getElementById(`cat-${categorySlug(category)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="page page--home">
      {/* Mobiilin koko ruudun hakunäkymä. Ehdotukset tulevat samasta
          SearchSuggest-komponentista kuin headerin pudotusvalikossa. */}
      {searchOpen && (
        <div className="home-search-overlay">
          <div className="home-search-overlay__bar">
            <div className="home-search">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2.2" />
                <path d="m17.5 17.5-4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                aria-label="Hae delivosta"
                placeholder="Hae delivosta"
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setSearchOpen(false)
                    navigate(`/haku?q=${encodeURIComponent(searchQuery.trim())}`)
                  }
                }}
              />
              {searchQuery && (
                <button type="button" aria-label="Tyhjennä haku" onClick={() => setSearchQuery('')}>
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="button"
              className="home-search-overlay__close"
              aria-label="Sulje haku"
              onClick={() => setSearchOpen(false)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {searchQuery.trim() ? (
            <SearchSuggest query={searchQuery} variant="fullscreen" onNavigate={() => setSearchOpen(false)} />
          ) : (
            <div className="home-search-start">
              {popularSearches.length > 0 && (
                <section className="home-search-start__section">
                  <h3 className="search-suggest-section__title">Suositut haut</h3>
                  {/* Ehdotukset ovat kategorioita, joten ne vievät suoraan
                      kategoriasivulle - hakusanalla ne löytäisivät vain ne
                      ravintolat joiden NIMESSÄ sana esiintyy. */}
                  <div className="home-search-chips">
                    {popularSearches.map((term) => (
                      <Link key={term} to={`/kategoria/${categorySlug(term)}`} onClick={() => setSearchOpen(false)}>
                        {term}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {mobileCategoryGroups.length > 0 && (
                <section className="home-search-start__section">
                  <h3 className="search-suggest-section__title">Kategoriat</h3>
                  <div className="home-search-cats">
                    {mobileCategoryGroups.map(({ category }) => {
                      const tile = CATEGORY_TILE_META[category] ?? DEFAULT_TILE_META
                      return (
                        <Link
                          key={category}
                          to={`/kategoria/${categorySlug(category)}`}
                          className="home-cat-tile"
                          onClick={() => setSearchOpen(false)}
                        >
                          <span className="home-cat-tile__art" aria-hidden="true">
                            {tile.img ? <img src={tile.img} alt="" loading="lazy" /> : tile.emoji}
                          </span>
                          <span className="home-cat-tile__label">{category}</span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )}

              {popularRestaurants.length > 0 && (
                <section className="home-search-start__section">
                  <h3 className="search-suggest-section__title">Suositut ravintolat</h3>
                  <div className="search-suggest-restaurants">
                    {popularRestaurants.map((r) => (
                      <Link
                        key={r.id}
                        to={`/ravintola/${r.id}`}
                        className="search-suggest-restaurant-card"
                        onClick={() => setSearchOpen(false)}
                      >
                        <div className="search-suggest-restaurant-card__media">
                          {r.image_url ? <img src={r.image_url} alt={r.name} loading="lazy" /> : null}
                        </div>
                        <span className="search-suggest-restaurant-card__name">{r.name}</span>
                        <span className="search-suggest-restaurant-card__meta">
                          {r.free_delivery ? 'Ilmainen kuljetus' : 'Kuljetus 5,99 €'}
                          {r.pickup_estimate_minutes && ` · n. ${r.pickup_estimate_minutes} min`}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      <Header
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Hae ravintoloita...' }}
        citySelector={cities.length > 0 ? { value: activeCity, onChange: setActiveCity, options: cities } : null}
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

      <main className="home-content">
        {/* Mobiilin yläosa: pelkkä haku. Sijaintia ei näytetä etusivulla. */}
        <div className="home-mobile-top">
          <div className="home-search" onClick={() => setSearchOpen(true)}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2.2" />
              <path d="m17.5 17.5-4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              aria-label="Hae ravintoloita"
              placeholder="Hae delivosta"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" aria-label="Tyhjennä haku" onClick={() => setSearchQuery('')}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

        </div>

        <div className="home-promo">
          <div className="home-ad">
            {HOME_ADS.map((ad, i) => (
              <div
                key={ad.id}
                className={`home-ad__slide${i === adIndex ? ' home-ad__slide--active' : ''}`}
                style={{ backgroundImage: `url(${ad.img})` }}
                aria-hidden={i !== adIndex}
              >
                <div className="home-ad__content">
                  <span className="home-ad__lead">
                    {ad.lead}
                    {ad.code && <span className="home-ad__code">{ad.code}</span>}
                    {ad.code && ' kassalla'}
                  </span>
                  <strong className="home-ad__title">{ad.title}</strong>
                  <button
                    type="button"
                    className="home-ad__cta"
                    onClick={(e) => mobileCategoryGroups[0] && scrollToCategory(e, mobileCategoryGroups[0].category)}
                  >
                    Tilaa nyt
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="home-ad__dots">
            {HOME_ADS.map((ad, i) => (
              <button
                key={ad.id}
                type="button"
                className={`home-ad__dot${i === adIndex ? ' home-ad__dot--active' : ''}`}
                aria-label={`Mainos ${i + 1}/${HOME_ADS.length}`}
                aria-current={i === adIndex}
                onClick={() => setAdIndex(i)}
              />
            ))}
          </div>
        </div>

        {/* Sticky kategoriarivi tarttuu headeriin. Tämä on tarkoituksella
            .home-content:n suora lapsi eikä .home-mobile-top:n sisällä: sticky
            pysyy vain oman vanhempansa laatikon sisällä, joten hakukentän
            vieressä se irtoaisi heti kun hakukenttä on vieritetty ohi. */}
        {mobileCategoryGroups.length > 0 && (
          <div className={`home-quick-cats${isScrolled ? ' home-quick-cats--compact' : ''}`}>
            {mobileCategoryGroups.map(({ category }) => {
              const tile = CATEGORY_TILE_META[category] ?? DEFAULT_TILE_META
              return (
                <a
                  key={category}
                  href={`#cat-${categorySlug(category)}`}
                  className={`home-cat-tile${
                    activeRowSlug === categorySlug(category) ? ' home-cat-tile--active' : ''
                  }`}
                  onClick={(e) => scrollToCategory(e, category)}
                >
                  <span className="home-cat-tile__art" aria-hidden="true">
                    {tile.img ? <img src={tile.img} alt="" loading="lazy" /> : tile.emoji}
                  </span>
                  <span className="home-cat-tile__label">{category}</span>
                </a>
              )
            })}
          </div>
        )}

        <PromoCarousel />

        {status === 'ready' && categories.length > 1 && (
          <CategoryFilter categories={categories} active={activeCategory} onChange={setActiveCategory} />
        )}

        {status === 'loading' && <Spinner label="Haetaan ravintoloita" />}

        {status === 'error' && (
          <p className="state-message state-message--error">Ravintoloiden haku epäonnistui: {errorMessage}</p>
        )}

        {status === 'ready' && filtered.length === 0 && (
          <p className="state-message">Ei ravintoloita näillä valinnoilla.</p>
        )}

        {status === 'ready' && filtered.length > 0 && (
          <div className="restaurant-grid restaurant-grid--desktop">
            {filtered.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}

        {status === 'ready' && baseFiltered.length > 0 && (
          <div className="category-rows" ref={rowsRef}>
            {mobileCategoryGroups.map(
              ({ category, items }, groupIndex) =>
                items.length > 0 && (
                  <Fragment key={category}>
                    <section className="category-row" id={`cat-${categorySlug(category)}`}>
                      <div className="category-row__header">
                        <h2 className="category-row__title">{category}</h2>
                        <Link className="category-row__see-all" to={`/kategoria/${categorySlug(category)}`}>
                          Näytä kaikki
                        </Link>
                      </div>
                      <div className="category-row__scroll">
                        {items.map((restaurant) => (
                          <RestaurantCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            disabled={restaurant.isPlaceholder}
                            isFavorite={favoriteIds.has(restaurant.id)}
                            onToggleFavorite={customer && !restaurant.isPlaceholder ? toggleFavorite : undefined}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Tumma jakaja toisen kategoriarivin jälkeen: rytmittää
                        valkoista sivua ja kertoo samalla delivon ydinlupauksen. */}
                    {groupIndex === 1 && (
                      <div className="home-pickup-banner">
                        <span className="home-pickup-banner__icon" aria-hidden="true">
                          🛍️
                        </span>
                        <span className="home-pickup-banner__text">
                          <strong>Nouda itse, ei kuljetusmaksua</strong>
                          <span>Säästät {formatPrice(599)} jokaisesta tilauksesta</span>
                        </span>
                      </div>
                    )}
                  </Fragment>
                ),
            )}
          </div>
        )}

      </main>

      {/* Kelluva ostoskori alareunassa headerin korikuvakkeen sijaan: se on
          peukalon ulottuvilla ja näyttää summan ilman että koria avaa.
          Ensimmäinen painallus levittää napin ja paljastaa tyhjennyksen,
          toinen vie ostoskoriin - näin tyhjennys ei ole vahingossa osuvan
          napin takana, mutta kassalle pääsee silti kahdella painalluksella. */}
      {cart.count > 0 && (
        <div className={`home-cart-fab${cartFabOpen ? ' home-cart-fab--open' : ''}`} ref={cartFabRef}>
          <Link
            to="/ostoskori"
            className="home-cart-fab__main"
            onClick={(e) => {
              if (!cartFabOpen) {
                e.preventDefault()
                setCartFabOpen(true)
              }
            }}
          >
            <span className="home-cart-fab__icon" aria-hidden="true">
              <ShoppingBag size={18} />
              <span className="home-cart-fab__count">{cart.count}</span>
            </span>
            <span>Ostoskori</span>
            <span className="home-cart-fab__total">{formatPrice(cart.totalCents)}</span>
          </Link>

          <button
            type="button"
            className="home-cart-fab__clear"
            aria-hidden={!cartFabOpen}
            tabIndex={cartFabOpen ? 0 : -1}
            onClick={() => {
              cart.clear()
              setCartFabOpen(false)
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
            Tyhjennä
          </button>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default Home
