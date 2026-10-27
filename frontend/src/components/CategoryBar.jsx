import { Fragment, useEffect, useRef, useState } from 'react'
import { CATEGORY_NAMES, DEALS_LINK_INDEX, DEALS_QUERY } from '../lib/categories.js'
import CategoryPill from './CategoryPill.jsx'
import './CategoryBar.css'

// Työpöydän kategoriat headerin alla, kiinni yläreunassa vieritettäessä
// (käyttäjän pyyntö 25.10.2026, värikkäiden laatikoiden tilalle): ikoni +
// nimi -pillerit (CategoryPill), sama tyyli kuin puhelimen rivissä. Jokainen
// hakee kategorialla; oranssi Tarjoukset kolmantena. Puhelimella piilossa
// (CategoryBar.css).
//
// Kaikki nimet eivät mahdu kapeammalle näytölle, joten rivi vierii ja reunoissa
// on nuolet silloin kun sivuun jää piiloon nimiä.
//
// Palkki pysyy kiinni headerin alla myös alas vieritettäessä (käyttäjän pyyntö
// 27.10.2026 - aiempi piiloon liukuminen poistettu).

function CategoryBar() {
  const trackRef = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  function updateEdges() {
    const track = trackRef.current
    if (!track) return
    const start = track.scrollLeft <= 1
    const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1
    setEdges((current) => (current.start === start && current.end === end ? current : { start, end }))
  }

  // ResizeObserver kutsuu heti ensimmäisen kerran, joten alkutila lasketaan sillä.
  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(updateEdges)
    observer.observe(track)
    return () => observer.disconnect()
  }, [])

  function scrollBy(direction) {
    const track = trackRef.current
    track?.scrollBy({ left: direction * track.clientWidth * 0.6, behavior: 'smooth' })
  }

  return (
    <nav className="category-bar" aria-label="Kategoriat">
      <div className="category-bar__inner">
        {!edges.start && (
          <button
            type="button"
            className="category-bar__arrow category-bar__arrow--prev"
            aria-label="Edelliset kategoriat"
            onClick={() => scrollBy(-1)}
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
        )}
        <div className="category-bar__track" ref={trackRef} onScroll={updateEdges}>
          {CATEGORY_NAMES.map((category, index) => (
            <Fragment key={category}>
              {index === DEALS_LINK_INDEX && <CategoryPill category={DEALS_QUERY} offers />}
              <CategoryPill category={category} />
            </Fragment>
          ))}
        </div>
        {!edges.end && (
          <button
            type="button"
            className="category-bar__arrow category-bar__arrow--next"
            aria-label="Seuraavat kategoriat"
            onClick={() => scrollBy(1)}
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
        )}
      </div>
    </nav>
  )
}

export default CategoryBar
