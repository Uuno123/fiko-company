import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg'
import {
  WHEEL_SEGMENTS,
  drawSegmentIndex,
  loadTodaysSpin,
  saveTodaysSpin,
} from '../lib/fortuneWheel'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
const SIZE = 280
const C = 150 // keskipiste viewBoxissa 0 0 300 300
const R = 138
const STEP = 360 / WHEEL_SEGMENTS.length

// Kaksi väriä vuorotellen (20.11.2026). light: pyöräytyssivun valkoisella
// pohjalla oranssi/kerma, dark: etusivun oranssissa bannerissa musta/kerma.
const PALETTES = {
  light: { fills: [colors.orange, '#fff3ec'], inks: ['#ffffff', colors.black], rim: colors.black },
  dark: { fills: [colors.black, '#fff3ec'], inks: ['#ffffff', colors.black], rim: colors.black },
}

function point(angle, radius) {
  const rad = (angle * Math.PI) / 180
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)]
}

function segmentPath(index) {
  const [x1, y1] = point(index * STEP, R)
  const [x2, y2] = point((index + 1) * STEP, R)
  return `M${C},${C} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z`
}

// Pyörän kuva ilman toimintoja: käytössä myös etusivun bannerissa.
// labels=false: pieni kuvake ilman lohkojen tekstejä (etusivun rivi).
export function WheelFace({ size, palette = 'dark', labels = true }) {
  const { fills, inks, rim } = PALETTES[palette] ?? PALETTES.dark
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Circle cx={C} cy={C} r={R + 5} fill={rim} />
      {WHEEL_SEGMENTS.map((segment, i) => (
        <G key={segment.key}>
          <Path d={segmentPath(i)} fill={fills[i % 2]} />
          <G rotation={i * STEP + STEP / 2} origin={`${C}, ${C}`}>
            {(labels ? segment.lines : []).map((line, row) => (
              <SvgText
                key={line}
                x={C}
                y={C - 100 + row * 14 - (segment.lines.length - 1) * 7}
                fill={inks[i % 2]}
                fontSize={segment.lines.length > 1 ? 11.5 : 15}
                fontFamily={fonts.bold}
                fontWeight="700"
                textAnchor="middle"
              >
                {line}
              </SvgText>
            ))}
          </G>
        </G>
      ))}
    </Svg>
  )
}

// Aikaa seuraavaan pyöräytykseen: uusi pyöräytys aukeaa paikallisena keskiyönä.
function msUntilMidnight(now = new Date()) {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next - now
}


// Pyöräyttäneelle (käyttäjän pyyntö 16.11.2026): milloin voi pyöräyttää
// seuraavan kerran ja laskuri sekunnin tarkkuudella.
function NextSpin({ onReady }) {
  const [left, setLeft] = useState(() => msUntilMidnight())
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    const timer = setInterval(() => {
      const ms = msUntilMidnight()
      // Keskiyö ohitettu: laskuri hyppää ~24 h:iin, pyörä avautuu uudelleen.
      if (ms > 23.99 * 3600 * 1000) {
        clearInterval(timer)
        readyRef.current?.()
        return
      }
      setLeft(ms)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const minutes = Math.ceil(left / 60000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return (
    <Text style={styles.next}>
      Uusi pyöräytys {h > 0 ? `${h} h ${m} min` : `${m} min`} päästä.
    </Text>
  )
}

// Päivän onnenpyörä (käyttäjän pyyntö 16.11.2026): kerran päivässä,
// voitto hyvin epätodennäköinen (lib/fortuneWheel.js). Kirjautumaton ohjataan
// kirjautumaan, koska etu kuuluu tilille.
export default function FortuneWheel({ userId, onLogin, style }) {
  const rotation = useRef(new Animated.Value(0)).current
  const [phase, setPhase] = useState('loading') // loading | ready | spinning | done
  const [result, setResult] = useState(null)

  // Tämän päivän pyöräytys: pyörä jää tulokseen eikä pyöri uudelleen.
  useEffect(() => {
    let cancelled = false
    if (!userId) {
      Promise.resolve().then(() => !cancelled && setPhase('ready'))
      return () => {
        cancelled = true
      }
    }
    loadTodaysSpin(userId).then((saved) => {
      if (cancelled) return
      const index = saved ? WHEEL_SEGMENTS.findIndex((s) => s.key === saved.segmentKey) : -1
      if (index >= 0) {
        rotation.setValue(-(index * STEP + STEP / 2))
        setResult(WHEEL_SEGMENTS[index])
        setPhase('done')
      } else setPhase('ready')
    })
    return () => {
      cancelled = true
    }
  }, [userId, rotation])

  function spin() {
    if (!userId) {
      onLogin?.()
      return
    }
    if (phase !== 'ready') return
    const index = drawSegmentIndex()
    const segment = WHEEL_SEGMENTS[index]
    // Lohkon keskikohta osoittimen alle, pieni satunnainen poikkeama ja
    // viisi täyttä kierrosta ennen pysähtymistä.
    const jitter = (Math.random() - 0.5) * STEP * 0.6
    const target = 360 * 5 - (index * STEP + STEP / 2) + jitter
    setPhase('spinning')
    rotation.setValue(0)
    Animated.timing(rotation, {
      toValue: target,
      duration: 5200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start(() => {
      setResult(segment)
      setPhase('done')
      saveTodaysSpin(userId, segment.key)
    })
  }

  const rotate = rotation.interpolate({ inputRange: [-360, 0, 360], outputRange: ['-360deg', '0deg', '360deg'], extrapolate: 'extend' })
  const won = Boolean(result?.prize)

  return (
    <View style={[styles.wrap, style]}>
      {/* Tavallinen sivu (20.11.2026, vähemmän tekoälymäinen): vasemmalle
          tasattu otsikko, pyörä, tulos tekstinä ja palkinnot listana. */}
      <Text style={styles.title} accessibilityRole="header">
        Onnenpyörä
      </Text>
      <Text style={styles.text}>Pyöräytä kerran päivässä. Voitto tulee tilillesi seuraavaa tilausta varten.</Text>

      <View style={styles.wheelWrap}>
        <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ rotate }] }}>
          <WheelFace size={SIZE} palette="light" />
        </Animated.View>

        {/* Osoitin ylhäällä */}
        <Svg width={22} height={20} viewBox="0 0 22 20" style={styles.pointer}>
          <Polygon points="11,19 2,2 20,2" fill={colors.black} />
        </Svg>

        {/* Keskinappi */}
        <Pressable
          onPress={spin}
          disabled={phase === 'spinning' || phase === 'loading' || phase === 'done'}
          style={({ pressed }) => [styles.hub, phase === 'done' && styles.hubDone, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={userId ? 'Pyöritä onnenpyörää' : 'Kirjaudu pyöräyttääksesi'}
        >
          <Text style={[styles.hubText, phase === 'done' && styles.hubTextDone]}>
            {phase === 'done' ? 'Huomenna' : userId ? 'Pyöritä' : 'Kirjaudu'}
          </Text>
        </Pressable>
      </View>

      {phase === 'done' && result ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>{won ? `Voitit: ${result.prize}.` : 'Ei voittoa tänään.'}</Text>
          {won ? <Text style={styles.resultText}>Etu on tililläsi ja näkyy kassalla.</Text> : null}
          <NextSpin
            onReady={() => {
              rotation.setValue(0)
              setResult(null)
              setPhase('ready')
            }}
          />
        </View>
      ) : (
        <Text style={styles.hint}>{userId ? 'Paina keskeltä.' : 'Kirjaudu sisään pyöräyttääksesi.'}</Text>
      )}

      <Text style={styles.prizesTitle}>Palkinnot</Text>
      {PRIZES.map((prize) => (
        <View key={prize} style={styles.prizeRow}>
          <View style={styles.prizeDot} />
          <Text style={styles.prizeText}>{prize}</Text>
        </View>
      ))}
    </View>
  )
}

// Palkinnot listana (sama järjestys kuin arvon todennäköisyys, harvinaisin ensin).
const PRIZES = [
  'Ilmainen ruoka, enintään 15 €',
  'Ilmainen kuljetus',
  '−15 % seuraavasta tilauksesta',
  '−2 € seuraavasta tilauksesta',
]

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  title: { fontFamily: fonts.headingBold, fontSize: 28, letterSpacing: -0.6, color: colors.black },
  text: { marginTop: 4, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 20, color: colors.textMuted },
  wheelWrap: { alignSelf: 'center', width: SIZE, height: SIZE, marginTop: 30 },
  pointer: { position: 'absolute', top: -6, left: SIZE / 2 - 11 },
  hub: {
    position: 'absolute',
    top: SIZE / 2 - 34,
    left: SIZE / 2 - 34,
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 34,
    backgroundColor: colors.black,
  },
  hubDone: { backgroundColor: '#ffffff', borderColor: colors.black },
  hubText: { fontFamily: fonts.semibold, fontSize: 13, color: '#ffffff' },
  hubTextDone: { fontSize: 10, color: colors.textMuted },
  hint: { marginTop: 20, textAlign: 'center', fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  result: { marginTop: 22, alignItems: 'center' },
  resultTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.black, textAlign: 'center' },
  resultText: { marginTop: 2, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  next: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  prizesTitle: { marginTop: 34, marginBottom: 6, fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  prizeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
  prizeText: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.black },
})
