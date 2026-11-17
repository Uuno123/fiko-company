import { StyleSheet, Text, View } from 'react-native'
import { Clock } from 'lucide-react-native'
import { dealPercent, dealPriceCents, formatCountdown } from '../../../frontend/src/lib/dailyDeals'
import { formatPrice } from '../../../frontend/src/lib/format'
import { useDealsCountdown } from '../lib/dealItems'
import StrikePrice from './StrikePrice'
import { fonts, colors } from '../theme'

// Tuotteen hinta päivän tarjouksella kuten verkkosivun DealPrice
// (RestaurantPage.jsx, 4.11.2026): alennettu hinta, yliviivattu vanha hinta,
// prosenttipilleri ja ajastin tarjouksen loppuun. Ilman tarjousta pelkkä hinta.
export default function DealPrice({ item, size = 14.5, style }) {
  const percent = dealPercent(item.id)
  if (!percent) return <Text style={[styles.price, { fontSize: size }, style]}>{formatPrice(item.price_cents)}</Text>
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.now, { fontSize: size }]}>{formatPrice(dealPriceCents(item))}</Text>
      <StrikePrice size={size * 0.86}>{formatPrice(item.price_cents)}</StrikePrice>
      <View style={styles.tag}>
        <Text style={styles.tagText}>−{percent} %</Text>
      </View>
      <Countdown />
    </View>
  )
}

function Countdown() {
  const ms = useDealsCountdown()
  return (
    <View style={styles.timer} accessibilityLabel={`Tarjous päättyy ${formatCountdown(ms)}`}>
      <Clock size={10} strokeWidth={2.6} color="#b9390d" />
      <Text style={styles.timerText}>{formatCountdown(ms)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  price: { fontFamily: fonts.semibold, color: colors.black },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 4 },
  now: { fontFamily: fonts.semibold, color: '#d9420f' },
  was: { fontFamily: fonts.medium, color: colors.textMuted, textDecorationLine: 'line-through' },
  tag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: '#ec5420' },
  tagText: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 15, color: '#ffffff' },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 5,
    paddingRight: 7,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#fff1ea',
  },
  timerText: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 15, color: '#b9390d', fontVariant: ['tabular-nums'] },
})
