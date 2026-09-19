import { Link } from 'react-router-dom'
import { Truck, Clock, Star } from 'lucide-react'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { formatPrice } from '../lib/format.js'
import './DishResultCard.css'

// Yksittäinen annososuma hakutuloksissa. Käytössä sekä hakuehdotuksissa että
// hakutulossivulla, jotta kortti näyttää molemmissa samalta.
// Kaikki metatiedot tulevat search_menu_items-funktiolta, ei arvattua dataa.
function DishResultCard({ item, onNavigate }) {
  return (
    <Link
      to={`/ravintola/${item.restaurant_id}`}
      className="dish-card"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onNavigate}
    >
      <div className="dish-card__media">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" />
        ) : (
          <RestaurantAvatarPlaceholder name={item.name} />
        )}
      </div>

      <div className="dish-card__body">
        <span className="dish-card__price">{formatPrice(item.price_cents)}</span>
        <span className="dish-card__name">{item.name}</span>
        <span className="dish-card__restaurant">{item.restaurant_name}</span>

        <span className="dish-card__meta">
          <span className={`dish-card__fee${item.restaurant_free_delivery ? ' dish-card__fee--free' : ''}`}>
            <Truck size={13} aria-hidden="true" />
            {item.restaurant_free_delivery ? '0,00 €' : formatPrice(599)}
          </span>
          {item.restaurant_pickup_estimate_minutes && (
            <span>
              <Clock size={13} aria-hidden="true" />
              {item.restaurant_pickup_estimate_minutes} min
            </span>
          )}
          {item.restaurant_rating != null && (
            <span>
              <Star size={13} aria-hidden="true" />
              {Number(item.restaurant_rating).toFixed(1)}
            </span>
          )}
        </span>
      </div>
    </Link>
  )
}

export default DishResultCard
