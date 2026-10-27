import { Link } from 'react-router-dom'
import {
  Beef,
  Coffee,
  CookingPot,
  EggFried,
  Fish,
  Flame,
  Grape,
  Hamburger,
  LeafyGreen,
  Percent,
  Pizza,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  UtensilsCrossed,
  Vegan,
  Wheat,
} from 'lucide-react'
import { DEALS_QUERY } from '../lib/categories.js'
import './CategoryPill.css'

// Kategoriapilleri: ohut viivaikoni ja nimi vaaleanharmaassa kapselissa
// (käyttäjän valinta 27.10.2026, pelkkien tekstien tilalle). Käytössä
// työpöydän CategoryBarissa ja puhelimen MobileCategoryRow'ssa. Painallus hakee
// kategorian nimellä. Ei valokuvia eikä emojeja; tuntematon kategoria saa
// haarukka-veitsi-ikonin.
const ICONS = {
  [DEALS_QUERY]: Percent,
  Burgerit: Hamburger,
  'Kebab & Pizza': Pizza,
  Salaatit: Salad,
  Aasialainen: Fish,
  Kahvila: Coffee,
  Italialainen: Wheat,
  Kotiruoka: CookingPot,
  Kebab: Beef,
  Ramen: Soup,
  Kiinalainen: Shrimp,
  Intialainen: Flame,
  Kreikkalainen: Grape,
  Bowlit: LeafyGreen,
  Tacot: Sandwich,
  Vegaani: Vegan,
  Aamiainen: EggFried,
}

// offers: oranssi Tarjoukset-pilleri. active: puhelimen rivin scroll-spy.
function CategoryPill({ category, offers = false, active = false }) {
  const Icon = ICONS[category] ?? UtensilsCrossed
  return (
    <Link
      to={`/haku?q=${encodeURIComponent(category)}`}
      className={`cat-pill${offers ? ' cat-pill--offers' : ''}${active ? ' cat-pill--active' : ''}`}
    >
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
      {category}
    </Link>
  )
}

export default CategoryPill
