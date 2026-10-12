import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { Button, Card, ListRow, Screen, SectionTitle } from '../components/ui'
import { vehicleIcon } from '../components/vehicleIcons'
import { vehicleLabel, useCourier } from '../lib/courier'
import { formatEuro, formatKm, initials } from '../lib/format'
import { summarize, useGigs } from '../lib/gigs'
import { colors, fonts } from '../theme'

// Profiili: nimi, puhelin ja sähköposti tallentuvat puhelimeen (kirjautumista
// ei vielä ole). Kulkuneuvo vaihdetaan asetuksista.
export default function ProfileScreen() {
  const router = useRouter()
  const { profile, updateProfile, settings } = useCourier()
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const stats = summarize(useGigs())

  // Profiili voi latautua muistista vasta näkymän avauduttua.
  useEffect(() => setDraft(profile), [profile])

  useEffect(() => {
    if (!saved) return undefined
    const timer = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [saved])

  const changed = ['name', 'phone', 'email'].some((field) => draft[field].trim() !== profile[field])
  const valid = draft.name.trim().length > 0
  const save = () => {
    updateProfile({ name: draft.name.trim(), phone: draft.phone.trim(), email: draft.email.trim() })
    setSaved(true)
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Profiili">
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(draft.name || profile.name)}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.vehicle}>{vehicleLabel(settings.vehicle)}</Text>
        </View>

        <SectionTitle>Omat tiedot</SectionTitle>
        <Card style={styles.form}>
          <Field label="Nimi" value={draft.name} onChangeText={(name) => setDraft((d) => ({ ...d, name }))} autoComplete="name" />
          <Field
            label="Puhelinnumero"
            value={draft.phone}
            onChangeText={(phone) => setDraft((d) => ({ ...d, phone }))}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="+358 40 123 4567"
          />
          <Field
            label="Sähköposti"
            value={draft.email}
            onChangeText={(email) => setDraft((d) => ({ ...d, email }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="nimi@esimerkki.fi"
            last
          />
        </Card>
        <View style={styles.saveRow}>
          {saved ? (
            <View style={styles.savedNote}>
              <Check size={18} strokeWidth={2.4} color={colors.open} />
              <Text style={styles.savedText}>Tallennettu</Text>
            </View>
          ) : (
            <Button title="Tallenna" onPress={save} disabled={!changed || !valid} />
          )}
        </View>

        <SectionTitle>Kulkuneuvo</SectionTitle>
        <Card>
          <ListRow
            icon={vehicleIcon(settings.vehicle)}
            label={vehicleLabel(settings.vehicle)}
            detail="Vaihda asetuksista"
            onPress={() => router.push('/settings')}
            last
          />
        </Card>

        <SectionTitle>Viimeiset 4 viikkoa</SectionTitle>
        <View style={styles.stats}>
          <Stat label="Keikat" value={String(stats.count)} />
          <Stat label="Ansiot" value={formatEuro(stats.total)} />
          <Stat label="Matka" value={formatKm(stats.km)} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}

function Field({ label, last = false, ...inputProps }) {
  return (
    <View style={[styles.field, !last && styles.fieldDivider]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.gray400} {...inputProps} />
    </View>
  )
}

function Stat({ label, value }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.orangeSoft,
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.orange,
  },
  name: {
    marginTop: 12,
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.4,
    color: colors.black,
  },
  vehicle: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  form: {
    paddingHorizontal: 16,
  },
  field: {
    paddingVertical: 12,
  },
  fieldDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  input: {
    marginTop: 4,
    paddingVertical: 4,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  saveRow: {
    marginTop: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  savedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  savedText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.open,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.black,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
})
