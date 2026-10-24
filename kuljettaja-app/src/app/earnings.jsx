import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight, CircleCheck, Landmark } from 'lucide-react-native'
import { Card, ListRow, Screen } from '../components/ui'
import {
  addDays,
  dayKey,
  formatDayLabel,
  formatEuro,
  formatWeekRange,
  isSameDay,
  startOfDay,
  startOfWeek,
  weekdayShort,
} from '../lib/format'
import { HISTORY_DAYS, summarize, useGigs } from '../lib/gigs'
import { useT } from '../lib/i18n'
import { periodPayout, unpaidByPeriod } from '../lib/payouts'
import { colors, fonts } from '../theme'

const CHART_HEIGHT = 120
// Tila pylvään summalle sen yläpuolella ja asteikon euroille oikealla.
const VALUE_SPACE = 18
const GRID_LABEL_WIDTH = 34
// Asteikon ylärajat euroina: puolikas on aina tasaluku.
const SCALE_STEPS = [2, 4, 6, 10, 20, 30, 40, 60, 80, 100, 200, 300, 400, 600, 1000]

function niceScaleCents(maxCents) {
  const euros = maxCents / 100
  const step = SCALE_STEPS.find((value) => euros <= value)
  return (step ?? Math.ceil(euros / 1000) * 1000) * 100
}

// Asteikko "10 €", pylvään summa "4,50".
function gridEuro(euros) {
  return `${Math.round(euros)} €`
}

function barEuro(euros) {
  return euros.toFixed(2).replace('.', ',')
}
// Keikkoja on HISTORY_DAYS päivää taaksepäin - sitä vanhempia viikkoja ei näytetä.
const MAX_WEEKS_BACK = Math.floor(HISTORY_DAYS / 7) - 1

// Ansiot yksinkertaisena (käyttäjän pyynnöt 24.10.2026): viikon summa ja
// pylväät, alla viikon kaikki keikat päivittäin. Pylvään napautus näyttää vain
// sen päivän keikat, uusi napautus taas koko viikon. Keikan pallo: vihreä =
// palkkio maksettu tilille, punainen = odottaa maksua (migraatio 0064).
// Alimpana seuraavan maksun päivä ja summa (lib/payouts.js).
export default function EarningsScreen() {
  const router = useRouter()
  const t = useT()
  const [weeksBack, setWeeksBack] = useState(0)
  const [selectedKey, setSelectedKey] = useState(null)
  const now = new Date()
  const weekStart = addDays(startOfWeek(now), -7 * weeksBack)
  const weekEnd = addDays(weekStart, 7)
  const allGigs = useGigs()
  const gigs = allGigs.filter((gig) => gig.deliveredAt >= weekStart && gig.deliveredAt < weekEnd)
  const week = summarize(gigs)
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index)
    const dayGigs = gigs.filter((gig) => isSameDay(gig.deliveredAt, day))
    return { key: dayKey(day), day, gigs: dayGigs, summary: summarize(dayGigs) }
  })
  const maxDay = Math.max(1, ...days.map((entry) => entry.summary.total))
  const weekTitle =
    weeksBack === 0
      ? t('earnings.thisWeek')
      : weeksBack === 1
        ? t('earnings.lastWeek')
        : t('earnings.weeksAgo', { count: weeksBack })

  // Valittu päivä (napautettu pylväs) tai null = koko viikko. Listassa päivät
  // uusin ensin, vain ne joilla on keikkoja (valittu päivä näkyy aina).
  const selected = days.find((entry) => entry.key === selectedKey) ?? null
  const listDays = selected ? [selected] : days.filter((entry) => entry.summary.count).reverse()

  const changeWeek = (next) => {
    setWeeksBack(next)
    setSelectedKey(null)
  }

  // Alalaatikko näyttää valitun viikon tilitysjakson: maksettu (milloin ja
  // paljonko) tai tuleva maksu. Nykyisellä jaksolla myös aiemmilta jaksoilta
  // maksamatta jääneet.
  const payout = periodPayout(allGigs, weekStart, now)
  const earlierTotal = payout.isCurrent
    ? unpaidByPeriod(allGigs, now)
        .slice(0, -1)
        .reduce((sum, entry) => sum + entry.total, 0)
    : 0
  const dayText = (date) => `${weekdayShort(date)} ${date.getDate()}.${date.getMonth() + 1}.`
  const showUnpaid = payout.unpaidTotal > 0 || (payout.isCurrent && payout.paidTotal === 0)
  const fullyPaid = !showUnpaid && payout.paidTotal > 0
  const payoutLabel = showUnpaid
    ? payout.period.payDate >= startOfDay(now)
      ? t('earnings.nextPayout', { date: dayText(payout.period.payDate) })
      : t('earnings.awaiting', { date: dayText(payout.period.payDate) })
    : fullyPaid
      ? t('earnings.paidOn', { date: dayText(payout.paidAt) })
      : t('earnings.payoutOn', { date: dayText(payout.period.payDate) })
  // Jaksolla ei laskutettavaa: 0,00 €.
  const payoutAmount = showUnpaid ? payout.unpaidTotal : payout.paidTotal
  const awaitingPayment = showUnpaid && payoutAmount > 0

  // Kaavion asteikko: pyöreä yläraja (esim. 10 €), apuviivat 0, puolet ja yläraja.
  const scaleMax = niceScaleCents(maxDay)

  return (
    <Screen title={t('menu.earnings')}>
      <View style={styles.weekSwitch}>
        <Pressable
          onPress={() => changeWeek(Math.min(MAX_WEEKS_BACK, weeksBack + 1))}
          disabled={weeksBack >= MAX_WEEKS_BACK}
          style={({ pressed }) => [
            styles.weekArrow,
            pressed && styles.weekArrowPressed,
            weeksBack >= MAX_WEEKS_BACK && styles.weekArrowDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('earnings.prevWeek')}
          hitSlop={6}
        >
          <ChevronLeft size={20} strokeWidth={2.2} color={colors.black} />
        </Pressable>
        <View style={styles.weekText}>
          <Text style={styles.weekTitle}>{weekTitle}</Text>
          <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>
        </View>
        <Pressable
          onPress={() => changeWeek(Math.max(0, weeksBack - 1))}
          disabled={weeksBack === 0}
          style={({ pressed }) => [
            styles.weekArrow,
            pressed && styles.weekArrowPressed,
            weeksBack === 0 && styles.weekArrowDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('earnings.nextWeek')}
          hitSlop={6}
        >
          <ChevronRight size={20} strokeWidth={2.2} color={colors.black} />
        </Pressable>
      </View>

      <Card style={styles.totalCard}>
        <Text style={styles.total}>{formatEuro(week.total)}</Text>
        <View style={styles.chart}>
          {/* Apuviivat euroineen: yläraja, puolet ja nolla. */}
          {[1, 0.5, 0].map((fraction) => (
            <View key={fraction} style={[styles.gridLine, { top: VALUE_SPACE + CHART_HEIGHT * (1 - fraction) }]}>
              <Text style={styles.gridLabel}>{gridEuro((scaleMax * fraction) / 100)}</Text>
            </View>
          ))}
          <View style={styles.bars}>
            {days.map((entry) => {
              const isSelected = entry.key === selected?.key
              const dimmed = selected && !isSelected
              const height = entry.summary.total
                ? Math.max(6, Math.round((entry.summary.total / scaleMax) * CHART_HEIGHT))
                : 3
              return (
                <Pressable
                  key={entry.key}
                  onPress={() => setSelectedKey(isSelected ? null : entry.key)}
                  style={styles.chartColumn}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${formatDayLabel(entry.day, now)}, ${formatEuro(entry.summary.total)}`}
                >
                  {entry.summary.total ? (
                    <Text
                      style={[styles.barValue, isSelected && styles.barValueSelected, dimmed && styles.dimmed]}
                      numberOfLines={1}
                    >
                      {barEuro(entry.summary.total / 100)}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.chartBar,
                      { height },
                      entry.summary.total
                        ? isSelected
                          ? styles.chartBarSelected
                          : dimmed
                            ? styles.chartBarDimmed
                            : styles.chartBarFilled
                        : styles.chartBarEmpty,
                    ]}
                  />
                </Pressable>
              )
            })}
          </View>
        </View>
        <View style={styles.dayLabels}>
          {days.map((entry) => {
            const isSelected = entry.key === selected?.key
            const today = isSameDay(entry.day, now)
            return (
              <View key={entry.key} style={styles.dayLabelColumn}>
                <Text style={[styles.chartDay, today && styles.chartDayToday, isSelected && styles.chartDaySelected]}>
                  {weekdayShort(entry.day)}
                </Text>
                <Text style={[styles.chartDate, isSelected && styles.chartDaySelected]}>{entry.day.getDate()}</Text>
                {today ? <View style={styles.todayDot} /> : null}
              </View>
            )
          })}
        </View>
      </Card>

      <Card>
        {selected ? (
          <Pressable
            onPress={() => setSelectedKey(null)}
            style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.showAllText}>{t('earnings.showWeek')}</Text>
          </Pressable>
        ) : null}
        {listDays.length ? (
          listDays.map((entry) => (
            <View key={entry.key}>
              <Text style={styles.dayLabel}>{formatDayLabel(entry.day, now)}</Text>
              {entry.gigs.length ? (
                entry.gigs.map((gig) => (
                  <Pressable
                    key={gig.id}
                    onPress={() => router.push(`/gig/${gig.id}`)}
                    style={({ pressed }) => [styles.gigRow, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${gig.restaurant.name}, ${formatEuro(gig.pay.total)}, ${
                      gig.paidAt ? t('earnings.paid') : t('earnings.unpaid')
                    }`}
                  >
                    <View style={[styles.dot, gig.paidAt ? styles.dotPaid : styles.dotUnpaid]} />
                    <Text style={styles.gigName} numberOfLines={1}>
                      {gig.restaurant.name}
                    </Text>
                    <Text style={styles.gigPay}>{formatEuro(gig.pay.total)}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>{t('earnings.dayEmpty')}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('earnings.weekEmpty')}</Text>
        )}
        <View style={styles.legend}>
          <View style={[styles.dot, styles.legendDot, styles.dotPaid]} />
          <Text style={styles.legendText}>{t('earnings.paid')}</Text>
          <View style={[styles.dot, styles.legendDot, styles.dotUnpaid, styles.legendGap]} />
          <Text style={styles.legendText}>{t('earnings.unpaid')}</Text>
        </View>
      </Card>

      <Card style={styles.payoutCard}>
        <View style={styles.payoutHead}>
          {fullyPaid ? <CircleCheck size={16} strokeWidth={2.2} color={colors.open} /> : null}
          <Text style={[styles.payoutLabel, fullyPaid && styles.payoutLabelPaid]}>{payoutLabel}</Text>
        </View>
        {/* Pallo summan toisessa reunassa: punainen = odottaa maksua, vihreä =
            maksettu tai jaksolla ei maksettavaa (0,00 €). */}
        <View style={styles.payoutAmountRow}>
          <Text style={styles.payoutAmount}>{formatEuro(payoutAmount)}</Text>
          <View
            style={[styles.payoutDot, awaitingPayment ? styles.dotUnpaid : styles.dotPaid]}
            accessible
            accessibilityLabel={awaitingPayment ? t('earnings.unpaid') : t('earnings.paid')}
          />
        </View>
        <Text style={styles.payoutPeriod}>
          {t('earnings.period', {
            start: `${payout.period.start.getDate()}.${payout.period.start.getMonth() + 1}.`,
            end: `${payout.period.end.getDate()}.${payout.period.end.getMonth() + 1}.`,
          })}
        </Text>
        {showUnpaid && payout.paidTotal > 0 ? (
          <Text style={styles.alreadyPaid}>
            {t('earnings.alreadyPaid', { amount: formatEuro(payout.paidTotal), date: dayText(payout.paidAt) })}
          </Text>
        ) : null}
        {earlierTotal > 0 ? (
          <Text style={styles.earlier}>{t('earnings.earlier', { amount: formatEuro(earlierTotal) })}</Text>
        ) : null}
        <View style={styles.payoutBilling}>
          <ListRow icon={Landmark} label={t('profile.billing')} onPress={() => router.push('/billing')} />
        </View>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  weekSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  weekArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f4f4f4',
  },
  weekArrowPressed: {
    backgroundColor: colors.gray200,
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
  total: {
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: -0.8,
    color: colors.black,
  },
  chart: {
    height: VALUE_SPACE + CHART_HEIGHT,
    marginTop: 14,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  gridLabel: {
    position: 'absolute',
    top: -8,
    right: 0,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  bars: {
    position: 'absolute',
    top: 0,
    right: GRID_LABEL_WIDTH,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValue: {
    marginBottom: 4,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.black,
  },
  barValueSelected: {
    color: colors.orange,
  },
  dimmed: {
    opacity: 0.4,
  },
  chartBar: {
    width: '100%',
    maxWidth: 30,
    borderRadius: 6,
  },
  chartBarFilled: {
    backgroundColor: colors.black,
  },
  chartBarSelected: {
    backgroundColor: colors.orange,
  },
  chartBarEmpty: {
    backgroundColor: colors.gray100,
  },
  chartBarDimmed: {
    backgroundColor: colors.gray200,
  },
  dayLabels: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingRight: GRID_LABEL_WIDTH,
  },
  dayLabelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartDay: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  chartDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  todayDot: {
    width: 4,
    height: 4,
    marginTop: 3,
    borderRadius: 2,
    backgroundColor: colors.orange,
  },
  chartDayToday: {
    color: colors.black,
  },
  chartDaySelected: {
    fontFamily: fonts.bold,
    color: colors.orange,
  },
  showAll: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.gray100,
  },
  showAllText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.black,
  },
  dayLabel: {
    paddingTop: 12,
    paddingBottom: 4,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  gigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotPaid: {
    backgroundColor: colors.open,
  },
  dotUnpaid: {
    backgroundColor: colors.danger,
  },
  gigName: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.black,
  },
  gigPay: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendGap: {
    marginLeft: 12,
  },
  legendText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyText: {
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  payoutCard: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  payoutHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payoutLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  payoutPeriod: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  payoutLabelPaid: {
    fontFamily: fonts.semibold,
    color: colors.open,
  },
  alreadyPaid: {
    marginTop: 4,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.open,
  },
  payoutAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  payoutAmount: {
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: -1,
    color: colors.black,
  },
  payoutDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  earlier: {
    marginTop: 4,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  payoutBilling: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
})
