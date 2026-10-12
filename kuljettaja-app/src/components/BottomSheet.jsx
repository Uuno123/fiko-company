import { useEffect, useRef, useState } from 'react'
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme'

const useNativeDriver = Platform.OS !== 'web'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// Alapaneeli, jonka voi vetää pienemmäksi ja isommaksi tai avata ja sulkea
// kahvaa napauttamalla. peek näkyy aina, children vain avattuna.
// onHeightChange: paneelin näkyvä korkeus (px) aina kun se asettuu uuteen kokoon.
export default function BottomSheet({ peek, children, onHeightChange }) {
  const insets = useSafeAreaInsets()
  const offset = useRef(new Animated.Value(0)).current
  const [sheetHeight, setSheetHeight] = useState(0)
  const [peekBottom, setPeekBottom] = useState(0)

  // Pienennettynä näkyy kahva ja peek-osa - loput paneelista liukuu ruudun alle.
  const maxOffset = sheetHeight && peekBottom ? Math.max(0, sheetHeight - (peekBottom + 16 + insets.bottom)) : 0
  const state = useRef({ value: 0, max: 0, expanded: true })
  state.current.max = maxOffset
  const reportHeight = useRef(onHeightChange)
  reportHeight.current = onHeightChange
  const sheetHeightRef = useRef(0)
  sheetHeightRef.current = sheetHeight

  function snapTo(expanded) {
    const s = state.current
    s.expanded = expanded
    s.value = expanded ? 0 : s.max
    Animated.spring(offset, { toValue: s.value, bounciness: 0, speed: 14, useNativeDriver }).start()
    reportHeight.current?.(sheetHeightRef.current - s.value)
  }

  // Sisällön korkeus voi muuttua (esim. online-tilassa eri teksti) - pienennetty
  // paneeli pysyy silloin oikeassa kohdassa.
  useEffect(() => {
    const s = state.current
    if (!s.expanded) {
      s.value = maxOffset
      offset.setValue(maxOffset)
    }
    if (sheetHeight) reportHeight.current?.(sheetHeight - s.value)
  }, [maxOffset, offset, sheetHeight])

  const pan = useRef(
    PanResponder.create({
      // Vain pystysuuntainen veto siirtää paneelia; napautukset menevät napeille.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
      onPanResponderGrant: () => offset.stopAnimation((value) => (state.current.value = value)),
      onPanResponderMove: (_, g) => offset.setValue(clamp(state.current.value + g.dy, 0, state.current.max)),
      onPanResponderRelease: (_, g) => {
        const s = state.current
        const position = clamp(s.value + g.dy, 0, s.max)
        snapTo(g.vy < -0.4 ? true : g.vy > 0.4 ? false : position < s.max / 2)
      },
      onPanResponderTerminate: () => snapTo(state.current.expanded),
    }),
  ).current

  return (
    <Animated.View
      style={[styles.sheet, { paddingBottom: insets.bottom + 8, transform: [{ translateY: offset }] }]}
      onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      {...pan.panHandlers}
    >
      <Pressable
        onPress={() => snapTo(!state.current.expanded)}
        style={styles.handleArea}
        accessibilityRole="button"
        accessibilityLabel="Suurenna tai pienennä paneeli"
        hitSlop={{ top: 8, bottom: 4 }}
      >
        <View style={styles.handle} />
      </Pressable>

      <View
        style={styles.peek}
        onLayout={(e) => setPeekBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
      >
        {peek}
      </View>

      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    boxShadow: '0 -4px 24px rgba(20, 21, 15, 0.14)',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d5d8dd',
  },
  peek: {
    paddingHorizontal: 20,
  },
})
