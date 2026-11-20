import Svg, { Circle, Path } from 'react-native-svg'
import { FACE_MOUTHS, scoreFromRating } from '../../../frontend/src/lib/score'
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

// Arvosanan merkki: oranssi tähti (20.11.2026, hymiön tilalla kuten
// verkkosivulla - vähemmän Woltin näköinen). Ilman arvosanaa harmaa.
// color-parametri jätetty yhteensopivuuden vuoksi; tähti on aina oranssi.
// eslint-disable-next-line no-unused-vars
export function ScoreSmiley({ rating, size = 16, color }) {
  const score = scoreFromRating(rating)
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.6l2.85 5.95 6.55.85-4.8 4.55 1.2 6.5L12 17.3l-5.8 3.15 1.2-6.5L2.6 9.4l6.55-.85L12 2.6z"
        fill={score == null ? colors.gray400 : colors.orange}
      />
    </Svg>
  )
}


// Rivin ikoniksi (ListRow): sama rajapinta kuin lucide-ikoneilla.
export function SmileyIcon({ size, color, strokeWidth }) {
  return <Smiley face="good" size={size} color={color} strokeWidth={strokeWidth} />
}
