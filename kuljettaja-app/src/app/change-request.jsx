import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CircleCheck, FileText, Info } from 'lucide-react-native'
import { Button, Card, ListRow, Screen } from '../components/ui'
import { vehicleIcon } from '../components/vehicleIcons'
import { useAuth } from '../lib/auth'
import { CHANGE_FIELDS, changeRequestErrorText, submitChangeRequest, useChangeRequests } from '../lib/changeRequests'
import { BILLING_METHODS, VEHICLES, billingMethodLabel, cityLabel, useCourier, vehicleLabel } from '../lib/courier'
import { colors, fonts } from '../theme'

// Muutospyyntö lukittuun tietoon: uusi arvo ja perustelu. delivo hyväksyy
// pyynnön Studiossa (migraatio 0051), yleensä 1–2 arkipäivässä.

const normalizeIban = (value) => value.replace(/\s+/g, '').toUpperCase()

// Uuden arvon tarkistus ennen lähetystä. Palauttaa virheen tai tyhjän.
function validate(field, value) {
  const trimmed = value.trim()
  if (!trimmed) return 'Anna uusi arvo.'
  if (field === 'name' && trimmed.length < 2) return 'Anna koko nimesi.'
  if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Tarkista sähköpostiosoite.'
  if (field === 'business_id' && !/^\d{7}-\d$/.test(trimmed)) return 'Y-tunnus muodossa 1234567-8.'
  if (field === 'iban' && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalizeIban(trimmed))) return 'Tarkista tilinumero (IBAN).'
  return ''
}

export default function ChangeRequestScreen() {
  const router = useRouter()
  const { field: fieldParam } = useLocalSearchParams()
  const field = CHANGE_FIELDS[fieldParam] ? fieldParam : 'name'
  const { courier } = useAuth()
  const { profile } = useCourier()
  const { pendingFor } = useChangeRequests()
  const pending = pendingFor(field)

  const current = {
    name: profile.name,
    email: profile.email,
    vehicle: profile.vehicle,
    city: profile.city,
    business_id: profile.businessId,
    billing_method: profile.billingMethod,
    iban: profile.iban,
  }[field]

  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const display = (key, raw) => {
    if (!raw) return '–'
    if (key === 'vehicle') return vehicleLabel(raw)
    if (key === 'city') return cityLabel(raw)
    if (key === 'billing_method') return billingMethodLabel(raw) ?? raw
    if (key === 'iban') return `•••• ${String(raw).slice(-4)}`
    return raw
  }

  const submit = async () => {
    const problem = validate(field, value)
    if (problem) return setError(problem)
    const newValue = field === 'iban' ? normalizeIban(value) : value.trim()
    if (current && String(newValue).toLowerCase() === String(current).toLowerCase()) {
      return setError('Uusi arvo on sama kuin nykyinen.')
    }
    setBusy(true)
    setError('')
    try {
      await submitChangeRequest(courier.id, field, newValue, reason.trim())
      setSent(true)
    } catch (err) {
      setError(changeRequestErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <Screen title="Muutospyyntö">
        <Card style={styles.done}>
          <CircleCheck size={40} strokeWidth={1.75} color={colors.open} />
          <Text style={styles.doneTitle}>Muutospyyntö lähetetty</Text>
          <Text style={styles.doneText}>delivo käsittelee sen yleensä 1–2 arkipäivässä. Näet tilan Profiilissa.</Text>
          <View style={styles.doneButton}>
            <Button title="Takaisin" onPress={() => router.back()} />
          </View>
        </Card>
      </Screen>
    )
  }

  // Muistutus dokumentista, joka pitää ladata ennen kuin pyynnön voi hyväksyä.
  let documentNote = null
  if (field === 'vehicle' && (value === 'car' || value === 'scooter')) {
    documentNote = 'Autolla ja skootterilla tarvitaan ajokortti. Lataa se Dokumentit-näkymään.'
  } else if (field === 'iban') {
    documentNote = 'Tilinumeron muutokseen tarvitaan pankkitodiste. Lataa se Dokumentit-näkymään.'
  } else if (field === 'billing_method' && value === 'own_company') {
    documentNote = 'Omalla yrityksellä laskuttaessa tarvitaan pankkitodiste. Lataa se Dokumentit-näkymään.'
  }

  const choices =
    field === 'vehicle'
      ? VEHICLES.map(({ key, label }) => ({ key, label, icon: vehicleIcon(key) }))
      : field === 'billing_method'
        ? BILLING_METHODS
        : null

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Muutospyyntö">
        <Card title={CHANGE_FIELDS[field].label}>
          <ListRow label="Nykyinen" value={display(field, current)} />
          {pending ? (
            <View style={styles.notice}>
              <Info size={18} strokeWidth={2} color={colors.orangeDark} />
              <Text style={styles.noticeText}>
                Avoin pyyntö odottaa hyväksyntää: {display(field, pending.new_value)}. Voit lähettää uuden, kun delivo on
                käsitellyt sen.
              </Text>
            </View>
          ) : null}
        </Card>

        {!pending ? (
          <>
            <Card title="Uusi arvo">
              {choices ? (
                choices.map((choice) => (
                  <ListRow
                    key={choice.key}
                    icon={choice.icon}
                    label={choice.label}
                    selected={value === choice.key}
                    onPress={() => {
                      setValue(choice.key)
                      setError('')
                    }}
                    role="radio"
                  />
                ))
              ) : (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={(next) => {
                    setValue(next)
                    setError('')
                  }}
                  autoCapitalize={field === 'name' || field === 'city' ? 'words' : field === 'iban' ? 'characters' : 'none'}
                  keyboardType={field === 'email' ? 'email-address' : 'default'}
                  placeholder={
                    { name: 'Etunimi Sukunimi', email: 'nimi@esimerkki.fi', city: 'Kaupunki', business_id: '1234567-8', iban: 'FI00 1234 5600 0007 85' }[
                      field
                    ]
                  }
                  placeholderTextColor={colors.gray400}
                  accessibilityLabel="Uusi arvo"
                />
              )}
            </Card>

            {documentNote ? (
              <Card>
                <ListRow icon={FileText} label="Dokumentit" detail={documentNote} onPress={() => router.push('/documents')} />
              </Card>
            ) : null}

            <Card title="Perustelu">
              <TextInput
                style={[styles.input, styles.reason]}
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder="Miksi tieto muuttuu?"
                placeholderTextColor={colors.gray400}
                accessibilityLabel="Perustelu"
              />
            </Card>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={busy ? 'Lähetetään…' : 'Lähetä muutospyyntö'} onPress={submit} disabled={busy || !value} />
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.orangeSoft,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
  },
  input: {
    minHeight: 52,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: colors.gray50,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
  reason: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
  },
  done: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  doneTitle: {
    marginTop: 4,
    fontFamily: fonts.display,
    fontSize: 21,
    color: colors.black,
  },
  doneText: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
})
