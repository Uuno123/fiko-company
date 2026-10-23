import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Star, X } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import { formatReviewAge } from '../lib/demoReviews.js'
import {
  daysSince,
  fetchMyReviewStatus,
  fetchReviews,
  markRestaurantOrdersReviewed,
  submitReview,
} from '../lib/reviews.js'
import ReviewForm from './ReviewForm.jsx'
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
// puhelimella alhaalta nouseva paneeli. Ylhäällä oman arvostelun kirjoitus:
// vain asiakas, jolla on ravintolasta valmis tilaus (migraatio 0054).
// Esittelyravintolalla näytetään lisäksi esimerkkiarvostelut (demoReviews).
function ReviewsModal({ restaurantId, restaurantName, rating, reviewCount, demoReviews = [], onSummaryChange, onClose }) {
  const { customer } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const customerId = customer?.id ?? null
  const [reviews, setReviews] = useState([])
  const [myStatus, setMyStatus] = useState(null)
  const [writing, setWriting] = useState(false)
  const [thanks, setThanks] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

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

  // Arvostelut ja kirjautuneen oma tilanne (voiko arvostella, oma arvostelu).
  const fetchAll = useCallback(
    () =>
      Promise.all([
        fetchReviews(restaurantId),
        customerId ? fetchMyReviewStatus(restaurantId) : Promise.resolve(null),
      ]),
    [restaurantId, customerId],
  )

  useEffect(() => {
    let cancelled = false
    fetchAll()
      .then(([list, status]) => {
        if (cancelled) return
        setReviews(list)
        setMyStatus(status)
      })
      .catch(() => {
        // Taulua ei vielä ole (0054 ajamatta) - näytetään vain esimerkit.
        if (!cancelled) setUnavailable(true)
      })
    return () => {
      cancelled = true
    }
  }, [fetchAll])

  async function handleSubmit(stars, comment) {
    await submitReview(restaurantId, stars, comment)
    // Arviointipyyntö (ReviewPrompt) ei enää kysy näistä tilauksista.
    markRestaurantOrdersReviewed(customerId, restaurantId)
    const [list, status] = await fetchAll()
    setReviews(list)
    setMyStatus(status)
    setWriting(false)
    setThanks(true)
    // Oikealle ravintolalle arvosana ja määrä sivun yläosaan heti.
    if (demoReviews.length === 0 && list.length > 0) {
      const average = list.reduce((sum, review) => sum + review.rating, 0) / list.length
      onSummaryChange?.({ rating: Math.round(average * 10) / 10, count: list.length })
    }
  }

  const ownReview = myStatus?.review ?? null
  const allReviews = [
    ...reviews.map((review) => ({
      id: review.id,
      name: review.author_name,
      rating: review.rating,
      text: review.comment,
      reply: review.reply,
      daysAgo: daysSince(review.created_at),
    })),
    ...demoReviews,
  ]

  let writeBlock = null
  if (unavailable) {
    writeBlock = null
  } else if (!customerId) {
    writeBlock = (
      <div className="reviews-modal__write">
        <p>Oletko tilannut täältä? Kirjaudu ja kerro kokemuksesi.</p>
        <button
          type="button"
          className="reviews-modal__write-btn"
          onClick={() => navigate('/login', { state: { from: `${location.pathname}${location.search}` } })}
        >
          Kirjaudu arvostellaksesi
        </button>
      </div>
    )
  } else if (writing) {
    writeBlock = <ReviewForm initial={ownReview} editing={Boolean(ownReview)} onCancel={() => setWriting(false)} onSubmit={handleSubmit} />
  } else if (myStatus?.can_review) {
    writeBlock = (
      <div className="reviews-modal__write">
        {thanks ? <p className="reviews-modal__thanks">Kiitos arvostelustasi!</p> : null}
        <button
          type="button"
          className="reviews-modal__write-btn"
          onClick={() => {
            setThanks(false)
            setWriting(true)
          }}
        >
          {ownReview ? 'Muokkaa arvosteluasi' : 'Kirjoita arvostelu'}
        </button>
      </div>
    )
  } else if (myStatus) {
    writeBlock = (
      <p className="reviews-modal__write-note">Voit arvostella ravintolan, kun olet tilannut sieltä.</p>
    )
  }

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
                <span>{reviewCount}</span>
              </span>
            </div>
          )}

          {writeBlock}

          {allReviews.length === 0 ? (
            <p className="reviews-modal__empty">Ei vielä arvosteluja.</p>
          ) : (
            <ul className="reviews-modal__list">
              {allReviews.map((review) => (
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
                  {review.text && <p>{review.text}</p>}
                  {review.reply && (
                    <div className="reviews-modal__reply">
                      <strong>Ravintolan vastaus</strong>
                      <p>{review.reply}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReviewsModal
