import { useEffect, useRef, useState } from 'react'
import { Animated, BackHandler, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton } from './ui'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'

// Kirjautumisen, rekisteröitymisen ja salasanan palautuksen runko:
// takaisin-nappi (ja rekisteröitymisessä edistymispalkki), iso otsikko ja
// lyhyt alaotsikko, lomake ja alareunaan kiinnitetty päänappi, joka nousee
// näppäimistön yläpuolelle (Expon ohje: KeyboardAvoidingView, iOS padding).
//   step / steps: edistymispalkin vaihe (1..steps), ilman niitä ei palkkia
//   stepKey: vaihtuessa sisältö liukuu sisään (rekisteröitymisen vaiheet)
// Androidin takaisin-nappi tekee saman kuin näkymän nuoli (onBack), esim.
// palaa koodista sähköpostivaiheeseen.
export default function AuthLayout({ title, subtitle, onBack, step, steps, stepKey, children, footer }) {
  const insets = useSafeAreaInsets()
  const [enter] = useState(() => new Animated.Value(1))

  const backRef = useRef(onBack)
  useEffect(() => {
    backRef.current = onBack
  })
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      backRef.current()
      return true
    })
    return () => subscription.remove()
  }, [])

  // Uusi vaihe liukuu kevyesti oikealta ja häivyttyy esiin.
  useEffect(() => {
    if (stepKey === undefined) return
    enter.setValue(0)
    Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver }).start()
  }, [stepKey, enter])

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={onBack} />
        {steps ? <Progress step={step} steps={steps} /> : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: enter,
            transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}
        >
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (typeof subtitle === 'string' ? <Text style={styles.subtitle}>{subtitle}</Text> : subtitle) : null}
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </ScrollView>

      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  )
}

// Edistymispalkki osina: valmiit ja nykyinen vaihe oransseina.
function Progress({ step, steps }) {
  return (
    <View
      style={styles.progress}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Vaihe ${step}/${steps}`}
      accessibilityValue={{ min: 1, max: steps, now: step }}
    >
      {Array.from({ length: steps }, (_, index) => (
        <View key={index} style={[styles.progressPart, index < step && styles.progressPartDone]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    // Sama leveys oikealla kuin takaisin-napilla vasemmalla: palkki pysyy keskellä.
    marginRight: 44,
  },
  progressPart: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray100,
  },
  progressPartDone: {
    backgroundColor: colors.orange,
  },
  content: {
    flexGrow: 1,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.black,
  },
  subtitle: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.textMuted,
  },
  body: {
    gap: 18,
    marginTop: 28,
  },
  footer: {
    gap: 6,
    paddingTop: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
  },
})
