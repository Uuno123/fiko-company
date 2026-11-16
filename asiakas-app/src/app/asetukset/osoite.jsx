import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MapPin, Search } from 'lucide-react-native'
import { SettingsTopBar, settingsStyles } from '../../components/SettingsUI'
import { Button, ErrorBanner } from '../../components/ui'
import AddressDetailsForm, {
  EMPTY_DETAILS,
  cleanAddressDetails,
  validateAddressDetails,
} from '../../components/AddressDetailsForm'
import { formatDisplayAddress } from '../../../../frontend/src/lib/format'
import { ADDRESS_SEARCH_DEBOUNCE_MS, searchAddresses } from '../../lib/addressSearch'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { colors, fonts } from '../../theme'

// Toimitusosoitteen muokkaus kuten verkkosivun DeliveryAddressForm: asunnon
// tyyppi, osoite, tyypin mukaiset lisätiedot ja ohjeet kuljettajalle.
// Tallennus customers-riville samoihin kenttiin (migraatio 0066).
// Erona verkkosivuun osoite valitaan haulla eikä kartalta (sovelluksessa ei
// ole karttaa) - haku antaa koordinaatit kuten kartta.
const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })

export default function AddressScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { customer, refreshCustomer } = useAuth()

  const [type, setType] = useState(customer?.address_type || '')
  const [place, setPlace] = useState(() =>
    customer?.address && customer.address_lat != null && customer.address_lng != null
      ? { address: customer.address, lat: customer.address_lat, lng: customer.address_lng }
      : null,
  )
  const [details, setDetails] = useState(() => ({ ...EMPTY_DETAILS, ...(customer?.address_details ?? {}) }))
  const [instructions, setInstructions] = useState(customer?.courier_instructions || '')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Osoitehaku
  const [searching, setSearching] = useState(!place)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchState, setSearchState] = useState('idle')
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    const term = query.trim()
    if (term.length < 3) return undefined
    timer.current = setTimeout(() => {
      setSearchState('loading')
      searchAddresses(term)
        .then((list) => {
          setResults(list)
          setSearchState(list.length ? 'ready' : 'empty')
        })
        .catch(() => setSearchState('error'))
    }, ADDRESS_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer.current)
  }, [query])

  function choosePlace(result) {
    setPlace({ address: result.full, lat: result.lat, lng: result.lng })
    setErrors((current) => ({ ...current, place: undefined }))
    setSearching(false)
    setQuery('')
    setResults([])
    setSearchState('idle')
  }

  async function save() {
    setSaveError('')
    const nextErrors = validateAddressDetails(type, details)
    if (!place) nextErrors.place = 'Hae ja valitse osoite.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !customer) return

    setSaving(true)
    const addressDetails = cleanAddressDetails(type, details)
    const { error } = await supabase
      .from('customers')
      .update({
        address: place.address,
        address_lat: place.lat,
        address_lng: place.lng,
        address_type: type,
        address_details: addressDetails,
        courier_instructions: instructions.trim() || null,
      })
      .eq('id', customer.id)
    if (error) {
      setSaveError('Osoitteen tallennus epäonnistui. Yritä uudelleen.')
      setSaving(false)
      return
    }
    await refreshCustomer()
    setSaving(false)
    if (router.canGoBack()) router.back()
    else router.replace('/asetukset/tiedot')
  }

  return (
    <View style={settingsStyles.screen}>
      <SettingsTopBar title="Toimitusosoite" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[settingsStyles.content, { gap: 22, paddingBottom: insets.bottom + 32 }]}
      >
        <ErrorBanner message={saveError} />

        <View>
          <Text style={styles.label}>Osoite</Text>
          {searching ? (
            <View>
              <View style={styles.search}>
                <Search size={18} strokeWidth={2.2} color={colors.black} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Hae katuosoitetta, esim. Puijonkatu 18"
                  placeholderTextColor={colors.gray400}
                  style={[styles.searchInput, webOutline]}
                  autoFocus={!place}
                  autoCorrect={false}
                  accessibilityLabel="Hae osoitetta"
                />
                {searchState === 'loading' ? <ActivityIndicator size="small" color={colors.black} /> : null}
              </View>
              {query.trim().length >= 3 && searchState === 'empty' ? (
                <Text style={styles.searchNote}>Osoitetta ei löytynyt. Tarkista kirjoitusasu.</Text>
              ) : null}
              {searchState === 'error' ? (
                <Text style={styles.searchNote}>Osoitehaku ei juuri nyt vastaa. Yritä hetken päästä.</Text>
              ) : null}
              {query.trim().length >= 3 && results.length > 0 ? (
                <View style={styles.results}>
                  {results.map((result, index) => (
                    <Pressable
                      key={result.id}
                      onPress={() => choosePlace(result)}
                      style={({ pressed }) => [styles.result, index > 0 && styles.resultDivided, pressed && styles.pressed]}
                      accessibilityRole="button"
                    >
                      <MapPin size={18} strokeWidth={2} color={colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultLabel}>{result.label}</Text>
                        <Text style={styles.resultFull} numberOfLines={1}>
                          {result.full}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {place ? (
                <Pressable onPress={() => setSearching(false)} hitSlop={8} style={{ marginTop: 10 }}>
                  <Text style={styles.link}>Peruuta</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Pressable
              onPress={() => setSearching(true)}
              style={({ pressed }) => [styles.place, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Vaihda osoite"
            >
              <MapPin size={20} strokeWidth={2} color={colors.black} />
              <Text style={styles.placeText}>{formatDisplayAddress(place.address)}</Text>
              <Text style={styles.link}>Vaihda</Text>
            </Pressable>
          )}
          {errors.place ? <Text style={styles.error}>{errors.place}</Text> : null}
        </View>

        <AddressDetailsForm
          type={type}
          onTypeChange={(value) => {
            setType(value)
            setErrors((current) => ({ ...current, type: undefined, apartment: undefined }))
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

        <Button title={saving ? 'Tallennetaan...' : 'Tallenna osoite'} onPress={save} loading={saving} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { backgroundColor: '#f2f2f1' },
  label: { marginBottom: 8, fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  error: { marginTop: 6, fontFamily: fonts.medium, fontSize: 13, color: '#c2334a' },
  hint: { marginTop: 6, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black, textDecorationLine: 'underline' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  typeSelected: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  typeText: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  typeTextSelected: { fontFamily: fonts.semibold },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 14,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  searchNote: { marginTop: 8, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  results: { marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ececec', borderRadius: 14 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  resultDivided: { borderTopWidth: 1, borderTopColor: '#efefef' },
  resultLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  resultFull: { marginTop: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 14,
  },
  placeText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  half: { flexBasis: '47%', flexGrow: 1 },
  wide: { flexBasis: '100%' },
  instructions: {
    minHeight: 90,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 14,
    textAlignVertical: 'top',
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.black,
  },
})
