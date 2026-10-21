import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, Check, ChevronRight, Lock } from 'lucide-react-native'
import { colors, fonts } from '../theme'

// Yhteiset rakennuspalat valikon näkymille (ansiot, historia, asetukset...)
// samassa ilmeessä kuin verkkosivun mobiilin tilisivu (frontend AccountHub):
// valkoinen yläpalkki nuolella ja keskitetyllä otsikolla, valkoiset kortit
// ohuella harmaalla reunuksella, otsikko kortin sisällä ja rivit, joissa ikoni
// vaaleanharmaassa neliössä ja nuoli - ilman erotinviivoja.

const SIDE = 16
const LINE = '#ececec'
const TILE = '#f4f4f4'
export const PAGE_BACKGROUND = colors.surface

// Yläpalkki: takaisin-nuoli vasemmalla, otsikko keskellä.
export function ScreenHeader({ title }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Takaisin"
        hitSlop={8}
      >
        <ArrowLeft size={22} strokeWidth={1.75} color={colors.black} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  )
}

// Näkymän runko: yläpalkki ja vieritettävä sisältö, kortit 14 px välein.
export function Screen({ title, children, scroll = true }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  )
}

// Kortin otsikko (kortin sisällä, rivien yläpuolella).
export function SectionTitle({ children, style }) {
  return (
    <Text style={[styles.sectionTitle, style]} accessibilityRole="header">
      {children}
    </Text>
  )
}

// Valkoinen kortti ohuella reunuksella. title: otsikko kortin sisälle.
// flat: ilman reunusta ja sisennystä (esim. alhaalta nousevan valikon sisällä).
export function Card({ title, children, style, flat = false }) {
  return (
    <View style={[styles.card, title ? styles.cardWithTitle : null, flat && styles.cardFlat, style]}>
      {title ? <SectionTitle>{title}</SectionTitle> : null}
      {children}
    </View>
  )
}

// Rivi: ikoni vaaleanharmaassa neliössä, teksti (+ lisärivi), arvo oikealla ja
// nuoli jos rivi on painettava. right korvaa nuolen (esim. kytkin).
// selected: valintarivi, valittu näkyy oranssina ruksina. detailAccent: lisärivi
// oranssina (esim. "Pyydä muutosta").
export function ListRow({ icon: Icon, label, detail, detailAccent = false, value, onPress, right, selected, danger = false, role }) {
  const choice = selected !== undefined
  let end = right
  if (choice) end = selected ? <Check size={20} strokeWidth={2.4} color={colors.orange} /> : null
  else if (end === undefined && onPress) end = <ChevronRight size={20} strokeWidth={1.75} color={colors.textMuted} />
  const content = (
    <>
      {Icon ? (
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Icon size={18} strokeWidth={1.75} color={danger ? colors.danger : colors.black} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {detail ? <Text style={[styles.rowDetail, detailAccent && styles.rowDetailAccent]}>{detail}</Text> : null}
      </View>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {end}
    </>
  )
  if (!onPress) return <View style={styles.row}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole={role ?? 'button'}
      aria-checked={choice ? selected : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      {content}
    </Pressable>
  )
}

// Lukittu tieto (muutetaan muutospyynnöllä): tiedon nimi pienellä, arvo sen
// alla ja kolmantena rivinä toiminto tai pyynnön tila. Lukko oikealla.
export function LockedRow({ icon: Icon, label, value, note, noteAccent = false, onPress }) {
  const content = (
    <>
      {Icon ? (
        <View style={styles.rowIcon}>
          <Icon size={18} strokeWidth={1.75} color={colors.black} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={styles.lockedLabel}>{label}</Text>
        <Text style={styles.lockedValue} numberOfLines={1}>
          {value || '–'}
        </Text>
        {note ? <Text style={[styles.rowDetail, noteAccent && styles.rowDetailAccent]}>{note}</Text> : null}
      </View>
      <Lock size={16} strokeWidth={2} color={colors.textMuted} />
    </>
  )
  if (!onPress) return <View style={styles.row}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={note ? `${label}: ${value || '–'}. ${note}` : `${label}: ${value || '–'}`}
    >
      {content}
    </Pressable>
  )
}

// Tilikortti kuten verkkosivun tilisivulla: kieleke kulmassa, oranssi
// nimikirjainpallo, nimi ja yhteystiedot, nuoli.
export function ProfileCard({ tag, name, lines = [], onPress }) {
  const initial = (String(name ?? '').trim()[0] ?? '?').toUpperCase()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.profileCard, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${tag}: ${name}`}
    >
      <View style={styles.profileTag}>
        <Text style={styles.profileTagText}>{tag}</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.profileText}>
        <Text style={styles.profileName} numberOfLines={1}>
          {name}
        </Text>
        {lines.filter(Boolean).map((line) => (
          <Text key={line} style={styles.profileLine} numberOfLines={1}>
            {line}
          </Text>
        ))}
      </View>
      <ChevronRight size={20} strokeWidth={1.75} color={colors.textMuted} />
    </Pressable>
  )
}

// Tunnusluvut yhtenä rivinä ohuin pystyviivoin. items: [{ label, value }],
// title: kortin otsikko lukujen yläpuolelle.
export function StatRow({ items, style, title }) {
  const stats = items.map(({ label, value }, index) => (
    <View key={label} style={[styles.stat, index > 0 && styles.statDivider]}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  ))
  if (title) {
    return (
      <View style={[styles.card, styles.cardWithTitle, style]}>
        <SectionTitle>{title}</SectionTitle>
        <View style={styles.statsInTitledCard}>{stats}</View>
      </View>
    )
  }
  return <View style={[styles.card, styles.stats, style]}>{stats}</View>
}

export function Button({ title, onPress, icon: Icon, variant = 'primary', disabled = false }) {
  const primary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      accessibilityRole="button"
    >
      {Icon ? <Icon size={19} strokeWidth={2} color={primary ? '#ffffff' : colors.black} /> : null}
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{title}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: colors.surface,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    marginVertical: 6,
    borderRadius: 22,
  },
  backButtonPressed: {
    backgroundColor: TILE,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.black,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    gap: 14,
    paddingHorizontal: SIDE,
    paddingTop: 16,
  },
  sectionTitle: {
    marginBottom: 6,
    fontFamily: fonts.display,
    fontSize: 21,
    letterSpacing: -0.2,
    color: colors.black,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  cardWithTitle: {
    paddingTop: 18,
    paddingBottom: 8,
  },
  cardFlat: {
    paddingHorizontal: 0,
    borderWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: 8,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: TILE,
  },
  rowIconDanger: {
    backgroundColor: '#fdecef',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  rowLabelDanger: {
    color: colors.danger,
  },
  rowDetail: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  rowDetailAccent: {
    fontFamily: fonts.medium,
    color: colors.orangeDark,
  },
  lockedLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  lockedValue: {
    marginTop: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  rowValue: {
    flexShrink: 1,
    maxWidth: '60%',
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 40,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  profileTag: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomRightRadius: 10,
    backgroundColor: colors.black,
  },
  profileTagText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orange,
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: '#ffffff',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.black,
  },
  profileLine: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  statsInTitledCard: {
    flexDirection: 'row',
    marginHorizontal: -16,
    paddingVertical: 6,
  },
  stat: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: LINE,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.black,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
  },
  buttonPrimary: {
    backgroundColor: colors.black,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: LINE,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.black,
  },
  buttonTextPrimary: {
    color: '#ffffff',
  },
})
