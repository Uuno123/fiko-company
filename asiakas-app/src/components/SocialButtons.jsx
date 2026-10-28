import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { providerEnabled, signInWithProvider } from '../lib/oauth'
import { colors, fonts } from '../theme'

// Isot kirjautumisnapit kuten Woltissa (käyttäjän valinta 27.10.2026): Apple,
// Google ja Facebook ylimpänä, sähköposti niiden alla. Toiminta kuten
// verkkosivulla: Google kirjaa sisään, kun se on otettu käyttöön Supabasessa;
// Apple ja Facebook kertovat olevansa tulossa. onSignedIn(session) onnistuessa.
export default function SocialButtons({ onSignedIn }) {
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null) // { text, error }

  const google = async () => {
    setNotice(null)
    setBusy('google')
    if (!(await providerEnabled('google'))) {
      setNotice({ text: 'Google-kirjautuminen ei ole vielä käytössä. Jatka sähköpostilla.' })
      setBusy(null)
      return
    }
    const result = await signInWithProvider('google')
    setBusy(null)
    if (result.session) onSignedIn(result.session)
    else if (result.error) setNotice({ text: 'Google-kirjautuminen epäonnistui. Yritä uudelleen tai jatka sähköpostilla.', error: true })
  }

  const comingSoon = (name) => {
    setNotice({ text: `${name}-kirjautuminen on tulossa pian. Käytä toistaiseksi sähköpostia.` })
  }

  return (
    <View style={styles.list}>
      <SocialButton label="Jatka Apple ID:llä" icon={<AppleIcon />} style={styles.apple} textStyle={styles.textLight} onPress={() => comingSoon('Apple')} />
      <SocialButton label="Jatka Googlella" icon={<GoogleIcon />} style={styles.google} onPress={google} busy={busy === 'google'} />
      <SocialButton
        label="Jatka Facebookilla"
        icon={<FacebookIcon />}
        style={styles.facebook}
        textStyle={styles.textLight}
        onPress={() => comingSoon('Facebook')}
      />
      {notice ? (
        <Text style={[styles.notice, notice.error && styles.noticeError]} accessibilityLiveRegion="polite">
          {notice.text}
        </Text>
      ) : null}
    </View>
  )
}

function SocialButton({ label, icon, style, textStyle, onPress, busy = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
    >
      <View style={styles.icon}>{icon}</View>
      {busy ? <ActivityIndicator color={colors.black} /> : <Text style={[styles.text, textStyle]}>{label}</Text>}
    </Pressable>
  )
}

// "tai jatka sähköpostilla" -erotin napit ja sähköpostikentän välissä.
export function OrDivider({ text = 'tai jatka sähköpostilla' }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{text}</Text>
      <View style={styles.dividerLine} />
    </View>
  )
}

// Logot samoista vektoreista kuin verkkosivun napeissa.
function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path d="M14.2 3.4c.6-.75 1.05-1.8.93-2.9-.9.05-2 .6-2.65 1.35-.6.65-1.1 1.7-.96 2.7 1 .08 1.98-.5 2.68-1.15Z" fill="#ffffff" />
      <Path
        d="M17.4 14.1c-.28.65-.62 1.25-1.02 1.83-.55.8-1 1.35-1.35 1.65-.55.5-1.13.76-1.75.78-.45.01-.99-.13-1.62-.41-.63-.28-1.2-.42-1.73-.42-.55 0-1.14.14-1.78.42-.64.28-1.16.43-1.56.44-.6.03-1.2-.24-1.79-.8-.38-.35-.86-.92-1.42-1.72-.6-.85-1.1-1.85-1.49-3-.42-1.24-.63-2.44-.63-3.6 0-1.33.29-2.47.86-3.44.45-.77 1.06-1.38 1.81-1.83a4.9 4.9 0 0 1 2.44-.73c.48 0 1.11.15 1.9.45.79.3 1.29.45 1.51.45.16 0 .72-.18 1.66-.53.9-.32 1.65-.46 2.27-.41 1.68.14 2.94.79 3.78 1.98-1.5.91-2.24 2.18-2.23 3.82.01 1.28.47 2.34 1.37 3.19.41.39.86.69 1.37.9-.11.32-.23.63-.36.93Z"
        fill="#ffffff"
      />
    </Svg>
  )
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path d="M19.6 10.23c0-.68-.06-1.33-.17-1.96H10v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.31 2.99-7.27Z" fill="#4285F4" />
      <Path d="M10 20c2.7 0 4.96-.89 6.61-2.42l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.06v2.59A10 10 0 0 0 10 20Z" fill="#34A853" />
      <Path d="M4.41 11.93a5.99 5.99 0 0 1 0-3.86V5.48H1.06a10 10 0 0 0 0 9.04l3.35-2.59Z" fill="#FBBC05" />
      <Path d="M10 3.96c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.98 9.98 0 0 0 10 0a10 10 0 0 0-8.94 5.48l3.35 2.6C5.2 5.72 7.4 3.96 10 3.96Z" fill="#EA4335" />
    </Svg>
  )
}

function FacebookIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={10} fill="#ffffff" />
      <Path
        d="M11.9 16v-5.1h1.72l.26-1.99h-1.98V7.61c0-.58.16-.97 1-.97h1.06V4.86c-.18-.02-.82-.08-1.55-.08-1.53 0-2.58.93-2.58 2.65v1.48H8.1v1.99h1.73V16h2.07Z"
        fill="#1877f2"
      />
    </Svg>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    paddingHorizontal: 52,
    borderRadius: 27,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  apple: {
    backgroundColor: '#000000',
  },
  google: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.surface,
  },
  facebook: {
    backgroundColor: '#1877f2',
  },
  // Logo napin vasemmassa reunassa, teksti keskellä.
  icon: {
    position: 'absolute',
    left: 22,
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  textLight: {
    color: '#ffffff',
  },
  notice: {
    marginTop: 2,
    paddingHorizontal: 4,
    fontFamily: fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.textMuted,
  },
  noticeError: {
    color: '#c2334a',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  dividerText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.textMuted,
  },
})
