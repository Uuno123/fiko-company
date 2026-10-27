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
// Alas vieritettäessä palkki liukuu headerin alle piiloon ja ylös
// vieritettäessä takaisin (käyttäjän pyyntö 25.10.2026).
const HIDE_AFTER_PX = 80
// Pieni liike (esim. kosketuslevyn värinä) ei vaihda tilaa.
const SCROLL_SLOP_PX = 6

function CategoryBar() {
  const trackRef = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (y <= HIDE_AFTER_PX) setHidden(false)
        else if (y > lastY + SCROLL_SLOP_PX) setHidden(true)
        else if (y < lastY - SCROLL_SLOP_PX) setHidden(false)
        else return
        lastY = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

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
    <nav className={`category-bar${hidden ? ' category-bar--hidden' : ''}`} aria-label="Kategoriat">
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
