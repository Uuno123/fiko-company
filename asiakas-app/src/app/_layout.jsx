import { View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold'
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { AuthProvider, useAuth } from '../lib/auth'
import { colors } from '../theme'

// Käynnistysnäyttö (valkoinen ja oranssi piste keskellä, app.json) pysyy, kunnes
// fontit ja tallennettu kirjautuminen on ladattu ja ensimmäinen näkymä piirretty.
// Alkunäytön animaatio alkaa täsmälleen samasta kuvasta (app/index.jsx), joten
// vaihtoa ei huomaa.
SplashScreen.preventAutoHideAsync().catch(() => {})

// Pohjaväri valkoiseksi heti käynnistyessä (puhelimen tumma tila ei näy
// kellon ja akun kohdalla), kuten kuljettajasovelluksessa.
SystemUI.setBackgroundColorAsync(colors.surface).catch(() => {})

// Kaikki näytöt ovat tässä pinossa ilman otsikkopalkkia: jokainen näyttö
// piirtää oman yläosansa.
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

  return (
    <AuthProvider>
      <Screens fontsReady={fontsLoaded || Boolean(fontError)} />
    </AuthProvider>
  )
}

// Käynnistysnäyttö peittää latauksen. Jos fonttien lataus epäonnistuu,
// jatketaan puhelimen omalla fontilla.
function Screens({ fontsReady }) {
  const { status } = useAuth()
  if (!fontsReady || status === 'loading') return null

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }} onLayout={() => SplashScreen.hide()}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
    </View>
  )
}
