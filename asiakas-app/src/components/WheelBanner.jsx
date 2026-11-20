import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { WheelFace } from './FortuneWheel'
import { loadTodaysSpin } from '../lib/fortuneWheel'
import { colors, fonts } from '../theme'

function msUntilMidnight(now = new Date()) {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next - now
}

function leftText(ms) {
  const minutes = Math.ceil(ms / 60000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

// Etusivun onnenpyörärivi (20.11.2026, vähemmän tekoälymäinen): hillitty
// harmaa rivi kuten sovelluksen muut linkit - pieni pyörä, otsikko, yksi rivi
// ja nuoli. Pyöräyttäneelle rivillä aika seuraavaan pyöräytykseen.
export default function WheelBanner({ onPress, userId }) {
  const [spunToday, setSpunToday] = useState(false)
  const [left, setLeft] = useState(() => msUntilMidnight())

  // Tila tarkistetaan aina kun etusivu tulee esiin (esim. pyöräytyssivulta palatessa).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      if (!userId) {
        Promise.resolve().then(() => !cancelled && setSpunToday(false))
      } else {
        loadTodaysSpin(userId).then((saved) => !cancelled && setSpunToday(Boolean(saved)))
      }
      return () => {
        cancelled = true
      }
    }, [userId]),
  )

  useEffect(() => {
    if (!spunToday) return undefined
    const timer = setInterval(() => {
      const ms = msUntilMidnight()
      if (ms > 23.99 * 3600 * 1000) setSpunToday(false)
      setLeft(ms)
    }, 30_000)
    return () => clearInterval(timer)
  }, [spunToday])

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.gray200 }]}
      accessibilityRole="button"
      accessibilityLabel={spunToday ? `Onnenpyörä, uusi pyöräytys ${leftText(left)} päästä` : 'Onnenpyörä, pyöräytä kerran päivässä'}
    >
      <WheelFace size={46} palette="light" labels={false} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Onnenpyörä</Text>
        <Text style={styles.text}>
          {spunToday ? `Uusi pyöräytys ${leftText(left)} päästä` : 'Pyöräytä kerran päivässä'}
        </Text>
      </View>
      <ChevronRight size={18} strokeWidth={2.2} color={colors.textMuted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 34,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.gray100,
  },
  title: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.black },
  text: { marginTop: 1, fontFamily: fonts.regular, fontSize: 13.5, color: colors.textMuted },
})
