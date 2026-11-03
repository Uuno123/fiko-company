import { Link } from 'react-router-dom'
import { Bike, Heart } from 'lucide-react'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { ScoreSmiley } from './Smiley.jsx'
import { DELIVERY_PRICE_RANGE, formatEtaRange } from '../lib/delivery.js'
import { formatScore } from '../lib/score.js'
import './RestaurantCard.css'

// Tarjousmerkit käyttäjän mallikuvan mukaan (2.11.2026): iso arvo ja pieni
// selite. Kokeilussa kaksi tyyliä: badgeStyle="corner" (kulmalappu kuvan
// vasemmassa yläkulmassa) tavallisilla riveillä ja "sticker" (pyöreä tarra
// oikeassa reunassa) nostoriveillä (DealsRow). Vain oikeita tarjouksia: koodit
// toimivat kassalla (Cart.jsx PROMO_CODES, backendin payments.js). Ilmaisesta
// kuljetuksesta ei merkkiä - se näkyy tietorivillä tekstinä.
const OFFER_BADGES = [
  // SUURTILAUS: 30 %, enintään 7 €.
  { value: '−30%', note: 'max 7 €', text: '−30 % tilauksesta (max 7 €)', tone: 'orange' },
  // BIDROP10
  { value: '−10%', note: 'tilauksesta', text: '−10 % tilauksesta', tone: 'orange' },
  // TERVETULOA
  { value: '−3 €', note: 'tilauksesta', text: '−3 € tilauksesta', tone: 'black' },
  // NOUTO15: 15 % noutotilauksista.
  { value: '−15%', note: 'noudosta', text: '−15 % noudosta (max 5 €)', tone: 'black' },
]

// Sama ravintola saa aina saman merkin. Noin 2/5 korteista ilman merkkiä;
// alwaysBadge: nostoriveillä aina merkki. Burgereilla −30 %.
function offerBadge(restaurant, alwaysBadge) {
  const key = String(restaurant.id ?? restaurant.name ?? '')
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  if (!alwaysBadge && hash % 5 < 2) return null
  if (restaurant.category === 'Burgerit') return OFFER_BADGES[0]
  return OFFER_BADGES[hash % OFFER_BADGES.length]
}

function RestaurantCard({
  restaurant,
  disabled,
  isFavorite,
  onToggleFavorite,
  alwaysBadge = false,
  badgeStyle = 'corner',
}) {
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
  const badge = offerBadge(restaurant, alwaysBadge)

  // Yksi tietorivi: arvosana · aika · kuljetus (käyttäjän pyyntö 3.11.2026).
  // Etäisyys pois korteista; etäisyys vaikuttaa edelleen järjestykseen, lib/ranking.js).
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
    // Kuljetus tietorivillä: hinta, tai ilmainen kuljetus pienenä badgena
    // (käyttäjän pyyntö 3.11.2026: ei omalle riville).
    freeDelivery ? (
      <span key="fee" className="restaurant-card__free-badge">Ilmainen kuljetus</span>
    ) : (
      <span key="fee" className="restaurant-card__stat">
        <Bike size={14} aria-hidden="true" />
        {DELIVERY_PRICE_RANGE}
      </span>
    ),
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

        {/* Pyöreä tarra nostoriveillä kuvan päällä; tavallisilla riveillä tarjous
            on kortin alaosassa tietorivin alla (käyttäjän pyyntö 3.11.2026). */}
        {badge && badgeStyle === 'sticker' && (
          <span className={`offer-badge offer-badge--${badgeStyle} offer-badge--${badge.tone}`}>
            <strong>{badge.value}</strong>
            <span>{badge.note}</span>
          </span>
        )}
      </div>

      <div className="restaurant-card__body">
        <div className="restaurant-card__heading">
          <h3>{name}</h3>
          {/* Maksettu näkyvyys merkitään aina (lib/ranking.js). */}
          {sponsored && <span className="restaurant-card__sponsored">Sponsoroitu</span>}
          {/* Sydän nimen vieressä Uber Eatsin tapaan (29.10.2026, aiemmin kuvan
              kulmassa). Puhelimella piilossa (RestaurantCard.css). */}
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

        <div className="restaurant-card__meta">
          {stats.map((stat, i) => (
            <span key={stat.key} className="restaurant-card__meta-item">
              {i > 0 && !(stat.key === 'fee' && freeDelivery) && (
                <span className="restaurant-card__sep" aria-hidden="true">
                  ·
                </span>
              )}
              {stat}
            </span>
          ))}
        </div>

        {badge && badgeStyle !== 'sticker' && (
          <span className="restaurant-card__offer">
            {/* Pidempi kuvaus kortin alaosan pillerissä (käyttäjän pyyntö 3.11.2026). */}
            {badge.text}
          </span>
        )}
      </div>
    </Wrapper>
  )
}

export default RestaurantCard
