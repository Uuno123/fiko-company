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

// Mobiilin kategoriariveille ei näytetä kahvilaosiota lainkaan (käyttäjän päätös).
const HIDDEN_MOBILE_CATEGORIES = ['Kahvila']

// Täytetiedot kun kategoriassa on alle 3 oikeaa ravintolaa - selvästi fiktiivisiä,
// ei klikattavissa (ks. RestaurantCard disabled-tila), ei omaa kuvaa eikä ruokalistaa.
const FILLER_TEMPLATES_BY_CATEGORY = {
  Burgerit: [
    {
      name: 'Liekki Burgers',
      rating: 4.3,
      pickup_estimate_minutes: 12,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1572448992068-26624d5cf341?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Pihvi & Co',
      rating: 4.1,
      pickup_estimate_minutes: 18,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=1600&q=80',
    },
  ],
  'Kebab & Pizza': [
    {
      name: 'Ateenan Kebab',
      rating: 4.4,
      pickup_estimate_minutes: 14,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1600&q=80',
    },
  ],
  Kotiruoka: [
    {
      name: 'Mummon Pöytä',
      rating: 4.6,
      pickup_estimate_minutes: 22,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1566751640620-a9dd00cfbab4?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Kotilieden Lounas',
      rating: 4.2,
      pickup_estimate_minutes: 16,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1708782340354-96cdbd9f70d6?auto=format&fit=crop&w=1600&q=80',
    },
  ],
  Salaatit: [
    {
      name: 'Vihreä Kulho',
      rating: 4.5,
      pickup_estimate_minutes: 9,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1758721218560-aec50748d450?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Terveystalo Bistro',
      rating: 4.0,
      pickup_estimate_minutes: 13,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?auto=format&fit=crop&w=1600&q=80',
    },
  ],
  Aasialainen: [
    {
      name: 'Wok & Roll',
      rating: 4.3,
      pickup_estimate_minutes: 17,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1464500542410-1396074bf230?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Bangkok Bistro',
      rating: 4.4,
      pickup_estimate_minutes: 20,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1633271332313-04df64c0105b?auto=format&fit=crop&w=1600&q=80',
    },
  ],
  Italialainen: [
    {
      name: 'Piccolo Trattoria',
      rating: 4.5,
      pickup_estimate_minutes: 19,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1615584240522-7fe7ed4dadee?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Pasta Fresca',
      rating: 4.2,
      pickup_estimate_minutes: 15,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1571175534150-72cd2b5a6039?auto=format&fit=crop&w=1600&q=80',
    },
  ],
}

function buildFillerRestaurant(category, index, template) {
  return {
    id: `filler-${category}-${index}`,
    name: template.name,
    category,
    image_url: template.image_url,
    is_open: true,
    rating: template.rating,
    menu_items: [],
    free_delivery: template.free_delivery,
    pickup_estimate_minutes: template.pickup_estimate_minutes,
    isPlaceholder: true,
  }
}

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
  const baseFiltered = restaurants.filter((r) => {
    const matchesCity = !activeCity || r.city === activeCity
    const matchesSearch = !normalizedQuery || r.name.toLowerCase().includes(normalizedQuery)
    return matchesCity && matchesSearch
  })
  const filtered = baseFiltered.filter((r) => {
    return activeCategory === ALL || (activeCategory === FREE_DELIVERY ? r.free_delivery : r.category === activeCategory)
  })
  // Mobiilissa ei ole enää kategoriavalitsinta - näytetään sen sijaan yksi vaakarivi per
  // kategoria (samaan tapaan kuin Wolt), riippumatta activeCategory-tilasta.
  const mobileCategoryGroups = Array.from(new Set(baseFiltered.map((r) => r.category)))
    .filter((category) => !HIDDEN_MOBILE_CATEGORIES.includes(category))
    .map((category) => {
      const realItems = baseFiltered.filter((r) => r.category === category)
      const fillers = FILLER_TEMPLATES_BY_CATEGORY[category] ?? []
      const items = [...realItems]
      for (let i = 0; items.length < 3 && i < fillers.length; i++) {
        items.push(buildFillerRestaurant(category, i, fillers[i]))
      }
      return { category, items }
    })

  const freeDeliveryItems = baseFiltered.filter((r) => r.free_delivery)
  if (freeDeliveryItems.length > 0) {
    mobileCategoryGroups.push({ category: FREE_DELIVERY, items: freeDeliveryItems })
  }

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
          <div className="restaurant-grid restaurant-grid--desktop">
            {filtered.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}

        {status === 'ready' && baseFiltered.length > 0 && (
          <div className="category-rows">
            {mobileCategoryGroups.map(
              ({ category, items }) =>
                items.length > 0 && (
                  <section className="category-row" key={category}>
                    <h2 className="category-row__title">{category}</h2>
                    <div className="category-row__scroll">
                      {items.map((restaurant) => (
                        <RestaurantCard key={restaurant.id} restaurant={restaurant} disabled={restaurant.isPlaceholder} />
                      ))}
                    </div>
                  </section>
                ),
            )}
          </div>
        )}

        <section className="home-promo-section">
          <h2 className="home-promo-section__title">Ajankohtaista</h2>
          <PromoCarousel
            slides={[
              {
                id: 'ale',
                image: '/kuva1.jpg',
                headline: 'Jopa -20%',
                subtitle: 'Syyskuun parhaat tarjoukset lähiravintoloista.',
              },
              {
                id: 'ilmainen-kuljetus',
                image: '/kuva2.jpg',
                headline: 'Ilmainen kuljetus',
                subtitle: 'Valituista ravintoloista, ilman lisäkuluja.',
              },
              {
                id: 'uudet-suosikit',
                image: '/kuva3.jpg',
                headline: 'Uudet suosikit',
                subtitle: 'Löydä tuoreimmat lisäykset valikoimaan.',
              },
            ]}
          />
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Home
