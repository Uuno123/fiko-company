import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DishResultCard from './DishResultCard.jsx'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { getRestaurants } from '../lib/api.js'
import { supabase } from '../lib/supabaseClient.js'
import './SearchSuggest.css'

// Hakuehdotukset: ravintolat ja yksittäiset annokset. Sama toteutus sekä
// headerin pudotusvalikossa että mobiilin koko ruudun hakunäkymässä, jotta
// hakulogiikka on vain yhdessä paikassa.
//
// Haku sietää pieniä kirjoitusvirheitä ("pizzta" -> "pizza") trigram-
// samankaltaisuuden avulla (search_restaurants/search_menu_items, ks.
// migraatio 0027) - pelkkä ilike vaatisi tarkan osajonon.
function SearchSuggest({ query, variant = 'dropdown', onNavigate }) {
  const [itemResults, setItemResults] = useState([])
  const [restaurantResults, setRestaurantResults] = useState([])
  const [fallback, setFallback] = useState([])

  useEffect(() => {
    const term = query?.trim()
    if (!term) {
      setItemResults([])
      setRestaurantResults([])
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(() => {
      supabase.rpc('search_menu_items', { search_term: term }).then(({ data }) => {
        if (!cancelled) setItemResults(data ?? [])
      })
      supabase.rpc('search_restaurants', { search_term: term }).then(({ data }) => {
        if (!cancelled) setRestaurantResults(data ?? [])
      })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  // Ravintolahaku osuu vain ravintolan nimeen/kategoriaan, joten esim.
  // "kinkkupizza" löytää annoksen muttei sitä tarjoavaa ravintolaa. Täydennetään
  // ravintolalista annososumien ravintoloilla - ne oikeasti myyvät haettua
  // ruokaa, ja search_menu_items palauttaa niistä jo kaikki tarvittavat tiedot.
  const shownRestaurants = useMemo(() => {
    const seen = new Set(restaurantResults.map((r) => r.id))
    const fromItems = []
    for (const item of itemResults) {
      if (!item.restaurant_id || seen.has(item.restaurant_id)) continue
      seen.add(item.restaurant_id)
      fromItems.push({
        id: item.restaurant_id,
        name: item.restaurant_name,
        image_url: item.restaurant_image_url,
        is_open: item.restaurant_is_open,
        rating: item.restaurant_rating,
        free_delivery: item.restaurant_free_delivery,
        pickup_estimate_minutes: item.restaurant_pickup_estimate_minutes,
      })
    }
    return [...restaurantResults, ...fromItems]
  }, [restaurantResults, itemResults])

  const hasResults = shownRestaurants.length > 0 || itemResults.length > 0
  const trimmed = query?.trim() ?? ''

  // Kun haku ei tuota osumia, näytetään silti ravintoloita - mutta omana
  // "suosittua"-osionaan eikä hakutuloksina, koska ne eivät vastaa hakua.
  useEffect(() => {
    if (!trimmed || hasResults || fallback.length > 0) return
    let cancelled = false
    getRestaurants()
      .then((data) => {
        if (cancelled) return
        const open = (data ?? []).filter((r) => r.is_open !== false)
        const pool = open.length > 0 ? open : (data ?? [])
        setFallback([...pool].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [trimmed, hasResults, fallback.length])

  if (!trimmed) return null

  const seeAllHref = `/haku?q=${encodeURIComponent(trimmed)}`

  return (
    <div className={`search-suggest-panel search-suggest-panel--${variant}`}>
      {shownRestaurants.length > 0 && (
        <div className="search-suggest-section">
          <div className="search-suggest-section__header">
            <h3 className="search-suggest-section__title">Ravintolat ja kaupat</h3>
            <Link to={seeAllHref} className="search-suggest-section__all" onClick={onNavigate}>
              Katso kaikki
            </Link>
          </div>
          <div className="search-suggest-restaurants">
            {shownRestaurants.map((r) => (
              <Link
                key={r.id}
                to={`/ravintola/${r.id}`}
                className="search-suggest-restaurant-card"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onNavigate}
              >
                <div className="search-suggest-restaurant-card__media">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.name} loading="lazy" />
                  ) : (
                    <RestaurantAvatarPlaceholder name={r.name} />
                  )}
                </div>
                <span className="search-suggest-restaurant-card__name">{r.name}</span>
                <span className="search-suggest-restaurant-card__meta">
                  {r.free_delivery ? 'Ilmainen kuljetus' : 'Kuljetus 5,99 €'}
                  {r.pickup_estimate_minutes && ` · n. ${r.pickup_estimate_minutes} min`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {itemResults.length > 0 && (
        <div className="search-suggest-section">
          <div className="search-suggest-section__header">
            <h3 className="search-suggest-section__title">Hakutulokset</h3>
            <Link to={seeAllHref} className="search-suggest-section__all" onClick={onNavigate}>
              Katso kaikki
            </Link>
          </div>
          <div className="search-suggest-items">
            {itemResults.map((item) => (
              <DishResultCard key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {!hasResults && (
        <div className="search-suggest-section">
          <p className="search-suggest-empty">Ei osumia haulla “{trimmed}”.</p>

          {fallback.length > 0 && (
            <>
              <div className="search-suggest-section__header">
                <h3 className="search-suggest-section__title">Suosittuja juuri nyt</h3>
              </div>
              <div className="search-suggest-restaurants">
                {fallback.map((r) => (
                  <Link
                    key={r.id}
                    to={`/ravintola/${r.id}`}
                    className="search-suggest-restaurant-card"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onNavigate}
                  >
                    <div className="search-suggest-restaurant-card__media">
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.name} loading="lazy" />
                      ) : (
                        <RestaurantAvatarPlaceholder name={r.name} />
                      )}
                    </div>
                    <span className="search-suggest-restaurant-card__name">{r.name}</span>
                    <span className="search-suggest-restaurant-card__meta">
                      {r.free_delivery ? 'Ilmainen kuljetus' : 'Kuljetus 5,99 €'}
                      {r.pickup_estimate_minutes && ` · n. ${r.pickup_estimate_minutes} min`}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchSuggest
