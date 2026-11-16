import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, fonts } from '../../theme'

// Ostoskori (alapalkista). Korin sisältöä ei vielä ole sovelluksessa, joten
// näkymä kertoo tyhjästä korista 3D-ruokakassin kuvalla (16.11.2026).
export default function CartScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Tyhjän korin kuva: käyttäjän 3D-ruokakassi (16.11.2026). */}
      <Image
        source={require('../../../assets/images/empty/cart-bag.png')}
        style={styles.image}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {/* Bidropin omalla äänellä (käyttäjän pyyntö 16.11.2026: lisää persoonaa). */}
      <Text style={styles.title}>
        Kassi huutaa tyhjyyttään<Text style={styles.dot}>.</Text>
      </Text>
      <Text style={styles.text}>Nälkä? Hoidetaan. Valitse lähiravintola, niin täytetään tämä yhdessä.</Text>
      {/* Pienempi musta nappi (käyttäjän pyyntö 16.11.2026). */}
      <Pressable
        onPress={() => router.navigate('/ravintolat')}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Selaa ravintoloita</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.surface,
  },
  image: { width: 180, height: 180 },
  title: {
    marginTop: 12,
    fontFamily: fonts.heading,
    fontSize: 25,
    letterSpacing: -0.5,
    color: colors.black,
    textAlign: 'center',
  },
  dot: { color: colors.orange },
  text: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: 22,
    height: 44,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.black,
  },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonText: { fontFamily: fonts.semibold, fontSize: 14.5, color: '#ffffff' },
})
