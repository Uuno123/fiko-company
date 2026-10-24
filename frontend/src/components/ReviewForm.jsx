import { useState } from 'react'
import { Star } from 'lucide-react'
import { REVIEW_MAX_LENGTH, reviewErrorText } from '../lib/reviews.js'
import './ReviewForm.css'

const STAR_LABELS = ['', 'Huono', 'Välttävä', 'Ok', 'Hyvä', 'Erinomainen']

// Tähtien valinta: viisi nappia, valittu määrä keltaisena. Samaa käyttää
// arviointipyyntö (ReviewPrompt) ilman lomaketta.
export function StarPicker({ value, onChange, size = 30 }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="review-form__stars" role="radiogroup" aria-label="Arvosana" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} / 5 tähteä`}
          className={n <= shown ? 'is-on' : ''}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star size={size} strokeWidth={1.6} fill={n <= shown ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      ))}
      <span className="review-form__star-label">{STAR_LABELS[shown]}</span>
    </div>
  )
}

// Arvostelulomake: tähdet ja vapaaehtoinen teksti. onSubmit(rating, comment)
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
      setError('Valitse 1–5 tähteä.')
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
      <StarPicker value={rating} onChange={setRating} />
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
