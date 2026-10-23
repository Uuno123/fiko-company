import { useCallback, useEffect, useState } from 'react'
import { MessageSquareReply, Star } from 'lucide-react'
import { useDashboardApi } from '../api.js'
import { useDashboard } from '../context.js'
import { Card, EmptyState, ErrorNote, PageHeader, Segmented, Stat } from '../ui.jsx'
import { relativeDay } from '../utils.js'

function Stars({ value, size = 15 }) {
  return (
    <span className="pd-stars" aria-label={`${value} / 5 tähteä`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= value ? 'is-on' : ''} aria-hidden="true" />
      ))}
    </span>
  )
}

const FILTERS = [
  { value: 'all', label: 'Kaikki' },
  { value: 'unanswered', label: 'Vastaamatta' },
  { value: 'low', label: '1–3 tähteä' },
]

const REPLY_MAX = 500

function ReviewItem({ review, onReply }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(review.reply ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function publish() {
    setBusy(true)
    setError('')
    const failed = await onReply(review.id, text.trim())
    setBusy(false)
    if (failed) setError('Vastauksen tallennus epäonnistui. Yritä uudelleen.')
    else setOpen(false)
  }

  return (
    <li className="pd-review">
      <div className="pd-review__head">
        <span className="pd-review__avatar" aria-hidden="true">
          {review.author_name[0]}
        </span>
        <span>
          <strong>{review.author_name}</strong>
          <span className="pd-muted">{relativeDay(review.created_at)}</span>
        </span>
        <Stars value={review.rating} />
      </div>
      {review.comment ? <p className="pd-review__text">{review.comment}</p> : <p className="pd-review__text pd-muted">Pelkkä tähtiarvio</p>}
      {open ? (
        <div className="pd-review__compose">
          <textarea
            className="pd-input pd-textarea"
            rows={3}
            maxLength={REPLY_MAX}
            placeholder="Kiitä palautteesta ja kerro tarvittaessa mitä teette asialle"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <ErrorNote>{error}</ErrorNote>
          <div className="pd-button-row">
            <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={() => setOpen(false)} disabled={busy}>
              Peruuta
            </button>
            <button type="button" className="pd-btn pd-btn--primary pd-btn--sm" disabled={busy || (!text.trim() && !review.reply)} onClick={publish}>
              {busy ? 'Tallennetaan...' : review.reply && !text.trim() ? 'Poista vastaus' : 'Julkaise vastaus'}
            </button>
          </div>
        </div>
      ) : review.reply ? (
        <div className="pd-review__reply">
          <strong>Vastauksesi</strong>
          <p>{review.reply}</p>
          <button type="button" className="pd-link" onClick={() => setOpen(true)}>
            Muokkaa vastausta
          </button>
        </div>
      ) : (
        <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={() => setOpen(true)}>
          <MessageSquareReply size={15} aria-hidden="true" /> Vastaa
        </button>
      )}
    </li>
  )
}

// Asiakkaiden arvostelut (restaurant_reviews, 0054): arvostella voi vain
// asiakas, jolla on ravintolasta valmis tilaus. Vastaus näkyy asiakkaille
// ravintolan arvosteluissa (0057).
export default function ReviewsView() {
  const { restaurant, toast } = useDashboard()
  const api = useDashboardApi()
  const [reviews, setReviews] = useState([])
  const [status, setStatus] = useState('loading')
  const [filter, setFilter] = useState('all')

  const fetchReviews = useCallback(() => api.fetchReviews(restaurant.id), [api, restaurant.id])

  useEffect(() => {
    let cancelled = false
    fetchReviews()
      .then((list) => {
        if (cancelled) return
        setReviews(list)
        setStatus('ready')
      })
      .catch((error) => {
        console.error('Arvostelujen haku epäonnistui', error)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [fetchReviews])

  async function reply(id, text) {
    try {
      await api.replyToReview(id, text)
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, reply: text || null } : r)))
      toast(text ? 'Vastaus julkaistu' : 'Vastaus poistettu')
      return false
    } catch (error) {
      console.error('Vastauksen tallennus epäonnistui', error)
      return true
    }
  }

  const count = reviews.length
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0
  const answered = reviews.filter((r) => r.reply).length
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }))
  const visible = reviews.filter((r) => (filter === 'unanswered' ? !r.reply : filter === 'low' ? r.rating <= 3 : true))

  return (
    <div className="pd-view">
      <PageHeader title="Arviot" description="Mitä asiakkaat sanovat - vastaaminen parantaa uusintatilauksia." />

      {status === 'error' && <ErrorNote>Arvosteluja ei voitu hakea. Tarkista yhteys.</ErrorNote>}
      {status === 'loading' && <div className="pd-skeleton pd-skeleton--block" />}

      {status === 'ready' && count === 0 && (
        <Card>
          <EmptyState
            icon={Star}
            title="Ei vielä arvosteluja"
            text="Asiakas voi arvostella ravintolan, kun hänen tilauksensa on valmis. Arvostelut ja vastauksesi näkyvät täällä."
          />
        </Card>
      )}

      {status === 'ready' && count > 0 && (
        <div className="pd-two-col pd-two-col--narrow-right">
          <Card title="Kaikki arviot" action={<Segmented size="sm" value={filter} onChange={setFilter} options={FILTERS} label="Suodatus" />}>
            {visible.length === 0 ? (
              <EmptyState icon={Star} title="Ei arvioita tällä suodatuksella" />
            ) : (
              <ul className="pd-reviews">
                {visible.map((review) => (
                  <ReviewItem key={review.id} review={review} onReply={reply} />
                ))}
              </ul>
            )}
          </Card>

          <div className="pd-stack">
            <Card title="Yhteenveto">
              <div className="pd-rating-summary">
                <strong>{average.toFixed(1).replace('.', ',')}</strong>
                <Stars value={Math.round(average)} size={18} />
                <span className="pd-muted">
                  {count} {count === 1 ? 'arvio' : 'arviota'}
                </span>
              </div>
              <ul className="pd-distribution">
                {distribution.map((row) => (
                  <li key={row.stars}>
                    <span>{row.stars}</span>
                    <span className="pd-distribution__track">
                      <span style={{ width: `${(row.count / count) * 100}%` }} />
                    </span>
                    <span className="pd-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="pd-stats-row pd-stats-row--2">
                <Stat label="Vastausprosentti" value={`${Math.round((answered / count) * 100)} %`} />
                <Stat label="Vastaamatta" value={count - answered} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
