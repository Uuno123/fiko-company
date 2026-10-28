import { Link } from 'react-router-dom'
import { BadgePercent, Bike, Gift, Heart, ShoppingBag, Tag } from 'lucide-react'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { ScoreSmiley } from './Smiley.jsx'
import { DELIVERY_PRICE_RANGE, formatEtaRange } from '../lib/delivery.js'
import { formatPrice } from '../lib/format.js'
import { formatScore } from '../lib/score.js'
import './RestaurantCard.css'

// Tarjousmerkki vaihtelee ravintolan mukaan (käyttäjän pyyntö 28.10.2026), lyhyt
// mutta kertoo mistä alennus tulee (koodi näkyy kassalla). Jokainen merkki on totta: koodit toimivat kassalla (Cart.jsx PROMO_CODES ja
// backendin payments.js - sama katto ja ehdot molemmissa). Ilmainen kuljetus vain
// ravintoloille, joilla se on (free_delivery, näkyy myös tietorivillä 0,00 €).
const OFFER_BADGES = [
  // SUURTILAUS: 30 %, enintään 7 €, tilaus vähintään 50 €.
  { Icon: Tag, text: '−30 % (enintään 7 €)' },
  // BIDROP10
  { Icon: BadgePercent, text: '−10 % tilauksesta' },
  // TERVETULOA
  { Icon: Gift, text: '−3 € tilauksesta' },
  // NOUTO15: 15 % noutotilauksista, enintään 5 €.
  { Icon: ShoppingBag, text: '−15 % noudosta' },
]
const FREE_DELIVERY_BADGE = { Icon: Bike, text: 'Ilmainen kuljetus' }

// Sama ravintola saa aina saman merkin (ei vaihdu sivun päivittyessä). Burgereilla
// aina −30 % (enintään 7 €) (käyttäjän pyyntö 28.10.2026).
function offerBadge(restaurant) {
  if (restaurant.category === 'Burgerit') return OFFER_BADGES[0]
  if (restaurant.free_delivery) return FREE_DELIVERY_BADGE
  const key = String(restaurant.id ?? restaurant.name ?? '')
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return OFFER_BADGES[hash % OFFER_BADGES.length]
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
    sponsored,
  } = restaurant

  const etaRange = formatEtaRange(pickupEstimateMinutes)
  const badge = offerBadge(restaurant)

  // Yksi tietorivi: arvosana · aika · kuljetusmaksu (käyttäjä: etäisyys pois
  // korteista; etäisyys vaikuttaa edelleen järjestykseen, lib/ranking.js).
  // Kiinni olevaa ravintolaa ei merkitä tekstillä vaan himmennetyllä kortilla
  // (.restaurant-card--closed).
  const stats = [
    rating != null && (
      <span key="rating" className="restaurant-card__stat restaurant-card__stat--rating">
        {/* Hymiö ja arvosana 0–10 (tähtien tilalle 28.10.2026, lib/score.js). */}
        <ScoreSmiley rating={rating} />
        {formatScore(rating)}
      </span>
    ),
    etaRange && (
      <span key="eta" className="restaurant-card__stat">
        {etaRange}
      </span>
    ),
    <span
      key="fee"
      className={`restaurant-card__stat${freeDelivery ? ' restaurant-card__stat--accent' : ''}`}
    >
      <Bike size={14} aria-hidden="true" />
      {freeDelivery ? formatPrice(0) : DELIVERY_PRICE_RANGE}
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
          <img src={imageUrl} alt={name} loading="lazy" decoding="async" />
        ) : (
          <RestaurantAvatarPlaceholder name={name} />
        )}

        {/* Merkki on totta, ks. OFFER_BADGES yllä. */}
        <span className="restaurant-card__promo">
          <badge.Icon size={12} aria-hidden="true" />
          {badge.text}
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
          {/* Maksettu näkyvyys merkitään aina (lib/ranking.js). */}
          {sponsored && <span className="restaurant-card__sponsored">Sponsoroitu</span>}
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
