import { Link } from 'react-router-dom'
import { Bike, Heart, Tag } from 'lucide-react'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { DELIVERY_FEE_CENTS, formatEtaRange } from '../lib/delivery.js'
import { formatDistance } from '../lib/deliveryAddress.js'
import { formatPrice } from '../lib/format.js'
import './RestaurantCard.css'

// Tähti arvosanan edessä.
function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76L10 2.5z" />
    </svg>
  )
}

function RestaurantCard({ restaurant, disabled, isFavorite, onToggleFavorite }) {
  const {
    id,
    name,
    image_url: imageUrl,
    is_open: isOpen,
    rating,
    free_delivery: freeDelivery,
    pickup_estimate_minutes: pickupEstimateMinutes,
    distance_km: distanceKm,
  } = restaurant

  const etaRange = formatEtaRange(pickupEstimateMinutes)
  const distance = formatDistance(distanceKm)

  // Yksi tietorivi: arvosana · aika · etäisyys · kuljetusmaksu. Etäisyys on
  // mukana vain kun kävijä on antanut toimitusosoitteen (lib/deliveryAddress.js).
  // Kiinni olevaa ravintolaa ei merkitä tekstillä vaan himmennetyllä kortilla
  // (.restaurant-card--closed).
  const stats = [
    rating != null && (
      <span key="rating" className="restaurant-card__stat restaurant-card__stat--rating">
        <StarIcon />
        {Number(rating).toFixed(1)}
      </span>
    ),
    etaRange && (
      <span key="eta" className="restaurant-card__stat">
        {etaRange}
      </span>
    ),
    distance && (
      <span key="distance" className="restaurant-card__stat">
        {distance}
      </span>
    ),
    <span
      key="fee"
      className={`restaurant-card__stat${freeDelivery ? ' restaurant-card__stat--accent' : ''}`}
    >
      <Bike size={14} aria-hidden="true" />
      {formatPrice(freeDelivery ? 0 : DELIVERY_FEE_CENTS)}
    </span>,
  ].filter(Boolean)

  const Wrapper = disabled ? 'div' : Link
  const wrapperProps = disabled ? { 'aria-disabled': true, tabIndex: -1 } : { to: `/ravintola/${id}` }

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

        {/* Merkki on totta: SUURTILAUS antaa kassalla oikeasti 30 % (enint. 7 €)
            kun tilaus on vähintään 50 € - sama katto ja raja on sekä täällä
            (Cart.jsx) että backendin payments.js:ssä, joka veloittaa summan. */}
        <span className="restaurant-card__promo">
          <Tag size={12} aria-hidden="true" />
          −30 % (enint. 7 €)
        </span>

        {onToggleFavorite && (
          <button
            type="button"
            className={`restaurant-card__fav${isFavorite ? ' restaurant-card__fav--active' : ''}`}
            aria-label={isFavorite ? `Poista ${name} suosikeista` : `Lisää ${name} suosikkeihin`}
            aria-pressed={isFavorite}
            onClick={(e) => {
              // Kortti on linkki, joten estetään navigointi sydäntä painettaessa.
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(id)
            }}
          >
            <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="restaurant-card__body">
        <div className="restaurant-card__heading">
          <h3>{name}</h3>
        </div>

        <div className="restaurant-card__meta">
          {stats.map((stat, i) => (
            <span key={stat.key} className="restaurant-card__meta-item">
              {i > 0 && (
                <span className="restaurant-card__sep" aria-hidden="true">
                  ·
                </span>
              )}
              {stat}
            </span>
          ))}
        </div>
      </div>
    </Wrapper>
  )
}

export default RestaurantCard
