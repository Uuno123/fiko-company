import { View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import * as SystemUI from 'expo-system-ui'
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold'
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { AuthProvider, useAuth } from '../lib/auth'
import { CourierProvider } from '../lib/courier'
import { usePushNotifications } from '../lib/notifications'
import { colors } from '../theme'

// Sovelluksen pohjaväri valkoiseksi heti käynnistyessä. Muuten puhelimen
// tumma tila näkyi mustana kellon ja akun kohdalla, eikä tummia kuvakkeita
// erottanut.
SystemUI.setBackgroundColorAsync(colors.surface).catch(() => {})

// Kaikki näytöt ovat tässä pinossa. Otsikkopalkki on pois päältä, koska
// jokainen näyttö piirtää oman yläosansa.
export default function RootLayout() {
  // Vain käytetyt painot (yksittäiset tiedostot, ei koko fonttiperhettä).
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  // Hetken valkoinen ruutu kunnes fontit ovat ladattu - muuten logo ja tekstit
  // vaihtaisivat fonttia silmien edessä. Jos lataus epäonnistuu, jatketaan
  // puhelimen omalla fontilla.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.surface }} />

  return (
    <AuthProvider>
      <PushNotifications />
      <CourierProvider>
        <View style={{ flex: 1, backgroundColor: colors.surface }}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
        </View>
      </CourierProvider>
    </AuthProvider>
  )
}

// Push-ilmoitukset kirjautuneelle kuljettajalle (lib/notifications.js).
function PushNotifications() {
  const { status, courier } = useAuth()
  usePushNotifications(status === 'ready' ? courier?.id : null)
  return null
}
