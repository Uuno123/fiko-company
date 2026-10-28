import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check } from 'lucide-react-native'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
const ROW_HEIGHT = 54
// Näin pitkä veto alas (tai nopea pyyhkäisy) sulkee paneelin, lyhyempi palauttaa sen.
const CLOSE_DISTANCE = 80
const CLOSE_VELOCITY = 0.6

// Alhaalta nouseva valintalista (esim. syntymäajan päivä, kuukausi ja vuosi),
// kuten kuljettajasovelluksen ChoiceSheet: tausta tummuu, valinta sulkee
// paneelin, samoin taustan napautus, Androidin takaisin-nappi ja veto alas
// kahvasta tai otsikosta. Pitkä lista vierii ja avautuu valitun kohdalta.
// options: [{ key, label }].
export default function OptionSheet({ visible, title, options, value, onSelect, onClose }) {
  const insets = useSafeAreaInsets()
  const windowSize = useWindowDimensions()
  const backdropHeight = Math.max(windowSize.height, Dimensions.get('screen').height)
  const listHeight = Math.min(options.length * ROW_HEIGHT, windowSize.height * 0.55)
  const [progress] = useState(() => new Animated.Value(0))
  const [sheetHeight, setSheetHeight] = useState(400)

  // Sulkeutuessa Modal pysyy näkyvissä, kunnes paneeli on liukunut alas.
  const [prevVisible, setPrevVisible] = useState(visible)
  const [closing, setClosing] = useState(false)
  if (visible !== prevVisible) {
    setPrevVisible(visible)
    setClosing(!visible)
  }

  const latest = useRef({ onClose, sheetHeight, visible })
  useEffect(() => {
    latest.current = { onClose, sheetHeight, visible }
  })

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 280 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver,
    }).start(() => {
      if (!latest.current.visible) setClosing(false)
    })
  }, [visible, progress])

  // Ele luetaan vain vedon aikana, ei piirrossa.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    const springBack = () => Animated.spring(progress, { toValue: 1, bounciness: 0, speed: 18, useNativeDriver }).start()
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => progress.stopAnimation(),
      onPanResponderMove: (_, g) => progress.setValue(Math.min(1, Math.max(0, 1 - Math.max(0, g.dy) / latest.current.sheetHeight))),
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) latest.current.onClose()
        else springBack()
      },
      onPanResponderTerminate: springBack,
    })
  })

  const selectedIndex = Math.max(0, options.findIndex((option) => option.key === value))
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] })

  return (
    <Modal visible={visible || closing} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { height: backdropHeight, opacity: progress }]}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onClose}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Sulje"
          onAccessibilityTap={onClose}
        />
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY }] }]}
          onLayout={(e) => setSheetHeight(Math.max(1, e.nativeEvent.layout.height))}
        >
          <View {...pan.panHandlers} style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
          </View>
          <FlatList
            style={{ height: listHeight }}
            data={options}
            keyExtractor={(option) => String(option.key)}
            getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
            initialScrollIndex={Math.max(0, selectedIndex - 2)}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected = item.key === value
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.key)
                    onClose()
                  }}
                  style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
                  accessibilityRole="radio"
                  aria-checked={selected}
                >
                  <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{item.label}</Text>
                  {selected ? <Check size={20} strokeWidth={2.4} color={colors.orange} /> : null}
                </Pressable>
              )
            }}
          />
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 21, 15, 0.55)',
  },
  sheet: {
    paddingHorizontal: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray200,
  },
  title: {
    marginTop: 16,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.black,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ROW_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowSelected: {
    backgroundColor: '#fff4ef',
  },
  rowPressed: {
    backgroundColor: colors.gray50,
  },
  rowText: {
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.black,
  },
  rowTextSelected: {
    fontFamily: fonts.semibold,
    color: colors.orangeDark,
  },
})
