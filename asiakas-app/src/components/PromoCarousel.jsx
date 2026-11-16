import { useEffect, useRef } from 'react'
import { FlatList, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { colors, fonts } from '../theme'

// Etusivun kuvapromot kuten verkkosivulla (Home.jsx PROMO_ITEMS). Kuvat ovat
// ravintoloiden omia: vain suunnittelua varten, lupa ennen julkaisua.
export const PROMO_ITEMS = [
  {
    id: 'subway',
    image: 'https://imageproxy.wolt.com/assets/68a861195a13d705dbfaa783',
    title: 'Subway',
    description: 'Subit, wrapit ja salaatit · 10–20 min',
  },
  {
    id: 'hesburger',
    image: 'https://imageproxy.wolt.com/assets/67ea79d0e3aca1debaea9cdd',
    title: 'Hesburger',
    description: 'Burgerit ja ateriat · 15–25 min',
  },
  {
    id: 'ozaki',
    image: 'https://imageproxy.wolt.com/assets/67332fbb149445354de03f5c',
    title: 'Ozaki Sushi',
    description: 'Sushia ja sashimia · 20–30 min',
  },
  {
    id: 'fjorno',
    image: 'https://imageproxy.wolt.com/assets/67331c914d55f07b7e8941ef',
    title: 'Fjorno',
    description: 'Napolilainen pizza · ilmainen kuljetus',
  },
]

const SIDE = 16
// Bannerit vaihtuvat itsestään tämän välein (käyttäjän pyyntö 16.11.2026).
// Asiakkaan oma pyyhkäisy nollaa ajastimen, jottei kuva vaihdu heti perään.
const AUTO_ADVANCE_MS = 4500

export default function PromoCarousel({ items = PROMO_ITEMS }) {
  const { width } = useWindowDimensions()
  const slideWidth = width - SIDE * 2
  const listRef = useRef(null)
  const dragStart = useRef(0)
  const indexRef = useRef(0)
  const dragging = useRef(false)
  const lastInteraction = useRef(0)

  function goTo(index) {
    indexRef.current = index
    listRef.current?.scrollToOffset({ offset: index * width, animated: true })
  }

  // Automaattinen vaihto: seuraava kuva, viimeisen jälkeen alkuun.
  useEffect(() => {
    if (items.length < 2) return undefined
    const timer = setInterval(() => {
      if (dragging.current || Date.now() - lastInteraction.current < AUTO_ADVANCE_MS) return
      goTo((indexRef.current + 1) % items.length)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
    // goTo käyttää vain refejä ja leveyttä.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, width])

  // Kevyt pyyhkäisy (käyttäjän pyyntö 15.11.2026): pieni veto tai nopea
  // sipaisu riittää vaihtamaan kuvan, ei tarvitse vetää puoleenväliin.
  function settle(e) {
    const x = e.nativeEvent.contentOffset.x
    const vx = e.nativeEvent.velocity?.x ?? 0
    const dx = x - dragStart.current
    const from = Math.round(dragStart.current / width)
    let next = from
    // Suunta vedosta (nopeuden etumerkki vaihtelee alustoittain), riittää
    // 8 % leveydestä tai nopea sipaisu.
    const quick = Math.abs(vx) > 0.15 && Math.abs(dx) > 10
    if (dx > 0 && (dx > width * 0.08 || quick)) next = from + 1
    else if (dx < 0 && (-dx > width * 0.08 || quick)) next = from - 1
    next = Math.max(0, Math.min(items.length - 1, next))
    dragging.current = false
    lastInteraction.current = Date.now()
    goTo(next)
  }

  return (
    <View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        ref={listRef}
        // Yksi kuva kerrallaan, seuraava ei pilkota reunasta (käyttäjän pyyntö 15.11.2026).
        decelerationRate="fast"
        onScrollBeginDrag={(e) => {
          dragging.current = true
          dragStart.current = e.nativeEvent.contentOffset.x
        }}
        onScrollEndDrag={settle}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: SIDE }}>
          <View style={[styles.slide, { width: slideWidth }]}>
            <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="promo-shade" x1="0" y1="0.25" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="0.62" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#promo-shade)" />
            </Svg>
            <View style={styles.text}>
              <Text style={styles.kicker}>Ravintola</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.sponsored}>Sponsoroitu</Text>
            </View>
          </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  slide: { height: 200, overflow: 'hidden', borderRadius: 10, backgroundColor: '#2a2a28' },
  text: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  kicker: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase', color: '#ffffff' },
  title: { marginTop: 6, fontFamily: fonts.heading, fontSize: 24, lineHeight: 28, letterSpacing: -0.48, color: '#ffffff' },
  description: { marginTop: 2, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: '#f2f0ec' },
  sponsored: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13, color: '#d4d0c8' },
})
