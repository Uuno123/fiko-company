import { useRef } from 'react'
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { HandCoins } from 'lucide-react-native'
import { formatEtaRange } from '../../../frontend/src/lib/delivery'
import { DELIVERY_BID } from '../../../frontend/src/lib/deliveryTime'
import { formatPrice } from '../../../frontend/src/lib/format'
import { formatStars } from '../../../frontend/src/lib/score'
import { offerBadge } from '../../../frontend/src/lib/offers'
import { formatDistance } from '../../../frontend/src/lib/distance'
import { ScoreSmiley } from './Smiley'
import { imageUri } from '../lib/restaurants'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'

// Kuva häivytetään esiin latauduttuaan, jolloin kortit eivät välähdä.
export function FadeImage({ uri, style, resizeMode = 'cover' }) {
  const opacity = useRef(new Animated.Value(0)).current
  return (
    <Animated.Image
      source={{ uri }}
      style={[style, { opacity }]}
      resizeMode={resizeMode}
      onLoad={() => Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver }).start()}
    />
  )
}

// Ravintolakortti täsmälleen kuten verkkosivun puhelinnäkymässä (mitattu
// 390 px leveänä): kuva 2,15:1, nimi 13,5 px lihava, tietorivi 11,5 px ja
// punainen tarjouspilleri tietorivin alla. large: tarjouspaneelien isompi kortti.
// showDistance: etäisyys tietorivillä (suodatetut listat, 17.11.2026).
export default function RestaurantCard({ restaurant, width, onPress, large = false, imageAspect, showDistance = false }) {
  const { name, rating, free_delivery: freeDelivery, sponsored } = restaurant
  const eta = formatEtaRange(restaurant.pickup_estimate_minutes)
  const badge = offerBadge(restaurant)
  const closed = restaurant.is_open === false
  const uri = imageUri(restaurant.image_url)

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [{ width }, closed && styles.closed, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${name}, ${badge.text}` : name}
    >
      <View style={[styles.imageWrap, large && styles.imageLarge, imageAspect && { aspectRatio: imageAspect }]}>
        {uri ? <FadeImage uri={uri} style={styles.image} /> : null}
      </View>

      <View style={styles.heading}>
        <Text style={[styles.name, large && styles.nameLarge]} numberOfLines={1}>
          {name}
        </Text>
        {sponsored ? <Text style={styles.sponsored}>Sponsoroitu</Text> : null}
      </View>

      <View style={styles.meta}>
        {rating != null ? (
          <View style={styles.metaItem}>
            <ScoreSmiley rating={rating} size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatStars(rating)}</Text>
          </View>
        ) : null}
        {showDistance && restaurant.distance_km != null ? (
          <View style={styles.metaItem}>
            {rating != null ? <Text style={styles.sep}>·</Text> : null}
            <Text style={styles.metaText}>{formatDistance(restaurant.distance_km)}</Text>
          </View>
        ) : null}
        {eta ? (
          <View style={styles.metaItem}>
            {rating != null || (showDistance && restaurant.distance_km != null) ? <Text style={styles.sep}>·</Text> : null}
            <Text style={styles.metaText}>{eta}</Text>
          </View>
        ) : null}
        {freeDelivery ? (
          <Text style={styles.freeBadge}>Ilmainen kuljetus</Text>
        ) : (
          <View style={styles.metaItem}>
            <Text style={styles.sep}>·</Text>
            {/* Tarjouskilpailu näkyviin (20.11.2026): "Kuljetus alk. 1,99 €". */}
            <HandCoins size={12} strokeWidth={2} color={colors.textMuted} />
            <Text style={styles.metaText}>Kuljetus alk. {formatPrice(DELIVERY_BID.minCents)}</Text>
          </View>
        )}
      </View>

      {badge ? (
        <View style={styles.offer}>
          <Text style={styles.offerText} numberOfLines={1}>
            {badge.text}
          </Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  closed: { opacity: 0.5 },
  imageWrap: {
    aspectRatio: 2.15,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#f1f3ec',
  },
  imageLarge: { aspectRatio: 1.75, borderRadius: 14 },
  image: { width: '100%', height: '100%' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  name: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13.5, letterSpacing: -0.13, color: '#202125' },
  nameLarge: { fontSize: 15.5 },
  sponsored: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', marginTop: 9, gap: 3 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontFamily: fonts.medium, fontSize: 11.5, color: '#707070' },
  sep: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.gray400, marginHorizontal: 1 },
  freeBadge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.orangeSoft,
    color: colors.orange,
    fontFamily: fonts.semibold,
    fontSize: 10.5,
  },
  offer: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: colors.offerRed,
  },
  offerText: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.05, color: '#ffffff' },
})
