import { useEffect, useState } from 'react'
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { TEST_COLLAGE_PHOTOS } from '../lib/testPhotos'
import { colors } from '../theme'

// Aidot ruokakuvat (Unsplash, ilmainen käyttö) kolmessa sarakkeessa, jotka
// liukuvat hitaasti vuorotellen ylös ja alas. Koko kollaasi on hieman vinossa.
// Yläreunassa vaalea liukuma kellon ja akun alla, alareunassa liukuma
// valkoiseen alkunäytön tekstiosaan.
const OWN_COLUMNS = [
  [require('../../assets/images/tacos.jpg'), require('../../assets/images/burger.jpg'), require('../../assets/images/spaghetti.jpg')],
  [require('../../assets/images/salad-bowl.jpg'), require('../../assets/images/pizza.jpg'), require('../../assets/images/tsukune.jpg')],
  [require('../../assets/images/laksa.jpg'), require('../../assets/images/pasta.jpg'), require('../../assets/images/salad.jpg')],
]

// Testikuvat (lib/testPhotos.js) ovat vaakakuvia: kaksi saraketta 16:9-ruutuja,
// jotta esim. hampurilainen ja logo näkyvät kokonaan. Omat kuvat pystyruutuina.
const TEST = TEST_COLLAGE_PHOTOS.length > 0
const COLUMNS = TEST ? TEST_COLLAGE_PHOTOS.map((column) => column.map((uri) => ({ uri }))) : OWN_COLUMNS
const TILE_RATIO = TEST ? 9 / 16 : 1.22
// Verkosta ladattavat kuvat haetaan heti, jotta ne ovat valmiina aloitusanimaation jälkeen.
if (TEST) TEST_COLLAGE_PHOTOS.flat().forEach((uri) => Image.prefetch(uri).catch(() => {}))

const GAP = 12
const TILT = '-8deg'
// Vinon kollaasin pitää peittää koko alue myös kulmista.
const OVERSIZE = 1.35
// Yhden kierroksen kesto; keskimmäinen sarake liikkuu toiseen suuntaan.
const DURATIONS = [34000, 30000, 38000]
// Sarakkeen kuvat kolmeen kertaan peräkkäin, jotta silmukka ei katkea.
const COPIES = 3

const useNativeDriver = Platform.OS !== 'web'

// moving: liike päällä (pois, jos puhelimessa on vähennetty liikettä).
export default function FoodCollage({ width, height, topFade, moving = true }) {
  const innerWidth = width * OVERSIZE
  const innerHeight = height * OVERSIZE
  const columnWidth = (innerWidth - GAP * (COLUMNS.length + 1)) / COLUMNS.length
  const tileHeight = Math.round(columnWidth * TILE_RATIO)

  return (
    <View style={[styles.root, { width, height }]} pointerEvents="none">
      <View
        style={[
          styles.inner,
          { width: innerWidth, height: innerHeight, left: (width - innerWidth) / 2, top: (height - innerHeight) / 2 },
        ]}
      >
        {COLUMNS.map((photos, index) => (
          <Column
            key={index}
            photos={photos}
            width={columnWidth}
            tileHeight={tileHeight}
            duration={DURATIONS[index % DURATIONS.length]}
            reverse={index === 1}
            moving={moving}
          />
        ))}
      </View>
      <Fade id="collageTop" height={topFade} from={0.92} to={0} style={styles.top} />
      <Fade id="collageBottom" height={140} from={0} to={1} style={styles.bottom} />
    </View>
  )
}

function Column({ photos, width, tileHeight, duration, reverse, moving }) {
  const [progress] = useState(() => new Animated.Value(0))
  // Yhden kuvasarjan korkeus: tämän verran liikuttua kuva on taas samassa kohdassa.
  const setHeight = photos.length * (tileHeight + GAP)

  useEffect(() => {
    if (!moving) return undefined
    const loop = Animated.loop(Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver }))
    loop.start()
    return () => loop.stop()
  }, [moving, duration, progress])

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? [-setHeight, 0] : [0, -setHeight],
  })
  const tiles = Array.from({ length: COPIES }, () => photos).flat()

  return (
    <Animated.View style={[styles.column, { width, transform: [{ translateY }] }]}>
      {tiles.map((source, index) => (
        <Image key={index} source={source} style={[styles.tile, { width, height: tileHeight }]} resizeMode="cover" />
      ))}
    </Animated.View>
  )
}

// Pystysuuntainen liukuma valkoiseen (from/to: peittävyys ylhäällä ja alhaalla).
function Fade({ id, height, from, to, style }) {
  return (
    <Svg style={[style, { height }]} width="100%" height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.surface} stopOpacity={from} />
          <Stop offset="1" stopColor={colors.surface} stopOpacity={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height={height} fill={`url(#${id})`} />
    </Svg>
  )
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  inner: {
    position: 'absolute',
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: GAP,
    transform: [{ rotate: TILT }],
  },
  column: {
    gap: GAP,
  },
  tile: {
    borderRadius: 22,
    backgroundColor: colors.gray100,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
})
