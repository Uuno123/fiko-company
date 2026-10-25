import { Share, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Share2 } from 'lucide-react-native'
import { Button, Card, Screen, StatusPill } from '../../components/ui'
import { displayChangeValue } from '../../lib/changeRequests'
import { billingMethodLabel, useCourier } from '../../lib/courier'
import { formatEuro, formatShortDate, formatTime, weekdayShort } from '../../lib/format'
import { usePayoutGigs } from '../../lib/gigs'
import { useT } from '../../lib/i18n'
import { formatPeriodRange, payoutStatementFor, statementStatus } from '../../lib/payouts'
import { colors, fonts } from '../../theme'

// Tilitysraportti yhdeltä kahden viikon jaksolta: summa ja tila, erittely,
// maksun saaja ja jakson keikat. "Jaa raportti" lähettää saman tekstinä
// (esim. sähköpostiin tai kirjanpitoon). Koko hinta on kuljettajan (0058).
export default function PayoutStatementScreen() {
  const { key } = useLocalSearchParams()
  const t = useT()
  const { profile } = useCourier()
  const { gigs } = usePayoutGigs()
  const statement = payoutStatementFor(gigs, Number(key))
  const { tone, text } = statementStatus(statement)
  const range = formatPeriodRange(statement.period)
  const count = statement.gigs.length
  const countText = `${count} ${t(count === 1 ? 'common.gig.one' : 'common.gig.other')}`
  const partlyPaid = statement.paidTotal > 0 && statement.unpaidTotal > 0
  const gigDate = (gig) =>
    `${weekdayShort(gig.deliveredAt)} ${formatShortDate(gig.deliveredAt)} ${formatTime(gig.deliveredAt)}`

  const recipient = [
    [t('payouts.name'), profile.name || '–'],
    [t('billing.businessId'), profile.businessId ?? t('common.notSet')],
    [t('billing.method'), billingMethodLabel(profile.billingMethod) ?? t('common.notSet')],
    [t('payouts.account'), profile.iban ? displayChangeValue('iban', profile.iban) : t('common.notSet')],
    [t('payouts.payDate'), `${weekdayShort(statement.period.payDate)} ${formatShortDate(statement.period.payDate)}`],
  ]

  const share = () => {
    const lines = [
      `Bidrop – ${t('payouts.statement')}`,
      `${t('payouts.period')}: ${range}`,
      `${t('payouts.statusLabel')}: ${text}`,
      '',
      ...recipient.map(([label, value]) => `${label}: ${value}`),
      '',
      `${t('payouts.gigs')}: ${countText}`,
      `${t('payouts.deliveryTotal')}: ${formatEuro(statement.total)}`,
      `${t('payouts.bidropShare')}: ${formatEuro(0)}`,
      `${t('payouts.toYou')}: ${formatEuro(statement.total)}`,
      '',
      ...statement.gigs.map(
        (gig) => `${gigDate(gig)}  #${gig.number}  ${gig.restaurant.name}  ${formatEuro(gig.pay.total)}`,
      ),
    ]
    Share.share({ message: lines.join('\n'), title: `${t('payouts.statement')} ${range}` }).catch(() => {})
  }

  return (
    <Screen title={t('payouts.statement')}>
      <Card style={styles.summary}>
        <Text style={styles.range}>{range}</Text>
        <View style={styles.pill}>
          <StatusPill tone={tone}>{text}</StatusPill>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>{formatEuro(statement.total)}</Text>
          <View
            style={[styles.bigDot, statement.unpaidTotal > 0 ? styles.dotUnpaid : styles.dotPaid]}
            accessible
            accessibilityLabel={statement.unpaidTotal > 0 ? t('earnings.unpaid') : t('earnings.paid')}
          />
        </View>
        <Text style={styles.muted}>{countText}</Text>
        {partlyPaid ? (
          <Text style={styles.partly}>
            {t('earnings.alreadyPaid', {
              amount: formatEuro(statement.paidTotal),
              date: formatShortDate(statement.paidAt),
            })}
          </Text>
        ) : null}
      </Card>

      <Card title={t('payouts.breakdown')}>
        <Line label={t('payouts.deliveryTotal')} value={formatEuro(statement.total)} />
        <Line label={t('payouts.bidropShare')} value={formatEuro(0)} />
        <Line label={t('payouts.toYou')} value={formatEuro(statement.total)} strong />
      </Card>

      <Card title={t('payouts.recipient')}>
        {recipient.map(([label, value]) => (
          <Line key={label} label={label} value={value} />
        ))}
      </Card>

      <Card title={t('payouts.gigs')}>
        {count === 0 ? <Text style={styles.empty}>{t('payouts.noGigs')}</Text> : null}
        {statement.gigs.map((gig, index) => (
          <View key={gig.id} style={[styles.gig, index > 0 && styles.gigDivider]}>
            <View style={styles.gigText}>
              <Text style={styles.gigRestaurant} numberOfLines={1}>
                {gig.restaurant.name}
              </Text>
              <Text style={styles.muted} numberOfLines={1}>
                {gigDate(gig)} · #{gig.number}
              </Text>
            </View>
            <Text style={styles.gigPay}>{formatEuro(gig.pay.total)}</Text>
            <View style={[styles.dot, gig.paidAt ? styles.dotPaid : styles.dotUnpaid]} />
          </View>
        ))}
      </Card>

      <Button title={t('payouts.share')} icon={Share2} variant="secondary" onPress={share} />
      <Text style={styles.note}>{t('payouts.note')}</Text>
    </Screen>
  )
}

function Line({ label, value, strong = false }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineStrong]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrong]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  summary: {
    paddingTop: 18,
    paddingBottom: 16,
  },
  range: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.black,
  },
  pill: {
    flexDirection: 'row',
    marginTop: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  amount: {
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: -1,
    color: colors.black,
  },
  bigDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
  muted: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  partly: {
    marginTop: 4,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.open,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 9,
  },
  lineLabel: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  lineValue: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.black,
    textAlign: 'right',
  },
  lineStrong: {
    fontFamily: fonts.bold,
    color: colors.black,
  },
  empty: {
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  gig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  gigDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  gigText: {
    flex: 1,
  },
  gigRestaurant: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  gigPay: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  note: {
    marginTop: 4,
    paddingHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
})
