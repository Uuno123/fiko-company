import Svg, { Circle, Path } from 'react-native-svg'
import { FACE_MOUTHS, faceForScore, scoreFromRating } from '../../../frontend/src/lib/score'
import { colors } from '../theme'

// Arvosanan hymiö tähtien tilalla (28.10.2026), sama piirros kuin verkkosivulla
// (frontend/src/components/Smiley.jsx): viivapiirros ilman oranssia, ilme
// arvosanan mukaan. Arviot näkyvät asteikolla 0–10 (frontend/src/lib/score.js).
export default function Smiley({ face = 'good', size = 16, color = colors.black, strokeWidth = 1.8 }) {
  const mouth = FACE_MOUTHS[face] ?? FACE_MOUTHS.ok
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={12} r={10} />
      <Circle cx={8.9} cy={9.8} r={1.15} fill={color} stroke="none" />
      <Circle cx={15.1} cy={9.8} r={1.15} fill={color} stroke="none" />
      <Path d={mouth.d} />
    </Svg>
  )
}

// Hymiö keskiarvosta (1–5 tietokannassa); ilman arvosanaa harmaa.
export function ScoreSmiley({ rating, size = 16, color = colors.black }) {
  const score = scoreFromRating(rating)
  return <Smiley face={faceForScore(score)} size={size} color={score == null ? colors.gray400 : color} />
}

// Rivin ikoniksi (ListRow): sama rajapinta kuin lucide-ikoneilla.
export function SmileyIcon({ size, color, strokeWidth }) {
  return <Smiley face="good" size={size} color={color} strokeWidth={strokeWidth} />
}
