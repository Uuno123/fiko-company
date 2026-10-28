import { Children, createContext, Fragment, isValidElement, useContext, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../lib/auth'
import { initials } from '../lib/format'
import { tr } from '../lib/i18n'
import { courierPhotoUrl } from '../lib/photo'
import { ArrowLeft, Check, ChevronRight, Lock } from 'lucide-react-native'
import { colors, fonts } from '../theme'

// Yhteiset rakennuspalat valikon näkymille (ansiot, historia, asetukset...)
// samassa ilmeessä kuin verkkosivun asetukset (frontend SettingsRow ja
// pages/Settings.css, "ryhmitellyt listat" 27.10.2026): valkoinen yläpalkki
// nuolella ja keskitetyllä otsikolla, ryhmän nimi pienellä harmaalla kortin
// yläpuolella, kortit ohuella reunuksella ja rivit, joissa ikoni harmaassa
// neliössä, ohut erotinviiva tekstin kohdalta ja painettaessa harmaa tausta.

const SIDE = 16
const LINE = '#ececec'
const TILE = '#f4f4f4'
const DIVIDER = '#efefef'
const CHEVRON = '#a3a69e'
const PRESSED = '#f2f2f1'
const DANGER = '#b42318'
// Rivin ikonineliö ja väli tekstiin: erotinviiva alkaa tekstin kohdalta.
const ICON_TILE = 36
const ROW_GAP = 14
export const PAGE_BACKGROUND = colors.surface

// Kortin vaakasisennys riveille: rivit ulottuvat kortin reunasta reunaan, jotta
// painalluksen harmaa tausta täyttää koko rivin (kuten verkkosivun .srow).
const CardInset = createContext(0)

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
        accessibilityLabel={tr('common.back')}
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
// footer: alareunaan kiinnitetty osa (esim. lähetysnappi), sisältö vierii sen yläpuolella.
export function Screen({ title, children, scroll = true, footer }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: footer ? 24 : insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
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

const isRow = (child) => isValidElement(child) && (child.type === ListRow || child.type === LockedRow)

// Valkoinen kortti ohuella reunuksella. title: ryhmän nimi kortin yläpuolelle.
// Peräkkäisten rivien väliin tulee ohut viiva, ikonillisilla riveillä tekstin
// kohdalta. flat: ilman reunusta, sisennystä ja viivoja (esim. alhaalta
// nousevan valikon sisällä).
export function Card({ title, children, style, flat = false }) {
  const items = Children.toArray(children)
  const onlyRows = items.length > 0 && items.every(isRow)
  const card = (
    <View style={[styles.card, onlyRows && styles.cardRows, flat && styles.cardFlat, style]}>
      <CardInset.Provider value={flat ? 0 : SIDE}>
        {items.map((child, index) => {
          const previous = items[index - 1]
          if (flat || !isRow(child) || !isRow(previous)) return child
          const inset = child.props.icon && previous.props.icon
          return (
            <Fragment key={child.key}>
              <View style={[styles.divider, inset && styles.dividerInset]} />
              {child}
            </Fragment>
          )
        })}
      </CardInset.Provider>
    </View>
  )
  return title ? <Group title={title}>{card}</Group> : card
}

// Ryhmä: nimi pienellä harmaalla sisällön yläpuolella (verkkosivun
// .settings-section). Card käyttää tätä, kun sillä on otsikko.
export function Group({ title, children }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  )
}

// Rivin painalluksen tausta kortin reunasta reunaan.
function useRowStyle() {
  const inset = useContext(CardInset)
  return inset ? [styles.row, { marginHorizontal: -inset, paddingHorizontal: inset }] : [styles.row]
}

// Rivi: ikoni vaaleanharmaassa neliössä, teksti (+ lisärivi), arvo oikealla ja
// nuoli jos rivi on painettava. right korvaa nuolen (esim. kytkin).
// selected: valintarivi, valittu näkyy oranssina ruksina. detailAccent: lisärivi
// oranssina (esim. "Pyydä muutosta").
export function ListRow({ icon: Icon, label, detail, detailAccent = false, value, onPress, right, selected, danger = false, role }) {
  const rowStyle = useRowStyle()
  const choice = selected !== undefined
  let end = right
  if (choice) end = selected ? <Check size={20} strokeWidth={2.4} color={colors.orange} /> : null
  else if (end === undefined && onPress && !danger) end = <ChevronRight size={18} strokeWidth={1.8} color={CHEVRON} />
  const content = (
    <>
      {Icon ? (
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Icon size={18} strokeWidth={1.8} color={danger ? DANGER : colors.black} />
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
  if (!onPress) return <View style={rowStyle}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...rowStyle, pressed && styles.rowPressed]}
      accessibilityRole={role ?? 'button'}
      aria-checked={choice ? selected : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      {content}
    </Pressable>
  )
}

// Tila pienenä pillerinä: pending (tarkastuksessa), success (hyväksytty),
// danger (hylätty / puuttuu), neutral.
const PILL_TONES = {
  pending: { background: colors.orangeSoft, color: colors.orangeDark },
  success: { background: '#e8f6ee', color: '#1a8a4a' },
  danger: { background: '#fdecef', color: '#c2334a' },
  neutral: { background: colors.gray100, color: colors.textMuted },
}

export function StatusPill({ tone = 'neutral', icon: Icon, children }) {
  const { background, color } = PILL_TONES[tone] ?? PILL_TONES.neutral
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {Icon ? <Icon size={12} strokeWidth={2.6} color={color} /> : null}
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}

// Tarkistettu tieto: nimi pienellä (lukon kuvake perässä, jos tieto muutetaan
// muutospyynnöllä), arvo sen alla ja tarvittaessa lisärivi (pyydetty arvo,
// hylkäyksen syy). Oikealla tila pillerinä vain kun pyyntö on kesken tai
// hylätty, ja nuoli jos rivi on painettava. locked=false: kuljettaja muuttaa
// tiedon itse (puhelinnumero).
export function LockedRow({ icon: Icon, label, value, status, statusText, detail, onPress, locked = true }) {
  const rowStyle = useRowStyle()
  const content = (
    <>
      {Icon ? (
        <View style={styles.rowIcon}>
          <Icon size={18} strokeWidth={1.8} color={colors.black} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <View style={styles.lockedLabelRow}>
          <Text style={styles.lockedLabel}>{label}</Text>
          {locked ? <Lock size={11} strokeWidth={2.2} color={colors.textMuted} /> : null}
        </View>
        <Text style={styles.lockedValue} numberOfLines={1}>
          {value || '–'}
        </Text>
        {detail ? (
          <Text style={[styles.rowDetail, status === 'rejected' && styles.rowDetailDanger]} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      {statusText ? <StatusPill tone={status === 'rejected' ? 'danger' : 'pending'}>{statusText}</StatusPill> : null}
      {onPress ? <ChevronRight size={18} strokeWidth={1.8} color={CHEVRON} /> : null}
    </>
  )
  const a11y = [`${label}: ${value || '–'}`, statusText, detail].filter(Boolean).join('. ')
  if (!onPress) return <View style={rowStyle}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...rowStyle, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      {content}
    </Pressable>
  )
}

// Kuljettajan profiilikuva (courier-photos) tai oranssi nimikirjainpallo, jos
// kuvaa ei ole tai se ei lataudu. Käytössä kaikkialla, missä kuljettajan
// profiilimerkki näkyy (asetusten profiilikortti, sivuvalikko).
export function CourierAvatar({ name, size = 48 }) {
  const { courier } = useAuth()
  const uri = courierPhotoUrl(courier?.photo_path)
  const [failedUri, setFailedUri] = useState(null)
  const frame = { width: size, height: size, borderRadius: size / 2 }
  return (
    <View style={[styles.avatar, frame]}>
      {uri && uri !== failedUri ? (
        <Image source={{ uri }} style={frame} onError={() => setFailedUri(uri)} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.36) }]}>{initials(name || tr('common.courier'))}</Text>
      )}
    </View>
  )
}

// Profiilikortti kuten verkkosivun tilisivulla: profiilikuva, nimi ja
// yhteystiedot, nuoli.
export function ProfileCard({ name, lines = [], onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.profileCard, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <CourierAvatar name={name} size={60} />
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
      <ChevronRight size={20} strokeWidth={1.8} color={CHEVRON} />
    </Pressable>
  )
}

// Tunnusluvut yhtenä rivinä ohuin pystyviivoin. items: [{ label, value }],
// title: kortin otsikko lukujen yläpuolelle. onPress: koko kortti avaa
// näkymän (otsikon vieressä nuoli), esim. Profiilin luvut -> Ansiot.
export function StatRow({ items, style, title, onPress }) {
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
  const content = title ? (
    <>
      <View style={styles.statHeader}>
        <SectionTitle>{title}</SectionTitle>
        {onPress ? <ChevronRight size={20} strokeWidth={1.8} color={CHEVRON} /> : null}
      </View>
      <View style={styles.statsInTitledCard}>{stats}</View>
    </>
  ) : (
    stats
  )
  const cardStyle = [styles.card, title ? styles.cardWithTitle : styles.stats, style]
  if (!onPress) return <View style={cardStyle}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [...cardStyle, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  )
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
  footer: {
    paddingTop: 12,
    paddingHorizontal: SIDE,
    borderTopWidth: 1,
    borderTopColor: LINE,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    marginBottom: 6,
    fontFamily: fonts.display,
    fontSize: 21,
    letterSpacing: -0.2,
    color: colors.black,
  },
  // Ryhmä: nimi pienellä harmaalla kortin yläpuolella (verkkosivun
  // .settings-section__head). marginTop + näkymän väli = 22 px ryhmien välissä.
  group: {
    gap: 8,
    marginTop: 8,
  },
  groupTitle: {
    paddingHorizontal: 4,
    fontFamily: fonts.bold,
    fontSize: 12.5,
    letterSpacing: 0.75,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  card: {
    overflow: 'hidden',
    paddingHorizontal: SIDE,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  cardRows: {
    paddingVertical: 0,
  },
  cardWithTitle: {
    paddingTop: 18,
    paddingBottom: 8,
  },
  cardFlat: {
    paddingHorizontal: 0,
    borderWidth: 0,
  },
  divider: {
    height: 1,
    marginRight: -SIDE,
    backgroundColor: DIVIDER,
  },
  dividerInset: {
    marginLeft: ICON_TILE + ROW_GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: 60,
    paddingVertical: 10,
  },
  rowPressed: {
    backgroundColor: PRESSED,
  },
  rowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ICON_TILE,
    height: ICON_TILE,
    borderRadius: 10,
    backgroundColor: TILE,
  },
  rowIconDanger: {
    backgroundColor: '#fdecec',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15.5,
    color: colors.black,
  },
  rowLabelDanger: {
    color: DANGER,
  },
  rowDetail: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: colors.textMuted,
  },
  rowDetailAccent: {
    fontFamily: fonts.medium,
    color: colors.orangeDark,
  },
  rowDetailDanger: {
    color: '#c2334a',
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  lockedValue: {
    marginTop: 1,
    fontFamily: fonts.semibold,
    fontSize: 15.5,
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
    gap: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.orange,
  },
  avatarText: {
    fontFamily: fonts.display,
    letterSpacing: -0.4,
    color: '#ffffff',
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontFamily: fonts.display,
    fontSize: 19,
    letterSpacing: -0.2,
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
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
