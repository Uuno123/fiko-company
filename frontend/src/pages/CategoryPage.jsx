import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AccountMenu from '../components/AccountMenu.jsx'
import Footer from '../components/Footer.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { getRestaurants } from '../lib/api.js'
import { CATEGORY_NAMES, categorySlug, padWithFillers } from '../lib/categories.js'
import { restaurantDistanceKm, useDeliveryAddress } from '../lib/deliveryAddress.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { getFavoriteRestaurantIds, addFavorite, removeFavorite } from '../lib/favorites.js'
import './CategoryPage.css'

function CategoryPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { customer } = useAuth()
  const [restaurants, setRestaurants] = useState([])
  const [status, setStatus] = useState('loading')
  const [favoriteIds, setFavoriteIds] = useState(() => new Set())
  const [sortBy, setSortBy] = useState('suositellut')
  const deliveryAddress = useDeliveryAddress()

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

  useEffect(() => {
    if (!customer?.id) {
      setFavoriteIds(new Set())
      return undefined
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

  // Samat kaksi oikeaa kenttää kuin hakutuloksissa (SearchResults.jsx) - ei
  // keksittyä järjestystä, molemmat lukevat kortin jo näyttämää dataa.
  const sortedMatching = useMemo(() => {
    if (sortBy === 'rating') return [...matching].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    if (sortBy === 'eta') {
      return [...matching].sort(
        (a, b) => (a.pickup_estimate_minutes ?? Infinity) - (b.pickup_estimate_minutes ?? Infinity),
      )
    }
    if (sortBy === 'distance') {
      return [...matching].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
    }
    return matching
  }, [matching, sortBy])

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
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(restaurantId)
        else next.delete(restaurantId)
        return next
      })
    }
  }

  return (
    <div className="page page--category">
      <div className="category-topbar">
        <div className="category-topbar__left">
          <button
            type="button"
            className="category-topbar__back"
            aria-label="Takaisin"
            onClick={() => navigate('/')}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <Link to="/" className="delivo-logo">
            delivo
          </Link>
        </div>
        <AccountMenu currentPath={`/kategoria/${slug}`} />
      </div>

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
                    <option value="suositellut">Suositellut</option>
                    <option value="rating">Paras arvio</option>
                    <option value="eta">Nopein toimitus</option>
                    {deliveryAddress && <option value="distance">Lähin ensin</option>}
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
          <p className="state-message">Ei ravintoloita tässä kategoriassa.</p>
        )}

        {matching.length > 0 && (
          <div className="category-page__list">
            {sortedMatching.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                disabled={restaurant.isPlaceholder}
                isFavorite={favoriteIds.has(restaurant.id)}
                onToggleFavorite={customer && !restaurant.isPlaceholder && !restaurant.isDemo ? toggleFavorite : undefined}
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
