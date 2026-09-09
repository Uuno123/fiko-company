import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import PromoCarousel from '../components/PromoCarousel.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import { getRestaurants } from '../lib/api.js'
import { useCart } from '../lib/CartContext.jsx'
import { formatPrice } from '../lib/format.js'
import './Home.css'

const ALL = 'Kaikki'
const FREE_DELIVERY = 'Ilmainen kuljetus'

function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const cart = useCart()
  const [restaurants, setRestaurants] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeCategory, setActiveCategory] = useState(ALL)
  const [activeCity, setActiveCity] = useState(() => searchParams.get('city') ?? '')
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '')

  useEffect(() => {
    if (searchParams.has('q') || searchParams.has('city')) {
      setSearchParams({}, { replace: true })
    }
    // Vain kerran alkulatauksella: siirretään mahdolliset ?q=/?city= headerin haun/sijainnin
    // aloitusarvoiksi (ks. RestaurantPage), eikä pidetä niitä osoiterivillä sen jälkeen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  const filtered = restaurants.filter((r) => {
    const matchesCategory =
      activeCategory === ALL ||
      (activeCategory === FREE_DELIVERY ? r.free_delivery : r.category === activeCategory)
    const matchesCity = !activeCity || r.city === activeCity
    const matchesSearch = !normalizedQuery || r.name.toLowerCase().includes(normalizedQuery)
    return matchesCategory && matchesCity && matchesSearch
  })

  return (
    <div className="page">
      <Header
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Hae ravintoloita...' }}
        citySelector={cities.length > 0 ? { value: activeCity, onChange: setActiveCity, options: cities } : null}
        cart={
          cart.count > 0
            ? { count: cart.count, totalCents: cart.totalCents, groups: cart.groups, onClear: cart.clear, formatPrice }
            : null
        }
      />

      <main className="home-content">
        <PromoCarousel />

        {status === 'ready' && categories.length > 1 && (
          <CategoryFilter categories={categories} active={activeCategory} onChange={setActiveCategory} />
        )}

        {status === 'loading' && <p className="state-message">Haetaan ravintoloita...</p>}

        {status === 'error' && (
          <p className="state-message state-message--error">Ravintoloiden haku epäonnistui: {errorMessage}</p>
        )}

        {status === 'ready' && filtered.length === 0 && (
          <p className="state-message">Ei ravintoloita näillä valinnoilla.</p>
        )}

        {status === 'ready' && filtered.length > 0 && (
          <div className="restaurant-grid">
            {filtered.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default Home
