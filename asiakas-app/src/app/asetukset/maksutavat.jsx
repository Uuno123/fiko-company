import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CreditCard } from 'lucide-react-native'
import { Notice, SettingsRow, SettingsSection, SettingsTopBar, settingsStyles } from '../../components/SettingsUI'
import { Button, TextField, TextLink } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { colors, fonts } from '../../theme'

// Maksutavat kuten verkkosivulla (SettingsPayments.jsx).
// TILAPÄINEN esittelykäyttöön kuten verkkosivullakin: kortin "tallennus" ei ole
// oikea maksupalvelu. Puhelimeen jää vain kortin merkki, 4 viimeistä numeroa ja
// voimassaolo - ei koskaan koko numeroa eikä turvakoodia. Oikeassa
// toteutuksessa kortti tallennetaan Stripeen (SetupIntent).
const storageKey = (customerId) => `delivo-demo-cards-${customerId}`

function cardBrand(digits) {
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  return 'Kortti'
}

// Luhn-tarkiste: kirjoitusvirhe huomataan jo ennen tallennusta.
function passesLuhn(digits) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

const formatCardNumber = (value) =>
  value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

function validateCard({ number, expiry, cvc, name }) {
  const errors = {}
  const digits = number.replace(/\D/g, '')
  if (digits.length < 13 || !passesLuhn(digits)) errors.number = 'Tarkista kortin numero'
  const match = expiry.match(/^(\d{2})\/(\d{2})$/)
  const month = match ? Number(match[1]) : 0
  const year = match ? 2000 + Number(match[2]) : 0
  const now = new Date()
  const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)
  if (!match || month < 1 || month > 12 || expired) errors.expiry = 'Tarkista voimassaolo (KK/VV)'
  if (!/^\d{3,4}$/.test(cvc)) errors.cvc = '3-4 numeroa'
  if (name.trim().length < 2) errors.name = 'Anna kortinhaltijan nimi'
  return errors
}

const EMPTY_FORM = { number: '', expiry: '', cvc: '', name: '' }
const METHODS = [
  { id: 'apple-pay', label: 'Apple Pay', badge: 'Pay', dark: true },
  { id: 'google-pay', label: 'Google Pay', badge: 'G Pay' },
  { id: 'mobilepay', label: 'MobilePay', badge: 'MobilePay', color: '#5a78ff' },
  { id: 'klarna', label: 'Klarna', badge: 'Klarna', color: '#ffb3c7', ink: colors.black },
]

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets()
  const { customer } = useAuth()
  const [cards, setCards] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!customer?.id) return
    AsyncStorage.getItem(storageKey(customer.id))
      .then((raw) => setCards(raw ? JSON.parse(raw) : []))
      .catch(() => {})
  }, [customer?.id])

  function updateCards(next) {
    setCards(next)
    if (customer?.id) AsyncStorage.setItem(storageKey(customer.id), JSON.stringify(next)).catch(() => {})
  }

  function startAdding() {
    setForm({ ...EMPTY_FORM, name: customer?.name ?? '' })
    setErrors({})
    setSaved(false)
    setAdding(true)
  }

  function submit() {
    const nextErrors = validateCard(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    const digits = form.number.replace(/\D/g, '')
    updateCards([...cards, { id: `${Date.now()}`, brand: cardBrand(digits), last4: digits.slice(-4), expiry: form.expiry }])
    setForm(EMPTY_FORM)
    setAdding(false)
    setSaved(true)
  }

  return (
    <View style={settingsStyles.screen}>
      <SettingsTopBar title="Maksutavat" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[settingsStyles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {saved ? <Notice>Kortti lisätty.</Notice> : null}

        <SettingsSection
          title="Tallennetut kortit"
          action={!adding ? <TextLink title="+ Lisää kortti" onPress={startAdding} /> : null}
        >
          {cards.length === 0 && !adding ? (
            <SettingsRow first icon={CreditCard} label="Ei vielä tallennettuja maksukortteja" />
          ) : null}

          {cards.map((card, index) => (
            <View key={card.id} style={[styles.card, index > 0 && styles.divided]}>
              <View style={[styles.brand, card.brand === 'Visa' && styles.visa, card.brand === 'Mastercard' && styles.mc]}>
                <Text style={styles.brandText}>{card.brand === 'Mastercard' ? 'MC' : card.brand.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardNumber}>
                    {card.brand} •••• {card.last4}
                  </Text>
                  {index === 0 ? <Text style={styles.default}>Oletus</Text> : null}
                </View>
                <Text style={styles.cardExpiry}>Voimassa {card.expiry}</Text>
              </View>
              <Pressable
                onPress={() => {
                  setSaved(false)
                  updateCards(cards.filter((c) => c.id !== card.id))
                }}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.remove}>Poista</Text>
              </Pressable>
            </View>
          ))}

          {adding ? (
            <View style={[styles.form, cards.length > 0 && styles.divided]}>
              <TextField
                label="Kortin numero"
                keyboardType="number-pad"
                placeholder="1234 5678 9012 3456"
                value={form.number}
                onChangeText={(v) => setForm((f) => ({ ...f, number: formatCardNumber(v) }))}
                error={errors.number}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextField
                  style={{ flex: 1 }}
                  label="Voimassa"
                  keyboardType="number-pad"
                  placeholder="KK/VV"
                  value={form.expiry}
                  onChangeText={(v) => setForm((f) => ({ ...f, expiry: formatExpiry(v) }))}
                  error={errors.expiry}
                />
                <TextField
                  style={{ flex: 1 }}
                  label="Turvakoodi"
                  keyboardType="number-pad"
                  placeholder="CVC"
                  secureTextEntry
                  value={form.cvc}
                  onChangeText={(v) => setForm((f) => ({ ...f, cvc: v.replace(/\D/g, '').slice(0, 4) }))}
                  error={errors.cvc}
                />
              </View>
              <TextField
                label="Kortinhaltijan nimi"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                error={errors.name}
              />
              <Button title="Tallenna kortti" onPress={submit} />
              <TextLink title="Peruuta" onPress={() => setAdding(false)} style={{ alignSelf: 'center' }} />
            </View>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Muut maksutavat">
          {METHODS.map((method, index) => (
            <View key={method.id} style={[styles.card, index > 0 && styles.divided]}>
              <View
                style={[
                  styles.badge,
                  method.dark && styles.badgeDark,
                  method.color && { backgroundColor: method.color, borderColor: method.color },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    (method.dark || method.color) && { color: method.ink ?? '#ffffff' },
                  ]}
                  numberOfLines={1}
                >
                  {method.badge}
                </Text>
              </View>
              <Text style={[styles.cardNumber, { flex: 1 }]}>{method.label}</Text>
              <Text style={styles.coming}>Tulossa</Text>
            </View>
          ))}
        </SettingsSection>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  divided: { borderTopWidth: 1, borderTopColor: '#efefef' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
  brand: {
    width: 46,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.black,
  },
  visa: { backgroundColor: '#1a1f71' },
  mc: { backgroundColor: '#eb001b' },
  brandText: { fontFamily: fonts.bold, fontSize: 10.5, color: '#ffffff' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardNumber: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  default: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.gray100,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
  },
  cardExpiry: { marginTop: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  remove: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black, textDecorationLine: 'underline' },
  form: { gap: 14, padding: 16 },
  badge: {
    width: 58,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  badgeDark: { backgroundColor: colors.black, borderColor: colors.black },
  badgeText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.black },
  coming: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
})
