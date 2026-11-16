import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { X } from 'lucide-react-native'
import FortuneWheel from '../components/FortuneWheel'
import { useAuth } from '../lib/auth'
import { colors } from '../theme'

// Pyöräytyssivu (16.11.2026): koko näytön oranssi sivu ilman headeria,
// vain sulkunappi vasemmassa yläkulmassa. Etusivun banneri tuo tänne.
export default function WheelScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const close = () => (router.canGoBack() ? router.back() : router.navigate('/ravintolat'))

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <FortuneWheel
          userId={session?.user?.id ?? null}
          onLogin={() => router.push('/kirjautuminen')}
          style={styles.wheel}
        />
      </ScrollView>

      <Pressable
        onPress={close}
        hitSlop={8}
        style={({ pressed }) => [styles.close, { top: insets.top + 10 }, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Sulje"
      >
        <X size={20} strokeWidth={2.4} color="#ffffff" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.orange },
  content: { flexGrow: 1, justifyContent: 'center' },
  wheel: { marginTop: 0, marginHorizontal: 0, borderRadius: 0, paddingHorizontal: 20 },
  close: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
})
