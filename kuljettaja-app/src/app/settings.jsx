import { useCallback, useState } from 'react'
import { Alert, Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import Constants from 'expo-constants'
import * as Location from 'expo-location'
import {
  Bell,
  BellRing,
  ExternalLink,
  Languages,
  LocateFixed,
  Lock,
  Map as MapIcon,
  Navigation,
  SunMedium,
  Vibrate,
} from 'lucide-react-native'
import ChoiceSheet from '../components/ChoiceSheet'
import { Card, ListRow, ProfileCard, Screen } from '../components/ui'
import { vehicleIcon } from '../components/vehicleIcons'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import { LANGUAGES, useT } from '../lib/i18n'
import { getNotificationPermission, registerForPushNotifications } from '../lib/notifications'
import { NAVIGATION_APPS, navigationAppLabel } from '../lib/navigationApps'
import { colors, fonts } from '../theme'

const PERMISSION_COLORS = { granted: colors.open, denied: colors.danger, undetermined: colors.gray400, unavailable: colors.gray400 }

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

// Asetukset. Kuljettaja vaihtaa itse vain sovelluksen käyttöön liittyvät
// asetukset (navigointi, värinä, ääni, näyttö päällä, kieli). Ne tallentuvat
// tähän puhelimeen (lib/courier.js), kieli myös kuljettajatietoihin.
// Kulkuneuvo on lukittu: rivi avaa muutospyynnön, jonka delivo hyväksyy.
export default function SettingsScreen() {
  const router = useRouter()
  const t = useT()
  const { settings, updateSettings, resetSettings, profile } = useCourier()
  const { courier, updateCourier } = useAuth()
  const [permission, setPermission] = useState(null)
  const [pushPermission, setPushPermission] = useState(null)
  const [sheet, setSheet] = useState(null)

  // Sijainti- ja ilmoituslupa tarkistetaan aina kun näkymään palataan (esim.
  // puhelimen asetuksista, joissa luvan on voinut muuttaa).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      Location.getForegroundPermissionsAsync()
        .then(({ status }) => !cancelled && setPermission(status))
        .catch(() => !cancelled && setPermission('undetermined'))
      getNotificationPermission().then((status) => !cancelled && setPushPermission(status))
      return () => {
        cancelled = true
      }
    }, []),
  )

  // Kieli vaihtuu heti tässä puhelimessa ja tallentuu kuljettajatietoihin.
  const chooseLanguage = (language) => {
    updateSettings({ language })
    if (courier) updateCourier({ language }).catch(() => {})
  }

  const confirmReset = () => {
    const title = t('settings.resetTitle')
    const message = t('settings.resetMessage')
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) resetSettings()
      return
    }
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.resetConfirm'), style: 'destructive', onPress: resetSettings },
    ])
  }

  // Ilmoitukset: kysymättä -> kysytään nyt, muuten luvan voi muuttaa vain
  // puhelimen asetuksista.
  const openNotifications = () => {
    if (pushPermission === 'undetermined') registerForPushNotifications().then(setPushPermission)
    else Linking.openSettings().catch(() => {})
  }

  const languageLabel = LANGUAGES.find((language) => language.key === settings.language)?.label ?? LANGUAGES[0].label

  return (
    <Screen title={t('settings.title')}>
      <ProfileCard
        tag={t('common.courier')}
        name={profile.name}
        lines={[profile.email, profile.phone]}
        onPress={() => router.push('/profile')}
      />

      <Card title={t('settings.driving')}>
        <ListRow
          icon={vehicleIcon(settings.vehicle)}
          label={t('settings.vehicle')}
          value={t(`vehicle.${settings.vehicle}`)}
          onPress={() => router.push({ pathname: '/change-request', params: { field: 'vehicle' } })}
          right={<Lock size={16} strokeWidth={2} color={colors.textMuted} />}
        />
        <ListRow
          icon={MapIcon}
          label={t('settings.navigation')}
          value={navigationAppLabel(settings.navigationApp)}
          onPress={() => setSheet('navigation')}
        />
      </Card>

      <Card title={t('settings.app')}>
        <ListRow
          icon={Vibrate}
          label={t('settings.haptics')}
          right={<Toggle label={t('settings.haptics')} value={settings.haptics} onValueChange={(haptics) => updateSettings({ haptics })} />}
        />
        <ListRow
          icon={BellRing}
          label={t('settings.sound')}
          right={<Toggle label={t('settings.sound')} value={settings.sound} onValueChange={(sound) => updateSettings({ sound })} />}
        />
        <ListRow
          icon={SunMedium}
          label={t('settings.keepAwake')}
          right={
            <Toggle
              label={t('settings.keepAwake')}
              value={settings.keepAwake}
              onValueChange={(keepAwake) => updateSettings({ keepAwake })}
            />
          }
        />
        <ListRow
          icon={LocateFixed}
          label={t('settings.location')}
          right={permission ? <PermissionStatus status={permission} /> : null}
        />
        <ListRow
          icon={Bell}
          label={t('settings.notifications')}
          onPress={pushPermission && pushPermission !== 'unavailable' ? openNotifications : undefined}
          right={pushPermission ? <PermissionStatus status={pushPermission} /> : null}
        />
        <ListRow icon={ExternalLink} label={t('settings.phoneSettings')} onPress={() => Linking.openSettings().catch(() => {})} />
      </Card>

      <Card title={t('settings.language')}>
        <ListRow icon={Languages} label={t('settings.language')} value={languageLabel} onPress={() => setSheet('language')} />
      </Card>

      <Card title={t('settings.about')}>
        <ListRow label={t('common.version')} value={APP_VERSION} />
        <ListRow label={t('settings.mapData')} onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})} />
        <ListRow label={t('settings.reset')} onPress={confirmReset} right={null} danger />
      </Card>

      <ChoiceSheet
        visible={sheet === 'navigation'}
        title={t('settings.navigationApp')}
        options={NAVIGATION_APPS.map(({ key, label }) => ({ key, label, icon: key === 'waze' ? Navigation : MapIcon }))}
        value={settings.navigationApp}
        onSelect={(navigationApp) => updateSettings({ navigationApp })}
        onClose={() => setSheet(null)}
      />
      <ChoiceSheet
        visible={sheet === 'language'}
        title={t('settings.language')}
        options={LANGUAGES.map(({ key, label }) => ({ key, label }))}
        value={settings.language}
        onSelect={chooseLanguage}
        onClose={() => setSheet(null)}
      />
    </Screen>
  )
}

function PermissionStatus({ status }) {
  const t = useT()
  return (
    <View style={styles.status}>
      <View style={[styles.statusDot, { backgroundColor: PERMISSION_COLORS[status] ?? colors.gray400 }]} />
      <Text style={styles.statusText}>{t(`permission.${status}`)}</Text>
    </View>
  )
}

// Selaimen esikatselussa (react-native-web) päällä olevan kytkimen nuppi on
// oletuksena turkoosi - sille oma väri vain siellä.
const WEB_SWITCH_COLORS = Platform.OS === 'web' ? { activeThumbColor: '#ffffff' } : {}

function Toggle({ label, value, onValueChange }) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.gray200, true: colors.orange }}
      thumbColor="#ffffff"
      ios_backgroundColor={colors.gray200}
      accessibilityLabel={label}
      {...WEB_SWITCH_COLORS}
    />
  )
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },

})
