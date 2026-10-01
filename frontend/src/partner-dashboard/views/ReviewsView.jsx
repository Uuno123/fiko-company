import { useState } from 'react'
import { MessageSquareReply, Star } from 'lucide-react'
import { DEMO_REVIEWS } from '../demo.js'
import { useDashboard } from '../context.js'
import { Card, EmptyState, PageHeader, Segmented, Stat } from '../ui.jsx'
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

function ReviewItem({ review, onReply }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  return (
    <li className="pd-review">
      <div className="pd-review__head">
        <span className="pd-review__avatar" aria-hidden="true">
          {review.author[0]}
        </span>
        <span>
          <strong>{review.author}</strong>
          <span className="pd-muted">{relativeDay(review.date)}</span>
        </span>
        <Stars value={review.rating} />
      </div>
      <p className="pd-review__text">{review.text}</p>
      {review.reply ? (
        <div className="pd-review__reply">
          <strong>Vastauksesi</strong>
          <p>{review.reply}</p>
        </div>
      ) : open ? (
        <div className="pd-review__compose">
          <textarea
            className="pd-input pd-textarea"
            rows={3}
            placeholder="Kiitä palautteesta ja kerro tarvittaessa mitä teette asialle"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="pd-button-row">
            <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={() => setOpen(false)}>
              Peruuta
            </button>
            <button
              type="button"
              className="pd-btn pd-btn--primary pd-btn--sm"
              disabled={!text.trim()}
              onClick={() => {
                onReply(review.id, text.trim())
                setOpen(false)
              }}
            >
              Julkaise vastaus
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="pd-btn pd-btn--ghost pd-btn--sm" onClick={() => setOpen(true)}>
          <MessageSquareReply size={15} aria-hidden="true" /> Vastaa
        </button>
      )}
    </li>
  )
}

export default function ReviewsView() {
  const { toast } = useDashboard()
  const [reviews, setReviews] = useState(DEMO_REVIEWS)
  const [filter, setFilter] = useState('all')

  const average = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const answered = reviews.filter((r) => r.reply).length
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }))
  const visible = reviews.filter((r) => (filter === 'unanswered' ? !r.reply : filter === 'low' ? r.rating <= 3 : true))

  function reply(id, text) {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, reply: text } : r)))
    toast('Vastaus julkaistu')
  }

  return (
    <div className="pd-view">
      <PageHeader title="Arviot" description="Mitä asiakkaat sanovat - vastaaminen parantaa uusintatilauksia." />

      <div className="pd-two-col pd-two-col--narrow-right">
        <Card title="Kaikki arviot" demo action={<Segmented size="sm" value={filter} onChange={setFilter} options={FILTERS} label="Suodatus" />}>
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
          <Card title="Yhteenveto" demo>
            <div className="pd-rating-summary">
              <strong>{average.toFixed(1).replace('.', ',')}</strong>
              <Stars value={Math.round(average)} size={18} />
              <span className="pd-muted">{reviews.length} arviota</span>
            </div>
            <ul className="pd-distribution">
              {distribution.map((row) => (
                <li key={row.stars}>
                  <span>{row.stars}</span>
                  <span className="pd-distribution__track">
                    <span style={{ width: `${(row.count / reviews.length) * 100}%` }} />
                  </span>
                  <span className="pd-muted">{row.count}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="pd-stats-row pd-stats-row--2">
              <Stat label="Vastausprosentti" value={`${Math.round((answered / reviews.length) * 100)} %`} />
              <Stat label="Vastaamatta" value={reviews.length - answered} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
