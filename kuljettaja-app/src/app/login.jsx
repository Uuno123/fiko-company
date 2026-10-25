import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Eye, EyeOff, Mail } from 'lucide-react-native'
import { AppleIcon, GoogleIcon } from '../components/BrandIcons'
import DelivoLogo from '../components/DelivoLogo'
import LoginIllustration from '../components/LoginIllustration'
import { useAuth } from '../lib/auth'
import { tr, useT } from '../lib/i18n'
import { useKeyboardHeight } from '../lib/keyboard'
import { isSupabaseConfigured } from '../lib/supabase'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
// Sama musta kuin sovelluksen kuvakkeessa ja käynnistysruudussa.
const HERO_BLACK = '#000000'

// Supabasen virheviestit suomeksi.
function loginErrorText(err) {
  const message = String(err?.message ?? '')
  if (/invalid login credentials/i.test(message)) return tr('login.errCredentials')
  if (/email not confirmed/i.test(message)) return tr('login.errConfirm')
  if (/network|fetch/i.test(message)) return tr('common.network')
  return message || tr('login.errFailed')
}

// Kuljettajan kirjautuminen Wolt Partner -sovelluksen mallin mukaan: musta
// yläosa logolla ja kuvituksella (sama ilme kuin sovelluksen kuvakkeessa), alla kirjautumistavat. "Kirjaudu
// sähköpostilla" avaa lomakkeen (samat tunnukset kuin delivon verkkosivulla).
// Google- ja Apple-napit ovat toistaiseksi vain ulkoasua (demo).
export default function LoginScreen() {
  const { status, signIn } = useAuth()
  const [mode, setMode] = useState('start')

  // Androidin takaisin-nappi palaa lomakkeelta aloitusnäkymään.
  useEffect(() => {
    if (mode !== 'email') return undefined
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode('start')
      return true
    })
    return () => subscription.remove()
  }, [mode])

  if (status !== 'signed-out' && status !== 'loading') return <Redirect href="/" />

  return (
    <View style={styles.screen}>
      {/* Valkoiset kellonaika ja kuvakkeet mustan yläosan päällä. */}
      <StatusBar style="light" />
      {mode === 'start' ? (
        <StartView onEmail={() => setMode('email')} />
      ) : (
        <EmailForm signIn={signIn} onBack={() => setMode('start')} />
      )}
    </View>
  )
}

function StartView({ onEmail }) {
  const insets = useSafeAreaInsets()
  const t = useT()
  const [notice, setNotice] = useState('')

  // Ilmoitus häviää hetken päästä ja alareunan ohje palaa.
  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  // Google- ja Apple-kirjautumista ei ole vielä toteutettu - nappi kertoo sen.
  const notAvailable = (provider) => setNotice(t('login.notAvailable', { provider }))

  return (
    <>
      <View style={[styles.hero, { paddingTop: insets.top }]}>
        <View style={styles.brand}>
          <DelivoLogo size={38} dark style={styles.logo} />
          <Text style={styles.brandLabel}>{t('login.courier')}</Text>
        </View>
        <LoginIllustration style={styles.illustration} />
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          onPress={onEmail}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Mail size={20} strokeWidth={2.2} color="#ffffff" />
          <Text style={styles.primaryText}>{t('login.withEmail')}</Text>
        </Pressable>

        <Pressable
          onPress={() => notAvailable('Google')}
          style={({ pressed }) => [styles.social, styles.socialGoogle, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <GoogleIcon size={20} />
          <Text style={styles.socialText}>{t('login.withGoogle')}</Text>
        </Pressable>
        <Pressable
          onPress={() => notAvailable('Apple')}
          style={({ pressed }) => [styles.social, styles.socialApple, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <AppleIcon size={20} />
          <Text style={[styles.socialText, styles.socialTextApple]}>{t('login.withApple')}</Text>
        </Pressable>

        <Text style={[styles.footnote, notice ? styles.footnoteNotice : null]} accessibilityLiveRegion="polite">
          {notice || t('login.footnote')}
        </Text>
        {!isSupabaseConfigured ? (
          <Text style={styles.configError}>{t('login.noConfig')}</Text>
        ) : null}
      </View>
    </>
  )
}

function EmailForm({ signIn, onBack }) {
  const t = useT()
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const passwordRef = useRef(null)
  const enter = useRef(new Animated.Value(0)).current

  // Lomake nousee alhaalta mustan yläosan päälle.
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, bounciness: 0, speed: 16, useNativeDriver }).start()
  }, [enter])

  const submit = async () => {
    if (busy) return
    if (!email.trim() || !password) {
      setError(t('login.errMissing'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await signIn(email, password)
    } catch (err) {
      setError(loginErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  const sheetStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
  }

  return (
    <>
      <View style={[styles.heroCompact, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
        >
          <ChevronLeft size={24} strokeWidth={2.4} color="#ffffff" />
        </Pressable>
        <DelivoLogo size={26} dark />
        <View style={styles.backSpacer} />
      </View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 24 + keyboardHeight }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{t('login.withEmail')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

          <Text style={styles.label}>{t('login.email')}</Text>
          <TextInput
            style={[styles.inputBox, styles.inputText, focused === 'email' && styles.inputFocused]}
            value={email}
            onChangeText={(value) => {
              setEmail(value)
              setError('')
            }}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            autoFocus
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder={t('login.emailPlaceholder')}
            placeholderTextColor={colors.gray400}
            editable={!busy}
            underlineColorAndroid="transparent"
            accessibilityLabel={t('login.email')}
          />

          <Text style={styles.label}>{t('login.password')}</Text>
          <View style={[styles.inputBox, styles.passwordRow, focused === 'password' && styles.inputFocused]}>
            <TextInput
              ref={passwordRef}
              style={[styles.inputText, styles.passwordInput]}
              value={password}
              onChangeText={(value) => {
                setPassword(value)
                setError('')
              }}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              placeholder="••••••••"
              placeholderTextColor={colors.gray400}
              editable={!busy}
              underlineColorAndroid="transparent"
              accessibilityLabel={t('login.password')}
            />
            <Pressable
              onPress={() => setShowPassword((value) => !value)}
              style={styles.eye}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              hitSlop={8}
            >
              {showPassword ? (
                <EyeOff size={20} strokeWidth={2} color={colors.textMuted} />
              ) : (
                <Eye size={20} strokeWidth={2} color={colors.textMuted} />
              )}
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {!isSupabaseConfigured ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{t('login.noConfig')}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [styles.primary, styles.submit, pressed && styles.pressed, busy && styles.busy]}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryText}>{t('login.submit')}</Text>}
          </Pressable>

          <Text style={styles.note}>{t('login.note')}</Text>
        </ScrollView>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  // Aloitusnäkymä: musta yläosa täyttää tilan napeista ylöspäin.
  hero: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: HERO_BLACK,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  logo: {
    alignSelf: 'center',
  },
  brandLabel: {
    marginTop: 12,
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: 5,
    color: colors.orange,
  },
  illustration: {
    width: '100%',
    aspectRatio: 400 / 310,
  },
  // -1: paneeli peittää kuvan ja paneelin väliin muuten jäävän hiusviivan.
  panel: {
    marginTop: -1,
    paddingTop: 13,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.orange,
  },
  primaryText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#ffffff',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  busy: {
    opacity: 0.8,
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    marginTop: 12,
    borderRadius: 27,
  },
  socialGoogle: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.surface,
  },
  socialApple: {
    backgroundColor: '#000000',
  },
  socialText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.black,
  },
  socialTextApple: {
    color: '#ffffff',
  },
  footnote: {
    marginTop: 18,
    minHeight: 36,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  footnoteNotice: {
    fontFamily: fonts.semibold,
    color: colors.orangeDark,
  },
  configError: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  // Sähköpostilomake: matala musta yläosa, jonka päälle valkoinen lomake nousee.
  heroCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 46,
    backgroundColor: HERO_BLACK,
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  backPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  backSpacer: {
    width: 42,
  },
  sheet: {
    flex: 1,
    marginTop: -26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  form: {
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.6,
    color: colors.black,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
  },
  label: {
    marginTop: 18,
    marginBottom: 6,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  inputBox: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
  },
  // Kehys tulee laatikosta (oranssi aktiivisena), ei selaimen omaa korostusta.
  inputText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
  inputFocused: {
    borderColor: colors.orange,
    backgroundColor: colors.surface,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
  },
  eye: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  errorBox: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fdecef',
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: colors.danger,
  },
  submit: {
    marginTop: 22,
  },
  note: {
    marginTop: 20,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
})
