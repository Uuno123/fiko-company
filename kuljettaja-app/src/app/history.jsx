import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight } from 'lucide-react-native'
import { ScreenHeader } from '../components/ui'
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
      <ScreenHeader
        title={day ? formatDayLabel(parseDayKey(day), now) : 'Keikkahistoria'}
        subtitle={day ? 'Päivän keikat' : `Viimeiset 4 viikkoa · ${gigs.length} keikkaa`}
      />
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
              {section.summary.count} {section.summary.count === 1 ? 'keikka' : 'keikkaa'} · {formatEuro(section.summary.total)}
            </Text>
          </View>
        )}
        renderItem={({ item: gig, index, section }) => (
          <Pressable
            onPress={() => router.push(`/gig/${gig.id}`)}
            style={({ pressed }) => [
              styles.gig,
              index === 0 && styles.gigFirst,
              index === section.data.length - 1 ? styles.gigLast : styles.gigDivider,
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
                → {gig.dropoff.area} · {formatKm(gig.distanceKm)}
              </Text>
            </View>
            <Text style={styles.gigPay}>{formatEuro(gig.pay.total)}</Text>
            <ChevronRight size={18} strokeWidth={2} color={colors.gray400} />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  content: {
    paddingHorizontal: 16,
  },
  showAll: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  showAllText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.black,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.black,
  },
  sectionMeta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  gig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.gray200,
  },
  gigFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  gigLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  gigDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gigPressed: {
    backgroundColor: colors.gray50,
  },
  gigTime: {
    width: 44,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.black,
  },
  gigText: {
    flex: 1,
  },
  gigRestaurant: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  gigMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  gigPay: {
    fontFamily: fonts.display,
    fontSize: 16,
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
