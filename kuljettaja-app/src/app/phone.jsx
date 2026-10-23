import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Card, Screen } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

// Puhelinnumero: ainoa yhteystieto, jonka kuljettaja vaihtaa itse ilman
// muutospyyntöä (couriers.phone). Avautuu profiilin riviltä kuten muutkin tiedot.
export default function PhoneScreen() {
  const router = useRouter()
  const t = useT()
  const { updateCourier } = useAuth()
  const { profile } = useCourier()
  const [draft, setDraft] = useState(profile.phone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const value = draft.trim()
  const changed = value !== profile.phone

  const save = async () => {
    // Numero, välilyöntejä, sulkeita ja viivoja; vähintään 7 numeroa.
    if (!/^\+?[\d\s()-]+$/.test(value) || value.replace(/\D/g, '').length < 7) {
      setError(t('profile.phoneInvalid'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateCourier({ phone: value })
      router.back()
    } catch {
      setError(t('profile.saveError'))
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={t('profile.phone')}>
        <Card style={styles.card}>
          <Text style={styles.label}>{t('profile.phone')}</Text>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(next) => {
              setDraft(next)
              setError('')
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            autoFocus
            placeholder="+358 40 123 4567"
            placeholderTextColor={colors.gray400}
            accessibilityLabel={t('profile.phone')}
            onSubmitEditing={changed ? save : undefined}
          />
          <Text style={styles.hint}>{t('profile.phoneHint')}</Text>
        </Card>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={t('profile.save')} onPress={save} disabled={saving || !changed || !value} />
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.black,
  },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: colors.gray50,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.black,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
  hint: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  error: {
    marginHorizontal: 4,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
  },
})
