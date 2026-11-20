import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, G, RadialGradient, Stop } from 'react-native-svg'
import { colors, fonts } from '../theme'

const SIZE = 210
const DIAL_INSET = 30
const R = 84
const CIRC = 2 * Math.PI * R

// Woltin tapaan aikaikkuna ("15–20") eikä yksittäinen minuutti - sama kuin
// verkkosivun OrderCountdownRing.
function minutesRange(minutes) {
  if (minutes <= 5) return 'Alle 5'
  const low = Math.floor(minutes / 5) * 5
  return `${low}–${low + 5}`
}

// Kolmiulotteinen aikalaskuri kuten verkkosivun seurannassa (12.11.2026):
// valosta varjoon kulkeva levy, sisään painunut kellotaulu ja oranssi kaari,
// joka täyttyy tilauksesta arvioituun aikaan. Päivittyy 30 s välein.
export default function CountdownClock({ createdAt, arrivalAt, deliveryMethod }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const start = new Date(createdAt).getTime()
  const end = new Date(arrivalAt).getTime()
  const total = Math.max(end - start, 1)
  const remaining = Math.max(end - now, 0)
  const minutes = Math.max(Math.ceil(remaining / 60000), 0)
  const progress = Math.min(Math.max(1 - remaining / total, 0), 1)
  const due = remaining <= 0
  const unit = deliveryMethod === 'pickup' ? 'minuuttia noutoon' : 'minuuttia toimitukseen'

  return (
    <View style={styles.disc}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="disc" cx="30%" cy="22%" r="85%">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="0.45" stopColor="#f6f5f2" />
            <Stop offset="1" stopColor="#e6e3dd" />
          </RadialGradient>
          <RadialGradient id="dial" cx="50%" cy="35%" r="70%">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="0.7" stopColor="#f7f6f3" />
            <Stop offset="1" stopColor="#ebe8e2" />
          </RadialGradient>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#disc)" />
        {/* Sisään painunut kellotaulu: tumma reuna ylhäällä, vaalea alhaalla */}
        <Circle cx={SIZE / 2} cy={SIZE / 2 + 1} r={SIZE / 2 - DIAL_INSET + 1} fill="rgba(20, 21, 15, 0.08)" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - DIAL_INSET} fill="url(#dial)" />
        <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(20, 21, 15, 0.07)" strokeWidth={9} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.orange}
            strokeWidth={9}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={CIRC * (1 - progress)}
          />
        </G>
      </Svg>
      <View style={styles.center}>
        {due ? (
          <Text style={styles.due}>Kohta perillä</Text>
        ) : (
          <>
            <Text style={styles.number}>{minutesRange(minutes)}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  disc: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZE / 2,
    boxShadow: '0 2px 4px rgba(20, 21, 15, 0.08), 0 14px 28px -10px rgba(20, 21, 15, 0.35), 0 30px 50px -24px rgba(244, 80, 30, 0.35)',
  },
  center: { alignItems: 'center', paddingHorizontal: 40 },
  number: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 40,
    letterSpacing: -0.8,
    color: colors.black,
    textShadowColor: 'rgba(20, 21, 15, 0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  unit: { marginTop: 2, maxWidth: 110, textAlign: 'center', fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 16, color: colors.textMuted },
  due: { fontFamily: fonts.headingBold, fontSize: 19, color: '#1f8a4c', textAlign: 'center' },
})
