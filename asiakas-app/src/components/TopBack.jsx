import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { BackButton } from './ui'

// Takaisin-nappi vasemmassa yläkulmassa sivuille, joille tullaan Kodin
// headerista tai valikosta (ei alapalkkia, sovellus kuten web 15.11.2026).
export const TOP_BACK_SPACE = 56

export default function TopBack() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.navigate('/ravintolat'))} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, zIndex: 5 },
})
