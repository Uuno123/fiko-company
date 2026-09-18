import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { computePriceTier } from '../lib/priceTier.js'
import './RestaurantCard.css'

function RestaurantCard({ restaurant, disabled }) {
  const {
    id,
    name,
    image_url: imageUrl,
    is_open: isOpen,
    rating,
    menu_items: menuItems,
    free_delivery: freeDelivery,
    pickup_estimate_minutes: pickupEstimateMinutes,
  } = restaurant
  const priceTier = computePriceTier(menuItems)

  const Wrapper = disabled ? 'div' : Link
  const wrapperProps = disabled
    ? { 'aria-disabled': true, tabIndex: -1 }
    : { to: `/ravintola/${id}` }

  return (
    <Wrapper
      {...wrapperProps}
      className={`restaurant-card${isOpen ? '' : ' restaurant-card--closed'}${disabled ? ' restaurant-card--disabled' : ''}`}
    >
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
          {rating != null && (
            <span className="rating-badge">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76L10 2.5z" />
              </svg>
              {Number(rating).toFixed(1)}
            </span>
          )}
          {isOpen && pickupEstimateMinutes && (
            <span className="eta-badge">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10 6v4l3 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              n. {pickupEstimateMinutes} min
            </span>
          )}
          {priceTier && <span className="price-tier">{priceTier}</span>}
        </div>

        <span className={`delivery-note${freeDelivery ? ' delivery-note--free' : ''}`}>
          <Truck size={13} aria-hidden="true" />
          {freeDelivery ? 'Ilmainen kuljetus' : 'Kuljetus 5,99 €'}
        </span>
      </div>
    </Wrapper>
  )
}

export default RestaurantCard
