import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { BriefcaseBusiness, Building2, Hotel, House, MapPin } from 'lucide-react-native'
import { TextField } from './ui'
import {
  ADDRESS_TYPES,
  COURIER_INSTRUCTIONS_MAX,
  requiresApartment,
} from '../../../frontend/src/lib/customerAddress'
import { colors, fonts } from '../theme'

// Osoitteen lisätiedot kuten verkkosivun DeliveryAddressForm: asunnon tyyppi,
// tyypin mukaiset kentät ja ohjeet kuljettajalle. Käytössä asetusten
// osoitesivulla (app/asetukset/osoite.jsx) ja headerin osoitepaneelissa
// uutta osoitetta lisättäessä (components/AddressSheet.jsx).
const TYPE_ICONS = { apartment: Building2, terraced: Hotel, house: House, office: BriefcaseBusiness, other: MapPin }

export const DETAIL_FIELDS = {
  apartment: ['staircase', 'floor', 'apartment', 'doorCode'],
  terraced: ['staircase', 'apartment'],
  house: [],
  office: ['company', 'floor'],
  other: [],
}

const INSTRUCTION_PLACEHOLDERS = {
  apartment: 'Esim. hissi rapun perällä, soita ovisummeria',
  terraced: 'Esim. ovi pihan puolella',
  house: 'Esim. punainen talo, ulko-ovi talon päädyssä',
  office: 'Esim. vastaanotto ensimmäisessä kerroksessa',
  other: 'Kerro, miten kuljettaja löytää perille',
}

export const EMPTY_DETAILS = { staircase: '', floor: '', apartment: '', doorCode: '', company: '' }

const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })

// Tarkistus: tyyppi pakollinen, asunnon numero kerros- ja rivitalossa.
export function validateAddressDetails(type, details) {
  const errors = {}
  if (!type) errors.type = 'Valitse asunnon tyyppi.'
  if (requiresApartment(type) && !String(details.apartment ?? '').trim()) errors.apartment = 'Lisää asunnon numero.'
  return errors
}

// Vain tyypin kentät, tyhjät pois.
export function cleanAddressDetails(type, details) {
  return Object.fromEntries(
    (DETAIL_FIELDS[type] ?? []).map((key) => [key, String(details[key] ?? '').trim()]).filter(([, value]) => value),
  )
}

export default function AddressDetailsForm({ type, onTypeChange, details, onDetailsChange, instructions, onInstructionsChange, errors = {} }) {
  const fields = DETAIL_FIELDS[type] ?? []
  const setDetail = (key, digitsOnly = false) => (value) =>
    onDetailsChange({ ...details, [key]: digitsOnly ? value.replace(/\D/g, '') : value })

  return (
    <View style={{ gap: 22 }}>
      <View>
        <Text style={styles.label}>Asunnon tyyppi</Text>
        <View style={styles.typeGrid}>
          {ADDRESS_TYPES.map(({ value, label }) => {
            const Icon = TYPE_ICONS[value]
            const selected = type === value
            return (
              <Pressable
                key={value}
                onPress={() => onTypeChange(value)}
                style={[styles.type, selected && styles.typeSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Icon size={18} strokeWidth={2} color={selected ? colors.orange : colors.black} />
                <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
        {errors.type ? <Text style={styles.error}>{errors.type}</Text> : null}
      </View>

      {fields.length > 0 ? (
        <View style={styles.details}>
          {fields.includes('company') ? (
            <TextField
              style={styles.wide}
              label="Yrityksen nimi"
              maxLength={60}
              value={details.company}
              onChangeText={setDetail('company')}
            />
          ) : null}
          {fields.includes('staircase') ? (
            <TextField
              style={styles.half}
              label={type === 'terraced' ? 'Talo tai porras' : 'Porras'}
              placeholder="Esim. A"
              maxLength={5}
              value={details.staircase}
              onChangeText={setDetail('staircase')}
            />
          ) : null}
          {fields.includes('floor') ? (
            <TextField
              style={styles.half}
              label="Kerros"
              placeholder="Esim. 3"
              keyboardType="number-pad"
              maxLength={2}
              value={details.floor}
              onChangeText={setDetail('floor', true)}
            />
          ) : null}
          {fields.includes('apartment') ? (
            <TextField
              style={styles.half}
              label="Asunnon numero"
              placeholder="Esim. 12"
              maxLength={10}
              value={details.apartment}
              onChangeText={setDetail('apartment')}
              error={errors.apartment}
            />
          ) : null}
          {fields.includes('doorCode') ? (
            <TextField
              style={styles.half}
              label="Ovikoodi"
              placeholder="Jos on"
              maxLength={12}
              value={details.doorCode}
              onChangeText={setDetail('doorCode')}
            />
          ) : null}
        </View>
      ) : null}

      <View>
        <Text style={styles.label}>Ohjeet kuljettajalle</Text>
        <TextInput
          value={instructions}
          onChangeText={onInstructionsChange}
          multiline
          maxLength={COURIER_INSTRUCTIONS_MAX}
          placeholder={INSTRUCTION_PLACEHOLDERS[type] ?? INSTRUCTION_PLACEHOLDERS.other}
          placeholderTextColor={colors.gray400}
          style={[styles.instructions, webOutline]}
          accessibilityLabel="Ohjeet kuljettajalle"
        />
        <Text style={styles.hint}>
          Vapaaehtoinen · {instructions.length}/{COURIER_INSTRUCTIONS_MAX}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  label: { marginBottom: 8, fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  error: { marginTop: 6, fontFamily: fonts.medium, fontSize: 13, color: '#c2334a' },
  hint: { marginTop: 6, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
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
