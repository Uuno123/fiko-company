import { useEffect, useMemo, useState } from 'react'
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Search, X } from 'lucide-react-native'
import RestaurantCard from '../../components/RestaurantCard'
import { BackButton } from '../../components/ui'
import { SectionTitle } from '../../components/HomeSection'
import { CATEGORY_NAMES, allFillerRestaurants, dealsFillerRestaurants, isDealsQuery } from '../../../../frontend/src/lib/categories'
import { quickFilterForQuery } from '../../../../frontend/src/lib/quickFilters'
import { searchRestaurants } from '../../../../frontend/src/lib/searchEngine'
import { useRestaurants } from '../../lib/restaurants'
import { colors, fonts } from '../../theme'

const SIDE = 16
const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })

// Haku-välilehti: hakukenttä ylhäällä, tyhjänä Kuopion suosituimmat, kirjoittaessa
// tulokset samalla hakumoottorilla kuin verkkosivulla (lib/searchEngine.js).
export default function SearchScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { restaurants } = useRestaurants()
  const { q, focus } = useLocalSearchParams()
  const [query, setQuery] = useState(typeof q === 'string' ? q : '')

  // Kodin pikavalintapilleri avaa haun valmiilla hakusanalla (?q=).
  useEffect(() => {
    if (typeof q === 'string') Promise.resolve().then(() => setQuery(q))
  }, [q])

  const pool = useMemo(() => {
    const names = new Set(restaurants.map((r) => r.name))
    return [...restaurants, ...allFillerRestaurants().filter((r) => !names.has(r.name))]
  }, [restaurants])

  const term = query.trim()
  const results = useMemo(
    () =>
      !term
        ? [...pool].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 10)
        : isDealsQuery(term)
          ? dealsFillerRestaurants()
          : CATEGORY_NAMES.includes(term)
            ? pool.filter((r) => r.category === term).sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0))
          : quickFilterForQuery(term)
            ? pool.filter(quickFilterForQuery(term).test).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
            : searchRestaurants(pool, term),
    [pool, term],
  )

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <View style={styles.fieldRow}>
      <BackButton onPress={() => (router.canGoBack() ? router.back() : router.navigate('/ravintolat'))} />
      <View style={styles.field}>
        <Search size={20} strokeWidth={2.2} color={colors.black} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Mitä tekis mieli?"
          autoFocus={focus === '1'}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, webOutline]}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Hae ravintoloita ja ruokia"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clear} accessibilityLabel="Tyhjennä haku">
            <X size={15} strokeWidth={2.4} color={colors.black} />
          </Pressable>
        ) : null}
      </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id ?? item.name)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SIDE, paddingBottom: 32, gap: 22 }}
        ListHeaderComponent={
          <SectionTitle title={term ? `Tulokset haulle "${term}"` : 'Kuopion suosituimmat'} style={styles.heading} />
        }
        ListEmptyComponent={<Text style={styles.empty}>Ei tuloksia. Kokeile toista hakusanaa.</Text>}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={item.isPlaceholder ? undefined : () => router.push(`/ravintola/${item.id}`)}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: SIDE, marginBottom: 14 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray100,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.black },
  clear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  heading: { fontSize: 22, marginTop: 6, marginBottom: 2 },
  empty: { marginTop: 24, textAlign: 'center', fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
})
