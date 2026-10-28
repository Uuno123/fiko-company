import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { translateAuthError } from '../../../frontend/src/lib/authErrors'
import AuthLayout from '../components/AuthLayout'
import SocialButtons, { OrDivider } from '../components/SocialButtons'
import { Button, EmailChip, ErrorBanner, PasswordField, TextField, TextLink } from '../components/ui'
import { nextPath, useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { colors, fonts } from '../theme'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Kirjautuminen kuten Woltissa (käyttäjän valinta 27.10.2026): ensin isot
// Apple-, Google- ja Facebook-napit, niiden alla sähköposti. Yksi kenttä
// kerrallaan: sähköpostin jälkeen oma vaihe salasanalle. Sama tili kuin
// verkkosivulla; kesken jäänyt rekisteröityminen jatkuu tietovaiheesta (nextPath).
export default function LoginScreen() {
  const router = useRouter()
  const { refreshCustomer } = useAuth()
  const [step, setStep] = useState('email') // 'email' | 'password'
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const finish = async (session) => {
    const row = await refreshCustomer()
    router.replace(nextPath(session, row))
  }

  const toPassword = () => {
    const address = email.trim()
    if (!address) return
    if (!EMAIL_PATTERN.test(address)) {
      setEmailError('Tarkista sähköpostiosoite.')
      return
    }
    setError('')
    setStep('password')
  }

  const signIn = async () => {
    if (busy || !password) return
    setBusy(true)
    setError('')
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) {
      setError(translateAuthError(signInError))
      setBusy(false)
      return
    }
    await finish(data.session)
  }

  if (step === 'password') {
    return (
      <AuthLayout
        title="Syötä salasana"
        onBack={() => setStep('email')}
        stepKey="password"
        footer={<Button title="Kirjaudu sisään" onPress={signIn} loading={busy} disabled={!password} />}
      >
        <EmailChip email={email.trim()} onChange={() => setStep('email')} />
        <ErrorBanner message={error} />
        <View>
          <PasswordField
            label="Salasana"
            value={password}
            onChangeText={(text) => {
              setPassword(text)
              setError('')
            }}
            placeholder="Salasanasi"
            autoComplete="current-password"
            textContentType="password"
            autoFocus
            returnKeyType="go"
            onSubmitEditing={signIn}
          />
          <TextLink
            title="Unohditko salasanan?"
            style={styles.forgot}
            onPress={() => router.push({ pathname: '/unohtunut-salasana', params: { email: email.trim() } })}
          />
        </View>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Kirjaudu sisään"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      stepKey="email"
      footer={
        <View style={styles.switch}>
          <Text style={styles.switchText}>Eikö sinulla ole tiliä?</Text>
          <TextLink title="Luo tili" onPress={() => router.replace('/rekisteroidy')} />
        </View>
      }
    >
      <SocialButtons onSignedIn={finish} />
      <OrDivider />
      <TextField
        label="Sähköposti"
        value={email}
        onChangeText={(text) => {
          setEmail(text)
          setEmailError('')
        }}
        error={emailError}
        placeholder="nimi@esimerkki.fi"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={toPassword}
      />
      <Button title="Jatka" onPress={toPassword} disabled={!email.trim()} />
    </AuthLayout>
  )
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    marginTop: 14,
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  switchText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
})
