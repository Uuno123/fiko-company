import { useCallback, useState } from 'react'
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import Constants from 'expo-constants'
import * as Location from 'expo-location'
import { ExternalLink, LocateFixed, Map as MapIcon, RotateCcw, SunMedium, Vibrate } from 'lucide-react-native'
import { Card, ListRow, Screen, SectionTitle } from '../components/ui'
import { vehicleIcon } from '../components/vehicleIcons'
import { VEHICLES, useCourier } from '../lib/courier'
import { NAVIGATION_APPS } from '../lib/navigationApps'
import { colors, fonts } from '../theme'

const PERMISSION_LABELS = { granted: 'Sallittu', denied: 'Estetty', undetermined: 'Ei kysytty' }

// Asetukset tallentuvat puhelimeen (lib/courier.js) ja vaikuttavat heti:
// kulkuneuvo ja navigointisovellus reitin avaamiseen, värinä liukukytkimeen
// ja "näyttö päällä" online-tilaan.
export default function SettingsScreen() {
  const { settings, updateSettings, resetAll } = useCourier()
  const [permission, setPermission] = useState(null)

  // Sijaintilupa tarkistetaan aina kun näkymään palataan (esim. puhelimen
  // asetuksista, joissa luvan on voinut muuttaa).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      Location.getForegroundPermissionsAsync()
        .then(({ status }) => !cancelled && setPermission(status))
        .catch(() => !cancelled && setPermission('undetermined'))
      return () => {
        cancelled = true
      }
    }, []),
  )

  const confirmReset = () => {
    const title = 'Palautetaanko oletukset?'
    const message = 'Asetukset ja profiilin tiedot palautetaan alkuperäisiksi.'
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) resetAll()
      return
    }
    Alert.alert(title, message, [
      { text: 'Peruuta', style: 'cancel' },
      { text: 'Palauta', style: 'destructive', onPress: resetAll },
    ])
  }

  return (
    <Screen title="Asetukset">
      <SectionTitle style={styles.firstTitle}>Kulkuneuvo</SectionTitle>
      <View style={styles.vehicles}>
        {VEHICLES.map(({ key, label }) => {
          const Icon = vehicleIcon(key)
          const selected = settings.vehicle === key
          return (
            <Pressable
              key={key}
              onPress={() => updateSettings({ vehicle: key })}
              style={({ pressed }) => [styles.vehicle, selected && styles.vehicleSelected, pressed && styles.vehiclePressed]}
              accessibilityRole="radio"
              aria-checked={selected}
            >
              <Icon size={26} strokeWidth={1.8} color={selected ? colors.orange : colors.black} />
              <Text style={[styles.vehicleLabel, selected && styles.vehicleLabelSelected]}>{label}</Text>
            </Pressable>
          )
        })}
      </View>

      <SectionTitle>Navigointisovellus</SectionTitle>
      <Card>
        {NAVIGATION_APPS.map(({ key, label }, index) => (
          <ListRow
            key={key}
            icon={MapIcon}
            label={label}
            onPress={() => updateSettings({ navigationApp: key })}
            right={<Radio selected={settings.navigationApp === key} />}
            last={index === NAVIGATION_APPS.length - 1}
          />
        ))}
      </Card>

      <SectionTitle>Sovellus</SectionTitle>
      <Card>
        <ListRow
          icon={Vibrate}
          label="Värinä"
          detail="Puhelin värähtää kun vaihdat online- ja offline-tilan välillä."
          right={<Toggle value={settings.haptics} onValueChange={(haptics) => updateSettings({ haptics })} />}
        />
        <ListRow
          icon={SunMedium}
          label="Pidä näyttö päällä"
          detail="Kun olet online, näyttö ei sammu itsestään."
          right={<Toggle value={settings.keepAwake} onValueChange={(keepAwake) => updateSettings({ keepAwake })} />}
          last
        />
      </Card>

      <SectionTitle>Sijainti</SectionTitle>
      <Card>
        <ListRow
          icon={LocateFixed}
          label="Sijaintilupa"
          detail="Sijaintia tarvitaan kartalle ja lähimpien keikkojen tarjoamiseen."
          value={permission ? PERMISSION_LABELS[permission] ?? permission : 'Tarkistetaan…'}
        />
        <ListRow
          icon={ExternalLink}
          label="Avaa puhelimen asetukset"
          onPress={() => Linking.openSettings().catch(() => {})}
          last
        />
      </Card>

      <SectionTitle>Tietoja</SectionTitle>
      <Card>
        <ListRow label="Versio" value={Constants.expoConfig?.version ?? '1.0.0'} />
        <ListRow
          label="Karttatiedot"
          detail="© OpenStreetMapin tekijät, OpenMapTiles, OpenFreeMap"
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}
        />
        <ListRow icon={RotateCcw} label="Palauta oletukset" onPress={confirmReset} danger last />
      </Card>
    </Screen>
  )
}

// Selaimen esikatselussa (react-native-web) päällä olevan kytkimen nuppi on
// oletuksena turkoosi - sille oma väri vain siellä.
const WEB_SWITCH_COLORS = Platform.OS === 'web' ? { activeThumbColor: '#ffffff' } : {}

function Toggle({ value, onValueChange }) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.gray200, true: colors.orange }}
      thumbColor="#ffffff"
      ios_backgroundColor={colors.gray200}
      {...WEB_SWITCH_COLORS}
    />
  )
}

function Radio({ selected }) {
  return <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
}

const styles = StyleSheet.create({
  firstTitle: {
    marginTop: 8,
  },
  vehicles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vehicle: {
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.gray200,
    backgroundColor: colors.surface,
  },
  vehicleSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  vehiclePressed: {
    transform: [{ scale: 0.98 }],
  },
  vehicleLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.black,
  },
  vehicleLabelSelected: {
    color: colors.orangeDark,
  },
  radio: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray400,
  },
  radioSelected: {
    borderColor: colors.orange,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orange,
  },
})
