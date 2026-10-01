import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { useCart } from '../lib/CartContext.jsx'
import { formatPrice } from '../lib/format.js'
import { searchFillerRestaurants } from '../lib/categories.js'
import { restaurantDistanceKm, useDeliveryAddress } from '../lib/deliveryAddress.js'
import { supabase } from '../lib/supabaseClient.js'
import './SearchResults.css'

const RESULT_LIMIT = 20
// Ravintoloissa näytetään kaikki joihin haku liittyy mitenkään (nimi, kategoria tai
// jokin tuote, ks. migraatio 0041) - 20:n raja katkaisisi osan niistä pois.
const RESTAURANT_RESULT_LIMIT = 100

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(query)
  const [restaurants, setRestaurants] = useState([])
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [restaurantSort, setRestaurantSort] = useState('relevance')
  const cart = useCart()
  const navigate = useNavigate()
  const deliveryAddress = useDeliveryAddress()

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
    setRestaurantSort('relevance')

    Promise.all([
      supabase.rpc('search_restaurants', { search_term: query, result_limit: RESTAURANT_RESULT_LIMIT }),
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

  // Sivu näyttää vain ravintoloita (samat kuin hakunäkymässä, ks. SearchSuggest):
  // annoshaku kertoo vain mitkä ravintolat myyvät haettua ruokaa, ja perään tulevat
  // hakuun liittyvät täyteravintolat.
  const allRestaurants = useMemo(() => {
    const seen = new Set(restaurants.map((r) => r.id))
    const fromItems = []
    for (const item of items) {
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
    const real = [...restaurants, ...fromItems]
    const realNames = new Set(real.map((r) => r.name?.toLowerCase()))
    const fillers = searchFillerRestaurants(query).filter((f) => !realNames.has(f.name.toLowerCase()))
    return [...real, ...fillers].map((r) => ({ ...r, distance_km: restaurantDistanceKm(r, deliveryAddress) }))
  }, [restaurants, items, query, deliveryAddress])

  // "Suositellut" on RPC:n oma järjestys (osuvuus haulle) - ainoa järjestys jota
  // ei voi laskea selaimessa. Muut kaksi ovat oikeita kenttiä datassa, ei arvattuja.
  const sortedRestaurants = useMemo(() => {
    if (restaurantSort === 'rating') {
      return [...allRestaurants].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    }
    if (restaurantSort === 'eta') {
      return [...allRestaurants].sort(
        (a, b) => (a.pickup_estimate_minutes ?? Infinity) - (b.pickup_estimate_minutes ?? Infinity),
      )
    }
    if (restaurantSort === 'distance') {
      return [...allRestaurants].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
    }
    return allRestaurants
  }, [allRestaurants, restaurantSort])

  return (
    <div className="page page--search">
      {/* Työpöydällä normaali delivo-header (logo, haku, tili, kori) - sama kuin
          etusivulla. Mobiilissa kevyt search-topbar riittää; kumpikin renderöityy
          aina, CSS näyttää oikean leveyden mukaan (sama tapa kuin Home.jsx:n
          home-mobile-top / restaurant-grid--desktop). */}
      <Header
        showAddress
        search={{
          value: inputValue,
          onChange: setInputValue,
          placeholder: 'Hae delivosta...',
        }}
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
        <div className="search-results__heading-row">
          {/* Työpöytä: kiinteä otsikko kuten Woltissa - haettu sana näkyy jo
              yläreunan hakukentässä, joten sitä ei tarvitse toistaa isolla. */}
          <h1 className="search-results__heading search-results__heading--desktop">Hakutulokset</h1>
          {/* Mobiili: haettu sana on itse otsikko, koska omaa hakukenttää
              sisältävää headeria ei näytetä. */}
          {query && <h1 className="search-results__heading search-results__heading--mobile">“{query}”</h1>}
          {query && <p className="search-results__heading-sub">haulle &quot;{query}&quot;</p>}
        </div>

        {status === 'loading' && <Spinner label="Haetaan" />}

        {status === 'ready' && !query.trim() && <p className="state-message">Kirjoita jotain hakeaksesi.</p>}

        {status === 'ready' && query.trim() && allRestaurants.length === 0 && (
          <p className="state-message">Ei tuloksia haulle &quot;{query}&quot;.</p>
        )}

        {status === 'ready' && allRestaurants.length > 0 && (
          <section className="search-results__section">
            <div className="search-results__section-header">
              <h2>Ravintolat ja kaupat</h2>

              {/* Lajittelu vaikuttaa oikeasti järjestykseen - "Paras arvio" ja
                  "Nopein toimitus" lukevat samoja kenttiä joita kortti jo näyttää,
                  ei mitään uutta tai keksittyä. Yhden osuman kanssa lajittelu ei
                  tee mitään, joten kontrollia ei silloin näytetä. */}
              {allRestaurants.length > 1 && (
                <div className="search-sort">
                  <label htmlFor="restaurant-sort" className="search-sort__label">
                    Lajittelu
                  </label>
                  <div className="search-sort__control">
                    <select
                      id="restaurant-sort"
                      value={restaurantSort}
                      onChange={(e) => setRestaurantSort(e.target.value)}
                    >
                      <option value="relevance">Suositellut</option>
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

            <div className="search-results__restaurant-grid">
              {sortedRestaurants.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} disabled={r.isPlaceholder} />
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
