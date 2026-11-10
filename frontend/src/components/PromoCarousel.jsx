import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './PromoCarousel.css'

// Etusivun promobannerit vaakakarusellina (käyttäjän speksi 8.11.2026).
// items: [{ id, image, alt, title, description, sponsored, href }]
// Yksi kortti kerrallaan näkyvissä (scroll-snap), koko kortti on linkki.
// Kortit vaihtuvat itsestään AUTOPLAY_MS välein ja lopusta palataan alkuun;
// ei liikettä, kun sormi/hiiri on päällä, sivu on taustalla tai käyttäjä on
// pyytänyt vähemmän liikettä.
const AUTOPLAY_MS = 4500

function isInternal(href) {
  return typeof href === 'string' && href.startsWith('/')
}

export default function PromoCarousel({ items = [], ariaLabel = 'Nostot' }) {
  const trackRef = useRef(null)
  const pausedRef = useRef(false)

  useEffect(() => {
    if (items.length < 2) return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => {
      const track = trackRef.current
      if (!track || pausedRef.current || document.hidden) return
      // Yhden dian verran (työpöydällä useampi dia näkyy rinnakkain).
      const step = track.querySelector('.promo-carousel__slide')?.offsetWidth || track.clientWidth
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step, behavior: 'smooth' })
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [items.length])

  if (items.length === 0) return null

  const pause = () => (pausedRef.current = true)
  const resume = () => (pausedRef.current = false)

  return (
    <section className="promo-carousel" aria-label={ariaLabel}>
      <div
        className="promo-carousel__track"
        ref={trackRef}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onFocus={pause}
        onBlur={resume}
      >
        {items.map((item) => {
          const content = (
            <>
              <img className="promo-carousel__img" src={item.image} alt={item.alt ?? ''} loading="lazy" />
              <div className="promo-carousel__shade" aria-hidden="true" />
              <div className="promo-carousel__text">
                <span className="promo-carousel__label">Ravintola</span>
                <h3 className="promo-carousel__title">{item.title}</h3>
                {item.description && <p className="promo-carousel__desc">{item.description}</p>}
                {item.sponsored && <span className="promo-carousel__sponsored">Sponsoroitu</span>}
              </div>
            </>
          )
          return (
            <div className="promo-carousel__slide" key={item.id}>
              {/* Ilman hrefiä kortti ei ole linkki (mainostetut ravintolat eivät
                  vielä ole palvelussa, käyttäjän pyyntö 10.11.2026). */}
              {!item.href ? (
                <div className="promo-carousel__card">{content}</div>
              ) : isInternal(item.href) ? (
                <Link to={item.href} className="promo-carousel__card">
                  {content}
                </Link>
              ) : (
                <a href={item.href} className="promo-carousel__card">
                  {content}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
