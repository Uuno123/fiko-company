import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { MailCheck } from 'lucide-react-native'
import { translateAuthError } from '../../../frontend/src/lib/authErrors'
import AuthLayout from '../components/AuthLayout'
import { Button, ErrorBanner, TextField } from '../components/ui'
import { WEBSITE_URL } from '../lib/links'
import { supabase } from '../lib/supabase'
import { colors, fonts } from '../theme'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Salasanan palautus kuten verkkosivulla: linkki sähköpostiin, ja linkki avaa
// verkkosivun /reset-password-sivun, jossa uusi salasana asetetaan.
export default function ForgotPasswordScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '')
  const [emailError, setEmailError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const back = () => (router.canGoBack() ? router.back() : router.replace('/kirjaudu'))

  const submit = async () => {
    const address = email.trim()
    if (busy || !address) return
    if (!EMAIL_PATTERN.test(address)) {
      setEmailError('Tarkista sähköpostiosoite.')
      return
    }
    setBusy(true)
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${WEBSITE_URL}/reset-password`,
    })
    setBusy(false)
    if (resetError) {
      setError(translateAuthError(resetError))
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout
        title="Tarkista sähköpostisi"
        subtitle={
          <Text style={styles.subtitle}>
            Jos osoitteella <Text style={styles.strong}>{email.trim()}</Text> on Bidrop-tili, lähetimme sinne linkin uuden
            salasanan asettamiseen.
          </Text>
        }
        onBack={back}
        stepKey="sent"
        footer={<Button title="Takaisin kirjautumiseen" onPress={back} />}
      >
        <View style={styles.sentIcon}>
          <MailCheck size={34} strokeWidth={1.8} color={colors.orange} />
        </View>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Unohtuiko salasana?"
      subtitle="Lähetämme sähköpostiisi linkin, jolla voit asettaa uuden salasanan."
      onBack={back}
      footer={<Button title="Lähetä linkki" onPress={submit} loading={busy} disabled={!email.trim()} />}
    >
      <ErrorBanner message={error} />
      <TextField
        label="Sähköposti"
        value={email}
        onChangeText={(text) => {
          setEmail(text)
          setEmailError('')
          setError('')
        }}
        error={emailError}
        placeholder="nimi@esimerkki.fi"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        returnKeyType="send"
        onSubmitEditing={submit}
      />
    </AuthLayout>
  )
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.textMuted,
  },
  strong: {
    fontFamily: fonts.semibold,
    color: colors.black,
  },
  sentIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.orangeSoft,
  },
})
