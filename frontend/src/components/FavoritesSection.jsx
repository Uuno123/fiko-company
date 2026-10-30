import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { ScoreSmiley } from './Smiley.jsx'
import { formatScore } from '../lib/score.js'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { getRestaurants } from '../lib/api.js'
import { formatEtaRange } from '../lib/delivery.js'
import { getDemoRestaurant } from '../lib/demoRestaurants.js'
import { getFavoriteRestaurantIds, removeFavorite } from '../lib/favorites.js'
import { restaurantThumb } from '../lib/brandLogos.js'

// Lempipaikat Omat tiedot -sivulla (customer_favorites). Sydän lisätään
// ravintolakortista tai ravintolan sivulta; täällä suosikit näkyvät tiiviinä
// listana (käyttäjä: isot kortit ja vahva hover pois), ja sydämestä suosikin
// voi poistaa. Esittelyravintolan tiedot tulevat tiedostosta kuten sen omalla
// sivulla (lib/demoRestaurants.js).
async function loadFavorites(customerId) {
  const [ids, restaurants] = await Promise.all([getFavoriteRestaurantIds(customerId), getRestaurants()])
  const byId = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant]))
  return ids
    .map((id) => {
      const demo = getDemoRestaurant(id)
      return demo ? { ...byId.get(id), ...demo } : byId.get(id)
    })
    .filter(Boolean)
}

function FavoriteRow({ restaurant, onRemove }) {
  const thumb = restaurantThumb(restaurant.name, restaurant.image_url)
  const meta = [restaurant.category, formatEtaRange(restaurant.pickup_estimate_minutes)].filter(Boolean).join(' · ')
  return (
    <li className="favorite-row">
      <Link to={`/ravintola/${restaurant.id}`} className="favorite-row__link">
        <span className="favorite-row__thumb">
          {thumb ? (
            <img
              src={thumb.src}
              alt=""
              loading="lazy"
              className={thumb.logo ? 'brand-thumb-logo' : undefined}
              style={thumb.style}
            />
          ) : (
            <RestaurantAvatarPlaceholder name={restaurant.name} />
          )}
        </span>
        <span className="favorite-row__text">
          <span className="favorite-row__name">{restaurant.name}</span>
          <span className="favorite-row__meta">
            {restaurant.rating != null && (
              <span className="favorite-row__rating">
                <ScoreSmiley rating={restaurant.rating} size={14} />
                {formatScore(restaurant.rating)}
              </span>
            )}
            {restaurant.rating != null && meta && <span aria-hidden="true">·</span>}
            {meta}
          </span>
        </span>
      </Link>
      <button
        type="button"
        className="favorite-row__remove"
        aria-label={`Poista ${restaurant.name} suosikeista`}
        onClick={() => onRemove(restaurant)}
      >
        <Heart size={18} fill="currentColor" aria-hidden="true" />
      </button>
    </li>
  )
}

function FavoritesSection({ customerId }) {
  const [favorites, setFavorites] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!customerId) return undefined
    let cancelled = false
    loadFavorites(customerId)
      .then((list) => {
        if (cancelled) return
        setFavorites(list)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  // Poisto heti näkyviin; jos tallennus epäonnistuu, rivi palaa paikalleen.
  async function handleRemove(restaurant) {
    setFavorites((list) => list.filter((item) => item.id !== restaurant.id))
    const ok = await removeFavorite(customerId, restaurant.id)
    if (!ok) setFavorites((list) => [...list, restaurant])
  }

  return (
    <section className="settings-section">
      <div className="settings-section__head">
        <h2>Lempipaikat</h2>
        {favorites.length > 0 && <span className="settings-section__count">{favorites.length}</span>}
      </div>

      {status === 'ready' && favorites.length === 0 && (
        <div className="settings-panel settings-panel--padded favorites-empty">
          <span className="favorites-empty__icon">
            <Heart size={19} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="settings-empty">
            <p>Ei vielä suosikkeja.</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="settings-panel settings-panel--padded">
          <p className="settings-empty__hint">Suosikkien haku epäonnistui. Yritä hetken kuluttua uudelleen.</p>
        </div>
      )}

      {favorites.length > 0 && (
        <ul className="settings-panel favorite-rows">
          {favorites.map((restaurant) => (
            <FavoriteRow key={restaurant.id} restaurant={restaurant} onRemove={handleRemove} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default FavoritesSection
