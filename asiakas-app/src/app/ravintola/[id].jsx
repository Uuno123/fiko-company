import { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SvgUri } from 'react-native-svg'
import { ArrowLeft, BadgePercent, Bike, ChevronRight, Clock, Plus, Search, X } from 'lucide-react-native'
import { FadeImage } from '../../components/RestaurantCard'
import { ScoreSmiley } from '../../components/Smiley'
import ItemSheet from '../../components/ItemSheet'
import ReviewsSheet from '../../components/ReviewsSheet'
import { getDemoReviews } from '../../../../frontend/src/lib/demoReviews'
import DealPrice from '../../components/DealPrice'
import { brandLogoFor } from '../../../../frontend/src/lib/brandLogos'
import { DELIVERY_PRICE_RANGE, formatEtaRange } from '../../../../frontend/src/lib/delivery'
import { formatDistance, restaurantDistanceKm } from '../../../../frontend/src/lib/distance'
import { formatDisplayAddress, formatPrice } from '../../../../frontend/src/lib/format'
import { formatStars } from '../../../../frontend/src/lib/score'
import { offerBadge } from '../../../../frontend/src/lib/offers'
import { useRestaurant } from '../../lib/restaurant'
import { imageUri } from '../../lib/restaurants'
import { groupCount, groupTotalCents, useCart } from '../../lib/cart'
import { useAuth } from '../../lib/auth'
import { useDeliveryAddresses } from '../../lib/deliveryAddresses'
import { colors, fonts } from '../../theme'

const SIDE = 16
// Kuvan korkeus kuvan omasta muodosta (n. 2:1), ettei se zoomaudu (17.11.2026).
const BANNER_RATIO = 2
// Takaisin-nappi pienempänä (käyttäjän pyyntö 17.11.2026).
const BACK = 34
const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })

// Ravintolasivu (käyttäjän pyyntö 17.11.2026: "samat kuin webissä"): kuva,
// logo, nimi, arvio, osoite ja etäisyys, aukiolo, toimitusaika, kuljetus ja
// tarjous; ruokalistan haku, suosituimmat, osiovälilehdet (kiinnittyvät
// ylös) ja tuotteet päivän tarjoushinnoin. Tuote avaa valintapaneelin
// (components/ItemSheet.jsx), alhaalla korin palkki.
export default function RestaurantScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { status, restaurant } = useRestaurant(id)
  const { groups } = useCart()
  const { customer } = useAuth()
  const { selected } = useDeliveryAddresses(customer)
  const [openItem, setOpenItem] = useState(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const scrollRef = useRef(null)
  const sectionY = useRef({})
  const menuY = useRef(0)
  // Välilehdet kiinni ylhäällä: valkoinen tausta kellon alle ja tilaa takaisin-napille.
  const stickyY = useRef(0)
  const [stuck, setStuck] = useState(false)

  const items = useMemo(
    () => (restaurant?.menu_items ?? []).filter((item) => !query.trim() || matches(item, query)),
    [restaurant, query],
  )
  const sections = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      const key = item.category || 'Ruokalista'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return [...map.entries()]
  }, [items])
  const featured = useMemo(
    () => (restaurant?.menu_items ?? []).filter((i) => i.is_available !== false && i.image_url).slice(0, 8),
    [restaurant],
  )

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/ravintolat'))

  if (status !== 'ready' || !restaurant) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {status === 'loading' ? (
          <ActivityIndicator color={colors.orange} />
        ) : (
          <>
            <Text style={styles.errorText}>Ravintolaa ei löytynyt.</Text>
            <Pressable onPress={back} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Takaisin</Text>
            </Pressable>
          </>
        )}
      </View>
    )
  }

  const closed = restaurant.is_open === false
  // Arvostelut kuten verkkosivulla: esittelyravintolalla esimerkit ja keksitty
  // määrä, oikealla ravintolalla tietokannan määrä; arvosana vasta kun arvioita on.
  const demoReviews = getDemoReviews(restaurant.id)
  const reviewTotal = restaurant.review_count ?? 0
  const shownRating = demoReviews.length > 0 || reviewTotal > 0 ? (restaurant.rating ?? null) : null
  const reviewCountShort = demoReviews.length > 0 ? `${pseudoReviewCount(restaurant.id)}+` : String(reviewTotal)
  const reviewCountLabel =
    demoReviews.length > 0
      ? `${pseudoReviewCount(restaurant.id)}+ arviota`
      : `${reviewTotal} ${reviewTotal === 1 ? 'arvio' : 'arviota'}`
  const brand = brandLogoFor(restaurant.name)
  const badge = offerBadge(restaurant)
  const eta = formatEtaRange(restaurant.pickup_estimate_minutes)
  const address = selected ? { lat: selected.lat, lng: selected.lng } : null
  const km = restaurantDistanceKm(restaurant, address)
  const group = groups.find((g) => g.restaurantId === restaurant.id)
  const banner = imageUri(restaurant.image_url)

  function jumpTo(category) {
    setActiveCategory(category)
    const y = sectionY.current[category]
    // Välilehtipalkki (n. 52 px) jää kiinni ylös osion päälle.
    if (y != null) scrollRef.current?.scrollTo({ y: menuY.current + y - 60, animated: true })
  }

  function onScroll(e) {
    const isStuck = e.nativeEvent.contentOffset.y >= stickyY.current - 1
    if (isStuck !== stuck) setStuck(isStuck)
    const y = e.nativeEvent.contentOffset.y + 70 - menuY.current
    let current = sections[0]?.[0] ?? null
    for (const [name] of sections) if ((sectionY.current[name] ?? Infinity) <= y) current = name
    if (current !== activeCategory) setActiveCategory(current)
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        onScroll={onScroll}
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: (group ? 96 : 32) + insets.bottom }}
      >
        <View>
          <View style={[styles.banner, { height: Math.round(width / BANNER_RATIO) + 22 }]}>
            {banner ? <FadeImage uri={banner} style={{ width: '100%', height: '100%' }} /> : null}
          </View>
          <View style={styles.head}>
            <View style={[styles.logo, brand?.bg && { backgroundColor: brand.bg }]}>
              {brand ? (
                brand.logo.endsWith('.svg') && Platform.OS !== 'web' ? (
                  <SvgUri uri={imageUri(brand.logo)} width={46} height={46} />
                ) : (
                  <Image source={{ uri: imageUri(brand.logo) }} style={{ width: 46, height: 46 }} resizeMode="contain" />
                )
              ) : (
                <Text style={styles.logoLetter}>{restaurant.name?.[0]}</Text>
              )}
            </View>
            <Text style={styles.name}>{restaurant.name}</Text>
            {/* Arvio linkkinä: avaa arvostelut (käyttäjän pyyntö 17.11.2026). */}
            <Pressable
              onPress={() => setReviewsOpen(true)}
              hitSlop={6}
              style={({ pressed }) => [styles.metaRow, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={
                shownRating != null
                  ? `Arvostelut: ${formatStars(shownRating)} / 5, ${reviewCountLabel}`
                  : 'Arvostelut: ei vielä arvosteluja'
              }
            >
              <ScoreSmiley rating={shownRating} size={15} color={colors.black} />
              {shownRating != null ? (
                <>
                  <Text style={styles.metaStrong}>{formatStars(shownRating)}</Text>
                  <Text style={styles.metaText}>({reviewCountShort})</Text>
                </>
              ) : (
                <Text style={styles.metaText}>Ei vielä arvioita</Text>
              )}
              <ChevronRight size={14} strokeWidth={2.4} color={colors.black} />
            </Pressable>
            {restaurant.address || km != null ? (
              <Text style={[styles.metaText, { marginTop: 4 }]} numberOfLines={1}>
                {[restaurant.address && formatDisplayAddress(restaurant.address), km != null && formatDistance(km)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
            <Text style={[styles.hours, closed && { color: colors.offerRed }]}>{closed ? 'Suljettu' : 'Avoinna'}</Text>
            {/* Saman ketjun tai kategorian muut ravintolat, kuten verkkosivulla. */}
            {brand || restaurant.category ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/haku',
                    params: { q: brand ? (brand.search ?? brand.name) : restaurant.category, t: String(Date.now()) },
                  })
                }
                hitSlop={6}
                style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}
                accessibilityRole="link"
              >
                <Text style={styles.moreText}>{brand ? `Katso muut ${brand.name}-ravintolat` : 'Katso vastaavat ravintolat'}</Text>
                <ChevronRight size={14} strokeWidth={2.4} color={colors.black} />
              </Pressable>
            ) : null}
            <View style={styles.deliveryRow}>
              {eta ? (
                <View style={styles.deliveryItem}>
                  <Clock size={15} strokeWidth={2.2} color={colors.textMuted} />
                  <Text style={styles.deliveryText}>{eta}</Text>
                </View>
              ) : null}
              <View style={styles.deliveryItem}>
                <Bike size={15} strokeWidth={2.2} color={restaurant.free_delivery ? colors.orange : colors.textMuted} />
                <Text style={[styles.deliveryText, restaurant.free_delivery && { color: colors.orange }]}>
                  {restaurant.free_delivery ? 'Ilmainen kuljetus' : `Tarjoa kuljetuksesta ${DELIVERY_PRICE_RANGE}`}
                </Text>
              </View>
            </View>
            {badge ? (
              <View style={styles.offer}>
                <BadgePercent size={14} strokeWidth={2.4} color="#ffffff" />
                <Text style={styles.offerText}>{badge.text}</Text>
              </View>
            ) : null}
            {closed ? (
              <Text style={styles.closedNotice}>Ravintola on juuri nyt suljettu, eikä tilaaminen ole mahdollista.</Text>
            ) : null}

            <View style={styles.search}>
              <Search size={17} strokeWidth={2.2} color={colors.black} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Hae ravintolasta ${restaurant.name}`}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, webOutline]}
                accessibilityLabel="Hae ruokalistasta"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Tyhjennä haku">
                  <X size={16} strokeWidth={2.2} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {featured.length > 0 && !query ? (
              <View style={{ marginTop: 26 }}>
                <Text style={styles.sectionTitle}>Suosituimmat</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -SIDE }}
                  contentContainerStyle={{ gap: 12, paddingHorizontal: SIDE, paddingTop: 12 }}
                >
                  {featured.map((item) => (
                    <Pressable key={item.id} onPress={() => setOpenItem(item)} style={styles.featured} accessibilityRole="button">
                      <View style={styles.featuredMedia}>
                        <FadeImage uri={imageUri(item.image_url)} style={{ width: '100%', height: '100%' }} />
                        <View style={styles.plus}>
                          <Plus size={16} strokeWidth={2.6} color={colors.black} />
                        </View>
                      </View>
                      <Text style={styles.featuredName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {/* Suosituimmissa ei vanhaa hintaa (20.11.2026). */}
                      <Price item={item} hideWas />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>

        {/* Osiovälilehdet kiinnittyvät ylös vieritettäessä */}
        <View
          pointerEvents="box-none"
          onLayout={(e) => (stickyY.current = e.nativeEvent.layout.y)}
          style={{ marginTop: -insets.top, paddingTop: insets.top, backgroundColor: stuck ? colors.surface : 'transparent' }}
        >
          <View style={styles.tabsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.tabs, stuck && { paddingLeft: SIDE + BACK + 14 }]}
            >
              {sections.map(([name]) => {
                const on = (activeCategory ?? sections[0]?.[0]) === name
                return (
                  <Pressable
                    key={name}
                    onPress={() => jumpTo(name)}
                    style={[styles.tab, on && styles.tabOn]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.tabText, on && styles.tabTextOn]}>{name}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </View>

        <View style={{ paddingHorizontal: SIDE }} onLayout={(e) => (menuY.current = e.nativeEvent.layout.y)}>
          {sections.length === 0 ? <Text style={styles.empty}>Ei tuotteita haulle "{query.trim()}".</Text> : null}
          {sections.map(([name, list]) => (
            <View
              key={name}
              onLayout={(e) => (sectionY.current[name] = e.nativeEvent.layout.y)}
              style={{ marginTop: 26 }}
            >
              <Text style={styles.sectionTitle}>{name}</Text>
              {list.map((item) => (
                <MenuRow key={item.id} item={item} onPress={() => setOpenItem(item)} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Takaisin kuvan päällä */}
      <Pressable
        onPress={back}
        hitSlop={8}
        style={({ pressed }) => [styles.back, { top: insets.top + (stuck ? 23 : 10) }, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel="Takaisin"
      >
        <ArrowLeft size={18} strokeWidth={2.2} color={colors.black} />
      </Pressable>

      {/* Korin palkki, kun tästä ravintolasta on tuotteita korissa */}
      {group ? (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={() => router.navigate('/ostoskori')}
            style={({ pressed }) => [styles.cartButton, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{groupCount(group)}</Text>
            </View>
            <Text style={styles.cartText}>Näytä tilaus</Text>
            <Text style={styles.cartTotal}>{formatPrice(groupTotalCents(group))}</Text>
          </Pressable>
        </View>
      ) : null}

      <ReviewsSheet
        visible={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        restaurant={restaurant}
        rating={shownRating}
        countLabel={reviewCountLabel}
      />

      <ItemSheet restaurant={restaurant} item={openItem} closed={closed} onClose={() => setOpenItem(null)} />
    </View>
  )
}

// Sama keksitty arvostelumäärä kuin verkkosivulla (esittelyravintola).
function pseudoReviewCount(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return 40 + (hash % 460)
}

function matches(item, query) {
  const q = query.trim().toLowerCase()
  return `${item.name} ${item.description ?? ''} ${item.category ?? ''}`.toLowerCase().includes(q)
}

// Hinta päivän tarjouksella: pilleri ja ajastin kuten verkkosivulla.
function Price({ item, style, hideWas }) {
  return <DealPrice item={item} hideWas={hideWas} style={[{ marginTop: 6 }, style]} />
}

function MenuRow({ item, onPress }) {
  const soldOut = item.is_available === false
  const uri = imageUri(item.image_url)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, soldOut && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.description ? (
          <Text style={styles.rowDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        {soldOut ? <Text style={styles.soldOut}>Loppu valikoimasta</Text> : <Price item={item} />}
      </View>
      {uri ? (
        <View style={styles.rowMedia}>
          <FadeImage uri={uri} style={{ width: '100%', height: '100%' }} />
          <View style={styles.plus}>
            <Plus size={16} strokeWidth={2.6} color={colors.black} />
          </View>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.surface },
  errorText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
  smallButton: { height: 40, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.black },
  smallButtonText: { fontFamily: fonts.semibold, fontSize: 14, color: '#ffffff' },
  banner: { width: '100%', backgroundColor: colors.gray100 },
  head: {
    marginTop: -22,
    paddingHorizontal: SIDE,
    paddingTop: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.surface,
  },
  logo: {
    width: 64,
    height: 64,
    marginTop: -32,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.surface,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 10px rgba(20, 21, 15, 0.15)',
  },
  logoLetter: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.black },
  name: { marginTop: 10, fontFamily: fonts.headingBold, fontSize: 27, lineHeight: 31, letterSpacing: -0.6, color: colors.black },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 6 },
  metaStrong: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  metaText: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  hours: { marginTop: 4, fontFamily: fonts.semibold, fontSize: 13.5, color: '#1f8a4c' },
  deliveryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  deliveryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  // Toimitusaika ja kuljetus harmaalla (käyttäjän pyyntö 17.11.2026).
  deliveryText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textMuted },
  more: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, marginTop: 6 },
  moreText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black, textDecorationLine: 'underline' },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.offerRed,
  },
  offerText: { fontFamily: fonts.semibold, fontSize: 12.5, color: '#ffffff' },
  closedNotice: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#8a1c22',
    backgroundColor: '#fde8e9',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    marginTop: 18,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: colors.gray100,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 14.5, color: colors.black },
  sectionTitle: { fontFamily: fonts.headingBold, fontSize: 21, letterSpacing: -0.3, color: colors.black },
  featured: { width: 140 },
  featuredMedia: { width: 140, height: 140, overflow: 'hidden', borderRadius: 16, backgroundColor: colors.gray100 },
  featuredName: { marginTop: 8, fontFamily: fonts.semibold, fontSize: 13.5, lineHeight: 17, color: '#202125' },
  plus: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 6px rgba(20, 21, 15, 0.2)',
  },
  // Välilehdet kuten verkkosivulla (17.11.2026): lihava harmaa teksti, valittu
  // musta ohuella mustalla alaviivalla, alla vaalea viiva.
  tabsBar: {
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ececea',
    backgroundColor: colors.surface,
  },
  tabs: { gap: 26, paddingHorizontal: SIDE },
  tab: { paddingTop: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabOn: { borderBottomColor: colors.black },
  tabText: { fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted },
  tabTextOn: { color: colors.black },
  empty: { marginTop: 30, textAlign: 'center', fontFamily: fonts.regular, fontSize: 14.5, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e3',
  },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, lineHeight: 20, color: '#202125' },
  rowDescription: { marginTop: 3, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  soldOut: { marginTop: 6, fontFamily: fonts.semibold, fontSize: 13, color: colors.offerRed },
  rowMedia: { width: 104, height: 104, overflow: 'hidden', borderRadius: 14, backgroundColor: colors.gray100 },
  rowDeal: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.offerRed,
  },
  rowDealText: { fontFamily: fonts.bold, fontSize: 11, color: '#ffffff' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  priceText: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black },
  oldPrice: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted, textDecorationLine: 'line-through' },
  back: {
    position: 'absolute',
    left: 16,
    width: BACK,
    height: BACK,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BACK / 2,
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 6px rgba(20, 21, 15, 0.18)',
  },
  cartBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SIDE,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e6e6e3',
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: colors.black,
  },
  cartCount: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: colors.orange,
  },
  cartCountText: { fontFamily: fonts.bold, fontSize: 12.5, color: '#ffffff' },
  cartText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: '#ffffff' },
  cartTotal: { fontFamily: fonts.bold, fontSize: 15, color: '#ffffff' },
})
