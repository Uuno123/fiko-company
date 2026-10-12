import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { Card, ListRow, Screen, SectionTitle } from '../components/ui'
import {
  addDays,
  dayKey,
  formatDayLabel,
  formatEuro,
  formatKm,
  formatWeekRange,
  isSameDay,
  startOfWeek,
  weekdayShort,
} from '../lib/format'
import { HISTORY_DAYS, summarize, useGigs } from '../lib/gigs'
import { colors, fonts } from '../theme'

const CHART_HEIGHT = 120
// Keikkoja on HISTORY_DAYS päivää taaksepäin - sitä vanhempia viikkoja ei näytetä.
const MAX_WEEKS_BACK = Math.floor(HISTORY_DAYS / 7) - 1

// Ansiot viikoittain: summa, pylväät päivittäin, tunnusluvut ja päivät,
// joista pääsee sen päivän keikkoihin.
export default function EarningsScreen() {
  const router = useRouter()
  const [weeksBack, setWeeksBack] = useState(0)
  const now = new Date()
  const weekStart = addDays(startOfWeek(now), -7 * weeksBack)
  const weekEnd = addDays(weekStart, 7)
  const allGigs = useGigs()
  const gigs = allGigs.filter((gig) => gig.deliveredAt >= weekStart && gig.deliveredAt < weekEnd)
  const week = summarize(gigs)
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index)
    return { day, summary: summarize(gigs.filter((gig) => isSameDay(gig.deliveredAt, day))) }
  })
  const maxDay = Math.max(1, ...days.map((entry) => entry.summary.total))
  const weekTitle = weeksBack === 0 ? 'Tämä viikko' : weeksBack === 1 ? 'Viime viikko' : `${weeksBack} viikkoa sitten`

  return (
    <Screen title="Ansiot">
      <View style={styles.weekSwitch}>
        <Pressable
          onPress={() => setWeeksBack((value) => Math.min(MAX_WEEKS_BACK, value + 1))}
          disabled={weeksBack >= MAX_WEEKS_BACK}
          style={({ pressed }) => [styles.weekArrow, pressed && styles.weekArrowPressed, weeksBack >= MAX_WEEKS_BACK && styles.weekArrowDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Edellinen viikko"
          hitSlop={6}
        >
          <ChevronLeft size={20} strokeWidth={2.2} color={colors.black} />
        </Pressable>
        <View style={styles.weekText}>
          <Text style={styles.weekTitle}>{weekTitle}</Text>
          <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>
        </View>
        <Pressable
          onPress={() => setWeeksBack((value) => Math.max(0, value - 1))}
          disabled={weeksBack === 0}
          style={({ pressed }) => [styles.weekArrow, pressed && styles.weekArrowPressed, weeksBack === 0 && styles.weekArrowDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Seuraava viikko"
          hitSlop={6}
        >
          <ChevronRight size={20} strokeWidth={2.2} color={colors.black} />
        </Pressable>
      </View>

      <Card style={styles.totalCard}>
        <Text style={styles.totalLabel}>Ansiot yhteensä</Text>
        <Text style={styles.total}>{formatEuro(week.total)}</Text>
        <Text style={styles.totalMeta}>
          {week.count} {week.count === 1 ? 'keikka' : 'keikkaa'} · {formatKm(week.km)}
        </Text>

        <View style={styles.chart}>
          {days.map(({ day, summary }) => {
            const today = isSameDay(day, now)
            const height = summary.total ? Math.max(6, Math.round((summary.total / maxDay) * CHART_HEIGHT)) : 4
            return (
              <View key={dayKey(day)} style={styles.chartColumn}>
                <Text style={styles.chartValue} numberOfLines={1}>
                  {summary.total ? Math.round(summary.total / 100) : ''}
                </Text>
                <View
                  style={[
                    styles.chartBar,
                    { height },
                    summary.total ? (today ? styles.chartBarToday : styles.chartBarFilled) : styles.chartBarEmpty,
                  ]}
                />
                <Text style={[styles.chartDay, today && styles.chartDayToday]}>{weekdayShort(day)}</Text>
              </View>
            )
          })}
        </View>
      </Card>

      <View style={styles.tiles}>
        <Tile label="Keikat" value={String(week.count)} />
        <Tile label="Keskimäärin / keikka" value={formatEuro(week.average)} />
        <Tile label="Tipit" value={formatEuro(week.tips)} />
        <Tile label="Kilometrit" value={formatKm(week.km)} />
      </View>

      <SectionTitle>Päivät</SectionTitle>
      {days.some((entry) => entry.summary.count) ? (
        <Card>
          {days
            .filter((entry) => entry.summary.count)
            .reverse()
            .map(({ day, summary }, index, list) => (
              <ListRow
                key={dayKey(day)}
                label={formatDayLabel(day, now)}
                detail={`${summary.count} ${summary.count === 1 ? 'keikka' : 'keikkaa'} · ${formatKm(summary.km)}`}
                value={formatEuro(summary.total)}
                onPress={() => router.push({ pathname: '/history', params: { day: dayKey(day) } })}
                last={index === list.length - 1}
              />
            ))}
        </Card>
      ) : (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>Ei keikkoja tällä viikolla.</Text>
        </Card>
      )}

    </Screen>
  )
}

function Tile({ label, value }) {
  return (
    <Card style={styles.tile}>
      <Text style={styles.tileValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  weekSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  weekArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  weekArrowPressed: {
    backgroundColor: colors.gray100,
  },
  weekArrowDisabled: {
    opacity: 0.35,
  },
  weekText: {
    flex: 1,
    alignItems: 'center',
  },
  weekTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.black,
  },
  weekRange: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  totalCard: {
    padding: 18,
  },
  totalLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  total: {
    marginTop: 2,
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: -1,
    color: colors.black,
  },
  totalMeta: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: CHART_HEIGHT + 44,
  },
  chartValue: {
    marginBottom: 4,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
  },
  chartBar: {
    width: '100%',
    maxWidth: 30,
    borderRadius: 8,
  },
  chartBarFilled: {
    backgroundColor: colors.black,
  },
  chartBarToday: {
    backgroundColor: colors.orange,
  },
  chartBarEmpty: {
    backgroundColor: colors.gray200,
  },
  chartDay: {
    marginTop: 6,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  chartDayToday: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tileValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.black,
  },
  tileLabel: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    padding: 18,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
})
