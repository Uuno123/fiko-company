import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, Platform } from 'react-native'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { readJson, writeJson } from './storage'

// Kuljettajan tila koko sovellukselle: online/offline, ajastettu offline,
// asetukset ja profiili. Asetukset ja profiili tallentuvat puhelimeen
// (kirjautumista ja tietokantaa kuljettajille ei ole vielä). Online-tilaa ei
// tallenneta: sovellus käynnistyy aina offline-tilassa.

const SETTINGS_KEY = 'delivo-courier-settings'
const PROFILE_KEY = 'delivo-courier-profile'
const KEEP_AWAKE_TAG = 'delivo-online'

export const VEHICLES = [
  { key: 'bike', label: 'Polkupyörä' },
  { key: 'ebike', label: 'Sähköpyörä' },
  { key: 'scooter', label: 'Skootteri' },
  { key: 'car', label: 'Auto' },
]

export const DEFAULT_SETTINGS = {
  vehicle: 'bike',
  navigationApp: Platform.OS === 'ios' ? 'apple' : 'google',
  haptics: true,
  keepAwake: true,
}

export const DEFAULT_PROFILE = { name: 'Demo-kuljettaja', phone: '', email: '' }

export function vehicleLabel(key) {
  return VEHICLES.find((vehicle) => vehicle.key === key)?.label ?? VEHICLES[0].label
}

const CourierContext = createContext(null)

export function CourierProvider({ children }) {
  const [online, setOnlineState] = useState(false)
  const [offlineAt, setOfflineAt] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([readJson(SETTINGS_KEY), readJson(PROFILE_KEY)]).then(([savedSettings, savedProfile]) => {
      if (cancelled) return
      if (savedSettings) setSettings((current) => ({ ...current, ...savedSettings }))
      if (savedProfile) setProfile((current) => ({ ...current, ...savedProfile }))
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Tallennus vasta latauksen jälkeen, ettei oletusarvo ehdi korvata tallennettua.
  useEffect(() => {
    if (loaded) writeJson(SETTINGS_KEY, settings)
  }, [loaded, settings])

  useEffect(() => {
    if (loaded) writeJson(PROFILE_KEY, profile)
  }, [loaded, profile])

  // Ajastettu offline: kun aika koittaa, kuljettaja siirtyy offline-tilaan.
  useEffect(() => {
    if (!offlineAt) return undefined
    const remaining = offlineAt.getTime() - Date.now()
    if (remaining <= 0) {
      setOnlineState(false)
      setOfflineAt(null)
      return undefined
    }
    const timer = setTimeout(() => {
      setOnlineState(false)
      setOfflineAt(null)
    }, remaining)
    return () => clearTimeout(timer)
  }, [offlineAt])

  // Taustalla ajastimet voivat viivästyä - tarkistetaan kun sovellus palaa näkyviin.
  const offlineAtRef = useRef(offlineAt)
  offlineAtRef.current = offlineAt
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const at = offlineAtRef.current
      if (state === 'active' && at && at.getTime() <= Date.now()) {
        setOnlineState(false)
        setOfflineAt(null)
      }
    })
    return () => subscription.remove()
  }, [])

  // Näyttö pysyy päällä online-tilassa (asetus), jotta kartta ja keikat näkyvät.
  useEffect(() => {
    if (!online || !settings.keepAwake) return undefined
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {})
    return () => {
      Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {})
    }
  }, [online, settings.keepAwake])

  function setOnline(value) {
    setOnlineState(value)
    // Itse offline-tilaan meneminen perii ajastuksen.
    if (!value) setOfflineAt(null)
  }

  const value = {
    online,
    setOnline,
    offlineAt,
    scheduleOffline: setOfflineAt,
    settings,
    updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
    profile,
    updateProfile: (patch) => setProfile((current) => ({ ...current, ...patch })),
    resetAll: () => {
      setSettings(DEFAULT_SETTINGS)
      setProfile(DEFAULT_PROFILE)
      setOfflineAt(null)
    },
  }

  // Näkymät piirretään vasta kun tallennetut asetukset ja profiili on luettu,
  // ettei oletusarvo välähdä. Luku puhelimen muistista kestää vain hetken.
  return <CourierContext.Provider value={value}>{loaded ? children : null}</CourierContext.Provider>
}

export function useCourier() {
  const context = useContext(CourierContext)
  if (!context) throw new Error('useCourier on kutsuttava CourierProviderin sisältä.')
  return context
}
