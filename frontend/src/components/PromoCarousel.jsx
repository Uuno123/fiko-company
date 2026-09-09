import { useRef } from 'react'
import './PromoCarousel.css'

const slides = [
  {
    id: 'nouto',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1600&q=80',
    headline: 'Kuopion parhaat noutoruoat',
    subtitle: 'Selaa lähiravintoloita ja nouda suoraan, ilman välikäsiä.',
  },
  {
    id: 'pizza',
    image: 'https://images.unsplash.com/photo-1600628421066-f6bda6a7b976?auto=format&fit=crop&w=1600&q=80',
    headline: 'Pizza ilman jonotusta',
    subtitle: 'Tilaa etukäteen, nouda kun on valmista.',
  },
  {
    id: 'burgerit',
    image: 'https://images.unsplash.com/photo-1606149059549-6042addafc5a?auto=format&fit=crop&w=1600&q=80',
    headline: 'Burgerit tuoreena grillistä',
    subtitle: 'Kuopion parhaat burgeripaikat yhdessä paikassa.',
  },
  {
    id: 'aasialainen',
    image: 'https://images.unsplash.com/photo-1567620815168-8afeeb18de17?auto=format&fit=crop&w=1600&q=80',
    headline: 'Sushia ja muuta aasialaista',
    subtitle: 'Nouda tuoretta sushia lähiravintolasta.',
  },
]

function PromoCarousel() {
  const trackRef = useRef(null)

  function scrollBySlide(direction) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' })
  }

  return (
    <section className="promo-carousel" aria-label="Nostot">
      <button
        type="button"
        className="promo-carousel__arrow promo-carousel__arrow--prev"
        aria-label="Edellinen"
        onClick={() => scrollBySlide(-1)}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M12 5 7 10l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="promo-carousel__track" ref={trackRef}>
        {slides.map((slide) => (
          <div className="promo-slide" key={slide.id}>
            <div className="promo-slide__image" style={{ backgroundImage: `url(${slide.image})` }} />
            <div className="promo-slide__overlay">
              <h2>{slide.headline}</h2>
              <p>{slide.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="promo-carousel__arrow promo-carousel__arrow--next"
        aria-label="Seuraava"
        onClick={() => scrollBySlide(1)}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </section>
  )
}

export default PromoCarousel
