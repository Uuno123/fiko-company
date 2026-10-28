import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { translateAuthError } from '../../../frontend/src/lib/authErrors'
import { ageFromBirthDate } from '../../../frontend/src/lib/customerAddress'
import { nationalPhone, splitName } from '../../../frontend/src/lib/format'
import AuthLayout from '../components/AuthLayout'
import BirthDateField from '../components/BirthDateField'
import CodeInput from '../components/CodeInput'
import SocialButtons, { OrDivider } from '../components/SocialButtons'
import { Button, EmailChip, ErrorBanner, PasswordField, PhoneField, TextField, TextLink } from '../components/ui'
import { useAuth } from '../lib/auth'
import { HOME_PATH } from '../lib/links'
import { supabase } from '../lib/supabase'
import { colors, fonts } from '../theme'

// Rekisteröityminen samoin kuin verkkosivulla (frontend/src/pages/Register.jsx),
// alku kuten Woltissa (käyttäjän valinta 27.10.2026): isot Apple-, Google- ja
// Facebook-napit ja niiden alla sähköposti, yksi kenttä kerrallaan.
//   1. sähköposti -> Supabase lähettää 6-numeroisen koodin (signInWithOtp)
//   2. koodi (verifyOtp) todistaa sähköpostin omistuksen ja kirjaa sisään
//   3. vasta sitten nimi, puhelin, syntymäaika ja salasana
// Kirjautunut, jonka tiedot puuttuvat (esim. sovellus suljettiin kesken),
// palaa suoraan vaiheeseen 3, samoin Googlella rekisteröitynyt. Takaisin-nappi
// (myös Androidin, AuthLayout) palaa edelliseen vaiheeseen; vaiheesta 3 se
// keskeyttää ja kirjaa ulos.

const CODE_LENGTH = 6
// Supabase sallii uuden koodin samalle osoitteelle minuutin välein.
const RESEND_SECONDS = 60
// Tietosuoja-asetuksen mukaan alle 13-vuotias tarvitsisi huoltajan suostumuksen.
const MIN_AGE = 13
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY_BIRTH = { day: '', month: '', year: '' }

// { day, month, year } -> 'yyyy-mm-dd', tai null jos puuttuu tai päivää ei ole (31. helmikuuta).
function birthDateIso({ day, month, year }) {
  if (!day || !month || !year) return null
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (date.getMonth() !== Number(month) - 1) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function birthParts(iso) {
  const [year, month, day] = String(iso ?? '').split('-')
  return year && month && day ? { day: String(Number(day)), month: String(Number(month)), year } : EMPTY_BIRTH
}

export default function RegisterScreen() {
  const router = useRouter()
  const { session, signOut } = useAuth()
  const [step, setStep] = useState('email') // 'email' | 'code'; kirjautuneena aina tiedot
  const [email, setEmail] = useState('')
  const current = session ? 'details' : step

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const back = () => {
    if (current === 'code') setStep('email')
    else if (current === 'details') signOut().then(() => router.replace('/'))
    else leave()
  }

  if (current === 'details') return <DetailsStep onBack={back} />
  if (current === 'code') return <CodeStep email={email} onBack={back} />
  return (
    <EmailStep
      email={email}
      onChange={setEmail}
      onBack={back}
      onSent={() => setStep('code')}
      onLogin={() => router.replace('/kirjaudu')}
    />
  )
}

function EmailStep({ email, onChange, onBack, onSent, onLogin }) {
  const [emailError, setEmailError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const address = email.trim()
    if (busy || !address) return
    if (!EMAIL_PATTERN.test(address)) {
      setEmailError('Tarkista sähköpostiosoite.')
      return
    }
    setBusy(true)
    setError('')
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } })
    setBusy(false)
    if (sendError) {
      setError(translateAuthError(sendError))
      return
    }
    onSent()
  }

  return (
    <AuthLayout
      title="Luo Bidrop-tili"
      onBack={onBack}
      step={1}
      steps={3}
      stepKey="email"
      footer={
        <View style={styles.switch}>
          <Text style={styles.switchText}>Onko sinulla jo tili?</Text>
          <TextLink title="Kirjaudu sisään" onPress={onLogin} />
        </View>
      }
    >
      {/* Googlella rekisteröitynyt kirjautuu heti: näkymä vaihtuu tietovaiheeseen. */}
      <SocialButtons onSignedIn={() => {}} />
      <OrDivider />
      <ErrorBanner message={error} />
      <TextField
        label="Sähköposti"
        value={email}
        onChangeText={(text) => {
          onChange(text)
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
        returnKeyType="next"
        onSubmitEditing={submit}
      />
      <Button title="Jatka" onPress={submit} loading={busy} disabled={!email.trim()} />
    </AuthLayout>
  )
}

function CodeStep({ email, onBack }) {
  const [code, setCode] = useState('')
  // Kasvava luku jokaisesta väärästä koodista: ruudut punaisiksi ja rivi värähtää.
  const [wrong, setWrong] = useState(0)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  // Oikea koodi kirjaa sisään: istunto vaihtaa näkymän tietovaiheeseen.
  const verify = async (token = code) => {
    if (token.length !== CODE_LENGTH || verifying) return
    setVerifying(true)
    setError('')
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })
    if (verifyError) {
      setError(translateAuthError(verifyError))
      setWrong((count) => count + 1)
      setCode('')
      setVerifying(false)
    }
  }

  const resend = async () => {
    setError('')
    setResent(false)
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
    if (sendError) {
      setError(translateAuthError(sendError))
      return
    }
    setResendIn(RESEND_SECONDS)
    setResent(true)
  }

  return (
    <AuthLayout
      title="Syötä koodi"
      subtitle={`Lähetimme ${CODE_LENGTH}-numeroisen koodin sähköpostiisi.`}
      onBack={onBack}
      step={2}
      steps={3}
      stepKey="code"
      footer={<Button title="Vahvista" onPress={() => verify()} loading={verifying} disabled={code.length !== CODE_LENGTH} />}
    >
      <EmailChip email={email.trim()} onChange={onBack} />
      <ErrorBanner message={error} />
      <CodeInput
        length={CODE_LENGTH}
        value={code}
        onChange={(next) => {
          setCode(next)
          if (wrong) setWrong(0)
        }}
        onComplete={verify}
        disabled={verifying}
        error={wrong}
        autoFocus
      />
      <Text style={styles.hint}>
        {resent ? 'Uusi koodi lähetetty. ' : ''}Viesti tulee hetken kuluttua. Tarkista tarvittaessa roskapostikansio.
      </Text>
      {resendIn > 0 ? (
        <Text style={styles.resendWait}>Voit pyytää uuden koodin {resendIn} sekunnin kuluttua</Text>
      ) : (
        <TextLink title="Lähetä uusi koodi" onPress={resend} style={styles.resend} />
      )}
    </AuthLayout>
  )
}

function DetailsStep({ onBack }) {
  const router = useRouter()
  const { session, customer, refreshCustomer } = useAuth()
  // Nimi tallennetaan tilin tietoihin vasta tässä vaiheessa: sen puuttuminen
  // tarkoittaa, että salasanaa ei ole vielä asetettu.
  const needsPassword = !session?.user.user_metadata?.name
  const lastNameRef = useRef(null)
  const phoneRef = useRef(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [birth, setBirth] = useState(EMPTY_BIRTH)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Aiemmin annetut tiedot valmiiksi kenttiin (asiakasrivi latautuu hetken viiveellä).
  const [prefilled, setPrefilled] = useState(false)
  if (customer && !prefilled) {
    setPrefilled(true)
    const { first, last } = splitName(customer.name)
    setFirstName((value) => value || first)
    setLastName((value) => value || last)
    setPhone((value) => value || nationalPhone(customer.phone))
    setBirth((value) => (value === EMPTY_BIRTH ? birthParts(customer.birth_date) : value))
  }

  const edit = (key, setter) => (value) => {
    setter(value)
    setError('')
    if (errors[key]) setErrors((all) => ({ ...all, [key]: '' }))
  }

  const submit = async () => {
    if (busy) return
    const phoneDigits = phone.replace(/\D/g, '')
    const birthDate = birthDateIso(birth)
    const age = birthDate ? ageFromBirthDate(birthDate) : null
    const found = {
      first: firstName.trim() ? '' : 'Anna etunimi.',
      last: lastName.trim() ? '' : 'Anna sukunimi.',
      phone: phoneDigits.length >= 6 && phoneDigits.length <= 11 ? '' : 'Tarkista puhelinnumero.',
      birth:
        age == null || age > 120
          ? 'Valitse syntymäaika.'
          : age < MIN_AGE
            ? `Bidropin käyttäjän on oltava vähintään ${MIN_AGE}-vuotias.`
            : '',
      password: !needsPassword || password.length >= 6 ? '' : 'Salasanassa on oltava vähintään 6 merkkiä.',
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    setBusy(true)
    setError('')
    // Nimi yhtenä (kuljettaja ja ravintola näkevät koko nimen), puhelin kansainvälisessä muodossa.
    const name = `${firstName.trim()} ${lastName.trim()}`
    const fullPhone = `+358${phoneDigits}`

    const { error: userError } = await supabase.auth.updateUser({
      ...(needsPassword ? { password } : {}),
      data: { name, phone: fullPhone },
    })
    if (userError) {
      setError(translateAuthError(userError))
      setBusy(false)
      return
    }

    // Asiakasrivi syntyi jo vahvistuksessa (handle_new_customer-trigger), joten päivitetään se.
    const { data: rows, error: profileError } = await supabase
      .from('customers')
      .update({ name, phone: fullPhone, birth_date: birthDate })
      .eq('id', session.user.id)
      .select('id')
    if (profileError || !rows?.length) {
      setError('Tietojen tallennus epäonnistui. Yritä uudelleen.')
      setBusy(false)
      return
    }

    await refreshCustomer()
    router.replace(HOME_PATH)
  }

  return (
    <AuthLayout
      title="Viimeistele tilisi"
      subtitle={
        <Text style={styles.subtitle}>
          Kirjautuneena: <Text style={styles.strong}>{session?.user.email}</Text>
        </Text>
      }
      onBack={onBack}
      step={3}
      steps={3}
      stepKey="details"
      footer={<Button title="Luo tili" onPress={submit} loading={busy} />}
    >
      <ErrorBanner message={error} />
      <View style={styles.nameRow}>
        <TextField
          style={styles.nameField}
          label="Etunimi"
          value={firstName}
          onChangeText={edit('first', setFirstName)}
          error={errors.first}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />
        <TextField
          ref={lastNameRef}
          style={styles.nameField}
          label="Sukunimi"
          value={lastName}
          onChangeText={edit('last', setLastName)}
          error={errors.last}
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
      </View>
      <PhoneField ref={phoneRef} label="Puhelinnumero" value={phone} onChangeText={edit('phone', setPhone)} error={errors.phone} />
      <BirthDateField
        label="Syntymäaika"
        value={birth}
        onChange={edit('birth', setBirth)}
        latestYear={new Date().getFullYear() - MIN_AGE}
        error={errors.birth}
        hint="Ikäsi tarkistamista varten. Ei näy muille."
      />
      {needsPassword ? (
        <PasswordField
          label="Salasana"
          value={password}
          onChangeText={edit('password', setPassword)}
          error={errors.password}
          hint="Vähintään 6 merkkiä."
          placeholder="Luo salasana"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      ) : null}
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
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textMuted,
  },
  resendWait: {
    fontFamily: fonts.medium,
    fontSize: 14.5,
    color: colors.textMuted,
  },
  resend: {
    alignSelf: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nameField: {
    flex: 1,
  },
})
