import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, Platform } from 'react-native'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from './auth'
import { readJson, writeJson } from './storage'

// Kuljettajan tila koko sovellukselle: online/offline, ajastettu offline,
// laitteen asetukset ja profiili.
//
// Profiili (nimi, puhelin, sähköposti, kulkuneuvo, kaupunki, laskutustiedot)
// tulee kuljettajan riviltä tietokannasta (couriers, lib/auth.js). Lukitut
// tiedot muuttuvat vain muutospyynnöllä (migraatio 0051), puhelinnumeron ja
// kielen kuljettaja vaihtaa itse. Puhelimeen tallentuvat vain laitekohtaiset
// asetukset. Online-tilaa ei tallenneta: sovellus käynnistyy aina offline-tilassa.

const SETTINGS_KEY = 'delivo-courier-settings'
const KEEP_AWAKE_TAG = 'delivo-online'

// Aiempi versio tallensi profiilin puhelimeen - tieto on nyt tietokannassa.
AsyncStorage.removeItem('delivo-courier-profile').catch(() => {})

export const VEHICLES = [
  { key: 'bike', label: 'Polkupyörä' },
  { key: 'ebike', label: 'Sähköpyörä' },
  { key: 'scooter', label: 'Skootteri' },
  { key: 'car', label: 'Auto' },
]

export const DEFAULT_SETTINGS = {
  navigationApp: Platform.OS === 'ios' ? 'apple' : 'google',
  haptics: true,
  keepAwake: true,
  // Ääni uudesta keikkatarjouksesta (lib/sound.js).
  sound: true,
  // Sovelluksen kieli myös puhelimessa, jotta se vaihtuu heti ja toimii ennen
  // kuin kuljettajatiedot on ladattu (tallentuu myös couriers.language).
  language: null,
}

export const BILLING_METHODS = [
  { key: 'own_company', label: 'Oma yritys (Y-tunnus)' },
  { key: 'ukko', label: 'UKKO.fi' },
  { key: 'eezy', label: 'Eezy' },
]

export function billingMethodLabel(key) {
  return BILLING_METHODS.find((method) => method.key === key)?.label ?? null
}

// Kaupungit, joissa delivo toimii (aluksi vain Kuopio).
export function cityLabel(key) {
  const city = String(key ?? 'kuopio')
  return city.charAt(0).toUpperCase() + city.slice(1)
}

export function vehicleLabel(key) {
  return VEHICLES.find((vehicle) => vehicle.key === key)?.label ?? VEHICLES[0].label
}

const CourierContext = createContext(null)

export function CourierProvider({ children }) {
  const [online, setOnlineState] = useState(false)
  const [offlineAt, setOfflineAt] = useState(null)
  const { courier, user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    readJson(SETTINGS_KEY).then((saved) => {
      if (cancelled) return
      if (saved) {
        // Kulkuneuvo oli ennen puhelimen asetus - nyt se on kuljettajatiedoissa.
        const { vehicle: _vehicle, ...rest } = saved
        setSettings((current) => ({ ...current, ...rest }))
      }
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

  // Kulkuneuvo kuljettajatiedoista: reitit ja keikkojen haku käyttävät sitä
  // asetusten kautta (settings.vehicle), kuten ennenkin.
  const vehicle = courier?.vehicle ?? 'bike'
  const language = settings.language ?? courier?.language ?? 'fi'
  const profile = {
    name: courier?.name?.trim() || '',
    phone: courier?.phone?.trim() || '',
    email: courier?.email || user?.email || '',
    city: courier?.city ?? 'kuopio',
    vehicle,
    businessId: courier?.business_id ?? null,
    billingMethod: courier?.billing_method ?? null,
    iban: courier?.iban ?? null,
    ibanHolder: courier?.iban_holder ?? null,
  }

  const value = {
    online,
    setOnline,
    offlineAt,
    scheduleOffline: setOfflineAt,
    settings: { ...settings, vehicle, language },
    updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
    profile,
    // "Palauta oletukset" koskee vain tämän puhelimen asetuksia, ei profiilia.
    resetSettings: () => {
      setSettings(DEFAULT_SETTINGS)
      setOfflineAt(null)
    },
  }

  // Näkymät piirretään vasta kun tallennetut asetukset on luettu, ettei
  // oletusarvo välähdä. Luku puhelimen muistista kestää vain hetken.
  return <CourierContext.Provider value={value}>{loaded ? children : null}</CourierContext.Provider>
}

export function useCourier() {
  const context = useContext(CourierContext)
  if (!context) throw new Error('useCourier on kutsuttava CourierProviderin sisältä.')
  return context
}
