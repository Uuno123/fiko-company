import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ArrowLeft } from 'lucide-react-native'
import FortuneWheel from '../components/FortuneWheel'
import { useAuth } from '../lib/auth'
import { colors } from '../theme'

// Pyöräytyssivu: etusivun banneri tuo tänne. Tavallinen valkoinen sivu
// takaisin-napilla kuten muut sovelluksen sivut (20.11.2026, aiemmin koko
// näytön oranssi).
export default function WheelScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/ravintolat'))

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={back}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Takaisin"
        >
          <ArrowLeft size={20} strokeWidth={2.2} color={colors.black} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 32 }}>
        <FortuneWheel userId={session?.user?.id ?? null} onLogin={() => router.push('/kirjautuminen')} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  top: { paddingHorizontal: 16, paddingBottom: 6 },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
})
