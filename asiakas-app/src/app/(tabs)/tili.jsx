import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, Bell, CreditCard, Lock, MessageCircle, ReceiptText, User } from 'lucide-react-native'
import { Button } from '../../components/ui'
import { formatDisplayAddress } from '../../../../frontend/src/lib/format'
import { useAuth } from '../../lib/auth'
import { colors, fonts } from '../../theme'

const SUPPORT = 'mailto:tuki@bidrop.fi'

// Tilisivu täsmälleen kuten verkkosivun puhelimen tilisivu
// (frontend/src/pages/AccountHub.jsx + SettingsLayout.jsx, käyttäjän pyyntö
// 15.11.2026): yläpalkissa pyöreä takaisin-nappi ja otsikko "Tili",
// tervehdys etunimellä (ei profiilikuvaa), sähköposti ja osoite, kevyet
// listarivit ryhmissä ohuen viivan erottamina ja Kirjaudu ulos alhaalla.
// Alasivut: app/asetukset/ (tiedot, salasana, ilmoitukset, maksutavat).
const GROUPS = [
  [
    { key: 'tiedot', label: 'Omat tiedot', hint: 'Nimi, puhelin ja toimitusosoite', Icon: User, to: '/asetukset/tiedot' },
    { key: 'salasana', label: 'Salasana', Icon: Lock, to: '/asetukset/salasana' },
    { key: 'ilmoitukset', label: 'Ilmoitukset', hint: 'Tilausten tila ja sähköpostit', Icon: Bell, to: '/asetukset/ilmoitukset' },
  ],
  [
    { key: 'tilaukset', label: 'Tilaukset', hint: 'Käynnissä olevat ja aiemmat tilaukset', Icon: ReceiptText, to: '/tilaukset' },
    { key: 'maksutavat', label: 'Maksutavat', hint: 'Kortit ja muut maksutavat', Icon: CreditCard, to: '/asetukset/maksutavat' },
  ],
  [{ key: 'tuki', label: 'Ota yhteyttä', hint: 'tuki@bidrop.fi', Icon: MessageCircle, href: SUPPORT }],
]

function TopBar({ title, onBack }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.topbar, { paddingTop: insets.top }]}>
      <View style={styles.topbarRow}>
        <Pressable
          onPress={onBack}
          hitSlop={6}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel="Takaisin etusivulle"
        >
          <ArrowLeft size={22} strokeWidth={1.75} color={colors.black} />
        </Pressable>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 38 }} />
      </View>
    </View>
  )
}

export default function AccountScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session, customer, signOut } = useAuth()
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/ravintolat'))

  if (!session) {
    return (
      <View style={styles.screen}>
        <TopBar title="Tili" onBack={back} />
        <View style={styles.content}>
          <Text style={styles.name}>Hei!</Text>
          <Text style={styles.line}>Kirjaudu sisään tilataksesi ja nähdäksesi tilauksesi.</Text>
          <View style={{ gap: 10, marginTop: 24 }}>
            <Button title="Kirjaudu sisään" onPress={() => router.push('/kirjautuminen')} />
            <Button title="Luo tili" variant="secondary" onPress={() => router.push('/rekisteroidy')} />
          </View>
        </View>
      </View>
    )
  }

  const firstName = customer?.name?.trim().split(/\s+/)[0]
  const email = customer?.email || session.user.email
  const address = customer?.address ? formatDisplayAddress(customer.address) : null

  const open = (row) => {
    if (row.to) router.push(row.to)
    else if (row.href) Linking.openURL(row.href)
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Tili" onBack={back} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Pressable
          onPress={() => router.push('/asetukset/tiedot')}
          style={({ pressed }) => [styles.profile, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          <Text style={styles.name} numberOfLines={1}>
            {firstName ? `Hei, ${firstName}!` : 'Hei!'}
          </Text>
          {email ? (
            <Text style={styles.line} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
          {address ? (
            <Text style={styles.line} numberOfLines={1}>
              {address}
            </Text>
          ) : null}
        </Pressable>

        {GROUPS.map((rows) => (
          <View key={rows[0].key} style={styles.group}>
            {rows.map((row) => (
              <Pressable
                key={row.key}
                onPress={() => open(row)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
              >
                <row.Icon size={18} strokeWidth={1.8} color={colors.black} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.hint ? (
                    <Text style={styles.rowHint} numberOfLines={1}>
                      {row.hint}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ))}

        <Pressable
          onPress={async () => {
            await signOut()
            router.replace('/')
          }}
          style={({ pressed }) => [styles.signOut, pressed && { transform: [{ scale: 0.97 }] }]}
          accessibilityRole="button"
        >
          <Text style={styles.signOutText}>Kirjaudu ulos</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  topbar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e5db',
  },
  topbarRow: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 9 },
  back: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#e2e4e8',
  },
  backPressed: { backgroundColor: '#d4d7dc' },
  topbarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.headingBold,
    fontSize: 17,
    color: colors.black,
  },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  profile: { gap: 2, paddingTop: 10, paddingBottom: 20 },
  name: {
    marginBottom: 2,
    fontFamily: fonts.headingBold,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.black,
  },
  line: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  group: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#ecebe8' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18, minHeight: 52, paddingVertical: 10 },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  rowHint: { fontFamily: fonts.regular, fontSize: 12.8, color: colors.textMuted },
  signOut: { alignSelf: 'center', marginTop: 24, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 12 },
  signOutText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.textMuted },
})
