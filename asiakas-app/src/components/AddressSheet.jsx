import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Check, House, MapPin, Pencil, Plus, Search, X } from 'lucide-react-native'
import { ADDRESS_SEARCH_DEBOUNCE_MS, searchAddresses } from '../lib/addressSearch'
import AddressDetailsForm, { EMPTY_DETAILS, cleanAddressDetails, validateAddressDetails } from './AddressDetailsForm'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
// Lyhyet ease-out-animaatiot jousen sijaan: jousi asettui ~0,6 s ja tuntui viiveeltä.
const EASE_OUT = Easing.out(Easing.cubic)
const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })

// Headerin osoitteesta aukeava alapaneeli (käyttäjän pyyntö 16.11.2026),
// Woltin mallin mukaan kuten verkkosivun LocationModal:
//   list   - tallennetut osoitteet (valittu merkitty) ja "Lisää uusi osoite"
//   search - uuden osoitteen haku
//   details - valitun osoitteen tiedot (tyyppi, porras, ovikoodi, ohjeet);
//             paneeli liukuu uudelleen alhaalta (käyttäjän pyyntö 16.11.2026)
// Liukuu alhaalta ylös ja suljetaan pyyhkäisemällä alas tai taustasta.
export default function AddressSheet({
  visible,
  onClose,
  addresses,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onEditHome,
}) {
  const insets = useSafeAreaInsets()
  const screenHeight = Dimensions.get('window').height
  const slide = useRef(new Animated.Value(screenHeight)).current
  const fade = useRef(new Animated.Value(0)).current
  const [mounted, setMounted] = useState(visible)
  const [view, setView] = useState('list')
  const [picked, setPicked] = useState(null)
  // Muokattava tallennettu osoite (kynä listassa): sama lisätietopaneeli
  // täytettynä, ja vain siellä voi poistaa osoitteen (16.11.2026).
  const [editing, setEditing] = useState(false)
  const viewRef = useRef(view)
  viewRef.current = view

  // Näppäimistön korkeus: paneelin alareuna nousee näppäimistön yläpuolelle.
  // (KeyboardAvoidingView ei toiminut Modalissa puhelimessa - osoite jäi
  // näppäimistön alle.)
  const [keyboard, setKeyboard] = useState(0)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, (e) => setKeyboard(e.endCoordinates?.height ?? 0))
    const hide = Keyboard.addListener(hideEvent, () => setKeyboard(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  function openDetails(address, edit = false) {
    setPicked(address)
    setEditing(edit)
    setView('details')
    // Lisätietopaneeli tulee alhaalta kuin uusi paneeli.
    slide.setValue(320)
    Animated.timing(slide, { toValue: 0, duration: 200, easing: EASE_OUT, useNativeDriver }).start()
  }

  useEffect(() => {
    if (visible) {
      setMounted(true)
      setView('list')
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, { toValue: screenHeight, duration: 160, useNativeDriver }),
        Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: false }),
      ]).start(() => setMounted(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Sisääntulo vasta kun Modal on piirretty: puhelimessa ennen piirtoa
  // aloitettu animaatio jätti taustan tummennuksen näkymättömäksi.
  // Tummennus JS-ajurilla, jotta läpinäkyvyys päivittyy varmasti.
  useEffect(() => {
    if (!mounted || !visible) return
    slide.setValue(screenHeight)
    fade.setValue(0)
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 220, easing: EASE_OUT, useNativeDriver }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, visible])

  // Pyyhkäisy alas mistä kohtaa paneelia tahansa sulkee (kaappaus, jotta
  // napit ja lista eivät vie eleitä).
  const pan = useRef(
    PanResponder.create({
      // Kosketus otsikkoon tai tyhjään kohtaan: paneeli ottaa sen itse
      // (napit ja rivit ehtivät ensin, joten painallukset toimivat yhä).
      onStartShouldSetPanResponder: () => true,
      // Lisätiedoissa lomake vierii, joten siellä paneelia vedetään vain yläosasta.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        viewRef.current !== 'details' && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => slide.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.8) closeRef.current()
        else Animated.timing(slide, { toValue: 0, duration: 160, easing: EASE_OUT, useNativeDriver }).start()
      },
    }),
  ).current
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Sulje" />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.anchor}>
        <Animated.View
          {...pan.panHandlers}
          style={[
            styles.sheet,
            // Haussa ja lisätiedoissa koko korkeus, jotta kenttä ja tulokset
            // ovat ylhäällä näkyvissä näppäimistön kanssa.
            view === 'list'
              ? { maxHeight: screenHeight - insets.top - 40 }
              : { height: screenHeight - insets.top - 24 },
            {
              paddingBottom: keyboard > 0 ? keyboard + 12 : insets.bottom + 16,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View>
            <View style={styles.handle} />
            <View style={styles.head}>
              {view !== 'list' ? (
                <IconButton label="Takaisin" onPress={() => setView(view === 'details' && !editing ? 'search' : 'list')}>
                  <ArrowLeft size={19} strokeWidth={2.2} color={colors.black} />
                </IconButton>
              ) : null}
              <Text style={styles.title}>{view === 'details' && editing ? 'Muokkaa osoitetta' : TITLES[view]}</Text>
              <IconButton label="Sulje" onPress={onClose}>
                <X size={18} strokeWidth={2.2} color={colors.black} />
              </IconButton>
            </View>
          </View>

          {view === 'list' ? (
            <View>
              {/* Tavallinen View eikä ScrollView: puhelimessa vieritys vei alaspäin pyyhkäisyn. */}
              {addresses.map((address) => {
                const active = address.id === selectedId
                const Icon = address.home ? House : MapPin
                return (
                  <Pressable
                    key={address.id}
                    onPress={() => onSelect(address.id)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${address.label}, ${address.full}`}
                  >
                    <View style={[styles.pin, active && styles.pinActive]}>
                      <Icon size={18} strokeWidth={2.2} color={active ? '#ffffff' : colors.black} />
                    </View>
                    <View style={styles.rowText}>
                      <View style={styles.rowTitleLine}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {address.label}
                        </Text>
                        {active ? <Check size={15} strokeWidth={2.8} color={colors.orange} /> : null}
                      </View>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {address.full}
                      </Text>
                    </View>
                    {address.home ? (
                      onEditHome ? (
                        <IconButton label="Muokkaa kotiosoitetta" onPress={onEditHome} small>
                          <Pencil size={15} strokeWidth={2.2} color={colors.textMuted} />
                        </IconButton>
                      ) : null
                    ) : (
                      <IconButton label="Muokkaa osoitetta" onPress={() => openDetails(address, true)} small>
                        <Pencil size={15} strokeWidth={2.2} color={colors.textMuted} />
                      </IconButton>
                    )}
                  </Pressable>
                )
              })}

              <Pressable
                onPress={() => setView('search')}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                accessibilityRole="button"
              >
                <View style={styles.pin}>
                  <Plus size={19} strokeWidth={2.2} color={colors.black} />
                </View>
                <Text style={styles.action}>Lisää uusi osoite</Text>
              </Pressable>
            </View>
          ) : view === 'search' ? (
            <AddressSearch onPick={openDetails} />
          ) : (
            <AddressDetails
              key={`${editing ? 'edit' : 'new'}-${picked?.id ?? picked?.full}`}
              address={picked}
              editing={editing}
              onSave={(saved) => {
                if (editing) {
                  onUpdate(picked.id, saved)
                  setView('list')
                } else onAdd(saved)
              }}
              onDelete={() => {
                onRemove(picked.id)
                setView('list')
              }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

const TITLES = { list: 'Minne ruoka tuodaan?', search: 'Lisää osoite', details: 'Osoitteen tiedot' }

// Valitun osoitteen lisätiedot ja tallennus.
function AddressDetails({ address, editing, onSave, onDelete }) {
  const [type, setType] = useState(address?.type ?? '')
  const [details, setDetails] = useState(() => ({ ...EMPTY_DETAILS, ...(address?.details ?? {}) }))
  const [instructions, setInstructions] = useState(address?.instructions ?? '')
  const [errors, setErrors] = useState({})

  function save() {
    const nextErrors = validateAddressDetails(type, details)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSave({ ...address, type, details: cleanAddressDetails(type, details), instructions: instructions.trim() })
  }

  return (
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
      <View style={styles.pickedCard}>
        <View style={[styles.pin, styles.pinActive]}>
          <MapPin size={18} strokeWidth={2.2} color="#ffffff" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {address?.label}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {address?.full}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 18 }}>
        <AddressDetailsForm
          type={type}
          onTypeChange={(value) => {
            setType(value)
            setErrors({})
          }}
          details={details}
          onDetailsChange={(next) => {
            setDetails(next)
            setErrors((current) => ({ ...current, apartment: undefined }))
          }}
          instructions={instructions}
          onInstructionsChange={setInstructions}
          errors={errors}
        />
      </View>

      <View style={{ marginTop: 22 }}>
        {/* Pieni musta nappi iso oranssin sijaan (käyttäjän pyyntö 16.11.2026). */}
        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.save, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>{editing ? 'Tallenna muutokset' : 'Tallenna osoite'}</Text>
        </Pressable>
      </View>

      {editing ? (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={({ pressed }) => [styles.delete, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          <Text style={styles.deleteText}>Poista osoite</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  )
}

function IconButton({ label, onPress, small = false, children }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [small ? styles.iconSmall : styles.icon, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </Pressable>
  )
}

// Uuden osoitteen haku (Nominatim, viive kuten asetuksissa).
function AddressSearch({ onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = query.trim()
    if (term.length < 3) {
      Promise.resolve().then(() => {
        setResults([])
        setSearching(false)
      })
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(() => {
      setSearching(true)
      setError('')
      searchAddresses(term)
        .then((found) => !cancelled && setResults(found))
        .catch((e) => !cancelled && setError(e.message || 'Osoitehaku ei juuri nyt vastaa.'))
        .finally(() => !cancelled && setSearching(false))
    }, ADDRESS_SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  return (
    <View style={{ flexShrink: 1 }}>
      <View style={styles.field}>
        <Search size={18} strokeWidth={2.2} color={colors.black} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Hae katuosoitetta"
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, webOutline]}
          accessibilityLabel="Hae katuosoitetta"
        />
        {searching ? <ActivityIndicator size="small" color={colors.orange} /> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ marginTop: 6 }}>
        {results.map((result) => (
          <Pressable
            key={result.id}
            onPress={() => onPick(result)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
          >
            <View style={styles.pin}>
              <MapPin size={17} strokeWidth={2} color={colors.black} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {result.label}
              </Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {result.full}
              </Text>
            </View>
          </Pressable>
        ))}
        {query.trim().length >= 3 && !searching && !error && results.length === 0 ? (
          <Text style={styles.empty}>Osoitetta ei löytynyt. Tarkista katu ja numero.</Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // RN 0.88:ssa ei ole StyleSheet.absoluteFillObject -> tausta oli puhelimessa 0x0.
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    paddingHorizontal: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.surface,
  },
  handle: { alignSelf: 'center', width: 38, height: 4, marginTop: 8, borderRadius: 2, backgroundColor: '#d9d9d6' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, paddingBottom: 10 },
  title: { flex: 1, fontFamily: fonts.headingBold, fontSize: 21, letterSpacing: -0.3, color: colors.black },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
  iconSmall: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderRadius: 12 },
  rowPressed: { opacity: 0.6 },
  pin: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.gray100,
  },
  pinActive: { backgroundColor: colors.orange },
  rowText: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowTitle: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  rowSub: { marginTop: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  save: {
    alignSelf: 'center',
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: 21,
    backgroundColor: colors.black,
  },
  saveText: { fontFamily: fonts.semibold, fontSize: 14.5, color: '#ffffff' },
  delete: { alignSelf: 'center', marginTop: 14, paddingVertical: 6 },
  deleteText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' },
  pickedCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.gray100,
  },
  action: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: colors.gray100,
  },
  input: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  error: { marginTop: 10, fontFamily: fonts.medium, fontSize: 13, color: colors.offerRed },
  empty: { marginTop: 14, textAlign: 'center', fontFamily: fonts.regular, fontSize: 13.5, color: colors.textMuted },
})
