import { forwardRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Svg, { Rect } from 'react-native-svg'
import { ArrowLeft, CircleAlert, Eye, EyeOff, Mail } from 'lucide-react-native'
import { colors, fonts } from '../theme'

// Yhteiset rakennuspalat asiakassovelluksen näkymille. Kenttien ilme kuten
// verkkosivun lomakkeissa: ohut harmaa reunus, aktiivisena tummempi harmaa
// (--field-focus-border), virheessä punainen.

const BORDER = colors.gray200
const FOCUS_BORDER = '#b9bcb3'
const ERROR = '#c2334a'
const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })

// Nappi: primary oranssi (päätoiminto), secondary valkoinen ohuella reunuksella,
// plain pelkkä teksti (vähäisempi vaihtoehto). loading: pyörivä merkki tekstin
// tilalla ja nappi lukittuna.
export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false }) {
  const inactive = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && (variant === 'plain' ? styles.plainPressed : styles.pressed),
        disabled && !loading && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : colors.black} />
      ) : (
        <Text style={[styles.buttonText, variant === 'primary' && styles.buttonTextPrimary]}>{title}</Text>
      )}
    </Pressable>
  )
}

// Tekstilinkki (esim. "Unohditko salasanan?", "Vaihda").
export function TextLink({ title, onPress, disabled = false, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [pressed && styles.plainPressed, style]}
      accessibilityRole="button"
    >
      <Text style={[styles.link, disabled && styles.linkDisabled]}>{title}</Text>
    </Pressable>
  )
}

// Pyöreä takaisin-nappi näkymän vasemmassa yläkulmassa.
export function BackButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
      accessibilityRole="button"
      accessibilityLabel="Takaisin"
      hitSlop={8}
    >
      <ArrowLeft size={22} strokeWidth={2} color={colors.black} />
    </Pressable>
  )
}

// Virheilmoitus lomakkeen yläpuolella.
export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <View style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <CircleAlert size={18} strokeWidth={2.2} color={ERROR} />
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  )
}

// Annettu sähköposti seuraavissa vaiheissa (salasana, koodi) ja Vaihda-linkki.
export function EmailChip({ email, onChange }) {
  return (
    <View style={styles.chip}>
      <Mail size={17} strokeWidth={1.9} color={colors.textMuted} />
      <Text style={styles.chipText} numberOfLines={1}>
        {email}
      </Text>
      <TextLink title="Vaihda" onPress={onChange} />
    </View>
  )
}

// Kenttä otsikolla. prefix: osa kentän alussa (puhelinnumeron lippu ja +358),
// right: osa lopussa (salasanan näyttö). hint harmaana kentän alla, error
// punaisena hintin tilalla.
export const TextField = forwardRef(function TextField(
  { label, hint, error, prefix, right, onFocus, onBlur, style, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocused, error && styles.fieldError]}>
        {prefix}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.gray400}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          accessibilityLabel={label}
          {...inputProps}
        />
        {right}
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
})

// Salasana: silmä-napista teksti näkyviin ja piiloon.
export const PasswordField = forwardRef(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <TextField
      ref={ref}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <Pressable
          onPress={() => setVisible((value) => !value)}
          style={({ pressed }) => [styles.eye, pressed && styles.plainPressed]}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Piilota salasana' : 'Näytä salasana'}
          hitSlop={6}
        >
          <Icon size={20} strokeWidth={1.9} color={colors.textMuted} />
        </Pressable>
      }
      {...props}
    />
  )
})

// Suomalainen puhelinnumero kuten verkkosivun rekisteröitymisessä (AuthInputs.jsx
// PhoneField): lippu ja +358 edessä, value ilman etuliitettä ja etunollaa.
export const PhoneField = forwardRef(function PhoneField({ value, onChangeText, ...props }, ref) {
  const change = (text) => {
    // Liitetty kansainvälinen muoto (+358 tai 00358) ja etunolla pois, vain numerot ja välit.
    let next = text.replace(/^\s*(\+|00)\s*358/, '')
    next = next.replace(/[^\d ]/g, '').replace(/^\s+/, '')
    if (next.startsWith('0')) next = next.slice(1)
    onChangeText(next)
  }
  return (
    <TextField
      ref={ref}
      value={value}
      onChangeText={change}
      keyboardType="phone-pad"
      autoComplete="tel-national"
      textContentType="telephoneNumber"
      placeholder="40 123 4567"
      prefix={
        <View style={styles.phonePrefix}>
          <FinnishFlag />
          <Text style={styles.phonePrefixText}>+358</Text>
        </View>
      }
      {...props}
    />
  )
})

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
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
  },
  primary: {
    backgroundColor: colors.orange,
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: colors.surface,
  },
  plain: {
    minHeight: 46,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  plainPressed: {
    opacity: 0.55,
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.black,
  },
  buttonTextPrimary: {
    color: '#ffffff',
  },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.orangeDark,
  },
  linkDisabled: {
    color: colors.gray400,
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray100,
  },
  backPressed: {
    backgroundColor: colors.gray200,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fdecef',
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14.5,
    lineHeight: 20,
    color: ERROR,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.gray50,
  },
  chipText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  label: {
    marginBottom: 8,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.black,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 56,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  fieldFocused: {
    borderColor: FOCUS_BORDER,
  },
  fieldError: {
    borderColor: ERROR,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontFamily: fonts.medium,
    fontSize: 16.5,
    color: colors.black,
    ...webOutline,
  },
  hint: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  fieldErrorText: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: ERROR,
  },
  eye: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  phonePrefixText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  flag: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 21, 15, 0.18)',
    borderRadius: 3,
  },
})
