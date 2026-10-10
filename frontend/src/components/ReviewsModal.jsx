import { useEffect } from 'react'
import { Star, X } from 'lucide-react'
import { formatReviewAge } from '../lib/demoReviews.js'
import './ReviewsModal.css'

function Stars({ value, size = 14 }) {
  return (
    <span className="reviews-modal__stars" role="img" aria-label={`${value} / 5 tähteä`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= Math.round(value) ? 'currentColor' : 'none'}
          className={n <= Math.round(value) ? '' : 'is-empty'}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

// Ravintolan arvostelut omassa ikkunassaan (käyttäjän pyyntö: ei sivulla
// näkyvänä osiona, vaan nappi joka vie niihin). Työpöydällä keskellä,
// puhelimella alhaalta nouseva paneeli.
function ReviewsModal({ restaurantName, rating, reviewCount, reviews, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div className="reviews-modal__backdrop" onClick={onClose}>
      <div
        className="reviews-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Arvostelut: ${restaurantName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="reviews-modal__head">
          <h2>Arvostelut</h2>
          <button type="button" className="reviews-modal__close" aria-label="Sulje" onClick={onClose}>
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="reviews-modal__body">
          {rating != null && (
            <div className="reviews-modal__summary">
              <strong>{Number(rating).toFixed(1)}</strong>
              <span className="reviews-modal__summary-side">
                <Stars value={Number(rating)} size={18} />
                <span>{reviewCount}+ arviota</span>
              </span>
            </div>
          )}

          <ul className="reviews-modal__list">
            {reviews.map((review) => (
              <li key={review.id} className="reviews-modal__item">
                <div className="reviews-modal__item-head">
                  <span className="reviews-modal__avatar" aria-hidden="true">
                    {review.name[0]}
                  </span>
                  <span className="reviews-modal__who">
                    <strong>{review.name}</strong>
                    <span>{formatReviewAge(review.daysAgo)}</span>
                  </span>
                </div>
                <Stars value={review.rating} />
                <p>{review.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ReviewsModal
