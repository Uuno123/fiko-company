import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './PromoCarousel.css'

const defaultSlides = [
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
    category: 'Kebab & Pizza',
  },
  {
    id: 'burgerit',
    image: 'https://images.unsplash.com/photo-1606149059549-6042addafc5a?auto=format&fit=crop&w=1600&q=80',
    headline: 'Burgerit tuoreena grillistä',
    subtitle: 'Kuopion parhaat burgeripaikat yhdessä paikassa.',
    category: 'Burgerit',
  },
  {
    id: 'aasialainen',
    image: 'https://images.unsplash.com/photo-1567620815168-8afeeb18de17?auto=format&fit=crop&w=1600&q=80',
    headline: 'Sushia ja muuta aasialaista',
    subtitle: 'Nouda tuoretta sushia lähiravintolasta.',
    category: 'Aasialainen',
  },
]

// slides voi antaa propina toista karuselli-esiintymää varten (esim. yksittäinen
// valmis mainoskuva ilman headline/subtitle-tekstiylitystä - kuva sisältää tekstinsä itse).
function PromoCarousel({ slides = defaultSlides, ariaLabel = 'Nostot' }) {
  const trackRef = useRef(null)
  const navigate = useNavigate()
  const showArrows = slides.length > 1

  function scrollBySlide(direction) {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' })
  }

  function handleSlideClick(slide) {
    if (!slide.category) return
    navigate(`/?category=${encodeURIComponent(slide.category)}`)
  }

  return (
    <section className="promo-carousel" aria-label={ariaLabel}>
      {showArrows && (
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
      )}

      <div className="promo-carousel__track" ref={trackRef}>
        {slides.map((slide) =>
          slide.headline ? (
            <div
              className={`promo-slide${slide.category ? ' promo-slide--clickable' : ''}`}
              key={slide.id}
              role={slide.category ? 'button' : undefined}
              tabIndex={slide.category ? 0 : undefined}
              onClick={() => handleSlideClick(slide)}
              onKeyDown={(e) => {
                if (slide.category && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  handleSlideClick(slide)
                }
              }}
            >
              <div className="promo-slide__image" style={{ backgroundImage: `url(${slide.image})` }} />
              <div className="promo-slide__overlay">
                <h2>{slide.headline}</h2>
                <p>{slide.subtitle}</p>
              </div>
            </div>
          ) : (
            // Valmis mainoskuva, jossa teksti on jo kuvan sisällä - näytetään kokonaisena
            // <img>-elementtinä (ei taustakuva-rajausta), ettei kuvan oma teksti leikkaudu.
            <div className="promo-slide promo-slide--banner" key={slide.id}>
              <img className="promo-slide__banner-img" src={slide.image} alt={slide.alt ?? ''} loading="lazy" />
            </div>
          ),
        )}
      </div>

      {showArrows && (
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
      )}
    </section>
  )
}

export default PromoCarousel
