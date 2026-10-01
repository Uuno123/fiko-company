import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { getRestaurants } from '../lib/api.js'
import { searchFillerRestaurants } from '../lib/categories.js'
import { supabase } from '../lib/supabaseClient.js'
import './SearchSuggest.css'

// Hakuehdotukset: pelkät ravintolat (ei yksittäisiä annoksia). Sama toteutus
// sekä headerin hakunäkymässä että mobiilin koko ruudun haussa, jotta
// hakulogiikka on vain yhdessä paikassa.
//
// Haku sietää pieniä kirjoitusvirheitä ("pizzta" -> "pizza") trigram-
// samankaltaisuuden avulla (search_restaurants/search_menu_items, ks.
// migraatio 0027) - pelkkä ilike vaatisi tarkan osajonon.
export function RestaurantResultCard({ restaurant: r, onNavigate }) {
  // Täyteravintolalla ei ole omaa sivua - kortti näkyy mutta ei ole linkki,
  // kuten etusivullakin (RestaurantCard disabled).
  const Wrapper = r.isPlaceholder ? 'div' : Link
  const wrapperProps = r.isPlaceholder
    ? { 'aria-disabled': true }
    : { to: `/ravintola/${r.id}`, onMouseDown: (e) => e.preventDefault(), onClick: onNavigate }

  return (
    <Wrapper
      {...wrapperProps}
      className={`search-suggest-restaurant-card${r.isPlaceholder ? ' search-suggest-restaurant-card--disabled' : ''}`}
    >
      <div className="search-suggest-restaurant-card__media">
        {r.image_url ? (
          <img src={r.image_url} alt={r.name} loading="lazy" />
        ) : (
          <RestaurantAvatarPlaceholder name={r.name} />
        )}
      </div>
      <div className="search-suggest-restaurant-card__body">
        <span className="search-suggest-restaurant-card__name">{r.name}</span>
        {r.category && <span className="search-suggest-restaurant-card__category">{r.category}</span>}
      </div>
      <span className="search-suggest-restaurant-card__meta">
        <Truck size={14} aria-hidden="true" />
        <span className={r.free_delivery ? 'search-suggest-restaurant-card__fee--free' : undefined}>
          {r.free_delivery ? '0,00 €' : '5,99 €'}
        </span>
        {r.pickup_estimate_minutes && <span>· {r.pickup_estimate_minutes} min</span>}
      </span>
    </Wrapper>
  )
}

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

  // Annoksia ei näytetä, mutta annosten haku kertoo mitkä ravintolat myyvät
  // haettua ruokaa (esim. "kinkkupizza" ei osu yhdenkään ravintolan nimeen).
  // Oikeiden ravintoloiden perään tulevat hakuun liittyvät täyteravintolat,
  // jotta näkymä ei jää kahden kortin varaan.
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
    const real = [...restaurantResults, ...fromItems]
    const realNames = new Set(real.map((r) => r.name?.toLowerCase()))
    const fillers = searchFillerRestaurants(query).filter((f) => !realNames.has(f.name.toLowerCase()))
    return [...real, ...fillers]
  }, [restaurantResults, itemResults, query])

  const hasResults = shownRestaurants.length > 0
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
          <div className="search-suggest-restaurants search-suggest-restaurants--grid">
            {shownRestaurants.map((r) => (
              <RestaurantResultCard key={r.id} restaurant={r} onNavigate={onNavigate} />
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
              <div className="search-suggest-restaurants search-suggest-restaurants--grid">
                {fallback.map((r) => (
                  <RestaurantResultCard key={r.id} restaurant={r} onNavigate={onNavigate} />
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
