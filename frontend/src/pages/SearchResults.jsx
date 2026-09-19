import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import DishResultCard from '../components/DishResultCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { supabase } from '../lib/supabaseClient.js'
import './SearchResults.css'

const RESULT_LIMIT = 20

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(query)
  const [restaurants, setRestaurants] = useState([])
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const navigate = useNavigate()

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
    <div className="page page--search">
      <div className="search-topbar">
        <button type="button" className="search-topbar__back" aria-label="Takaisin" onClick={() => navigate('/')}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="search-topbar__field">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2.2" />
            <path d="m17.5 17.5-4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            aria-label="Hae delivosta"
            placeholder="Hae delivosta"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          {inputValue && (
            <button type="button" aria-label="Tyhjennä haku" onClick={() => setInputValue('')}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <main className="search-results">
        {query && <h1 className="search-results__heading">“{query}”</h1>}

        {status === 'loading' && <Spinner label="Haetaan" />}

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
                <DishResultCard key={item.id} item={item} />
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
