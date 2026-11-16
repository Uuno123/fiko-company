import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { House, Search, ShoppingCart } from 'lucide-react-native'
import { colors, fonts } from '../theme'

// Leijuva lasinen alapalkki Uber Eatsin mallin mukaan (käyttäjän pyyntö
// 15.11.2026): vasemmalla pyöreä Koti-nappi, keskellä leveä "Haku"-pilleri ja
// oikealla pyöreä ostoskori-nappi - kolme erillistä valkoista palaa varjolla
// (ei lasia, käyttäjän tarkennus 15.11.2026).
export const GLASS_TAB_BAR_SPACE = 88

const SIZE = 48

function Glass({ style, children }) {
  return <View style={[styles.glass, style]}>{children}</View>
}

export default function GlassTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets()
  const current = state.routes[state.index]?.name

  const go = (name) => {
    const route = state.routes.find((r) => r.name === name)
    if (!route) return
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
    if (current !== name && !event.defaultPrevented) navigation.navigate(name)
  }

  const iconColor = (name) => (current === name ? colors.black : '#3d3f3a')

  const bottom = Math.max(insets.bottom, 12) + 4

  return (
    <>
    {/* Valkoinen pohja nappien takana (käyttäjän pyyntö 15.11.2026): sisältö
        häviää siististi valkoiseen eikä näy nappien välistä. */}
    <View pointerEvents="none" style={[styles.fade, { height: bottom + SIZE + 28 }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="tabbar-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="0.45" stopColor="#ffffff" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#tabbar-fade)" />
      </Svg>
    </View>
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Pressable
        onPress={() => go('ravintolat')}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole="tab"
        accessibilityState={{ selected: current === 'ravintolat' }}
        accessibilityLabel="Koti"
      >
        <Glass style={styles.circle}>
          <View style={styles.center}>
            <House size={20} strokeWidth={current === 'ravintolat' ? 2.4 : 2} color={iconColor('ravintolat')} />
          </View>
        </Glass>
      </Pressable>

      <Pressable
        onPress={() => go('haku')}
        style={({ pressed }) => [{ flex: 1 }, pressed && styles.pressed]}
        accessibilityRole="tab"
        accessibilityState={{ selected: current === 'haku' }}
        accessibilityLabel="Haku"
      >
        <Glass style={styles.pill}>
          <View style={styles.pillInner}>
            <Search size={18} strokeWidth={current === 'haku' ? 2.6 : 2.2} color={iconColor('haku')} />
            <Text style={[styles.pillText, current === 'haku' && styles.pillTextActive]}>Haku</Text>
          </View>
        </Glass>
      </Pressable>

      <Pressable
        onPress={() => go('ostoskori')}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole="tab"
        accessibilityState={{ selected: current === 'ostoskori' }}
        accessibilityLabel="Ostoskori"
      >
        <Glass style={styles.circle}>
          <View style={styles.center}>
            <ShoppingCart size={20} strokeWidth={current === 'ostoskori' ? 2.4 : 2} color={iconColor('ostoskori')} />
          </View>
        </Glass>
      </Pressable>
    </View>
    </>
  )
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  wrap: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  glass: {
    borderRadius: SIZE / 2,
    backgroundColor: colors.surface,
    boxShadow: '0 4px 16px rgba(20, 21, 15, 0.12)',
  },
  circle: { width: SIZE, height: SIZE },
  pill: { height: SIZE },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pillInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18 },
  pillText: { fontFamily: fonts.medium, fontSize: 15, color: '#3d3f3a' },
  pillTextActive: { fontFamily: fonts.semibold, color: colors.black },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
})
