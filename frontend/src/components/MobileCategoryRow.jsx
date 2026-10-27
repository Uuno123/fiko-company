import { Fragment, useEffect, useRef, useState } from 'react'
import { DEALS_LINK_INDEX, DEALS_QUERY, categorySlug } from '../lib/categories.js'
import CategoryPill from './CategoryPill.jsx'

// Mobiilin etusivun kategoriarivi: ikoni + nimi -pillerit (CategoryPill), sama
// tyyli kuin työpöydän palkissa (käyttäjän valinta 27.10.2026). Pilleri hakee
// kategorialla, oranssi Tarjoukset kolmantena. Rivin tyylit Home.css:ssä
// (.home-quick-cats).
//
// Aktiivinen nimi seuraa näkyvää kategoriariviä (scroll-spy). Tila on tässä
// eikä Homessa, jotta korostuksen vaihtuminen kesken vierityksen ei piirrä koko
// etusivua kortteineen uudelleen - se nyki puhelimella.
//
// Headeriin kiinni ollessaan rivi liukuu alas vieritettäessä headerin alle
// piiloon ja tulee ylös vieritettäessä takaisin, kuten työpöydän palkki
// (käyttäjän pyyntö 25.10.2026). Omalla paikallaan rivi näkyy aina.
const SCROLL_SLOP_PX = 6

function MobileCategoryRow({ categories, rowsRef }) {
  const navRef = useRef(null)
  const [activeSlug, setActiveSlug] = useState(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return undefined
    let lastY = window.scrollY
    let frame = 0
    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (Math.abs(y - lastY) < SCROLL_SLOP_PX) return
        // Kiinni: rivi on sticky-kohdassaan (piilossa se on sen yläpuolella).
        const stuck = nav.getBoundingClientRect().top <= parseFloat(getComputedStyle(nav).top) + 1
        setHidden(y > lastY && stuck)
        lastY = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const sections = rowsRef.current?.querySelectorAll('.category-row')
    if (!sections?.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveSlug(visible.target.id.replace(/^cat-/, ''))
      },
      { rootMargin: '-150px 0px -60% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [rowsRef, categories.length])

  return (
    <nav ref={navRef} className={`home-quick-cats${hidden ? ' home-quick-cats--hidden' : ''}`} aria-label="Kategoriat">
      <div className="home-quick-cats__row">
        {categories.map((category, index) => (
          <Fragment key={category}>
            {index === DEALS_LINK_INDEX && <CategoryPill category={DEALS_QUERY} offers />}
            <CategoryPill category={category} active={activeSlug === categorySlug(category)} />
          </Fragment>
        ))}
      </div>
    </nav>
  )
}

export default MobileCategoryRow
