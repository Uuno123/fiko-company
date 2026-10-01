import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ALL, CATEGORY_TILE_META, DEFAULT_TILE_META } from '../lib/categories.js'
import './CategoryFilter.css'

// Työpöydän kategoriarivi: pyöristetyt ruokakuvalaatikot, samat kuvat kuin
// mobiilin kategoriarivillä. Laatikko hakee kategorian nimellä ja vie
// hakutuloksiin (käyttäjän pyyntö) - aiemmin se suodatti etusivua paikallaan.
//
// Laatikoita on kuusitoista, joten rivi täyttyy ja vierittyy itsestään -
// aiempaa listan toistamista ei enää tarvita.
function CategoryFilter({ categories }) {
  const trackRef = useRef(null)

  const selectable = categories.filter((category) => category !== ALL)
  if (selectable.length === 0) return null

  // Askel on neljä laatikkoa, jotta nuoli liikuttaa riviä eikä nytkäytä sitä.
  // Leveys luetaan laatikosta itsestään, jottei sitä tarvitse pitää CSS:n
  // kanssa synkassa.
  function scrollBy(direction) {
    const track = trackRef.current
    if (!track) return
    const tile = track.querySelector('.cat-tile')
    const step = tile ? tile.getBoundingClientRect().width + 10 : track.clientWidth * 0.6
    track.scrollBy({ left: direction * step * 4, behavior: 'smooth' })
  }

  return (
    <div className="category-filter-wrap">
      <div className="category-filter-nav">
        <button type="button" className="cat-nav" aria-label="Edelliset kategoriat" onClick={() => scrollBy(-1)}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12 4 6 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className="cat-nav" aria-label="Seuraavat kategoriat" onClick={() => scrollBy(1)}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m8 4 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <nav className="category-filter" aria-label="Hae ruokalajin mukaan" ref={trackRef}>
        {selectable.map((category) => {
          const tile = CATEGORY_TILE_META[category] ?? DEFAULT_TILE_META

          return (
            <Link key={category} to={`/haku?q=${encodeURIComponent(category)}`} className="cat-tile">
              <span className="cat-tile__art" aria-hidden="true">
                {tile.img ? <img src={tile.img} alt="" loading="lazy" /> : tile.emoji}
              </span>
              <span className="cat-tile__label">{category}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default CategoryFilter
