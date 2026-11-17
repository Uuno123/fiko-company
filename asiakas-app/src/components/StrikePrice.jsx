import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'

// Vanha hinta yliviivattuna (käyttäjän pyyntö 17.11.2026). Viiva piirretään
// itse tekstin päälle, koska textDecorationLine ei näkynyt kaikissa
// puhelimissa omalla fontilla - näin viiva näkyy aina.
export default function StrikePrice({ children, size = 12.5, color = colors.textMuted, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.text, { fontSize: size, color }]}>{children}</Text>
      <View pointerEvents="none" style={[styles.line, { backgroundColor: color, height: size > 14 ? 1.6 : 1.3 }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  text: { fontFamily: fonts.medium, textDecorationLine: 'line-through' },
  line: { position: 'absolute', left: -1, right: -1, top: '52%' },
})
