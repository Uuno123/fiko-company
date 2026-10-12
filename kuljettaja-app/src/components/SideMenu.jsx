import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { ChevronRight, CircleHelp, History, LogOut, Settings, Wallet, X } from 'lucide-react-native'
import DelivoLogo from './DelivoLogo'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import { formatEuro, initials, isSameDay } from '../lib/format'
import { summarize, useGigs } from '../lib/gigs'
import { colors, fonts } from '../theme'

// Profiili avautuu valikon yläosan kortista.
const ITEMS = [
  { key: 'earnings', label: 'Ansiot', Icon: Wallet, path: '/earnings' },
  { key: 'history', label: 'Keikkahistoria', Icon: History, path: '/history' },
  { key: 'settings', label: 'Asetukset', Icon: Settings, path: '/settings' },
  { key: 'help', label: 'Tuki ja ohjeet', Icon: CircleHelp, path: '/help' },
]

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

const useNativeDriver = Platform.OS !== 'web'

// Vasemmalta liukuva sivuvalikko. Sulkeutuu kun napauttaa karttaa valikon
// vieressä, pyyhkäisee valikkoa vasemmalle, painaa ruksia tai Androidin
// takaisin-nappia. onNavigate(path): avaa valikon kohdan näkymän.
export default function SideMenu({ open, onClose, onNavigate }) {
  const insets = useSafeAreaInsets()
  const { online, profile: localProfile } = useCourier()
  const { courier, signOut } = useAuth()
  // Nimi kuljettajatiedoista (tietokanta), muuten puhelimeen tallennettu profiili.
  const profile = { ...localProfile, name: courier?.name?.trim() || localProfile.name }
  // Päivän luvut samoista keikoista kuin Ansiot-näkymä.
  const gigs = useGigs()
  const today = useMemo(() => {
    const now = new Date()
    return summarize(gigs.filter((gig) => isSameDay(gig.deliveredAt, now)))
  }, [gigs, open])
  const { width } = useWindowDimensions()
  const panelWidth = Math.min(340, Math.round(width * 0.86))
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

  // Pyyhkäisy vasemmalle missä tahansa (valikon tai kartan päällä) vetää
  // valikkoa sormen mukana. Capture-vaihe ottaa eleen ennen valikon rivejä,
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
        {/* Kartan kosketus sulkee valikon heti kun sormi osuu - ei vasta
            irrotettaessa, ja myös nopealla napautuksella. */}
        <Animated.View
          style={[styles.backdrop, { opacity: progress }]}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onClose}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Sulje valikko"
          onAccessibilityTap={onClose}
        />

        <Animated.View
          style={[
            styles.panel,
            { width: panelWidth, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, transform: [{ translateX }] },
          ]}
        >
          <View style={styles.top}>
            <DelivoLogo size={22} />
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Sulje valikko"
              hitSlop={8}
            >
              <X size={20} strokeWidth={2.2} color={colors.black} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => onNavigate('/profile')}
            style={({ pressed }) => [styles.profile, pressed && styles.profilePressed]}
            accessibilityRole="button"
            accessibilityLabel={`Profiili, ${profile.name}`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(profile.name)}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile.name}
              </Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: online ? colors.open : colors.gray400 }]} />
                <Text style={styles.statusText}>{online ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
            <ChevronRight size={20} strokeWidth={2} color={colors.gray400} />
          </Pressable>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatEuro(today.total)}</Text>
              <Text style={styles.statLabel}>Ansaittu tänään</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{today.count}</Text>
              <Text style={styles.statLabel}>Keikkaa tänään</Text>
            </View>
          </View>

          <View style={styles.items}>
            {ITEMS.map(({ key, label, Icon, path }) => (
              <Pressable
                key={key}
                onPress={() => onNavigate(path)}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                accessibilityRole="button"
              >
                <View style={styles.itemIcon}>
                  <Icon size={20} strokeWidth={1.9} color={colors.black} />
                </View>
                <Text style={styles.itemLabel}>{label}</Text>
                <ChevronRight size={18} strokeWidth={2} color={colors.gray400} />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => {
              onClose()
              signOut()
            }}
            style={({ pressed }) => [styles.item, styles.logout, pressed && styles.itemPressed]}
            accessibilityRole="button"
          >
            <View style={styles.itemIcon}>
              <LogOut size={20} strokeWidth={1.9} color={colors.danger} />
            </View>
            <Text style={[styles.itemLabel, styles.logoutLabel]}>Kirjaudu ulos</Text>
          </Pressable>

          <Text style={styles.version}>Versio {APP_VERSION}</Text>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 21, 15, 0.45)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    boxShadow: '8px 0 32px rgba(20, 21, 15, 0.18)',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 4,
    marginBottom: 22,
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
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.gray50,
  },
  profilePressed: {
    backgroundColor: colors.gray100,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orangeSoft,
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.orange,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: -0.2,
    color: colors.black,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.gray200,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.black,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  items: {
    marginTop: 18,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  itemPressed: {
    backgroundColor: colors.gray50,
  },
  itemIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
  },
  itemLabel: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  logout: {
    marginTop: 'auto',
  },
  logoutLabel: {
    color: colors.danger,
  },
  version: {
    marginTop: 8,
    paddingLeft: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.gray400,
  },
})
