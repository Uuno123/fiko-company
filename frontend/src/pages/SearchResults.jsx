import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ListFilter } from 'lucide-react'
import BottomSheet from '../components/BottomSheet.jsx'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import Spinner from '../components/Spinner.jsx'
import { useCart } from '../lib/CartContext.jsx'
import { formatPrice } from '../lib/format.js'
import { allFillerRestaurants, dealsFillerRestaurants, isDealsQuery, searchFillerRestaurants } from '../lib/categories.js'
import { getRestaurants } from '../lib/api.js'
import { QUICK_FILTERS, quickFilterForQuery } from '../lib/quickFilters.js'
import { restaurantDistanceKm, useDeliveryAddress } from '../lib/deliveryAddress.js'
import { SORT_COMPARATORS, rankRestaurants, useRankingSignals } from '../lib/ranking.js'
import { supabase } from '../lib/supabaseClient.js'
import './SearchResults.css'

// Lajitteluvaihtoehdot: työpöydän valikko ja mobiilin suodatinpaneeli.
// "Lähin ensin" vain kun toimitusosoite on annettu.
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Suositellut' },
  { value: 'rating', label: 'Paras arvio' },
  { value: 'eta', label: 'Nopein toimitus' },
  { value: 'distance', label: 'Lähin ensin', needsAddress: true },
]

const RESULT_LIMIT = 20
// Ravintoloissa näytetään kaikki joihin haku liittyy mitenkään (nimi, kategoria tai
// jokin tuote, ks. migraatio 0041) - 20:n raja katkaisisi osan niistä pois.
const RESTAURANT_RESULT_LIMIT = 100

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  // Etusivun pikavalinta ("Alle 30 min" ym.): kaikki ehdon täyttävät ravintolat.
  const quickFilter = quickFilterForQuery(query)
  const [inputValue, setInputValue] = useState(query)
  const [restaurants, setRestaurants] = useState([])
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('idle')
  const [restaurantSort, setRestaurantSort] = useState('relevance')
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
  // Suodattimet paneelista (Alle 30 min, Ilmainen kuljetus, Arvio 9+), useampi
  // kerrallaan - siirretty etusivun pillereistä 29.10.2026.
  const [activeFilters, setActiveFilters] = useState([])
  function toggleFilter(id) {
    setActiveFilters((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  }
  // Mobiilin yläpalkki madaltuu heti kun sivua vieritetään.
  const [topbarCompact, setTopbarCompact] = useState(() => window.scrollY > 8)

  useEffect(() => {
    function handleScroll() {
      setTopbarCompact(window.scrollY > 8)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  const cart = useCart()
  const navigate = useNavigate()
  const deliveryAddress = useDeliveryAddress()
  const { popularity } = useRankingSignals()
  // Järjestykseen tarvittavat kentät, joita hakufunktiot eivät palauta
  // (sponsorointi, ikä, aukioloajat, sijainti) - id -> rivi.
  const [rankingDetails, setRankingDetails] = useState(() => new Map())

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

    // Pikavalinta ei ole tekstihaku: kaikki ravintolat, joista ehto suodattaa.
    const filter = quickFilterForQuery(query)
    if (filter) {
      getRestaurants()
        .catch(() => [])
        .then((all) => {
          if (cancelled) return
          setRestaurants((all ?? []).filter(filter.test))
          setItems([])
          setStatus('ready')
        })
      return () => {
        cancelled = true
      }
    }

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

  useEffect(() => {
    const ids = [...new Set([...restaurants.map((r) => r.id), ...items.map((item) => item.restaurant_id)].filter(Boolean))]
    if (ids.length === 0 || !supabase) return undefined
    let cancelled = false
    supabase
      .from('restaurants')
      .select('id, plan, featured_until, created_at, opening_hours, lat, lng, review_count')
      .in('id', ids)
      .then(({ data }) => {
        if (!cancelled && data) setRankingDetails(new Map(data.map((row) => [row.id, row])))
      })
    return () => {
      cancelled = true
    }
  }, [restaurants, items])

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
    const real = [...restaurants, ...fromItems].map((r) => ({ ...rankingDetails.get(r.id), ...r }))
    const realNames = new Set(real.map((r) => r.name?.toLowerCase()))
    // Tarjoukset-laatikko (kategoriarivi) hakee sanalla "Tarjoukset": tulokset
    // ovat etusivun Kovimmat tarjoukset -rivin ravintolat.
    const fillers = (
      quickFilter
        ? allFillerRestaurants().filter(quickFilter.test)
        : isDealsQuery(query)
          ? dealsFillerRestaurants()
          : searchFillerRestaurants(query)
    ).filter((f) => !realNames.has(f.name.toLowerCase()))
    return [...real, ...fillers].map((r) => ({ ...r, distance_km: restaurantDistanceKm(r, deliveryAddress) }))
  }, [restaurants, items, query, quickFilter, deliveryAddress, rankingDetails])

  // Haku päättää mitkä ravintolat näytetään, järjestys tulee delivon säännöstä
  // (lib/ranking.js): "Suositellut" = sponsorit paikoille 1 ja 4 ja muut pisteiden
  // mukaan, asiakkaan oma valinta tarkasti valinnan mukaan (enintään 1 sponsori).
  const sortedRestaurants = useMemo(() => {
    const tests = QUICK_FILTERS.filter((filter) => activeFilters.includes(filter.id)).map((filter) => filter.test)
    return rankRestaurants(
      allRestaurants.filter((r) => tests.every((test) => test(r))),
      {
        address: deliveryAddress,
        popularity,
        compare: SORT_COMPARATORS[restaurantSort] ?? null,
      },
    )
  }, [allRestaurants, activeFilters, restaurantSort, deliveryAddress, popularity])

  return (
    <div className="page page--search">
      {/* Työpöydällä normaali delivo-header (logo, haku, tili, kori) - sama kuin
          etusivulla. Mobiilissa kevyt search-topbar riittää; kumpikin renderöityy
          aina, CSS näyttää oikean leveyden mukaan (sama tapa kuin Home.jsx:n
          home-mobile-top / restaurant-grid--desktop). */}
      <Header
        showAddress
        flatUntilScroll
        search={{
          value: inputValue,
          onChange: setInputValue,
          placeholder: 'Hae Bidropista...',
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

      <div className={`search-topbar${topbarCompact ? ' search-topbar--compact' : ''}`}>
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
            aria-label="Hae Bidropista"
            placeholder="Hae Bidropista"
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
          {/* Kiinteä otsikko kuten Woltissa - haettu sana näkyy jo hakukentässä
              (työpöydällä headerissa, mobiilissa yläpalkissa). Mobiilissa oikealla
              suodatinpainike, joka avaa lajittelun (käyttäjän kuva 28.10.2026);
              oranssi piste kertoo, että muu kuin oletuslajittelu on valittu. */}
          <div className="search-results__title-row">
            <h1 className="search-results__heading">Hakutulokset</h1>
            {status === 'ready' && allRestaurants.length > 1 && (
              <button
                type="button"
                className={`search-filter-btn${restaurantSort !== 'relevance' || activeFilters.length > 0 ? ' is-active' : ''}`}
                aria-label="Lajittele hakutulokset"
                aria-haspopup="dialog"
                onClick={() => setSortSheetOpen(true)}
              >
                <ListFilter size={20} strokeWidth={2.2} aria-hidden="true" />
              </button>
            )}
          </div>
          {query && <p className="search-results__heading-sub">haulle &quot;{query}&quot;</p>}
        </div>

        {sortSheetOpen && (
          <BottomSheet onClose={() => setSortSheetOpen(false)} labelledBy="sort-sheet-title" compact>
            {(close) => (
              <div className="sort-sheet">
                <h2 id="sort-sheet-title">Lajittelu</h2>
                <div className="sort-sheet__options" role="radiogroup" aria-labelledby="sort-sheet-title">
                  {SORT_OPTIONS.filter((option) => !option.needsAddress || deliveryAddress).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={restaurantSort === option.value}
                      className={`sort-sheet__option${restaurantSort === option.value ? ' is-selected' : ''}`}
                      onClick={() => {
                        setRestaurantSort(option.value)
                        close()
                      }}
                    >
                      {option.label}
                      {restaurantSort === option.value && <Check size={18} strokeWidth={2.6} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                <h2 className="sort-sheet__subtitle">Suodata</h2>
                <div className="sort-sheet__chips">
                  {QUICK_FILTERS.map(({ id, query }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={activeFilters.includes(id)}
                      className={`sort-sheet__chip${activeFilters.includes(id) ? ' is-selected' : ''}`}
                      onClick={() => toggleFilter(id)}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </BottomSheet>
        )}

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
                      {SORT_OPTIONS.filter((option) => !option.needsAddress || deliveryAddress).map((option) => (
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
