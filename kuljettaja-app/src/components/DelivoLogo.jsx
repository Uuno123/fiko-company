import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import {
  LOGO_ACCENT_PATH,
  LOGO_DESCENT,
  LOGO_HEIGHT,
  LOGO_LETTERS_PATH,
  LOGO_ORANGE,
  LOGO_WIDTH,
} from '../../../frontend/src/lib/logoPaths'
import { colors } from '../theme'

// Bidropin sanamerkki samoista vektoreista kuin verkkosivulla
// (frontend/src/lib/logoPaths.js): "bidrop" + oranssi i:n piste.
// size: suunnilleen sama näkyvä koko kuin vanhalla pillerilogolla.
// inverted: oranssille pohjalle, kaikki valkoista (oranssi piste ei erottuisi).
// p:n alaosa piirtyy laatikon alapuolelle, jotta kirjainten koko ja asettelu
// pysyvät samoina kuin ennen.
export default function DelivoLogo({ size = 20, inverted = false, style }) {
  const height = Math.round(size * 1.15)
  const width = (height * LOGO_WIDTH) / LOGO_HEIGHT
  const fullHeight = (height * (LOGO_HEIGHT + LOGO_DESCENT)) / LOGO_HEIGHT
  const letters = inverted ? '#ffffff' : colors.black
  const accent = inverted ? '#ffffff' : LOGO_ORANGE
  return (
    <View
      style={[{ width, height, alignSelf: 'flex-start', overflow: 'visible' }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Bidrop"
    >
      <Svg width={width} height={fullHeight} viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT + LOGO_DESCENT}`}>
        <Path d={LOGO_LETTERS_PATH} fill={letters} />
        <Path d={LOGO_ACCENT_PATH} fill={accent} />
      </Svg>
    </View>
  )
}
