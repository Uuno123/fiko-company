import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Bike, Clock, Flame, Search, SearchX, SlidersHorizontal, X } from 'lucide-react-native'
import CategoryTiles from '../../components/CategoryTiles'
import RestaurantCard, { FadeImage } from '../../components/RestaurantCard'
import { ScoreSmiley } from '../../components/Smiley'
import FilterBar from '../../components/FilterBar'
import FilterSheet from '../../components/FilterSheet'
import { CATEGORY_NAMES, allFillerRestaurants, dealsFillerRestaurants, isDealsQuery } from '../../../../frontend/src/lib/categories'
import { quickFilterForQuery } from '../../../../frontend/src/lib/quickFilters'
import { searchRestaurants } from '../../../../frontend/src/lib/searchEngine'
import { DELIVERY_PRICE_RANGE, formatEtaRange } from '../../../../frontend/src/lib/delivery'
import { formatScore } from '../../../../frontend/src/lib/score'
import { offerBadge } from '../../../../frontend/src/lib/offers'
import { imageUri, useRestaurants } from '../../lib/restaurants'
import { clearSearches, forgetSearch, rememberSearch, useRecentSearches } from '../../lib/recentSearches'
import { useAuth } from '../../lib/auth'
import { useDeliveryAddresses } from '../../lib/deliveryAddresses'
import { EMPTY_FILTERS, applyFilters, categoriesOf, countActiveFilters } from '../../lib/restaurantFilters'
import { colors, fonts } from '../../theme'

const SIDE = 16
const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })

// Suositut haut -pillerit: tunnetut hakusanat (kategoriat ja pikasuodattimet).
const POPULAR = ['Tarjoukset', 'Ilmainen kuljetus', 'Burgerit', 'Kebab', 'Aasialainen', 'Alle 30 min', 'Arvio 9+', 'Lähelläsi']

// Hakusivu (uudistus 17.11.2026): iso otsikko ja hakukenttä, tyhjänä
// viimeisimmät haut, kategoriat, suositut haut ja Kuopion suosituimmat
// tiiviinä listana. Kirjoittaessa tulokset samalla hakumoottorilla kuin
// verkkosivulla (lib/searchEngine.js), kuvalliset rivit.
export default function SearchScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { restaurants } = useRestaurants()
  // t: aikaleima jokaisella avauksella - sama hakusana uudelleen tai välissä
  // kirjoitettu haku ei jätä vanhaa hakua näkyviin (välilehti pysyy muistissa).
  const { q, focus, t } = useLocalSearchParams()
  const [query, setQuery] = useState(typeof q === 'string' ? q : '')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const recent = useRecentSearches()
  const { customer } = useAuth()
  const { selected } = useDeliveryAddresses(customer)
  const address = useMemo(
    () => (selected ? { label: selected.full, lat: selected.lat, lng: selected.lng } : null),
    [selected],
  )
  // Suodatus (17.11.2026): sama kuin tarjoussivulla, lib/restaurantFilters.js.
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const activeCount = countActiveFilters(filters)

  // Kodin linkit avaavat haun valmiilla hakusanalla (?q=).
  useEffect(() => {
    if (typeof q === 'string') Promise.resolve().then(() => setQuery(q))
  }, [q, t])

  // Kodin hakupalkki (?focus=1): kursori kenttään.
  useEffect(() => {
    if (focus !== '1') return
    // Kodin hakupalkista tyhjä kenttä, ei edellistä hakua.
    if (typeof q !== 'string') Promise.resolve().then(() => setQuery(''))
    setTimeout(() => inputRef.current?.focus(), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, t])

  const pool = useMemo(() => {
    const names = new Set(restaurants.map((r) => r.name))
    return [...restaurants, ...allFillerRestaurants().filter((r) => !names.has(r.name))]
  }, [restaurants])

  const term = query.trim()
  const byRating = (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  const categories = useMemo(() => categoriesOf(pool), [pool])
  // Tulokset näytetään, kun on hakusana tai rajauksia; muuten aloitusnäkymä.
  const showResults = Boolean(term) || activeCount > 0
  const base = useMemo(() => {
    if (!term) return activeCount > 0 ? [...pool].sort(byRating) : [...pool].sort(byRating).slice(0, 8)
    if (isDealsQuery(term)) return dealsFillerRestaurants()
    if (CATEGORY_NAMES.includes(term)) return pool.filter((r) => r.category === term).sort(byRating)
    const filter = quickFilterForQuery(term)
    if (filter) return pool.filter(filter.test).sort(byRating)
    return searchRestaurants(pool, term)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, term, activeCount > 0])
  const results = useMemo(
    () => (showResults ? applyFilters(base, filters, address) : base),
    [base, filters, address, showResults],
  )

  function searchFor(value) {
    setQuery(value)
    rememberSearch(value)
    inputRef.current?.blur()
  }

  function open(restaurant) {
    if (term) rememberSearch(term)
    if (!restaurant.isPlaceholder) router.push(`/ravintola/${restaurant.id}`)
  }

  const header = showResults ? (
    <View>
      <View style={{ marginHorizontal: -SIDE, marginTop: 6 }}>
        <FilterBar filters={filters} onOpen={() => setFilterOpen(true)} onChange={setFilters} showButton={false} />
      </View>
      <Text style={styles.count}>
        {results.length === 0 ? '' : `${results.length} ${results.length === 1 ? 'ravintola' : 'ravintolaa'}`}
      </Text>
    </View>
  ) : (
    <View>
      {recent.length > 0 ? (
        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Text style={styles.blockTitle}>Viimeisimmät haut</Text>
            <Pressable onPress={clearSearches} hitSlop={8} accessibilityRole="button">
              <Text style={styles.blockAction}>Tyhjennä</Text>
            </Pressable>
          </View>
          {recent.map((item) => (
            <Pressable
              key={item}
              onPress={() => searchFor(item)}
              style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Clock size={17} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.recentText} numberOfLines={1}>
                {item}
              </Text>
              <Pressable onPress={() => forgetSearch(item)} hitSlop={10} accessibilityLabel={`Poista haku ${item}`}>
                <X size={16} strokeWidth={2.2} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={[styles.blockTitle, styles.blockTitlePad]}>Kategoriat</Text>
        <View style={{ marginHorizontal: -SIDE }}>
          <CategoryTiles onSelect={searchFor} />
        </View>
      </View>

      <View style={styles.block}>
        <Text style={[styles.blockTitle, styles.blockTitlePad]}>Suositut haut</Text>
        <View style={styles.chips}>
          {POPULAR.map((item, index) => (
            <Pressable
              key={item}
              onPress={() => searchFor(item)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              accessibilityRole="button"
            >
              {index < 2 ? <Flame size={14} strokeWidth={2.2} color={colors.orange} /> : null}
              <Text style={styles.chipText}>{item === 'Aasialainen' ? 'Sushi' : item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={[styles.blockTitle, styles.blockTitlePad, { marginTop: 28 }]}>Kuopion suosituimmat</Text>
    </View>
  )

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title} accessibilityRole="header">
        Haku<Text style={{ color: colors.orange }}>.</Text>
      </Text>

      <View style={styles.fieldRow}>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Search size={19} strokeWidth={2.3} color={colors.black} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => rememberSearch(query)}
          placeholder="Ravintolat, ruoat, keittiöt"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, webOutline]}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Hae ravintoloita ja ruokia"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clear} accessibilityLabel="Tyhjennä haku">
            <X size={14} strokeWidth={2.6} color="#ffffff" />
          </Pressable>
        ) : null}
      </View>
      {/* Suodata-nappi hakukentän vieressä */}
      <Pressable
        onPress={() => setFilterOpen(true)}
        style={({ pressed }) => [styles.filterButton, pressed && { backgroundColor: colors.gray200 }]}
        accessibilityRole="button"
        accessibilityLabel={activeCount ? `Suodata, ${activeCount} valittu` : 'Suodata'}
      >
        <SlidersHorizontal size={19} strokeWidth={2.3} color={colors.black} />
        {activeCount ? (
          <View style={styles.filterDot}>
            <Text style={styles.filterDotText}>{activeCount}</Text>
          </View>
        ) : null}
      </Pressable>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id ?? item.name)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: SIDE, paddingTop: 8, paddingBottom: 32 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <SearchX size={26} strokeWidth={2} color={colors.black} />
            </View>
            <Text style={styles.emptyTitle}>{term ? `Ei osumia haulle “${term}”` : 'Ei ravintoloita näillä rajauksilla'}</Text>
            <Text style={styles.emptyText}>
              {activeCount ? 'Poista jokin rajaus tai kokeile toista sanaa.' : 'Kokeile toista sanaa tai valitse jokin näistä.'}
            </Text>
            <View style={[styles.chips, { justifyContent: 'center', marginTop: 14 }]}>
              {POPULAR.slice(0, 4).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => searchFor(item)}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                >
                  <Text style={styles.chipText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        // Haun tulokset isoina litteinä kortteina koko leveydeltä (käyttäjän
        // pyyntö 17.11.2026); tyhjän haun suosituimmat tiiviinä riveinä.
        ItemSeparatorComponent={() => (showResults ? <View style={{ height: 32 }} /> : <View style={styles.separator} />)}
        renderItem={({ item }) =>
          showResults ? (
            <RestaurantCard
              restaurant={item}
              imageAspect={2.7}
              showDistance
              onPress={item.isPlaceholder ? undefined : () => open(item)}
            />
          ) : (
            <ResultRow restaurant={item} onPress={() => open(item)} />
          )
        }
      />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onChange={setFilters}
        resultCount={showResults ? results.length : applyFilters(base, filters, address).length}
        categories={categories}
        address={address}
      />
    </View>
  )
}

// Tiivis tulosrivi: kuva vasemmalla, nimi, tiedot ja tarjous.
function ResultRow({ restaurant, onPress }) {
  const uri = imageUri(restaurant.image_url)
  const eta = formatEtaRange(restaurant.pickup_estimate_minutes)
  const badge = offerBadge(restaurant)
  const closed = restaurant.is_open === false
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, closed && { opacity: 0.5 }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={restaurant.name}
    >
      <View style={styles.thumb}>{uri ? <FadeImage uri={uri} style={styles.thumbImage} /> : null}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.meta}>
          {restaurant.rating != null ? (
            <>
              <ScoreSmiley rating={restaurant.rating} size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatScore(restaurant.rating)}</Text>
            </>
          ) : null}
          {eta ? <Text style={styles.metaText}>· {eta}</Text> : null}
          {restaurant.free_delivery ? (
            <Text style={styles.free}>Ilmainen kuljetus</Text>
          ) : (
            <>
              <Text style={styles.metaText}>·</Text>
              <Bike size={12} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.metaText}>{DELIVERY_PRICE_RANGE}</Text>
            </>
          )}
        </View>
        {badge ? (
          <View style={styles.offer}>
            <Text style={styles.offerText} numberOfLines={1}>
              {badge.text}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  pressed: { opacity: 0.6 },
  title: {
    marginHorizontal: SIDE,
    fontFamily: fonts.headingBold,
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.black,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginHorizontal: SIDE, marginBottom: 6 },
  filterButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: colors.gray100,
  },
  filterDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: 9,
    backgroundColor: colors.black,
  },
  filterDotText: { fontFamily: fonts.bold, fontSize: 10, color: '#ffffff' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 25,
    backgroundColor: colors.gray100,
  },
  fieldFocused: { borderColor: colors.black, backgroundColor: colors.surface },
  input: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 16, color: colors.black },
  clear: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#9b9b97',
  },
  block: { marginTop: 22 },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  blockTitle: { fontFamily: fonts.headingBold, fontSize: 19, letterSpacing: -0.3, color: colors.black },
  blockTitlePad: { marginBottom: 12 },
  blockAction: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textMuted },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  recentText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
  chipPressed: { backgroundColor: colors.gray200 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black },
  count: { marginTop: 14, marginBottom: 18, fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 86, backgroundColor: '#e6e6e3' },
  thumb: { width: 72, height: 72, overflow: 'hidden', borderRadius: 14, backgroundColor: colors.gray100 },
  thumbImage: { width: '100%', height: '100%' },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: '#202125' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  metaText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  free: {
    marginLeft: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  offer: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.offerRed,
  },
  offerText: { fontFamily: fonts.semibold, fontSize: 11, color: '#ffffff' },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 12 },
  emptyIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: colors.gray100,
  },
  emptyTitle: { marginTop: 14, textAlign: 'center', fontFamily: fonts.headingBold, fontSize: 19, color: colors.black },
  emptyText: { marginTop: 4, textAlign: 'center', fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
})
