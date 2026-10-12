import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'

// delivon logo samanlaisena kuin verkkosivun yläpalkissa
// (frontend/src/components/Header.css, .site-header__logo): valkoinen "delivo"
// Space Grotesk -fontilla oranssin pyöristetyn pillerin sisällä. Mittasuhteet
// samat kuin sivulla (20 px teksti, 5/13 px reunat, 13 px pyöristys).
// inverted: oranssilla pohjalla valkoinen pilleri ja oranssi teksti.
export default function DelivoLogo({ size = 20, inverted = false, style }) {
  return (
    <View
      style={[
        styles.pill,
        inverted && styles.pillInverted,
        { paddingVertical: size * 0.25, paddingHorizontal: size * 0.65, borderRadius: size * 0.65 },
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="delivo"
    >
      <Text
        style={[
          styles.text,
          inverted && styles.textInverted,
          { fontSize: size, lineHeight: Math.round(size * 1.2), letterSpacing: -0.02 * size },
        ]}
      >
        delivo
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.orange,
  },
  pillInverted: {
    backgroundColor: '#ffffff',
  },
  text: {
    fontFamily: fonts.display,
    color: '#ffffff',
    includeFontPadding: false,
  },
  textInverted: {
    color: colors.orange,
  },
})
