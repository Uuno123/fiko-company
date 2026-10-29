import { useEffect, useMemo, useState } from 'react'
import { Check, ListFilter } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet.jsx'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { getRestaurants } from '../lib/api.js'
import { CATEGORY_NAMES, categorySlug, padWithFillers } from '../lib/categories.js'
import { restaurantDistanceKm, useDeliveryAddress } from '../lib/deliveryAddress.js'
import { SORT_COMPARATORS, rankRestaurants, useRankingSignals } from '../lib/ranking.js'
import { useCart } from '../lib/CartContext.jsx'
import { formatPrice } from '../lib/format.js'
import { useFavorites } from '../lib/useFavorites.js'
import './CategoryPage.css'

// Lajitteluvaihtoehdot: työpöydän valikko ja puhelimen lajittelupaneeli.
// "Lähin ensin" vain kun toimitusosoite on annettu.
const SORT_OPTIONS = [
  { value: 'suositellut', label: 'Suositellut' },
  { value: 'rating', label: 'Paras arvio' },
  { value: 'eta', label: 'Nopein toimitus' },
  { value: 'distance', label: 'Lähin ensin', needsAddress: true },
]

function CategoryPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const [searchValue, setSearchValue] = useState('')
  const [restaurants, setRestaurants] = useState([])
  const [status, setStatus] = useState('loading')
  const { favoriteIds, toggleFavorite } = useFavorites()
  const [sortBy, setSortBy] = useState('suositellut')
  const deliveryAddress = useDeliveryAddress()
  const { popularity } = useRankingSignals()
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
  // Puhelimen yläpalkin varjo vasta vieritettäessä.
  const [scrolled, setScrolled] = useState(() => window.scrollY > 56)
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 56)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let cancelled = false
    getRestaurants()
      .then((data) => {
        if (cancelled) return
        setRestaurants(data ?? [])
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Kanoninen nimi tulee CATEGORY_NAMES-listasta eikä ravintoladatasta: jos
  // kategorialla ei ole vielä yhtään oikeaa ravintolaa, otsikko ja täytteet
  // pitää silti pystyä ratkaisemaan pelkän slugin perusteella.
  const canonicalCategory = useMemo(
    () => CATEGORY_NAMES.find((name) => categorySlug(name) === slug) ?? null,
    [slug],
  )

  // Täydennetään samalla säännöllä kuin etusivun rivit, jotta kategoria näyttää
  // saman määrän molemmissa paikoissa. Täytteet ovat fiktiivisiä eivätkä
  // klikattavissa (disabled).
  const matching = useMemo(() => {
    if (!canonicalCategory) return []
    const real = restaurants.filter((r) => r.category && categorySlug(r.category) === slug)
    return padWithFillers(canonicalCategory, real).map((r) => ({
      ...r,
      distance_km: restaurantDistanceKm(r, deliveryAddress),
    }))
  }, [restaurants, slug, canonicalCategory, deliveryAddress])

  const title = canonicalCategory
  const sortOptions = SORT_OPTIONS.filter((option) => !option.needsAddress || deliveryAddress)

  // "Suositellut" = delivon järjestys (lib/ranking.js: sponsorit paikoille 1 ja 4,
  // muut pisteiden mukaan). Asiakkaan oma valinta järjestää tarkasti valinnan
  // mukaan, ylimpänä enintään yksi sponsori.
  const sortedMatching = useMemo(
    () =>
      rankRestaurants(matching, {
        address: deliveryAddress,
        popularity,
        compare: SORT_COMPARATORS[sortBy] ?? null,
      }),
    [matching, sortBy, deliveryAddress, popularity],
  )

  return (
    <div className="page page--category">
      {/* Työpöydällä sama header kuin etusivulla (logo, osoite, haku, tili, kori).
          Mobiilissa kevyt topbar - CSS näyttää oikean, sama tapa kuin SearchResults.jsx:ssä. */}
      <Header
        showAddress
        search={{ value: searchValue, onChange: setSearchValue, placeholder: 'Hae ravintoloita...' }}
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

      {/* Puhelimen yläpalkki (käyttäjän pyyntö 29.10.2026: siistimpi, ei tilin
          nappeja): takaisin vasemmalla, lajittelu oikealla ja kategorian nimi
          niiden välissä keskellä. */}
      <div className={`category-topbar${scrolled ? ' is-scrolled' : ''}`}>
        <button type="button" className="category-topbar__back" aria-label="Takaisin" onClick={() => navigate('/')}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="category-topbar__title" aria-hidden="true">
          {title}
        </span>
        {matching.length > 1 ? (
          <button
            type="button"
            className={`category-topbar__filter${sortBy !== 'suositellut' ? ' is-active' : ''}`}
            aria-label="Lajittele ravintolat"
            aria-haspopup="dialog"
            onClick={() => setSortSheetOpen(true)}
          >
            <ListFilter size={19} strokeWidth={2.2} aria-hidden="true" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      {sortSheetOpen && (
        <BottomSheet onClose={() => setSortSheetOpen(false)} labelledBy="category-sort-title" compact>
          {(close) => (
            <div className="sort-sheet">
              <h2 id="category-sort-title">Lajittelu</h2>
              <div className="sort-sheet__options" role="radiogroup" aria-labelledby="category-sort-title">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={sortBy === option.value}
                    className={`sort-sheet__option${sortBy === option.value ? ' is-selected' : ''}`}
                    onClick={() => {
                      setSortBy(option.value)
                      close()
                    }}
                  >
                    {option.label}
                    {sortBy === option.value && <Check size={18} strokeWidth={2.6} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </BottomSheet>
      )}

      <main className="category-page">
        {title && (
          <div className="category-page__heading">
            <h1>{title}</h1>

            {matching.length > 1 && (
              <div className="search-sort">
                <label htmlFor="category-sort" className="search-sort__label">
                  Lajittelu
                </label>
                <div className="search-sort__control">
                  <select id="category-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <svg className="search-sort__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="m6 8 4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'loading' && <Spinner label="Haetaan ravintoloita" />}
        {status === 'error' && <p className="state-message state-message--error">Ravintoloiden haku epäonnistui.</p>}
        {status === 'ready' && matching.length === 0 && (
          <p className="state-message">Tähän kategoriaan ei ole vielä liittynyt ravintoloita – tulossa pian!</p>
        )}

        {matching.length > 0 && (
          <div className="category-page__list">
            {sortedMatching.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                disabled={restaurant.isPlaceholder}
                isFavorite={favoriteIds.has(restaurant.id)}
                onToggleFavorite={restaurant.isPlaceholder ? undefined : toggleFavorite}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default CategoryPage
