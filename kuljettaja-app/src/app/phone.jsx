import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Rect } from 'react-native-svg'
import { Button, Screen } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import { formatPhone, internationalPhone, nationalPhone } from '../lib/format'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

// Puhelinnumero: ainoa yhteystieto, jonka kuljettaja vaihtaa itse ilman
// muutospyyntöä (couriers.phone). Avautuu profiilin riviltä kuten muutkin tiedot.
// Kenttä kuten verkkosivun rekisteröitymisessä: Suomen lippu ja +358 edessä,
// kuljettaja kirjoittaa loput ilman etunollaa. Tallentuu muodossa +358401234567.
export default function PhoneScreen() {
  const router = useRouter()
  const t = useT()
  const { updateCourier } = useAuth()
  const { profile } = useCourier()
  // null = ei muokattu: kenttä näyttää tallennetun numeron myös, jos tiedot
  // latautuvat vasta näkymän avautumisen jälkeen.
  const [edited, setEdited] = useState(null)
  const draft = edited ?? nationalPhone(formatPhone(profile.phone))
  const [focused, setFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const value = internationalPhone(draft)
  const changed = value !== internationalPhone(profile.phone)

  // Liitetty kansainvälinen muoto (+358 tai 00358) ja etunolla pois, vain numerot ja välit.
  const change = (text) => {
    let next = text.replace(/^\s*(\+|00)\s*358/, '')
    next = next.replace(/[^\d ]/g, '').replace(/^\s+/, '')
    if (next.startsWith('0')) next = next.slice(1)
    setEdited(next)
    setError('')
  }

  const save = async () => {
    // Suomalainen numero ilman suuntanumeron nollaa: 6–12 numeroa.
    const digits = value.length - 4
    if (digits < 6 || digits > 12) {
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
      <Screen
        title={t('profile.phone')}
        footer={
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={t('profile.save')} onPress={save} disabled={saving || !changed || !value} />
          </>
        }
      >
        <View style={[styles.field, focused && styles.fieldFocused]}>
          <View style={styles.prefix}>
            <FinnishFlag />
            <Text style={styles.prefixText}>+358</Text>
          </View>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={change}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="phone-pad"
            autoComplete="tel"
            autoFocus
            placeholder="40 123 4567"
            placeholderTextColor={colors.gray400}
            accessibilityLabel={t('profile.phone')}
            onSubmitEditing={changed ? save : undefined}
          />
        </View>
        <Text style={styles.hint}>{t('profile.phoneHint')}</Text>
      </Screen>
    </KeyboardAvoidingView>
  )
}

function FinnishFlag() {
  return (
    <View style={styles.flag}>
      <Svg width={22} height={14} viewBox="0 0 18 11">
        <Rect width={18} height={11} fill="#ffffff" />
        <Rect x={5} width={3} height={11} fill="#002f6c" />
        <Rect y={4} width={18} height={3} fill="#002f6c" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 58,
    borderWidth: 1.5,
    borderColor: '#ececec',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  fieldFocused: {
    borderColor: '#b9bcb3',
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#ececec',
  },
  flag: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 21, 15, 0.18)',
    borderRadius: 3,
  },
  prefixText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.black,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
  hint: {
    marginTop: -4,
    marginHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  error: {
    marginBottom: 10,
    marginHorizontal: 4,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
  },
})
