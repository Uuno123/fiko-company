import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import RestaurantAvatarPlaceholder from '../components/RestaurantAvatarPlaceholder.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { useCart } from '../lib/CartContext.jsx'
import { formatPrice } from '../lib/format.js'
import './SearchResults.css'

const RESULT_LIMIT = 20

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(query)
  const [restaurants, setRestaurants] = useState([])
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const cart = useCart()

  useEffect(() => {
    setInputValue(query)
  }, [query])

  useEffect(() => {
    if (!inputValue.trim()) return undefined
    const timer = setTimeout(() => {
      setSearchParams({ q: inputValue.trim() }, { replace: true })
    }, 400)
    return () => clearTimeout(timer)
  }, [inputValue, setSearchParams])

  useEffect(() => {
    if (!query.trim()) {
      setRestaurants([])
      setItems([])
      setStatus('ready')
      return undefined
    }
    let cancelled = false
    setStatus('loading')

    Promise.all([
      supabase.rpc('search_restaurants', { search_term: query, result_limit: RESULT_LIMIT }),
      supabase.rpc('search_menu_items', { search_term: query, result_limit: RESULT_LIMIT }),
    ]).then(([restaurantsRes, itemsRes]) => {
      if (cancelled) return
      setRestaurants(restaurantsRes.data ?? [])
      setItems(itemsRes.data ?? [])
      setStatus('ready')
    })

    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="page">
      <Header
        search={{ value: inputValue, onChange: setInputValue, placeholder: 'Hae ravintoloita...' }}
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

      <main className="search-results">
        <h1 className="search-results__heading">
          Hakutulokset{query ? <> haulle &quot;{query}&quot;</> : null}
        </h1>

        {status === 'loading' && <p className="state-message">Haetaan...</p>}

        {status === 'ready' && !query.trim() && <p className="state-message">Kirjoita jotain hakeaksesi.</p>}

        {status === 'ready' && query.trim() && restaurants.length === 0 && items.length === 0 && (
          <p className="state-message">Ei tuloksia haulle &quot;{query}&quot;.</p>
        )}

        {restaurants.length > 0 && (
          <section className="search-results__section">
            <h2>Ravintolat ja kaupat</h2>
            <div className="search-results__restaurant-grid">
              {restaurants.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section className="search-results__section">
            <h2>Ruokalajit</h2>
            <div className="search-results__item-grid">
              {items.map((item) => (
                <Link key={item.id} to={`/ravintola/${item.restaurant_id}`} className="search-result-item-card">
                  <div className="search-result-item-card__media">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} loading="lazy" />
                    ) : (
                      <RestaurantAvatarPlaceholder name={item.name} />
                    )}
                  </div>
                  <div className="search-result-item-card__body">
                    <span className="search-result-item-card__price">{formatPrice(item.price_cents)}</span>
                    <span className="search-result-item-card__name">{item.name}</span>
                    <span className="search-result-item-card__restaurant">{item.restaurant_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default SearchResults
