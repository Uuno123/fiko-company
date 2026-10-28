import { useEffect, useRef } from 'react'
import RestaurantCard from './RestaurantCard.jsx'
import './DealsRow.css'

// Etusivun "Kovimmat tarjoukset" -rivi (käyttäjän pyyntö 24.10.2026): Bidropin
// valitsemat ravintolat omana rivinään Kebab & Pizza -rivin jälkeen. Rivi
// erottuu muista isommilla nostokorteilla, vaalealla oranssilla kaistalla ja
// otsikon Tarjous-merkillä. Ravintolat: DEALS_RESTAURANTS (lib/categories.js).
// Samat luokat kuin kategoriariveillä, joten nuolet (onScrollRow) toimivat
// samalla tavalla.
//
// Kortit vaihtuvat itsestään kuten etusivun mainoskaruselli (käyttäjän pyyntö
// 28.10.2026): rivi siirtyy kortin verran DEALS_ROTATE_MS välein ja palaa
// lopusta alkuun. Ei liikettä, kun hiiri tai sormi on rivillä, sivu on
// taustalla tai käyttäjä on pyytänyt vähemmän liikettä.
const DEALS_ROTATE_MS = 4000

function DealsRow({ items, favoriteIds, onToggleFavorite, onScrollRow }) {
  const scrollRef = useRef(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || items.length < 2) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => {
      if (pausedRef.current || document.hidden) return
      const card = scroller.querySelector('.restaurant-card')
      if (!card) return
      const gap = parseFloat(getComputedStyle(scroller).columnGap) || 16
      const step = card.getBoundingClientRect().width + gap
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4
      scroller.scrollTo({ left: atEnd ? 0 : scroller.scrollLeft + step, behavior: 'smooth' })
    }, DEALS_ROTATE_MS)
    return () => clearInterval(timer)
  }, [items.length])

  const pause = () => {
    pausedRef.current = true
  }
  const resume = () => {
    pausedRef.current = false
  }

  return (
    <section className="category-row category-row--deals" aria-labelledby="deals-row-title">
      <div className="category-row__header">
        <div className="deals-row__heading">
          <h2 className="category-row__title" id="deals-row-title">
            Kovimmat tarjoukset
          </h2>
          <span className="deals-row__tag">Tarjous</span>
        </div>
        <div className="category-row__actions">
          <button
            type="button"
            className="category-row__nav"
            aria-label="Kovimmat tarjoukset: edelliset"
            onClick={(e) => onScrollRow(e, -1)}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M12 4 6 10l6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="category-row__nav"
            aria-label="Kovimmat tarjoukset: seuraavat"
            onClick={(e) => onScrollRow(e, 1)}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="m8 4 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="category-row__scroll"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onFocus={pause}
        onBlur={resume}
      >
        {items.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            disabled={restaurant.isPlaceholder}
            isFavorite={favoriteIds.has(restaurant.id)}
            onToggleFavorite={restaurant.isPlaceholder ? undefined : onToggleFavorite}
          />
        ))}
      </div>
    </section>
  )
}

export default DealsRow
