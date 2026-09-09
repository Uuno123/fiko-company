import { Link } from 'react-router-dom'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { computePriceTier } from '../lib/priceTier.js'
import './RestaurantCard.css'

function RestaurantCard({ restaurant }) {
  const {
    id,
    name,
    category,
    image_url: imageUrl,
    is_open: isOpen,
    rating,
    menu_items: menuItems,
    free_delivery: freeDelivery,
  } = restaurant
  const priceTier = computePriceTier(menuItems)

  return (
    <Link to={`/ravintola/${id}`} className={`restaurant-card${isOpen ? '' : ' restaurant-card--closed'}`}>
      <div className="restaurant-card__media">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" />
        ) : (
          <RestaurantAvatarPlaceholder name={name} />
        )}
        <span className={`status-badge ${isOpen ? 'status-badge--open' : 'status-badge--closed'}`}>
          <span className="status-badge__dot" />
          {isOpen ? 'Avoinna' : 'Kiinni'}
        </span>
      </div>

      <div className="restaurant-card__body">
        <div className="restaurant-card__heading">
          <h3>{name}</h3>
          <span className="restaurant-card__arrow" aria-hidden="true">
            →
          </span>
        </div>

        <div className="restaurant-card__meta">
          <span className="category-tag">{category}</span>
          {priceTier && <span className="price-tier">{priceTier}</span>}
          {rating != null && (
            <span className="rating-badge">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76L10 2.5z" />
              </svg>
              {Number(rating).toFixed(1)}
            </span>
          )}
        </div>

        <span className={`delivery-note${freeDelivery ? ' delivery-note--free' : ''}`}>
          {freeDelivery ? 'Ilmainen kuljetus' : 'Kuljetus 5,99 €'}
        </span>
      </div>
    </Link>
  )
}

export default RestaurantCard
