import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight } from 'lucide-react-native'
import { PAGE_BACKGROUND, ScreenHeader } from '../components/ui'
import { dayKey, formatDayLabel, formatEuro, formatKm, formatTime, parseDayKey } from '../lib/format'
import { groupByDay, useGigs } from '../lib/gigs'
import { colors, fonts } from '../theme'

// Keikkahistoria päivittäin. ?day=2026-10-06 näyttää vain sen päivän keikat
// (Ansiot-näkymän päiväriveiltä).
export default function HistoryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { day } = useLocalSearchParams()
  const now = new Date()
  const gigs = useGigs().filter((gig) => !day || dayKey(gig.deliveredAt) === day)
  const sections = groupByDay(gigs).map((group) => ({
    key: group.key,
    title: formatDayLabel(group.day, now),
    summary: group.summary,
    data: group.gigs,
  }))

  return (
    <View style={styles.screen}>
      <ScreenHeader title={day ? formatDayLabel(parseDayKey(day), now) : 'Keikkahistoria'} />
      <SectionList
        sections={sections}
        keyExtractor={(gig) => gig.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          day ? (
            <Pressable onPress={() => router.setParams({ day: '' })} style={styles.showAll} accessibilityRole="button">
              <Text style={styles.showAllText}>Näytä kaikki keikat</Text>
            </Pressable>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionMeta}>
              {section.summary.count} {section.summary.count === 1 ? 'keikka' : 'keikkaa'} ·{' '}
              {formatEuro(section.summary.total)}
            </Text>
          </View>
        )}
        renderItem={({ item: gig, index, section }) => (
          <Pressable
            onPress={() => router.push(`/gig/${gig.id}`)}
            style={({ pressed }) => [
              styles.gig,
              index === section.data.length - 1 && styles.gigLast,
              pressed && styles.gigPressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.gigTime}>{formatTime(gig.deliveredAt)}</Text>
            <View style={styles.gigText}>
              <Text style={styles.gigRestaurant} numberOfLines={1}>
                {gig.restaurant.name}
              </Text>
              <Text style={styles.gigMeta} numberOfLines={1}>
                {gig.dropoff.address} · {formatKm(gig.distanceKm)}
              </Text>
            </View>
            <Text style={styles.gigPay}>{formatEuro(gig.pay.total)}</Text>
            <ChevronRight size={20} strokeWidth={1.75} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ei keikkoja vielä.</Text>
          </View>
        }
      />
    </View>
  )
}

const CARD_LINE = '#ececec'

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
  },
  content: {
    paddingHorizontal: 16,
  },
  showAll: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#f4f4f4',
  },
  showAllText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.black,
  },
  // Päivän kortin yläosa: reunus ylhäällä ja sivuilla, otsikko ja yhteenveto.
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: CARD_LINE,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 21,
    letterSpacing: -0.2,
    color: colors.black,
  },
  sectionMeta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  gig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: CARD_LINE,
    backgroundColor: colors.surface,
  },
  // Päivän viimeinen keikka sulkee kortin.
  gigLast: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  gigPressed: {
    opacity: 0.6,
  },
  gigTime: {
    width: 44,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.black,
  },
  gigText: {
    flex: 1,
  },
  gigRestaurant: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  gigMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  gigPay: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  empty: {
    marginTop: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
})
