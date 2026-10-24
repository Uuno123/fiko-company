import { Bike, Car, Star, Zap } from 'lucide-react'
import { courierPhotoUrl } from '../lib/deliveryBids.js'
import './CourierAvatar.css'

const VEHICLE_ICONS = { bike: Bike, ebike: Zap, scooter: Bike, car: Car }

function initials(name) {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

// Kuljettajan kuva (tai nimikirjaimet) ja kulkuneuvo pienenä merkkinä kulmassa
// (migraatio 0062: kuljettaja lisää kuvan sovelluksessa). Tarjouskortti ja
// kuljettajan profiili (CourierProfileSheet). large: profiilin iso kuva.
export function CourierAvatar({ name, photoPath, vehicle, large = false }) {
  const Icon = VEHICLE_ICONS[vehicle] ?? Bike
  const photo = courierPhotoUrl(photoPath)
  return (
    <span className={`courier-avatar${large ? ' courier-avatar--large' : ''}`} aria-hidden="true">
      {photo ? <img src={photo} alt="" loading="lazy" /> : initials(name) || <Icon size={large ? 32 : 18} />}
      <span className="courier-avatar__vehicle">
        <Icon size={large ? 15 : 11} strokeWidth={2.4} />
      </span>
    </span>
  )
}

export function StarRow({ stars, size = 12 }) {
  return (
    <span className="courier-stars" role="img" aria-label={`${stars} / 5 tähteä`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={2}
          fill={n <= Math.round(stars) ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}
