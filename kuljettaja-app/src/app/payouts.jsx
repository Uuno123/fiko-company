import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Card, Screen, StatusPill } from '../components/ui'
import { formatEuro } from '../lib/format'
import { usePayoutGigs } from '../lib/gigs'
import { useT } from '../lib/i18n'
import { formatPeriodRange, payoutStatements, statementStatus } from '../lib/payouts'
import { colors, fonts } from '../theme'

// Tilitykset: kahden viikon jaksot uusimmasta vanhimpaan, jakson summa ja
// maksun tila (lib/payouts.js). Rivi avaa jakson tilitysraportin. Pallo kuten
// Ansioissa: punainen = odottaa maksua, vihreä = maksettu tai ei maksettavaa.
export default function PayoutsScreen() {
  const router = useRouter()
  const t = useT()
  const { gigs, status } = usePayoutGigs()
  const statements = payoutStatements(gigs)

  return (
    <Screen title={t('payouts.title')}>
      {status === 'loading' ? (
        <Card style={styles.loading}>
          <ActivityIndicator color={colors.orange} />
        </Card>
      ) : (
        <Card>
          {status === 'error' ? <Text style={styles.error}>{t('common.loadFailed')}</Text> : null}
          {statements.map((statement, index) => {
            const { tone, text } = statementStatus(statement)
            const range = formatPeriodRange(statement.period)
            const count = statement.gigs.length
            return (
              <Pressable
                key={statement.period.key}
                onPress={() => router.push(`/payout/${statement.period.key}`)}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${range}, ${formatEuro(statement.total)}, ${text}`}
              >
                <View style={styles.rowText}>
                  <Text style={styles.range}>{range}</Text>
                  <Text style={styles.count}>
                    {count} {t(count === 1 ? 'common.gig.one' : 'common.gig.other')}
                  </Text>
                  <View style={styles.pill}>
                    <StatusPill tone={tone}>{text}</StatusPill>
                  </View>
                </View>
                <Text style={styles.amount}>{formatEuro(statement.total)}</Text>
                <View style={[styles.dot, statement.unpaidTotal > 0 ? styles.dotUnpaid : styles.dotPaid]} />
                <ChevronRight size={20} strokeWidth={1.75} color={colors.textMuted} />
              </Pressable>
            )
          })}
        </Card>
      )}
      <Text style={styles.note}>{t('payouts.listNote')}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  error: {
    paddingTop: 14,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowText: {
    flex: 1,
  },
  range: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  count: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  pill: {
    flexDirection: 'row',
    marginTop: 8,
  },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.black,
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
  note: {
    marginTop: 4,
    paddingHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
})
