import { useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Clock, X } from 'lucide-react-native'
import RestaurantCard, { FadeImage } from '../components/RestaurantCard'
import FilterBar from '../components/FilterBar'
import StrikePrice from '../components/StrikePrice'
import FilterSheet from '../components/FilterSheet'
import { allFillerRestaurants } from '../../../frontend/src/lib/categories'
import { offerBadge } from '../../../frontend/src/lib/offers'
import { formatPrice } from '../../../frontend/src/lib/format'
import { formatCountdown } from '../../../frontend/src/lib/dailyDeals'
import { imageUri, useRestaurants } from '../lib/restaurants'
import { useDealItems, useDealsCountdown } from '../lib/dealItems'
import { useAuth } from '../lib/auth'
import { useDeliveryAddresses } from '../lib/deliveryAddresses'
import { EMPTY_FILTERS, applyFilters, categoriesOf } from '../lib/restaurantFilters'
import { colors, fonts } from '../theme'

const SIDE = 16
const HERO = colors.black

// Järjestys: isoin etu ensin (arvot kuten korttien merkit, lib/offers.js).
const ORDER = ['−40%', '−30%', '−15%', '−10%']

// Tarjoussivu (käyttäjän pyyntö 17.11.2026): etusivun Bidrop-"Tarjoukset"
// avaa oman, erikoisemman näkymän tavallisen haun sijaan. Musta yläosa,
// suodatus (components/FilterSheet.jsx: järjestys, etäisyys, toimitusaika,
// arvio, avoinna, ilmainen kuljetus, tarjous, keittiö) ja ravintolakortit
// tarjoustarralla. Kupongit poistettu (näyttivät liian tekoälyltä).

// Aikaa päivän tarjousten loppuun (sama jakso kuin verkkosivulla).
function DealsTimer() {
  const ms = useDealsCountdown()
  return (
    <View style={styles.timer}>
      <Clock size={12} strokeWidth={2.6} color={colors.offerRed} />
      <Text style={styles.timerText}>{formatCountdown(ms)}</Text>
    </View>
  )
}

// Alennuksessa olevat tuotteet ravintolakorttien välissä (käyttäjän pyyntö
// 17.11.2026). Piilossa, jos tänään ei ole alennettuja tuotteita.
function DealItemsRow({ items, onOpen }) {
  return (
    <View>
      <View style={styles.listHead}>
        <Text style={styles.listTitle}>Tuotteet alennuksessa</Text>
        <DealsTimer />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.items}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item.restaurant_id)}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.restaurant.name}, −${item.percent} %`}
          >
            <View style={styles.itemImage}>
              {imageUri(item.image_url) ? (
                <FadeImage uri={imageUri(item.image_url)} style={{ width: '100%', height: '100%' }} />
              ) : null}
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>−{item.percent} %</Text>
              </View>
            </View>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.prices}>
              <Text style={styles.dealPrice}>{formatPrice(item.dealCents)}</Text>
              <StrikePrice>{formatPrice(item.price_cents)}</StrikePrice>
            </View>
            <Text style={styles.itemRestaurant} numberOfLines={1}>
              {item.restaurant.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

export default function OffersScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { restaurants } = useRestaurants()
  const dealItems = useDealItems(restaurants)
  const { customer } = useAuth()
  const { selected } = useDeliveryAddresses(customer)
  const address = useMemo(
    () => (selected ? { label: selected.full, lat: selected.lat, lng: selected.lng } : null),
    [selected],
  )
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)

  // Isoin etu ensin, sitten arvio ("Suositellut").
  const pool = useMemo(() => {
    const names = new Set(restaurants.map((r) => r.name))
    const rank = (r) => ORDER.indexOf(offerBadge(r)?.value)
    return [...restaurants, ...allFillerRestaurants().filter((r) => !names.has(r.name))]
      .filter((r) => offerBadge(r))
      .sort((a, b) => rank(a) - rank(b) || (b.rating ?? 0) - (a.rating ?? 0))
  }, [restaurants])
  const categories = useMemo(() => categoriesOf(pool), [pool])
  const list = useMemo(() => applyFilters(pool, filters, address), [pool, filters, address])

  const close = () => (router.canGoBack() ? router.back() : router.navigate('/ravintolat'))

  const header = (
    <View>
      <View style={[styles.hero, { paddingTop: insets.top + 64 }]}>
        <Text style={styles.title}>
          Tarjoukset<Text style={{ color: colors.orange }}>.</Text>
        </Text>
        <Text style={styles.subtitle}>Kuopion kovimmat edut yhdessä paikassa.</Text>
      </View>

      <View style={styles.listHead}>
        <Text style={styles.listTitle}>Kaikki tarjoukset</Text>
        <Text style={styles.listCount}>{list.length} ravintolaa</Text>
      </View>
      <FilterBar filters={filters} onOpen={() => setFilterOpen(true)} onChange={setFilters} style={{ marginBottom: 20 }} />
    </View>
  )

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <FlatList
        data={list}
        keyExtractor={(restaurant) => String(restaurant.id ?? restaurant.name)}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 34 }} />}
        ListEmptyComponent={<Text style={styles.empty}>Ei tarjouksia näillä rajauksilla.</Text>}
        renderItem={({ item: restaurant, index }) => {
          const badge = offerBadge(restaurant)
          return (
            <View>
              <View style={{ paddingHorizontal: SIDE }}>
                <RestaurantCard
                  restaurant={restaurant}
                  imageAspect={2.4}
                  showDistance
                  onPress={restaurant.isPlaceholder ? undefined : () => router.push(`/ravintola/${restaurant.id}`)}
                />
                {/* Tarjoustarra kuvan oikeassa yläkulmassa */}
                <View style={[styles.sticker, badge.tone === 'black' && styles.stickerDark]} pointerEvents="none">
                  <Text style={styles.stickerValue}>{badge.value.replace('%', ' %')}</Text>
                  <Text style={styles.stickerNote}>{badge.note}</Text>
                </View>
              </View>
              {index === Math.min(1, list.length - 1) && dealItems.length > 0 ? (
                <View style={{ marginTop: 22 }}>
                  <DealItemsRow items={dealItems} onOpen={(id) => router.push(`/ravintola/${id}`)} />
                </View>
              ) : null}
            </View>
          )
        }}
      />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onChange={setFilters}
        resultCount={list.length}
        categories={categories}
        address={address}
      />

      <Pressable
        onPress={close}
        hitSlop={8}
        style={({ pressed }) => [styles.close, { top: insets.top + 10 }, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Sulje"
      >
        <X size={20} strokeWidth={2.4} color="#ffffff" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: {
    paddingHorizontal: SIDE,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: HERO,
  },
  title: {
    marginTop: 10,
    fontFamily: fonts.headingBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    color: '#ffffff',
  },
  subtitle: { marginTop: 4, fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },
  empty: { marginTop: 24, textAlign: 'center', fontFamily: fonts.regular, fontSize: 14.5, color: colors.textMuted },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE,
    paddingTop: 30,
    paddingBottom: 16,
  },
  listTitle: { flexShrink: 1, fontFamily: fonts.headingBold, fontSize: 21, letterSpacing: -0.3, color: colors.black },
  items: { gap: 12, paddingHorizontal: SIDE },
  item: { width: 150 },
  itemImage: { width: 150, height: 150, overflow: 'hidden', borderRadius: 16, backgroundColor: colors.gray100 },
  itemBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: colors.offerRed,
  },
  itemBadgeText: { fontFamily: fonts.bold, fontSize: 12, color: '#ffffff' },
  itemName: { marginTop: 8, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: '#202125' },
  prices: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  dealPrice: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.offerRed },
  oldPrice: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted, textDecorationLine: 'line-through' },
  itemRestaurant: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fde8e9',
  },
  timerText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.offerRed, fontVariant: ['tabular-nums'] },
  listCount: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  sticker: {
    position: 'absolute',
    top: -8,
    right: SIDE - 6,
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 33,
    backgroundColor: colors.orange,
    transform: [{ rotate: '-10deg' }],
    boxShadow: '0 4px 12px rgba(20, 21, 15, 0.25)',
  },
  stickerDark: { backgroundColor: colors.black },
  stickerValue: { fontFamily: fonts.headingBold, fontSize: 16, letterSpacing: -0.4, color: '#ffffff' },
  stickerNote: { fontFamily: fonts.semibold, fontSize: 9, color: 'rgba(255, 255, 255, 0.9)' },
  close: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(20, 21, 15, 0.55)',
  },
})
