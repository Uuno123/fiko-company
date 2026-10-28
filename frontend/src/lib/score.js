// Arvosanat näytetään hymiönä asteikolla 0–10 (käyttäjän pyyntö 28.10.2026,
// tähtien ja 1–5:n tilalle, kuten Woltissa). Tietokannassa arvostelut ovat
// edelleen 1–5 (migraatio 0054) ja keskiarvot samalla asteikolla, joten
// näytettävä arvosana on kaksinkertainen: 4,1 -> 8,2 ja 5 -> 10.
// Jaetaan kuljettajasovelluksen kanssa (metro watchFolders).

export function scoreFromRating(rating) {
  if (rating == null || rating === '') return null
  const value = Number(rating)
  return Number.isFinite(value) ? Math.round(value * 20) / 10 : null
}

// "8,2", täysi kymppi "10". Tyhjä merkkijono, jos arvosanaa ei ole.
export function formatScore(rating) {
  const score = scoreFromRating(rating)
  if (score == null) return ''
  return score >= 10 ? '10' : score.toFixed(1).replace('.', ',')
}

// Yksittäinen arvio (1–5 hymiötä) on aina kokonaisluku 2, 4, 6, 8 tai 10, joten
// ilman desimaalia: "8" eikä "8,0" (käyttäjä ihmetteli "10" vs "8,0" 28.10.2026).
// Keskiarvoille formatScore.
export function formatReviewScore(rating) {
  const score = scoreFromRating(rating)
  if (score == null) return ''
  return Number.isInteger(score) ? String(score) : formatScore(rating)
}

// Hymiön ilme arvosanan (0–10) mukaan.
export const FACES = ['awful', 'bad', 'ok', 'good', 'great']

export function faceForScore(score) {
  if (score == null) return 'ok'
  if (score >= 9) return 'great'
  if (score >= 7.5) return 'good'
  if (score >= 5.5) return 'ok'
  if (score >= 3.5) return 'bad'
  return 'awful'
}

// Arvostelun antaminen: viisi ilmettä, tallennetaan 1–5 (näkyy 2–10).
export const RATING_CHOICES = [
  { value: 1, face: 'awful', label: 'Huono' },
  { value: 2, face: 'bad', label: 'Välttävä' },
  { value: 3, face: 'ok', label: 'Ok' },
  { value: 4, face: 'good', label: 'Hyvä' },
  { value: 5, face: 'great', label: 'Erinomainen' },
]

// Hymiön suu viivana (viewBox 0 0 24 24) ilmeittäin, iloisimmasta
// surullisimpaan. Sama kuva verkkosivulla ja kuljettajasovelluksessa.
export const FACE_MOUTHS = {
  great: { d: 'M7.4 13.2 Q12 19.2 16.6 13.2' },
  good: { d: 'M8.3 14.2 Q12 17.4 15.7 14.2' },
  ok: { d: 'M8.8 15.2 L15.2 15.2' },
  bad: { d: 'M8.5 16.4 Q12 13.7 15.5 16.4' },
  awful: { d: 'M8 17.2 Q12 12.6 16 17.2' },
}
