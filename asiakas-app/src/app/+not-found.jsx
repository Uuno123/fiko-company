import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { BackButton, Button } from '../components/ui'
import { useAuth } from '../lib/auth'
import { colors, fonts } from '../theme'

// Näkymä, jota ei (vielä) ole: esim. ravintolalista, jonne kirjautunut ja
// "Selaa ilman tiliä" vievät, kunnes se on tehty. Kirjautuneelle tili ja
// uloskirjautuminen, jotta kirjautumista voi testata.
export default function NotFoundScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session, signOut } = useAuth()

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Tulossa pian</Text>
        {session ? <Text style={styles.text}>Kirjautuneena: {session.user.email}</Text> : null}
      </View>
      {session ? (
        <View style={styles.footer}>
          <Button
            title="Kirjaudu ulos"
            variant="secondary"
            onPress={async () => {
              await signOut()
              router.replace('/')
            }}
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  top: {
    paddingHorizontal: 16,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.black,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: 24,
  },
})
