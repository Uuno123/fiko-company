import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'
import { isRunningInExpoGo } from 'expo'
import * as Location from 'expo-location'
import { colors } from '../theme'
import { tr } from './i18n'
import { supabase } from './supabase'

// Sijainti myös taustalla: kun kuljettaja avaa navigoinnin toisessa
// sovelluksessa tai lukitsee näytön, sijainti päivittyy edelleen palvelimelle
// (lähimmän kuljettajan valinta ja keikan aikana asiakkaan kartta).
// courier_heartbeat (migraatio 0046) tallentaa sijainnin courier_locations-tauluun.
//
// Androidilla tämä on etupalvelu, josta näkyy pysyvä ilmoitus, joten erillistä
// "Salli aina" -lupaa ei tarvita. Toimii vain omassa sovellusversiossa: Expo
// Gossa, selaimessa, iPhonessa (vaatii Applen kehittäjätilin) ja vanhassa
// versiossa ilman expo-task-manageria kaikki alla oleva ohitetaan.
//
// Sovelluksen ollessa näkyvissä sijainti kulkee tavallista reittiä
// (lib/jobs.js), joten tehtävä lähettää vain taustalla.

const TASK = 'bidrop-courier-location'
// Keikalla asiakas seuraa karttaa, muuten riittää lähimmän kuljettajan valintaan.
const GIG_INTERVAL_MS = 10_000
const ONLINE_INTERVAL_MS = 30_000

function loadTaskManager() {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return null
  try {
    return require('expo-task-manager')
  } catch {
    return null
  }
}

const TaskManager = loadTaskManager()

// Mitä taustalla lähetetään; päivittyy useBackgroundLocation-koukusta.
const state = { courierId: null, onGig: false, lastSent: 0 }

TaskManager?.defineTask(TASK, async ({ data, error }) => {
  const locations = data?.locations
  if (error || !locations?.length || !state.courierId || AppState.currentState === 'active') return
  const now = Date.now()
  if (now - state.lastSent < (state.onGig ? GIG_INTERVAL_MS : ONLINE_INTERVAL_MS)) return
  state.lastSent = now
  const { latitude, longitude } = locations[locations.length - 1].coords
  try {
    await supabase.rpc('courier_heartbeat', { p_lat: latitude, p_lng: longitude })
  } catch {
    // Ei verkkoa: seuraava sijainti yrittää uudelleen.
  }
})

async function startUpdates() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) return
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status !== 'granted') return
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: GIG_INTERVAL_MS,
      distanceInterval: 0,
      foregroundService: {
        notificationTitle: tr('bgLocation.title'),
        notificationBody: tr('bgLocation.body'),
        notificationColor: colors.orange,
        // Sovelluksen sulkeminen pysäyttää myös sijainnin jakamisen.
        killServiceOnDestroy: true,
      },
    })
  } catch {
    // Android sallii käynnistyksen vain sovelluksen ollessa näkyvissä:
    // yritetään uudelleen, kun sovellus palaa näkyviin.
  }
}

async function stopUpdates() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK)
  } catch {
    // Ei käynnissä.
  }
}

// Taustasijainti päällä online-tilassa ja keikan aikana. Pysähtyy offline-
// tilassa, uloskirjautuessa ja kun sovellus suljetaan.
export function useBackgroundLocation({ courierId, online, onGig }) {
  const active = Boolean(TaskManager && courierId && (online || onGig))

  useEffect(() => {
    state.courierId = courierId
    state.onGig = onGig
  }, [courierId, onGig])

  useEffect(() => {
    if (!TaskManager) return undefined
    // Myös edelliseltä käynnistykseltä jäänyt tehtävä pysäytetään.
    if (!active) {
      stopUpdates()
      return undefined
    }
    startUpdates()
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') startUpdates()
    })
    return () => {
      subscription.remove()
      stopUpdates()
    }
  }, [active])
}
