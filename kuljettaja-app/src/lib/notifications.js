import { useEffect } from 'react'
import { Platform } from 'react-native'
import { isRunningInExpoGo } from 'expo'
import Constants from 'expo-constants'
import { router } from 'expo-router'
import { colors } from '../theme'
import { tr } from './i18n'
import { supabase } from './supabase'

// Push-ilmoitukset (migraatio 0061): uusi kuljetuspyyntö, asiakkaan hinta,
// asiakas valitsi sinut, ravintola hyväksyi, tilaus valmis ja peruutus tulevat
// puhelimeen myös kun sovellus on taustalla tai suljettu. Puhelimen
// Expo-tunnus tallentuu tietokantaan (register_push_token), ja tietokanta
// lähettää viestit Expon push-palvelun kautta.
//
// Expo Go ei tue push-ilmoituksia (SDK 53 alkaen), joten kirjasto ladataan vain
// omassa sovellusversiossa (development build / valmis sovellus). Expo Gossa ja
// selaimen esikatselussa kaikki alla oleva ohitetaan.
const SUPPORTED = Platform.OS !== 'web' && !isRunningInExpoGo()
const Notifications = SUPPORTED ? require('expo-notifications') : null

// Sama kanava kuin tietokannan viesteissä (channelId) ja app.jsonin defaultChannel.
const CHANNEL_ID = 'gigs'

// Tunnus, joka on tallennettu tälle kirjautumiselle (poistetaan uloskirjautuessa).
let registeredToken = null

// Kun sovellus on auki, ilmoitusta ei näytetä: sovellus näyttää saman asian
// omalla tavallaan (pyyntölista, värinä, ilmoitusrivi).
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// Android 13+: lupaa ei voi kysyä ennen kuin kanava on olemassa. Tärkeyttä ja
// värinää ei voi muuttaa luomisen jälkeen, vain nimen (kieli).
async function ensureChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: tr('push.channelName'),
    description: tr('push.channelDescription'),
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: colors.orange,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
}

// 'granted' | 'denied' | 'undetermined' | 'unavailable' (Expo Go, selain).
export async function getNotificationPermission() {
  if (!SUPPORTED) return 'unavailable'
  try {
    const { status } = await Notifications.getPermissionsAsync()
    return status
  } catch {
    return 'undetermined'
  }
}

// Kysyy luvan (jos sitä ei ole vielä kysytty) ja tallentaa puhelimen tunnuksen
// kirjautuneelle kuljettajalle. Palauttaa luvan tilan kuten yllä.
export async function registerForPushNotifications() {
  if (!SUPPORTED || !supabase) return 'unavailable'
  let status = 'undetermined'
  try {
    await ensureChannel()
    const current = await Notifications.getPermissionsAsync()
    status = current.status
    if (status !== 'granted' && current.canAskAgain) {
      ;({ status } = await Notifications.requestPermissionsAsync())
    }
    if (status !== 'granted') return status

    // Projektin tunnus tulee app.jsonista (npx eas-cli@latest init).
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) {
      if (__DEV__) console.warn('Push-ilmoitukset: EAS projectId puuttuu app.jsonista (aja npx eas-cli@latest init).')
      return status
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS })
    if (!error) registeredToken = token
    return status
  } catch {
    // Ei verkkoa tai Expon palvelu ei vastannut: yritetään seuraavalla käynnistyksellä.
    return status
  }
}

// Uloskirjautuessa: tämä puhelin ei saa enää kuljettajan ilmoituksia. Ei odoteta
// yli 3 s, ettei huono verkko estä uloskirjautumista.
export async function unregisterPushToken() {
  const token = registeredToken
  registeredToken = null
  if (!token || !supabase) return
  await Promise.race([
    supabase.rpc('unregister_push_token', { p_token: token }).then(
      () => {},
      () => {},
    ),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ])
}

// Sovelluksen juureen: tunnus talteen kun kuljettaja on kirjautunut, ja
// ilmoituksen napautus vie etusivulle (keikat ja pyynnöt näkyvät siellä).
export function usePushNotifications(courierId) {
  useEffect(() => {
    if (courierId) registerForPushNotifications()
  }, [courierId])

  useEffect(() => {
    if (!SUPPORTED) return undefined
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.dismissTo('/')
    })
    return () => subscription.remove()
  }, [])
}
