import { useEffect, useRef } from 'react'
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import {
  CATEGORY_NAMES,
  CATEGORY_SHORT_LABELS,
  CATEGORY_TILE_META,
} from '../../../frontend/src/lib/categories'
import { DELIVERY_BID } from '../../../frontend/src/lib/deliveryTime'
import { formatPrice } from '../../../frontend/src/lib/format'
import { FadeImage } from './RestaurantCard'
import { SectionTitle } from './HomeSection'
import BidropLogo from './BidropLogo'
import { imageUri } from '../lib/restaurants'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
const SIDE = 16

// Kategoriakuvakkeet (samat kuvat kuin verkkosivulla, ladataan sieltä): pelkkä
// kuvake ja nimi ilman laatikkoa. Painallus hakee kategorian ravintolat.
const HOME_CATEGORIES = CATEGORY_NAMES.filter(
  (name) => name !== 'Kahvila' && CATEGORY_TILE_META[name]?.icon?.endsWith('-photo.webp'),
).slice(0, 8)

export function CategoryStrip({ onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
      {HOME_CATEGORIES.map((name) => (
        <Pressable
          key={name}
          onPress={() => onSelect?.(name)}
          style={({ pressed }) => [styles.category, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={name}
        >
          <FadeImage uri={imageUri(CATEGORY_TILE_META[name].icon)} style={styles.categoryIcon} resizeMode="contain" />
          <Text style={styles.categoryLabel} numberOfLines={1}>
            {CATEGORY_SHORT_LABELS[name] ?? name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

// Bidropin oma juttu yhdellä silmäyksellä: kuljetuksen hinta ei ole kiinteä,
// vaan kuljettajat tarjoavat ja asiakas valitsee. Sama oranssi liukuviiva kuin
// oman hinnan valinnassa (hintahaarukka lib/deliveryTime.js DELIVERY_BID).
export function BidStrip() {
  return (
    <View style={styles.bid}>
      <SectionTitle title="Sinä päätät kuljetuksen hinnan" style={styles.bidTitle} />
      <Text style={styles.bidText}>Kuljettajat tarjoavat hinnan tilauksellesi, ja sinä valitset niistä sopivan.</Text>
      <View style={styles.bidScale}>
        <Text style={styles.bidPrice}>{formatPrice(DELIVERY_BID.minCents)}</Text>
        <View style={styles.bidTrack}>
          <View style={styles.bidFill} />
          <View style={styles.bidKnob} />
        </View>
        <Text style={styles.bidPrice}>{formatPrice(DELIVERY_BID.maxCents)}</Text>
      </View>
    </View>
  )
}

// Latausluuranko: sykkivät harmaat paikat riveille, kunnes ravintolat on haettu.
export function HomeSkeleton() {
  const { width } = useWindowDimensions()
  const cardWidth = Math.round((width - SIDE) * 0.7)
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <Animated.View style={{ opacity: pulse }} accessibilityLabel="Ladataan ravintoloita">
      {[0, 1].map((row) => (
        <View key={row} style={styles.skeletonRow}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonRail}>
            {[0, 1].map((card) => (
              <View key={card} style={{ width: cardWidth }}>
                <View style={styles.skeletonImage} />
                <View style={[styles.skeletonLine, { width: '70%', marginTop: 10 }]} />
                <View style={[styles.skeletonLine, { width: '45%', marginTop: 6 }]} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </Animated.View>
  )
}

// Etusivun loppu (käyttäjän pyyntö 15.11.2026): ohut viiva, pieni Bidrop-logo,
// tieto että ravintolarivit päättyvät tähän, ja tie kaikkiin ravintoloihin.
export function FeedEnd({ onBrowse }) {
  return (
    <View style={styles.end}>
      <View style={styles.endRule} />
      <BidropLogo size={14} style={{ alignSelf: 'center' }} />
      <Text style={styles.endTitle}>Ravintolat päättyvät tähän.</Text>
      <Text style={styles.endText}>Etsitkö jotain tiettyä? Kaikki Kuopion ravintolat löytyvät yhdestä listasta.</Text>
      <Pressable
        onPress={onBrowse}
        style={({ pressed }) => [styles.endButton, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <Text style={styles.endButtonText}>Selaa kaikkia ravintoloita</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  categories: { gap: 6, paddingHorizontal: SIDE - 6 },
  category: { width: 70, alignItems: 'center' },
  categoryIcon: { width: 52, height: 52 },
  categoryLabel: { marginTop: 5, fontFamily: fonts.medium, fontSize: 11.5, color: colors.black },

  bid: {
    marginTop: 30,
    marginHorizontal: SIDE,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderRadius: 20,
    backgroundColor: colors.orangeSoft,
  },
  bidTitle: { fontSize: 18 },
  bidText: { marginTop: 4, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: '#6b4a3c' },
  bidScale: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  bidPrice: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.black, fontVariant: ['tabular-nums'] },
  bidTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(244, 80, 30, 0.2)', justifyContent: 'center' },
  bidFill: { width: '38%', height: 4, borderRadius: 2, backgroundColor: colors.orange },
  bidKnob: {
    position: 'absolute',
    left: '38%',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: colors.orange,
    boxShadow: '0 1px 4px rgba(20, 21, 15, 0.25)',
  },

  skeletonRow: { marginTop: 28 },
  skeletonTitle: { width: 170, height: 18, marginLeft: SIDE, borderRadius: 6, backgroundColor: colors.gray100 },
  skeletonRail: { flexDirection: 'row', gap: 10, marginTop: 14, paddingLeft: SIDE, overflow: 'hidden' },
  skeletonImage: { aspectRatio: 2.1, borderRadius: 12, backgroundColor: colors.gray100 },
  skeletonLine: { height: 11, borderRadius: 5, backgroundColor: colors.gray100 },

  end: { alignItems: 'center', marginTop: 48, paddingHorizontal: 32 },
  endRule: { width: 40, height: 3, borderRadius: 2, marginBottom: 24, backgroundColor: colors.gray200 },
  endTitle: {
    marginTop: 14,
    fontFamily: fonts.headingBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.black,
    textAlign: 'center',
  },
  endText: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  endButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: colors.gray100,
  },
  endButtonText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
})
