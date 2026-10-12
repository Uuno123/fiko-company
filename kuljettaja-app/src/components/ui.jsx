import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react-native'
import { colors, fonts } from '../theme'

// Yhteiset rakennuspalat valikon näkymille (ansiot, historia, asetukset...),
// jotta kaikki näyttävät samalta.

export function ScreenHeader({ title, subtitle }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Takaisin"
        hitSlop={8}
      >
        <ChevronLeft size={24} strokeWidth={2.2} color={colors.black} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

// Näkymän runko: yläpalkki ja vieritettävä sisältö harmaalla pohjalla.
export function Screen({ title, subtitle, children, scroll = true }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} subtitle={subtitle} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
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

export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>
}

// Rivi kortin sisällä: ikoni, otsikko (+ lisärivi), arvo oikealla ja nuoli jos
// rivi on painettava. right korvaa nuolen (esim. kytkin tai valintapallo).
export function ListRow({ icon: Icon, label, detail, value, onPress, right, last = false, danger = false }) {
  const content = (
    <>
      {Icon ? (
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Icon size={19} strokeWidth={1.9} color={danger ? colors.danger : colors.black} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right ?? (onPress ? <ChevronRight size={18} strokeWidth={2} color={colors.gray400} /> : null)}
    </>
  )
  const style = [styles.row, !last && styles.rowDivider]
  if (!onPress) return <View style={style}>{content}</View>
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && styles.rowPressed]} accessibilityRole="button">
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

export function DemoNotice({ children }) {
  return (
    <View style={styles.notice}>
      <Info size={16} strokeWidth={2} color={colors.textMuted} />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.gray50,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    boxShadow: '0 1px 4px rgba(20, 21, 15, 0.1)',
  },
  backButtonPressed: {
    transform: [{ scale: 0.94 }],
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.black,
  },
  headerSubtitle: {
    marginTop: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
    color: colors.textMuted,
  },
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  rowPressed: {
    backgroundColor: colors.gray50,
  },
  rowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
  rowIconDanger: {
    backgroundColor: '#fdecef',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  rowLabelDanger: {
    color: colors.danger,
  },
  rowDetail: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  rowValue: {
    maxWidth: '45%',
    fontFamily: fonts.medium,
    fontSize: 14,
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
    borderColor: colors.gray200,
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
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.gray100,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
})
