import { useEffect, useState } from 'react'
import { Animated, Easing, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
const BORDER = colors.gray200
const ERROR = '#c2334a'

// Sähköpostiin tullut koodi omissa ruuduissaan (kuten verkkosivun CodeInput).
// Ruutujen päällä on yksi näkymätön kenttä, joten liittäminen, poisto ja
// puhelimen koodiehdotus (iOS: koodi Mail-sovelluksesta) toimivat kerralla.
// Viimeinen numero lähettää koodin (onComplete). error: ruudut punaisiksi ja
// rivi värähtää.
export default function CodeInput({ length = 6, value, onChange, onComplete, disabled = false, error = false, autoFocus = false }) {
  const [focused, setFocused] = useState(false)
  const [shake] = useState(() => new Animated.Value(0))
  const [blink] = useState(() => new Animated.Value(1))

  useEffect(() => {
    if (!error) return
    shake.setValue(0)
    Animated.sequence(
      [10, -10, 7, -7, 3, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 55, easing: Easing.linear, useNativeDriver })),
    ).start()
  }, [error, shake])

  // Vilkkuva kursori aktiivisessa ruudussa.
  useEffect(() => {
    if (!focused) return undefined
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 450, delay: 350, useNativeDriver }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [focused, blink])

  const change = (text) => {
    const next = text.replace(/\D/g, '').slice(0, length)
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  return (
    <Animated.View style={[styles.row, { transform: [{ translateX: shake }] }]}>
      {Array.from({ length }, (_, index) => {
        const digit = value[index]
        const active = focused && !disabled && index === Math.min(value.length, length - 1) && value.length < length
        return (
          <View key={index} style={[styles.box, digit && styles.boxFilled, active && styles.boxActive, error && styles.boxError]}>
            {digit ? <Text style={styles.digit}>{digit}</Text> : null}
            {active ? <Animated.View style={[styles.caret, { opacity: blink }]} /> : null}
          </View>
        )
      })}
      <TextInput
        style={styles.hidden}
        value={value}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.select({ android: 'sms-otp', default: 'one-time-code' })}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        contextMenuHidden={false}
        accessibilityLabel={`${length}-numeroinen koodi`}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 62,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  boxFilled: {
    borderColor: '#b9bcb3',
  },
  boxActive: {
    borderWidth: 2,
    borderColor: colors.black,
  },
  boxError: {
    borderColor: ERROR,
    backgroundColor: '#fff7f8',
  },
  digit: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.black,
  },
  caret: {
    position: 'absolute',
    width: 2,
    height: 26,
    borderRadius: 1,
    backgroundColor: colors.black,
  },
  // Näkymätön kenttä koko rivin päällä: napautus mihin tahansa ruutuun avaa näppäimistön.
  hidden: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0,
    color: 'transparent',
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
})
