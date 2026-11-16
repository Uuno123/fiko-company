import { useEffect, useRef } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { WheelFace } from './FortuneWheel'
import { colors, fonts } from '../theme'

const WHEEL = 190

// Etusivun banneri päivän onnenpyörälle (käyttäjän pyyntö 16.11.2026):
// vie omalle pyöräytyssivulle (app/onnenpyora.jsx). Pyörä pyörii hitaasti
// bannerin oikeassa reunassa puoliksi piilossa.
export default function WheelBanner({ onPress }) {
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 24000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [spin])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Päivän onnenpyörä, pyöräytä kerran päivässä"
    >
      <Animated.View style={[styles.wheel, { transform: [{ rotate }] }]} pointerEvents="none">
        <WheelFace size={WHEEL} />
      </Animated.View>

      <View style={styles.texts}>
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>KERRAN PÄIVÄSSÄ</Text>
        </View>
        <Text style={styles.title}>
          Päivän{'\n'}onnenpyörä<Text style={styles.titleDot}>.</Text>
        </Text>
        <Text style={styles.text}>Voita vaikka ilmainen ruoka.</Text>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Pyöräytä</Text>
          <ChevronRight size={15} strokeWidth={2.6} color="#ffffff" />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 34,
    marginHorizontal: 16,
    height: 176,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: colors.orange,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  wheel: { position: 'absolute', right: -58, top: (176 - WHEEL) / 2 },
  texts: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, alignItems: 'flex-start' },
  eyebrow: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.black },
  eyebrowText: { fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.2, color: '#ffffff' },
  title: {
    marginTop: 8,
    fontFamily: fonts.headingBold,
    fontSize: 23,
    lineHeight: 25,
    letterSpacing: -0.5,
    color: '#ffffff',
  },
  titleDot: { color: colors.black },
  text: { marginTop: 4, fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 10,
    paddingLeft: 12,
    paddingRight: 8,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.black,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 12.5, color: '#ffffff' },
})
