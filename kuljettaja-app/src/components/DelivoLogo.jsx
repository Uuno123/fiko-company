import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import {
  LOGO_CHECK_PATH,
  LOGO_CHECK_STROKE,
  LOGO_HEIGHT,
  LOGO_LETTERS_PATH,
  LOGO_ORANGE,
  LOGO_VIEWBOX,
  LOGO_WIDTH,
} from '../../../frontend/src/lib/logoPaths'
import { colors } from '../theme'

// delivon sanamerkki samoista vektoreista kuin verkkosivulla
// (frontend/src/lib/logoPaths.js): "deli" + oranssi ruksi v:n paikalla + "o".
// size: suunnilleen sama näkyvä koko kuin vanhalla pillerilogolla.
// inverted: oranssille pohjalle, kaikki valkoista (oranssi ruksi ei erottuisi).
export default function DelivoLogo({ size = 20, inverted = false, style }) {
  const height = Math.round(size * 1.15)
  const width = (height * LOGO_WIDTH) / LOGO_HEIGHT
  const letters = inverted ? '#ffffff' : colors.black
  const check = inverted ? '#ffffff' : LOGO_ORANGE
  return (
    <View style={[{ width, height, alignSelf: 'flex-start' }, style]} accessible accessibilityRole="image" accessibilityLabel="delivo">
      <Svg width={width} height={height} viewBox={LOGO_VIEWBOX}>
        <Path d={LOGO_LETTERS_PATH} fill={letters} />
        <Path
          d={LOGO_CHECK_PATH}
          fill="none"
          stroke={check}
          strokeWidth={LOGO_CHECK_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}
