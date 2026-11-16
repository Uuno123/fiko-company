import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg'
import BidropLogo from './BidropLogo'
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

// Lohkojen värit vuorotellen: oranssi, kerma, musta, kerma.
const FILLS = [colors.orange, '#fff3ec', colors.black, '#fff3ec']
const INKS = ['#ffffff', colors.black, '#ffffff', colors.black]

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
export function WheelFace({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Circle cx={C} cy={C} r={R + 8} fill={colors.black} />
      {WHEEL_SEGMENTS.map((segment, i) => (
        <G key={segment.key}>
          <Path d={segmentPath(i)} fill={FILLS[i % 4]} />
          <G rotation={i * STEP + STEP / 2} origin={`${C}, ${C}`}>
            {segment.lines.map((line, row) => (
              <SvgText
                key={line}
                x={C}
                y={C - 100 + row * 14 - (segment.lines.length - 1) * 7}
                fill={INKS[i % 4]}
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
      {/* Valot reunalla */}
      {Array.from({ length: 16 }, (_, i) => {
        const [x, y] = point(i * 22.5, R + 4)
        return <Circle key={i} cx={x} cy={y} r={2.6} fill={i % 2 ? colors.orange : '#ffffff'} />
      })}
    </Svg>
  )
}

// Aikaa seuraavaan pyöräytykseen: uusi pyöräytys aukeaa paikallisena keskiyönä.
function msUntilMidnight(now = new Date()) {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next - now
}

const pad = (n) => String(n).padStart(2, '0')

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

  const total = Math.floor(left / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  return (
    <View style={styles.next}>
      <Text style={styles.nextLabel}>Voit pyöräyttää seuraavan kerran</Text>
      <Text style={styles.nextTime}>{`${pad(h)}:${pad(m)}:${pad(sec)}`}</Text>
      <Text style={styles.nextSub}>huomenna klo 00.00</Text>
    </View>
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
    <View style={[styles.card, style]}>
      {/* Oranssi kortti (käyttäjän pyyntö 16.11.2026): valkoinen otsikko, musta piste. */}
      {/* Otsikko keskitettynä pyörän kanssa: pieni musta merkki, iso otsikko. */}
      <View style={styles.eyebrow}>
        <Text style={styles.eyebrowText}>KERRAN PÄIVÄSSÄ</Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        Päivän onnenpyörä<Text style={styles.titleDot}>.</Text>
      </Text>
      <Text style={styles.text}>Voita ilmainen ruoka, kuljetus tai alennus.</Text>

      <View style={styles.wheelWrap}>
        <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ rotate }] }}>
          <WheelFace size={SIZE} />
        </Animated.View>

        {/* Osoitin ylhäällä */}
        <Svg width={34} height={30} viewBox="0 0 34 30" style={styles.pointer}>
          <Polygon points="17,28 3,4 31,4" fill={colors.black} stroke="#ffffff" strokeWidth={3} strokeLinejoin="round" />
        </Svg>

        {/* Keskinappi */}
        <Pressable
          onPress={spin}
          disabled={phase === 'spinning' || phase === 'loading' || phase === 'done'}
          style={({ pressed }) => [styles.hub, pressed && { transform: [{ scale: 0.95 }] }]}
          accessibilityRole="button"
          accessibilityLabel={userId ? 'Pyöritä onnenpyörää' : 'Kirjaudu pyöräyttääksesi'}
        >
          {phase === 'done' ? (
            <BidropLogo size={11} dark style={{ alignSelf: 'center' }} />
          ) : (
            <Text style={styles.hubText}>{userId ? 'PYÖRITÄ' : 'KIRJAUDU'}</Text>
          )}
        </Pressable>
      </View>

      {phase === 'done' && result ? (
        <View style={[styles.result, won && styles.resultWon]}>
          <Text style={[styles.resultTitle, won && styles.resultTitleWon]}>
            {won ? `Voitit: ${result.prize}!` : 'Ei tällä kertaa.'}
          </Text>
          <Text style={[styles.resultText, won && styles.resultTextWon]}>
            {won ? 'Etu tallentui tilillesi seuraavaa tilausta varten.' : 'Onni kääntyy vielä.'}
          </Text>
        </View>
      ) : null}
      {phase === 'done' && result ? (
        <NextSpin
          onReady={() => {
            rotation.setValue(0)
            setResult(null)
            setPhase('ready')
          }}
        />
      ) : (
        <Text style={styles.hint}>
          {userId ? 'Paina keskeltä ja jännitä.' : 'Kirjaudu sisään, niin voitot tallentuvat tilillesi.'}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 34,
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 24,
    backgroundColor: colors.orange,
  },
  eyebrow: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.black,
  },
  eyebrowText: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 1.4, color: '#ffffff' },
  title: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: fonts.headingBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: '#ffffff',
  },
  titleDot: { color: colors.black },
  text: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  wheelWrap: { alignSelf: 'center', width: SIZE, height: SIZE, marginTop: 22 },
  pointer: { position: 'absolute', top: -12, left: SIZE / 2 - 17 },
  hub: {
    position: 'absolute',
    top: SIZE / 2 - 36,
    left: SIZE / 2 - 36,
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    borderRadius: 36,
    backgroundColor: colors.black,
    boxShadow: '0 4px 14px rgba(20, 21, 15, 0.35)',
  },
  hubText: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, color: '#ffffff' },
  next: { marginTop: 18, alignItems: 'center' },
  nextLabel: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' },
  nextTime: {
    marginTop: 2,
    fontFamily: fonts.headingBold,
    fontSize: 34,
    letterSpacing: 1,
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  nextSub: { marginTop: 1, fontFamily: fonts.medium, fontSize: 12.5, color: 'rgba(255, 255, 255, 0.75)' },
  hint: { marginTop: 16, textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: '#ffffff' },
  result: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.surface },
  resultWon: { backgroundColor: colors.black },
  resultTitle: { textAlign: 'center', fontFamily: fonts.heading, fontSize: 19, color: colors.black },
  resultTitleWon: { color: '#ffffff' },
  resultText: { marginTop: 3, textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  resultTextWon: { color: 'rgba(255, 255, 255, 0.9)' },
})
