import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Check, FileText, Landmark, Mail, MapPin, User } from 'lucide-react-native'
import { Button, Card, ListRow, LockedRow, Screen, StatRow } from '../components/ui'
import { vehicleIcon } from '../components/vehicleIcons'
import { useAuth } from '../lib/auth'
import { billingMethodLabel, cityLabel, useCourier } from '../lib/courier'
import { useChangeRequests } from '../lib/changeRequests'
import { formatEuro, formatKm } from '../lib/format'
import { summarize, useGigs } from '../lib/gigs'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

// Profiili. Nimi, sähköposti, kulkuneuvo ja kaupunki ovat lukittuja: rivi avaa
// muutospyynnön, jonka delivo hyväksyy (migraatio 0051). Puhelinnumeron
// kuljettaja vaihtaa itse, ja se tallentuu kuljettajatietoihin.
export default function ProfileScreen() {
  const router = useRouter()
  const t = useT()
  const { profile } = useCourier()
  const { pendingFor, rejectedFor } = useChangeRequests()
  const stats = summarize(useGigs())

  // Pyydetty uusi arvo luettavassa muodossa (kulkuneuvo ja kaupunki nimenä).
  const display = (field, value) => {
    if (field === 'vehicle') return t(`vehicle.${value}`)
    if (field === 'city') return cityLabel(value)
    if (field === 'billing_method') return billingMethodLabel(value) ?? value
    return value
  }

  const lockedRow = (field, Icon, label, value) => {
    const pending = pendingFor(field)
    const rejected = rejectedFor(field)
    let detail = t('profile.requestChange')
    if (pending) detail = t('profile.pending', { value: display(field, pending.new_value) })
    else if (rejected?.admin_note) detail = t('profile.rejected', { note: rejected.admin_note })
    return (
      <LockedRow
        icon={Icon}
        label={label}
        value={value}
        note={detail}
        noteAccent={!pending && !rejected?.admin_note}
        onPress={() => router.push({ pathname: '/change-request', params: { field } })}
      />
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={t('profile.title')}>
        <Card title={t('profile.details')}>
          {lockedRow('name', User, t('profile.name'), profile.name)}
          {lockedRow('email', Mail, t('profile.email'), profile.email)}
          {lockedRow('vehicle', vehicleIcon(profile.vehicle), t('profile.vehicle'), t(`vehicle.${profile.vehicle}`))}
          {lockedRow('city', MapPin, t('profile.city'), cityLabel(profile.city))}
        </Card>

        {/* Uusi avain, kun tallennettu numero muuttuu: kenttä alkaa siitä. */}
        <PhoneCard key={profile.phone} phone={profile.phone} />

        <Card title={t('profile.account')}>
          <ListRow icon={Landmark} label={t('profile.billing')} onPress={() => router.push('/billing')} />
          <ListRow icon={FileText} label={t('profile.documents')} onPress={() => router.push('/documents')} />
        </Card>

        <StatRow
          title={t('profile.stats')}
          items={[
            { label: t('profile.gigs'), value: String(stats.count) },
            { label: t('profile.earnings'), value: formatEuro(stats.total) },
            { label: t('common.distance'), value: formatKm(stats.km) },
          ]}
        />
      </Screen>
    </KeyboardAvoidingView>
  )
}

// Puhelinnumero: ainoa tieto, jonka kuljettaja muuttaa itse (couriers.phone).
function PhoneCard({ phone }) {
  const t = useT()
  const { updateCourier } = useAuth()
  const [draft, setDraft] = useState(phone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const changed = draft.trim() !== phone

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await updateCourier({ phone: draft.trim() })
      setSaved(true)
    } catch {
      setError(t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title={t('profile.phone')}>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={(value) => {
          setDraft(value)
          setSaved(false)
          setError('')
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="+358 40 123 4567"
        placeholderTextColor={colors.gray400}
        accessibilityLabel={t('profile.phone')}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved && !changed ? (
        <View style={styles.saved}>
          <Check size={18} strokeWidth={2.4} color={colors.open} />
          <Text style={styles.savedText}>{t('profile.saved')}</Text>
        </View>
      ) : changed ? (
        <View style={styles.saveRow}>
          <Button title={t('profile.save')} onPress={save} disabled={saving} />
        </View>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  input: {
    height: 52,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: colors.gray50,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
  error: {
    marginBottom: 8,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  saveRow: {
    marginBottom: 8,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  savedText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.open,
  },
})
