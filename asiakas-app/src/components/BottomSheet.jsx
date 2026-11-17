import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
const EASE_OUT = Easing.out(Easing.cubic)

// Yleinen alapaneeli (17.11.2026) samoilla opeilla kuin osoitepaneeli
// (AddressSheet.jsx): tausta tummenee, paneeli liukuu alhaalta, sulkeutuu
// pyyhkäisemällä alas, taustasta tai X:stä. Taustalla erilliset reunat
// (RN 0.88:ssa ei StyleSheet.absoluteFillObjectia).
// dragFromHeaderOnly: vieritettävä sisältö (suodatus) - paneelia vedetään
// alas vain yläosasta. footer: kiinteä alarivi vieritettävän sisällön alla.
export default function BottomSheet({ visible, onClose, title, children, footer, dragFromHeaderOnly = false }) {
  const insets = useSafeAreaInsets()
  const screenHeight = Dimensions.get('window').height
  const slide = useRef(new Animated.Value(screenHeight)).current
  const fade = useRef(new Animated.Value(0)).current
  const [mounted, setMounted] = useState(visible)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const dragFromHeaderOnlyRef = useRef(dragFromHeaderOnly)
  dragFromHeaderOnlyRef.current = dragFromHeaderOnly

  useEffect(() => {
    if (visible) setMounted(true)
    else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, { toValue: screenHeight, duration: 160, useNativeDriver }),
        Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: false }),
      ]).start(() => setMounted(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    if (!mounted || !visible) return
    slide.setValue(screenHeight)
    fade.setValue(0)
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 220, easing: EASE_OUT, useNativeDriver }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, visible])

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !dragFromHeaderOnlyRef.current && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => slide.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.8) closeRef.current()
        else Animated.timing(slide, { toValue: 0, duration: 160, easing: EASE_OUT, useNativeDriver }).start()
      },
    }),
  ).current

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Sulje" />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.anchor}>
        <Animated.View
          {...(dragFromHeaderOnly ? {} : pan.panHandlers)}
          style={[
            styles.sheet,
            {
              maxHeight: screenHeight - insets.top - 40,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View {...(dragFromHeaderOnly ? pan.panHandlers : {})}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Sulje"
            >
              <X size={18} strokeWidth={2.2} color={colors.black} />
            </Pressable>
          </View>
          </View>
          {children}
          {footer ?? null}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 16, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.surface },
  handle: { alignSelf: 'center', width: 38, height: 4, marginTop: 8, borderRadius: 2, backgroundColor: '#d9d9d6' },
  head: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  title: { flex: 1, fontFamily: fonts.headingBold, fontSize: 21, letterSpacing: -0.3, color: colors.black },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
})
