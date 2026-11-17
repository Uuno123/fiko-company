import { useEffect, useRef } from 'react'
import { Animated, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Bell, CreditCard, LifeBuoy, ReceiptText, Tag, UserRound } from 'lucide-react-native'
import BidropLogo from './BidropLogo'
import { useAuth } from '../lib/auth'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
const PANEL = 320
const SUPPORT = 'mailto:tuki@bidrop.fi'

// Hamburger-valikko täsmälleen kuten verkkosivun puhelinnäkymässä
// (frontend/src/components/MobileMenu.jsx): paneeli liukuu vasemmalta.
// Kirjautumaton: musta Liity-nappi Bidrop-logolla ja harmaa Kirjaudu sisään.
// Kirjautunut: profiili, ikonilista, Kirjaudu ulos ja jakoviiva.
// Alla tekstilinkit.
export default function MobileMenu({ open, onClose }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session, customer, signOut } = useAuth()
  const slide = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (open) Animated.timing(slide, { toValue: 1, duration: 260, useNativeDriver }).start()
  }, [open, slide])

  const close = (after) => {
    Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver }).start(() => {
      onClose()
      after?.()
    })
  }
  const go = (path) => close(() => router.push(path))
  const search = (q) => go({ pathname: '/haku', params: { q, t: String(Date.now()) } })

  const firstName = customer?.name ? String(customer.name).split(' ')[0] : null
  const accountLinks = [
    { label: 'Tilaukset', Icon: ReceiptText, onPress: () => go('/tilaukset') },
    { label: 'Maksutavat', Icon: CreditCard, onPress: () => go('/tili') },
    { label: 'Tarjoukset', Icon: Tag, onPress: () => search('Tarjoukset') },
    { label: 'Ilmoitukset', Icon: Bell, onPress: () => go('/tili') },
    { label: 'Ohje', Icon: LifeBuoy, onPress: () => close(() => Linking.openURL(SUPPORT)) },
  ]
  const links = [
    ...(session ? [] : [{ label: 'Selaa kaikkia ravintoloita', onPress: () => search('Kaikki ravintolat') }]),
    { label: 'Tarjoukset', onPress: () => search('Tarjoukset') },
    { label: 'Ilmainen kuljetus', onPress: () => search('Ilmainen kuljetus') },
    { label: 'Lähelläsi', onPress: () => search('Lähelläsi') },
    { label: 'Asiakastuki', onPress: () => close(() => Linking.openURL(SUPPORT)) },
  ]

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Sulje valikko" />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-PANEL, 0] }) }],
          },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {session ? (
            <>
              <Pressable onPress={() => go('/tili')} style={styles.profile} accessibilityRole="button">
                <View style={styles.avatar}>
                  <UserRound size={22} strokeWidth={1.9} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.profileName}>{firstName || 'Oma tili'}</Text>
                  <Text style={styles.profileLink}>Hallinnoi tiliä</Text>
                </View>
              </Pressable>
              {accountLinks.map(({ label, Icon, onPress }) => (
                <Pressable key={label} onPress={onPress} style={styles.row} accessibilityRole="button">
                  <Icon size={20} strokeWidth={2} color={colors.black} />
                  <Text style={styles.rowText}>{label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => close(signOut)} style={styles.signOut} accessibilityRole="button">
                <Text style={styles.signOutText}>Kirjaudu ulos</Text>
              </Pressable>
              <View style={styles.divider} />
            </>
          ) : (
            <View style={styles.auth}>
              <Pressable
                onPress={() => go('/rekisteroidy')}
                style={styles.join}
                accessibilityRole="button"
                accessibilityLabel="Liity Bidropiin"
              >
                <BidropLogo size={19} dark style={{ alignSelf: 'center' }} />
              </Pressable>
              <Pressable onPress={() => go('/kirjautuminen')} style={styles.login} accessibilityRole="button">
                <Text style={styles.loginText}>Kirjaudu sisään</Text>
              </Pressable>
            </View>
          )}

          {links.map(({ label, onPress }) => (
            <Pressable key={label} onPress={onPress} style={styles.link} accessibilityRole="button">
              <Text style={styles.linkText}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20, 21, 15, 0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL,
    maxWidth: '86%',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  auth: { gap: 10, marginBottom: 26 },
  join: { height: 54, justifyContent: 'center', borderRadius: 10, backgroundColor: colors.black },
  login: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#f3f3f3' },
  loginText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#6b6b6b',
  },
  profileName: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  profileLink: { marginTop: 2, fontFamily: fonts.medium, fontSize: 13, color: colors.orange },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 11 },
  rowText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  signOut: { alignSelf: 'flex-start', paddingVertical: 12 },
  signOutText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.textMuted },
  divider: { height: 1, marginHorizontal: -24, marginTop: 8, marginBottom: 14, backgroundColor: '#ececea' },
  link: { paddingVertical: 9 },
  linkText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.black },
})
