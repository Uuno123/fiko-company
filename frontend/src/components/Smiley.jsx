import { FACE_MOUTHS, scoreFromRating } from '../lib/score.js'

// Arvosanan hymiö (tähtien tilalle 28.10.2026): siisti viivapiirros samassa
// värissä kuin viereinen teksti (currentColor, ei oranssia - käyttäjän
// toive), ilme arvosanan mukaan (lib/score.js).
// face: 'awful' | 'bad' | 'ok' | 'good' | 'great'. muted: vaaleanharmaa (esim.
// ei arvosanaa tai valitsematon vaihtoehto arvostelulomakkeessa).
export function Smiley({ face = 'good', size = 16, muted = false, className }) {
  const mouth = FACE_MOUTHS[face] ?? FACE_MOUTHS.ok
  return (
    <svg
      className={`smiley${muted ? ' smiley--muted' : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="8.9" cy="9.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="9.8" r="1.15" fill="currentColor" stroke="none" />
      <path d={mouth.d} />
    </svg>
  )
}

// Arvosanan merkki asiakkaan näkymissä: oranssi tähti (20.11.2026, hymiön
// tilalla - vähemmän Woltin näköinen). Ilman arvosanaa harmaa. Nimi pidetty,
// jotta kaikki käyttöpaikat vaihtuivat kerralla.
export function ScoreSmiley({ rating, size = 16, className }) {
  const score = scoreFromRating(rating)
  return (
    <svg
      className={`rating-star${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2.6l2.85 5.95 6.55.85-4.8 4.55 1.2 6.5L12 17.3l-5.8 3.15 1.2-6.5L2.6 9.4l6.55-.85L12 2.6z"
        fill={score == null ? '#c9c9c5' : 'var(--delivo-orange, #f4501e)'}
      />
    </svg>
  )
}
