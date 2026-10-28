import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { LOGO_DESCENT, LOGO_HEIGHT, LOGO_LETTERS_PATH, LOGO_ORANGE, LOGO_WIDTH } from '../../../frontend/src/lib/logoPaths'
import FoodCollage from '../components/FoodCollage'
import { Button } from '../components/ui'
import { nextPath, useAuth } from '../lib/auth'
import { colors, fonts } from '../theme'

// Alkunäyttö ja sen aloitusanimaatio.
//
// Animaatio jatkaa käynnistysnäytöstä (valkoinen, oranssi piste keskellä):
// piste ottaa vauhtia, hyppää kaarena Bidrop-sanamerkin i:n pisteeksi ja
// kirjaimet nousevat esiin. Sitten logo liukuu ja pienenee paikalleen
// tekstiosan yläreunaan, ja ruokakuvat ja napit tulevat näkyviin.
// Animaatio näytetään kerran käynnistyksessä; takaisin palatessa ja kun
// puhelimessa on vähennetty liikettä, näkymä on heti valmis. Kirjautunut
// ohjataan suoraan eteenpäin (kesken jäänyt rekisteröityminen jatkuu).

// i:n piste sanamerkissä (LOGO_ACCENT_PATH): keskipiste ja halkaisija logon yksiköissä.
const DOT = { x: 73.8, y: 12.62, size: 18.8 }
// Käynnistysnäytön pisteen koko (app.json, expo-splash-screen imageWidth).
const SPLASH_DOT = 26
const INTRO_WIDTH = 220
const FINAL_WIDTH = 120
const JUMP = 76

const introLogo = {
  width: INTRO_WIDTH,
  height: (INTRO_WIDTH * LOGO_HEIGHT) / LOGO_WIDTH,
}
const dot = {
  x: (DOT.x / LOGO_WIDTH) * INTRO_WIDTH,
  y: (DOT.y / LOGO_HEIGHT) * introLogo.height,
  size: (DOT.size / LOGO_WIDTH) * INTRO_WIDTH,
}
// Piste lähtee logon keskeltä (= näytön keskeltä) käynnistysnäytön kokoisena.
const DOT_START = {
  x: introLogo.width / 2 - dot.x,
  y: introLogo.height / 2 - dot.y,
  scale: SPLASH_DOT / dot.size,
}

const useNativeDriver = Platform.OS !== 'web'
let introPlayed = false

export default function StartScreen() {
  const router = useRouter()
  const { session, customer, customerReady } = useAuth()
  const insets = useSafeAreaInsets()
  const windowSize = useWindowDimensions()
  const [screen, setScreen] = useState(null)
  const [panelTop, setPanelTop] = useState(null)
  const [slot, setSlot] = useState(null)
  const [reduceMotion, setReduceMotion] = useState(null)

  const [anim] = useState(() => ({
    dotX: new Animated.Value(introPlayed ? 0 : DOT_START.x),
    dotY: new Animated.Value(introPlayed ? 0 : DOT_START.y),
    dotScale: new Animated.Value(introPlayed ? 1 : DOT_START.scale),
    // -1 venyy pystyyn (lennossa), 0 pyöreä, 1 litistyy (ponnistus ja lasku).
    squash: new Animated.Value(0),
    letters: new Animated.Value(introPlayed ? 1 : 0),
    move: new Animated.Value(introPlayed ? 1 : 0),
    reveal: new Animated.Value(introPlayed ? 1 : 0),
  }))

  useEffect(() => {
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => !cancelled && setReduceMotion(enabled))
      .catch(() => !cancelled && setReduceMotion(false))
    return () => {
      cancelled = true
    }
  }, [])

  const ready = screen && panelTop !== null && slot && reduceMotion !== null

  useEffect(() => {
    if (!ready || introPlayed) return
    introPlayed = true
    if (reduceMotion) {
      Object.values(anim).forEach((value) => value.setValue(1))
      anim.dotX.setValue(0)
      anim.dotY.setValue(0)
      anim.squash.setValue(0)
      return
    }
    const timing = (value, toValue, duration, easing = Easing.inOut(Easing.quad)) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver })
    Animated.sequence([
      Animated.delay(180),
      // Vauhdinotto: piste litistyy.
      timing(anim.squash, 0.7, 150, Easing.out(Easing.quad)),
      // Hyppy kaarena i:n kohdalle, piste venyy lennossa ja pienenee oikeaan kokoon.
      Animated.parallel([
        timing(anim.squash, -0.35, 160, Easing.out(Easing.quad)),
        timing(anim.dotX, 0, 480),
        timing(anim.dotScale, 1, 480),
        Animated.sequence([
          timing(anim.dotY, DOT_START.y - JUMP, 230, Easing.out(Easing.quad)),
          timing(anim.dotY, 0, 250, Easing.in(Easing.quad)),
        ]),
      ]),
      // Lasku: piste litistyy ja palautuu, kirjaimet nousevat esiin.
      Animated.parallel([
        Animated.sequence([
          timing(anim.squash, 0.6, 80, Easing.out(Easing.quad)),
          Animated.spring(anim.squash, { toValue: 0, friction: 4, tension: 160, useNativeDriver }),
        ]),
        timing(anim.letters, 1, 380, Easing.out(Easing.cubic)),
      ]),
      Animated.delay(320),
      // Logo paikalleen, kuvat ja napit esiin.
      Animated.parallel([
        timing(anim.move, 1, 700, Easing.bezier(0.65, 0, 0.35, 1)),
        Animated.sequence([Animated.delay(160), timing(anim.reveal, 1, 900, Easing.out(Easing.cubic))]),
      ]),
    ]).start()
  }, [ready, reduceMotion, anim])

  const width = screen?.width ?? windowSize.width
  const height = screen?.height ?? windowSize.height

  // Logo näytön keskellä intron aikana, lopuksi tekstiosan logopaikalla.
  const start = { x: (width - introLogo.width) / 2, y: (height - introLogo.height) / 2 }
  const scale = FINAL_WIDTH / INTRO_WIDTH
  const target = slot ? { x: slot.x, y: panelTop + slot.y } : start
  const shift = {
    x: target.x + (introLogo.width * scale) / 2 - (start.x + introLogo.width / 2),
    y: target.y + (introLogo.height * scale) / 2 - (start.y + introLogo.height / 2),
  }

  if (session && customerReady) return <Redirect href={nextPath(session, customer)} />

  const fadeUp = (from, distance = 18) => ({
    opacity: anim.reveal.interpolate({ inputRange: [from, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { translateY: anim.reveal.interpolate({ inputRange: [from, 1], outputRange: [distance, 0], extrapolate: 'clamp' }) },
    ],
  })

  return (
    <View style={styles.screen} onLayout={(e) => setScreen(e.nativeEvent.layout)}>
      <Animated.View
        style={[
          styles.collage,
          {
            opacity: anim.reveal,
            transform: [
              { translateY: anim.reveal.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
              { scale: anim.reveal.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) },
            ],
          },
        ]}
      >
        {screen && panelTop !== null ? (
          <FoodCollage width={width} height={panelTop} topFade={insets.top + 28} moving={reduceMotion === false} />
        ) : null}
      </Animated.View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]} onLayout={(e) => setPanelTop(e.nativeEvent.layout.y)}>
        <View
          style={[styles.logoSlot, { width: FINAL_WIDTH, height: introLogo.height * scale }]}
          onLayout={(e) => setSlot(e.nativeEvent.layout)}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Bidrop"
        />
        <Animated.Text style={[styles.title, fadeUp(0.2)]} accessibilityRole="header">
          Ruoka perille, sinun hinnallasi
        </Animated.Text>
        <Animated.Text style={[styles.lead, fadeUp(0.3)]}>Kuljettajat tarjoavat, sinä valitset.</Animated.Text>
        <Animated.View style={[styles.actions, fadeUp(0.4, 24)]}>
          <Button title="Luo tili" onPress={() => router.push('/rekisteroidy')} />
          <Button title="Kirjaudu sisään" variant="secondary" onPress={() => router.push('/kirjaudu')} />
          <Button title="Selaa ilman tiliä" variant="plain" onPress={() => router.push('/ravintolat')} />
        </Animated.View>
      </View>

      {/* Animoitu logo kaiken päällä: ensin keskellä, lopuksi logopaikalla. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View
          style={[
            styles.logo,
            {
              left: start.x,
              top: start.y,
              transform: [
                { translateX: anim.move.interpolate({ inputRange: [0, 1], outputRange: [0, shift.x] }) },
                { translateY: anim.move.interpolate({ inputRange: [0, 1], outputRange: [0, shift.y] }) },
                { scale: anim.move.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) },
              ],
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: anim.letters,
              transform: [{ translateY: anim.letters.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
          >
            <Svg
              width={introLogo.width}
              height={(introLogo.height * (LOGO_HEIGHT + LOGO_DESCENT)) / LOGO_HEIGHT}
              viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT + LOGO_DESCENT}`}
            >
              <Path d={LOGO_LETTERS_PATH} fill={colors.black} />
            </Svg>
          </Animated.View>
          <Animated.View
            style={[
              styles.dot,
              {
                left: dot.x - dot.size / 2,
                top: dot.y - dot.size / 2,
                transform: [
                  { translateX: anim.dotX },
                  { translateY: anim.dotY },
                  { scale: anim.dotScale },
                  { scaleX: anim.squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.8, 1, 1.3] }) },
                  { scaleY: anim.squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.25, 1, 0.7] }) },
                ],
              },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  collage: {
    flex: 1,
  },
  panel: {
    paddingTop: 4,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
  },
  logoSlot: {
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: colors.black,
  },
  lead: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
  },
  actions: {
    gap: 10,
    marginTop: 26,
  },
  logo: {
    position: 'absolute',
    width: introLogo.width,
    height: introLogo.height,
    overflow: 'visible',
  },
  dot: {
    position: 'absolute',
    width: dot.size,
    height: dot.size,
    borderRadius: dot.size / 2,
    backgroundColor: LOGO_ORANGE,
  },
})
