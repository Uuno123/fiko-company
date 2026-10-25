import { Link } from 'react-router-dom'
import { DEALS_QUERY } from '../lib/categories.js'
import './OffersTile.css'

// Kategoriarivin oranssi Tarjoukset-laatikko (käyttäjän pyyntö 24.10.2026):
// kolmantena rivissä, selvästi muista erottuva. Hakee kuten muutkin laatikot:
// sanalla "Tarjoukset" hakutuloksiin tulevat etusivun Kovimmat tarjoukset
// -rivin ravintolat (SearchResults, lib/categories.js). Vain puhelimen
// kategoriarivissä (ja sen pilleriversiossa): työpöydän laatikot poistettiin.
export const OFFERS_TILE_INDEX = 2

function OffersTile() {
  return (
    <Link to={`/haku?q=${encodeURIComponent(DEALS_QUERY)}`} className="home-cat-tile home-cat-tile--offers">
      <span className="home-cat-tile__art offers-tile__art" aria-hidden="true">
        <span className="offers-tile__sign">%</span>
        {/* Sama luku kuin ravintolakorttien alennusmerkissä (RestaurantCard). */}
        <span className="offers-tile__badge">−30 %</span>
      </span>
      <span className="home-cat-tile__label">Tarjoukset</span>
    </Link>
  )
}

export default OffersTile
