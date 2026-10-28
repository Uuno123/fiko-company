import { useState } from 'react'
import { Smiley } from './Smiley.jsx'
import { REVIEW_MAX_LENGTH, reviewErrorText } from '../lib/reviews.js'
import { RATING_CHOICES, formatReviewScore } from '../lib/score.js'
import './ReviewForm.css'

// Arvion valinta: viisi hymiötä surullisesta iloiseen (tähtien tilalle
// 28.10.2026). Valittu (ja osoitettu) oranssina ja suurempana, muut harmaina.
// Tallennetaan 1–5, näkyy asteikolla 0–10 (lib/score.js).
export function RatingPicker({ value, onChange, size = 40 }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  const choice = RATING_CHOICES.find((option) => option.value === shown)
  return (
    <div className="review-form__faces" role="radiogroup" aria-label="Arvio" onMouseLeave={() => setHover(0)}>
      <div className="review-form__face-row">
        {RATING_CHOICES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            aria-label={`${option.label} (${formatReviewScore(option.value)} / 10)`}
            className={option.value === shown ? 'is-on' : ''}
            onMouseEnter={() => setHover(option.value)}
            onClick={() => onChange(option.value)}
          >
            <Smiley face={option.face} size={size} muted={option.value !== shown} />
          </button>
        ))}
      </div>
      <span className="review-form__face-label">
        {choice ? `${choice.label} · ${formatReviewScore(choice.value)} / 10` : 'Valitse arvio'}
      </span>
    </div>
  )
}

// Arvostelulomake: hymiöt ja vapaaehtoinen teksti. onSubmit(rating, comment)
// heittää virheen, jos tallennus epäonnistuu - virhe näytetään lomakkeessa.
function ReviewForm({
  initial,
  editing = false,
  cancelLabel = 'Peruuta',
  placeholder = 'Miten ruoka ja toimitus onnistuivat?',
  onCancel,
  onSubmit,
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) {
      setError('Valitse arvio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(rating, comment.trim())
    } catch (err) {
      setError(reviewErrorText(err))
      setSaving(false)
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <RatingPicker value={rating} onChange={setRating} />
      <label className="review-form__field">
        <span className="review-form__label">Kerro kokemuksestasi (vapaaehtoinen)</span>
        <textarea
          value={comment}
          maxLength={REVIEW_MAX_LENGTH}
          rows={4}
          placeholder={placeholder}
          onChange={(e) => setComment(e.target.value)}
        />
        <span className="review-form__count">
          {comment.length}/{REVIEW_MAX_LENGTH}
        </span>
      </label>
      {error && <p className="review-form__error">{error}</p>}
      <div className="review-form__actions">
        <button type="button" className="review-form__cancel" onClick={onCancel} disabled={saving}>
          {cancelLabel}
        </button>
        <button type="submit" className="review-form__submit" disabled={saving}>
          {saving ? 'Lähetetään…' : editing ? 'Tallenna muutokset' : 'Lähetä arvostelu'}
        </button>
      </div>
    </form>
  )
}

export default ReviewForm
