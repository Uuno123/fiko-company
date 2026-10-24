import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { ChevronRight, CircleHelp, FileText, History, LogOut, Settings, Wallet, X } from 'lucide-react-native'
import DelivoLogo from './DelivoLogo'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import { formatEuro, isSameDay } from '../lib/format'
import { summarize, useGigs } from '../lib/gigs'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

// Profiili avautuu valikon yläosan kuljettajakortista.
const ITEMS = [
  { key: 'earnings', label: 'menu.earnings', Icon: Wallet, path: '/earnings' },
  { key: 'history', label: 'menu.history', Icon: History, path: '/history' },
  { key: 'documents', label: 'menu.documents', Icon: FileText, path: '/documents' },
  { key: 'settings', label: 'menu.settings', Icon: Settings, path: '/settings' },
  { key: 'help', label: 'menu.help', Icon: CircleHelp, path: '/help' },
]

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

const useNativeDriver = Platform.OS !== 'web'

// Vasemmalta liukuva sivuvalikko koko näytön levyisenä (käyttäjän pyyntö
// 24.10.2026). Sulkeutuu kun pyyhkäisee valikkoa vasemmalle, painaa ruksia tai
// Androidin takaisin-nappia. onNavigate(path): avaa valikon kohdan näkymän.
//
// Ulkoasu sama kuin pääsivun alapaneelissa: "Kuljettaja / nimi" kuten
// "Toimitusalue / Kuopio", tila pallolla kuten alueen kysyntä ja rivit kuin
// pääsivun lista (ikoni + teksti, hiusviivat).
export default function SideMenu({ open, onClose, onNavigate }) {
  const insets = useSafeAreaInsets()
  const t = useT()
  // Nimi ja kulkuneuvo kuljettajatiedoista (tietokanta, lib/courier.js).
  const { online, profile } = useCourier()
  const { signOut } = useAuth()
  // Päivän luvut samoista keikoista kuin Ansiot-näkymä.
  const gigs = useGigs()
  const today = useMemo(() => {
    const now = new Date()
    return summarize(gigs.filter((gig) => isSameDay(gig.deliveredAt, now)))
  }, [gigs, open])
  const { width, height } = useWindowDimensions()
  // Tummennukselle koko näytön mitat: Androidin Modal ei aina anna absoluteFill-
  // taustalle koko ruudun kokoa, jolloin tummennusta ei näkynyt (sama korjaus
  // kuin ChoiceSheetissä).
  const screen = Dimensions.get('screen')
  const backdropSize = { width: Math.max(width, screen.width), height: Math.max(height, screen.height) }
  // Koko näytön levyinen: tummennus näkyy vain liukumisen aikana.
  const panelWidth = width
  const progress = useRef(new Animated.Value(0)).current
  const [mounted, setMounted] = useState(open)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    if (open) {
      setMounted(true)
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }).start()
    } else {
      // Sulkeutuminen lähtee heti liikkeelle (ease-out), jotta napautus tuntuu
      // reagoivan. Myös keskeytynyt sulkeminen päättyy piilotukseen, ellei
      // valikkoa ole sillä välin avattu uudelleen - muuten näkymätön valikko
      // voisi jäädä ruudun päälle estämään kosketukset.
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }).start(() => {
        if (!openRef.current) setMounted(false)
      })
    }
  }, [open, progress])

  // Pyyhkäisy vasemmalle missä tahansa valikon päällä vetää valikkoa sormen
  // mukana. Capture-vaihe ottaa eleen ennen valikon rivejä,
  // joten veto toimii myös rivin päältä aloitettuna. Lyhytkin nopea pyyhkäisy
  // riittää sulkemaan.
  const latest = useRef({ panelWidth, onClose })
  latest.current = { panelWidth, onClose }
  const swipe = useRef(
    PanResponder.create({
      // Ei kesken sulkemisen: veto ei saa pysäyttää jo alkanutta sulkeutumista.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        openRef.current && g.dx < -6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => progress.setValue(Math.min(1, Math.max(0, 1 + g.dx / latest.current.panelWidth))),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -latest.current.panelWidth * 0.2 || g.vx < -0.25) latest.current.onClose()
        else Animated.spring(progress, { toValue: 1, bounciness: 0, useNativeDriver }).start()
      },
      onPanResponderTerminate: () => Animated.spring(progress, { toValue: 1, bounciness: 0, useNativeDriver }).start(),
    }),
  ).current

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] })

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.root} {...swipe.panHandlers}>
        {/* Tummennus näkyy liukumisen aikana. Jos sitä ehtii koskettaa,
            valikko sulkeutuu heti. */}
        <Animated.View
          style={[styles.backdrop, backdropSize, { opacity: progress }]}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onClose}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('menu.close')}
          onAccessibilityTap={onClose}
        />

        <Animated.View
          style={[
            styles.panel,
            { width: panelWidth, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12, transform: [{ translateX }] },
          ]}
        >
          <View style={styles.top}>
            <DelivoLogo size={20} />
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('menu.close')}
              hitSlop={8}
            >
              <X size={20} strokeWidth={2.2} color={colors.black} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => onNavigate('/profile')}
            style={({ pressed }) => [styles.identity, pressed && styles.identityPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('menu.profile', { name: profile.name })}
          >
            <Text style={styles.label}>{t('common.courier')}</Text>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.name}
              </Text>
              <ChevronRight size={22} strokeWidth={2} color={colors.gray400} />
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: online ? colors.open : colors.gray400 }]} />
              <Text style={styles.statusText} numberOfLines={1}>
                {online ? t('common.online') : t('common.offline')} · {t(`vehicle.${profile.vehicle}`)}
              </Text>
            </View>
            <Text style={styles.today}>
              {t('menu.today')} <Text style={styles.todayValue}>{formatEuro(today.total)}</Text> · {today.count}{' '}
              {today.count === 1 ? t('common.gig.one') : t('common.gig.other')}
            </Text>
          </Pressable>

          <View style={styles.rows}>
            {ITEMS.map(({ key, label, Icon, path }) => (
              <Pressable
                key={key}
                onPress={() => onNavigate(path)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                accessibilityRole="button"
              >
                <Icon size={22} strokeWidth={1.9} color={colors.black} />
                <Text style={styles.rowLabel}>{t(label)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => {
                onClose()
                signOut()
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
            >
              <LogOut size={22} strokeWidth={1.9} color={colors.black} />
              <Text style={styles.rowLabel}>{t('menu.signOut')}</Text>
            </Pressable>
            <Text style={styles.version}>
              {t('common.version')} {APP_VERSION}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(20, 21, 15, 0.55)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.surface,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gray100,
  },
  closeButtonPressed: {
    backgroundColor: colors.gray200,
  },
  // Samat tekstityylit kuin pääsivun "Toimitusalue / Kuopio / Alueen kysyntä".
  identity: {
    marginTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  identityPressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  name: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.6,
    color: colors.black,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  today: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  todayValue: {
    fontFamily: fonts.semibold,
    color: colors.black,
  },
  // Rivit kuin pääsivun listassa (app/index.jsx: rows, row, rowLabel).
  rows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  rowPressed: {
    backgroundColor: colors.gray50,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  footer: {
    marginTop: 'auto',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  version: {
    marginTop: 10,
    paddingHorizontal: 20,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.gray400,
  },
})
