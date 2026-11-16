import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, ChevronRight, X } from 'lucide-react-native'
import { colors, fonts } from '../theme'

// Tilin ja asetusten rakennuspalat verkkosivun mukaan (SettingsLayout.jsx,
// SettingsRow.jsx, Settings.css): yläpalkki, ryhmät otsikkoineen, rivit
// ikoniruudulla, kytkin, ilmoitukset ja alhaalta nouseva muokkausikkuna.

// Yläpalkki: pyöreä takaisin-nappi, otsikko keskellä, ohut viiva alla.
export function SettingsTopBar({ title, onBack }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.navigate('/tili')))
  return (
    <View style={[styles.topbar, { paddingTop: insets.top }]}>
      <View style={styles.topbarRow}>
        <Pressable
          onPress={back}
          hitSlop={6}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel="Takaisin"
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

// Ryhmä: pieni harmaa otsikko (ja oikealla toiminto) ja reunustettu paneeli.
export function SettingsSection({ title, action, children }) {
  return (
    <View style={styles.section}>
      {title || action ? (
        <View style={styles.sectionHead}>
          {title ? <Text style={styles.sectionTitle}>{title}</Text> : <View />}
          {action}
        </View>
      ) : null}
      <View style={styles.panel}>{children}</View>
    </View>
  )
}

// Rivi: ikoni harmaassa ruudussa, teksti ja oikealla nuoli tai oma elementti.
//   value: pieni otsikko (label) ja sen alla arvo; ilman sitä label on rivin otsikko
//   hint: lisärivi(t) harmaalla, merkkijono tai taulukko
//   onPress: rivi on nappi ja saa nuolen; trailing: oma elementti nuolen tilalle
//   danger: punainen teksti (tilin poisto); first: ei erotinviivaa yläpuolelle
export function SettingsRow({ icon: Icon, label, value, hint, onPress, trailing, danger = false, first = false }) {
  const hints = (Array.isArray(hint) ? hint : [hint]).filter(Boolean)
  const body = (
    <>
      {Icon ? (
        <View style={styles.rowIcon}>
          <Icon size={18} strokeWidth={1.8} color={danger ? colors.danger : colors.black} />
        </View>
      ) : null}
      <View style={styles.rowText}>
        {value != null ? (
          <>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </>
        ) : (
          <Text style={[styles.rowTitle, danger && styles.rowDanger]}>{label}</Text>
        )}
        {hints.map((text) => (
          <Text key={text} style={styles.rowHint}>
            {text}
          </Text>
        ))}
      </View>
      {trailing ?? (onPress && !danger ? <ChevronRight size={18} strokeWidth={1.8} color={colors.gray400} /> : null)}
    </>
  )
  const style = [styles.row, !first && styles.rowDivided, Icon && !first && styles.rowDividedIcon]
  if (!onPress) return <View style={style}>{body}</View>
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  )
}

// Kytkin (Ilmoitukset): oranssi päällä, harmaa pois.
export function Toggle({ value, onChange, disabled, label }) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      style={[styles.toggle, value && styles.toggleOn, disabled && { opacity: 0.6 }]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      hitSlop={8}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
    </Pressable>
  )
}

// Onnistumis- tai virheilmoitus sivun yläosassa.
export function Notice({ kind = 'success', children }) {
  if (!children) return null
  return (
    <Text
      style={[styles.notice, kind === 'error' ? styles.noticeError : styles.noticeSuccess]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {children}
    </Text>
  )
}

// Alhaalta nouseva muokkausikkuna (verkkosivun ProfileEditSheet puhelimella).
export function EditSheet({ visible, title, onClose, children }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Sulje" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.sheetClose, pressed && styles.backPressed]}
              accessibilityRole="button"
              accessibilityLabel="Sulje"
            >
              <X size={18} strokeWidth={2} color={colors.black} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export const settingsStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingTop: 20 },
})

const styles = StyleSheet.create({
  topbar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: '#e2e5db' },
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
  topbarTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.headingBold, fontSize: 17, color: colors.black },

  section: { marginBottom: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  panel: { overflow: 'hidden', borderWidth: 1, borderColor: '#ececec', borderRadius: 16, backgroundColor: colors.surface },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
  rowDivided: { borderTopWidth: 1, borderTopColor: '#efefef' },
  rowDividedIcon: {},
  rowPressed: { backgroundColor: '#f2f2f1' },
  rowIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#f4f4f4',
  },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted },
  rowValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  rowTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  rowDanger: { color: colors.danger },
  rowHint: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.textMuted },

  toggle: {
    width: 46,
    height: 27,
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: '#e2e5db',
  },
  toggleOn: { backgroundColor: colors.orange },
  toggleThumb: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(20, 21, 15, 0.25)',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  notice: {
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    overflow: 'hidden',
    borderRadius: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  noticeSuccess: { backgroundColor: '#e8f6ec', color: '#237a3c' },
  noticeError: { backgroundColor: '#fdecef', color: '#c2334a' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(20, 21, 15, 0.45)' },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.surface,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontFamily: fonts.headingBold, fontSize: 20, color: colors.black },
  sheetClose: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#e2e4e8',
  },
})
