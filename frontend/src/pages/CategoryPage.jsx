import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AccountMenu from '../components/AccountMenu.jsx'
import Footer from '../components/Footer.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { getRestaurants } from '../lib/api.js'
import { categorySlug, padWithFillers } from '../lib/categories.js'
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

  // Täydennetään samalla säännöllä kuin etusivun rivit, jotta kategoria näyttää
  // saman määrän molemmissa paikoissa. Täytteet ovat fiktiivisiä eivätkä
  // klikattavissa (disabled).
  const matching = useMemo(() => {
    const real = restaurants.filter((r) => r.category && categorySlug(r.category) === slug)
    if (real.length === 0) return []
    return padWithFillers(real[0].category, real)
  }, [restaurants, slug])

  // Otsikko luetaan datasta, jotta se näkyy oikein kirjoitettuna ("Kebab & Pizza")
  // eikä URL-muodossa. Latauksen aikana dataa ei vielä ole, joten otsikko
  // näytetään vasta sitten - muuten ylhäällä vilahtaisi "burgerit" pienellä.
  const title = matching[0]?.category ?? null

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
          </div>
        )}

        {status === 'loading' && <Spinner label="Haetaan ravintoloita" />}
        {status === 'error' && <p className="state-message state-message--error">Ravintoloiden haku epäonnistui.</p>}
        {status === 'ready' && matching.length === 0 && (
          <p className="state-message">Ei ravintoloita tässä kategoriassa.</p>
        )}

        {matching.length > 0 && (
          <div className="category-page__list">
            {matching.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                disabled={restaurant.isPlaceholder}
                isFavorite={favoriteIds.has(restaurant.id)}
                onToggleFavorite={customer && !restaurant.isPlaceholder ? toggleFavorite : undefined}
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
