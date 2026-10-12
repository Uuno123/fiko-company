import { useRef, useState } from 'react'
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { ChevronRight } from 'lucide-react-native'
import { fonts } from '../theme'

const KNOB = 56
const PAD = 4
const useNativeDriver = Platform.OS !== 'web'

// Liukukytkin Woltin "Slide to go online" -mallin mukaan. Pallon voi vetää
// loppuun tai kytkintä voi napauttaa - molemmat vahvistavat. haptics: värähdys
// vahvistettaessa (asetus).
export default function SlideToConfirm({ label, color, onConfirm, haptics = true }) {
  const [trackWidth, setTrackWidth] = useState(0)
  const x = useRef(new Animated.Value(0)).current
  const maxX = Math.max(0, trackWidth - KNOB - PAD * 2)
  // PanResponder luodaan kerran, joten se lukee tuoreet arvot tästä.
  const latest = useRef({ maxX, onConfirm, haptics })
  latest.current = { maxX, onConfirm, haptics }
  const busy = useRef(false)

  function finish() {
    if (busy.current) return
    busy.current = true
    Animated.timing(x, { toValue: latest.current.maxX, duration: 160, useNativeDriver }).start(() => {
      if (latest.current.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      latest.current.onConfirm()
      // Pallo palaa alkuun vasta kun kytkimen uusi teksti on jo näkyvissä.
      setTimeout(() => {
        x.setValue(0)
        busy.current = false
      }, 300)
    })
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !busy.current,
      onMoveShouldSetPanResponder: () => !busy.current,
      // Alapaneelin vetäminen ei saa viedä kosketusta kesken liu'utuksen.
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(Math.min(Math.max(g.dx, 0), latest.current.maxX)),
      onPanResponderRelease: (_, g) => {
        const tap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6
        if (tap || g.dx > latest.current.maxX * 0.7) finish()
        else Animated.spring(x, { toValue: 0, bounciness: 6, useNativeDriver }).start()
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver }).start(),
    }),
  ).current

  const labelOpacity = x.interpolate({
    inputRange: [0, Math.max(1, maxX * 0.6)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  return (
    <View
      style={[styles.track, { backgroundColor: color }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      onAccessibilityTap={finish}
      {...pan.panHandlers}
    >
      <Animated.Text style={[styles.label, { opacity: labelOpacity }]} numberOfLines={1}>
        {label}
      </Animated.Text>
      <Animated.View style={[styles.knob, { transform: [{ translateX: x }] }]}>
        <ChevronRight size={28} strokeWidth={2.4} color={color} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
    height: KNOB + PAD * 2,
    borderRadius: (KNOB + PAD * 2) / 2,
    overflow: 'hidden',
  },
  label: {
    paddingLeft: KNOB + PAD,
    paddingRight: 16,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#ffffff',
  },
  knob: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    alignItems: 'center',
    justifyContent: 'center',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#ffffff',
  },
})
