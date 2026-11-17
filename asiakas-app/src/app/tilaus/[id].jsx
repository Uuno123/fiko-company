import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChevronDown, ChevronUp, MessageCircle, Receipt, X } from 'lucide-react-native'
import CourierSearch from '../../components/CourierSearch'
import RestaurantLogo from '../../components/RestaurantLogo'
import {
  ORDER_STATUS_FLOW,
  estimatedArrivalAt,
  isOrderInProgress,
  trackingHeadline,
  trackingMessage,
} from '../../../../frontend/src/lib/orderStatus'
import { formatPrice } from '../../../../frontend/src/lib/format'
import { useTrackedOrder } from '../../lib/orderTracking'
import { colors, fonts } from '../../theme'

const SIDE = 16
const STEPS = ORDER_STATUS_FLOW.slice(0, 4)
const clock = (value) => new Date(value).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })

function stepLabel(status, isDelivery) {
  if (status === 'pending') return 'Tilattu'
  if (status === 'confirmed') return 'Hyväksytty'
  if (status === 'preparing') return 'Valmistus'
  if (status === 'ready') return isDelivery ? 'Matkalla' : 'Valmis'
  return ''
}

// Tilauksen seuranta (käyttäjän pyyntö 17.11.2026) kuten verkkosivun
// OrderTrackingView: kuljettajaa etsittäessä tutka ja tarjoukset
// (components/CourierSearch.jsx), sen jälkeen arvioitu aika, otsikko ja
// selitys, vaihepalkki sekä tilauksen tiedot. Päivittyy reaaliajassa.
export default function TrackingScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { status, order, refresh } = useTrackedOrder(id ? String(id) : null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const close = () => (router.canGoBack() ? router.back() : router.navigate('/tilaukset'))

  if (status !== 'ready' || !order) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        {status === 'loading' ? (
          <ActivityIndicator color={colors.orange} />
        ) : (
          <>
            <Text style={styles.muted}>Tilausta ei löytynyt.</Text>
            <Pressable onPress={close} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Takaisin</Text>
            </Pressable>
          </>
        )}
      </View>
    )
  }

  const isDelivery = order.delivery_method === 'delivery'
  const searching = order.status === 'awaiting_courier'
  const arrivalAt = estimatedArrivalAt(order)
  const showEta = Boolean(arrivalAt) && order.status !== 'cancelled' && isOrderInProgress(order)
  const minutesLeft = arrivalAt ? Math.max(0, Math.round((arrivalAt.getTime() - now) / 60000)) : null
  const stepIndex =
    order.status === 'completed' || order.courier_status === 'picked_up' || order.courier_status === 'delivered'
      ? STEPS.length - 1
      : STEPS.indexOf(order.status)
  const destination = isDelivery ? order.delivery_address : order.restaurants?.address

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 60, paddingHorizontal: SIDE, paddingBottom: insets.bottom + 40 }}>
        {searching ? (
          <>
            <CourierSearch orderId={order.id} restaurant={order.restaurants} onCancelled={refresh} onChanged={refresh} />
            <Text style={styles.facts}>
              {[order.restaurants?.name, order.order_number ? `#${order.order_number}` : null, formatPrice(order.total_cents)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </>
        ) : (
          <>
            <View style={styles.place}>
              <RestaurantLogo name={order.restaurants?.name} imageUrl={order.restaurants?.image_url} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {order.restaurants?.name ?? 'Ravintola'}
                </Text>
                <Text style={styles.muted}>
                  {isDelivery ? 'Kotiinkuljetus' : 'Nouto'}
                  {order.order_number ? ` · #${order.order_number}` : ''}
                </Text>
              </View>
            </View>

            {showEta ? (
              <View style={styles.eta}>
                <Text style={styles.etaLabel}>{isDelivery ? 'Arvioitu toimitus' : 'Arvioitu nouto'}</Text>
                <Text style={styles.etaTime}>
                  {minutesLeft > 0 ? `${minutesLeft} min` : 'Pian'}
                </Text>
                <Text style={styles.etaClock}>noin klo {clock(arrivalAt)}</Text>
              </View>
            ) : null}

            <Text style={styles.headline}>{trackingHeadline(order)}</Text>
            <Text style={styles.message}>{trackingMessage(order)}</Text>

            {order.status !== 'cancelled' && stepIndex >= 0 ? (
              <View style={styles.steps}>
                {STEPS.map((step, i) => (
                  <View key={step} style={{ flex: 1 }}>
                    <View style={[styles.stepBar, i <= stepIndex && styles.stepDone, i === stepIndex && styles.stepCurrent]} />
                    <Text style={[styles.stepText, i === stepIndex && styles.stepTextOn]}>{stepLabel(step, isDelivery)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}

        {/* Tilauksen tiedot */}
        <View style={styles.details}>
          <Pressable onPress={() => setDetailsOpen((v) => !v)} style={styles.detailsToggle} accessibilityRole="button">
            <View style={styles.detailsIcon}>
              <Receipt size={18} strokeWidth={1.8} color={colors.black} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailsTitle}>Tilauksen tiedot</Text>
              <Text style={styles.muted}>
                {order.order_number ? `#${order.order_number} · ` : ''}
                {formatPrice(order.total_cents)}
              </Text>
            </View>
            {detailsOpen ? (
              <ChevronUp size={18} strokeWidth={1.8} color={colors.black} />
            ) : (
              <ChevronDown size={18} strokeWidth={1.8} color={colors.black} />
            )}
          </Pressable>

          {detailsOpen ? (
            <View style={styles.detailsBody}>
              {showEta ? <Fact label={isDelivery ? 'Arvioitu toimitus' : 'Arvioitu nouto'} value={`n. ${clock(arrivalAt)}`} /> : null}
              {destination ? <Fact label={isDelivery ? 'Toimitusosoite' : 'Noutopaikka'} value={destination} /> : null}
              <View style={{ marginTop: 6 }}>
                {(order.order_items ?? []).map((line) => (
                  <View key={line.id} style={styles.line}>
                    <Text style={styles.lineQty}>{line.quantity}×</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineName}>{line.name}</Text>
                      {line.selected_options?.length ? (
                        <Text style={styles.muted}>{line.selected_options.map((o) => o.name).join(', ')}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.linePrice}>{formatPrice((line.unit_price_cents ?? line.price_cents) * line.quantity)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.sums}>
                {searching ? <Sum label="Toimitus" value="sovitaan" /> : null}
                {order.delivery_fee_cents > 0 ? <Sum label="Toimitus" value={formatPrice(order.delivery_fee_cents)} /> : null}
                {order.delivery_price_cents > 0 && !order.delivery_fee_cents ? (
                  <Sum label="Toimitus (sovittu)" value={formatPrice(order.delivery_price_cents)} />
                ) : null}
                {order.service_fee_cents > 0 ? <Sum label="Palvelumaksu" value={formatPrice(order.service_fee_cents)} /> : null}
                {order.discount_cents > 0 ? (
                  <Sum
                    label={`Alennus${order.promo_code ? ` (${order.promo_code})` : ''}`}
                    value={`−${formatPrice(order.discount_cents)}`}
                    accent
                  />
                ) : null}
                <View style={styles.totalRow}>
                  <Text style={styles.total}>{searching ? 'Yhteensä ilman toimitusta' : 'Yhteensä'}</Text>
                  <Text style={styles.total}>{formatPrice(order.total_cents)}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <Pressable onPress={() => Linking.openURL('mailto:tuki@bidrop.fi')} style={styles.support} accessibilityRole="button">
          <MessageCircle size={18} strokeWidth={1.8} color={colors.black} />
          <Text style={styles.supportText}>Ota yhteyttä asiakastukeen</Text>
        </Pressable>
      </ScrollView>

      <Pressable
        onPress={close}
        hitSlop={8}
        style={({ pressed }) => [styles.close, { top: insets.top + 10 }, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Sulje"
      >
        <X size={18} strokeWidth={2.2} color={colors.black} />
      </Pressable>
    </View>
  )
}

function Fact({ label, value }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  )
}

function Sum({ label, value, accent }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumText, accent && { color: colors.offerRed }]}>{label}</Text>
      <Text style={[styles.sumText, accent && { color: colors.offerRed }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.surface },
  muted: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, color: colors.textMuted },
  smallButton: { height: 40, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.black },
  smallButtonText: { fontFamily: fonts.semibold, fontSize: 14, color: '#ffffff' },
  close: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
  facts: { marginTop: 20, textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  place: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black },
  eta: { alignItems: 'center', marginTop: 26, paddingVertical: 20, borderRadius: 20, backgroundColor: colors.black },
  etaLabel: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' },
  etaTime: { marginTop: 2, fontFamily: fonts.headingBold, fontSize: 44, letterSpacing: -1, color: '#ffffff' },
  etaClock: { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255, 255, 255, 0.85)' },
  headline: { marginTop: 24, fontFamily: fonts.headingBold, fontSize: 24, letterSpacing: -0.4, color: colors.black },
  message: { marginTop: 6, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.textMuted },
  steps: { flexDirection: 'row', gap: 6, marginTop: 20 },
  stepBar: { height: 5, borderRadius: 3, backgroundColor: colors.gray200 },
  stepDone: { backgroundColor: colors.black },
  stepCurrent: { backgroundColor: colors.orange },
  stepText: { marginTop: 6, fontFamily: fonts.medium, fontSize: 11.5, color: colors.textMuted },
  stepTextOn: { fontFamily: fonts.bold, color: colors.black },
  details: { marginTop: 28, borderWidth: 1, borderColor: '#ececea', borderRadius: 16, overflow: 'hidden' },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  detailsIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.gray100 },
  detailsTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  detailsBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#f0f0ee' },
  fact: { paddingTop: 12 },
  factValue: { marginTop: 1, fontFamily: fonts.medium, fontSize: 14.5, color: colors.black },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
  lineQty: { width: 26, fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  lineName: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  linePrice: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  sums: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0ee' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  sumText: { fontFamily: fonts.regular, fontSize: 14, color: colors.black },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  total: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  support: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginTop: 22, padding: 8 },
  supportText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black, textDecorationLine: 'underline' },
})
