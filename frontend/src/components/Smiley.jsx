import { FACE_MOUTHS, faceForScore, scoreFromRating } from '../lib/score.js'

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

// Hymiö keskiarvosta (1–5 tietokannassa): ilme näytettävän 0–10-arvosanan mukaan.
export function ScoreSmiley({ rating, size = 16, className }) {
  const score = scoreFromRating(rating)
  return <Smiley face={faceForScore(score)} size={size} muted={score == null} className={className} />
}
