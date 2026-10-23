import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Menu } from 'lucide-react-native'
import { colors, fonts } from '../theme'
import { tr } from '../lib/i18n'

const BUTTON_SIZE = 44
const useNativeDriver = Platform.OS !== 'web'

// Yläpalkki Woltin kuljettaja-appin mallin mukaan: valikkonappi ja otsikkona
// kuljettajan oma katuosoite. hidden (online-tila): palkki liukuu pois ja
// kartan päälle jää vain valikkonappi - se pysyy paikallaan, ja harmaasta
// pallosta tulee valkoinen varjollinen pallo.
// onHeightChange: palkin korkeus (px), jotta kartta osaa keskittää sen alle.
export default function TopBar({ title, hidden = false, onMenuPress, onHeightChange }) {
  const insets = useSafeAreaInsets()
  const visible = useRef(new Animated.Value(hidden ? 0 : 1)).current
  const [height, setHeight] = useState(0)

  useEffect(() => {
    Animated.timing(visible, {
      toValue: hidden ? 0 : 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start()
  }, [hidden, visible])

  const translateY = visible.interpolate({ inputRange: [0, 1], outputRange: [-(height || 120), 0] })

  return (
    <>
      <Animated.View
        style={[
          styles.bar,
          { paddingTop: insets.top + 8, opacity: visible, transform: [{ translateY }] },
          // Piilotettu palkki ei saa estää kartan koskettamista sen kohdalta.
          { pointerEvents: hidden ? 'none' : 'auto' },
        ]}
        onLayout={(e) => {
          const nextHeight = e.nativeEvent.layout.height
          setHeight(nextHeight)
          onHeightChange?.(nextHeight)
        }}
      >
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </Animated.View>

      {/* Nappi on yksi pyöreä pallo, jonka oma tausta ja varjo piirtyvät aina
          kuvakkeen alle. (Erilliset taustakerrokset saattoivat Androidilla
          peittää kuvakkeen.) */}
      <Pressable
        onPress={onMenuPress}
        style={({ pressed }) => [
          styles.menuButton,
          { top: insets.top + 8 },
          hidden ? styles.menuButtonFloating : styles.menuButtonInBar,
          pressed && styles.menuButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={tr('common.openMenu')}
        hitSlop={8}
      >
        <Menu size={22} strokeWidth={2.2} color={colors.black} />
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Tila valikkonapille, joka on palkin päällä omana kerroksenaan.
    paddingLeft: 16 + BUTTON_SIZE + 12,
    paddingRight: 16,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    boxShadow: '0 1px 0 rgba(20, 21, 15, 0.08)',
  },
  row: {
    justifyContent: 'center',
    height: BUTTON_SIZE,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.black,
  },
  menuButton: {
    position: 'absolute',
    left: 16,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
  },
  menuButtonInBar: {
    backgroundColor: colors.gray100,
  },
  // Online-tilassa kartan päällä: valkoinen pallo, jonka varjo erottaa sen
  // vaaleasta kartasta.
  menuButtonFloating: {
    backgroundColor: colors.surface,
    boxShadow: '0 3px 12px rgba(20, 21, 15, 0.26)',
  },
  menuButtonPressed: {
    transform: [{ scale: 0.94 }],
  },
})
