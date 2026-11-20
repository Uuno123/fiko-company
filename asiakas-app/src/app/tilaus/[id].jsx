import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  Bike,
  ChefHat,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  Clock,
  Headset,
  MapPin,
  MessageCircle,
  MessageSquareText,
  PackageCheck,
  Receipt,
  ReceiptText,
  X,
} from 'lucide-react-native'
import CourierSearch from '../../components/CourierSearch'
import RestaurantLogo from '../../components/RestaurantLogo'
import TrackingMap from '../../components/TrackingMap'
import { courierHasFood, useCourierPosition } from '../../lib/courierPosition'
import { VEHICLE_LABELS, courierPhotoUrl, useDeliveryNegotiation } from '../../lib/deliveryBids'
import { ScoreSmiley } from '../../components/Smiley'
import { formatStars } from '../../../../frontend/src/lib/score'
import {
  ORDER_STATUS_FLOW,
  customerStatusLabel,
  estimatedArrivalAt,
  isOrderInProgress,
  trackingHeadline,
  trackingMessage,
} from '../../../../frontend/src/lib/orderStatus'
import { formatPrice } from '../../../../frontend/src/lib/format'
import { haversineKm } from '../../../../frontend/src/lib/deliveryTime'
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

// Tilauksen seuranta. Kuljettajaa etsittäessä tutka ja tarjoukset
// (components/CourierSearch.jsx). Kun tilaus on käynnissä: Bidropin oma
// näkymä (20.11.2026, ei Woltin "kartta ylhäällä + iso kello" -asettelua):
// kartta koko näytöllä reittiviivoineen ja sen päällä kelluva kortti, jossa
// perilläoloaika kellonaikana, pieni edistymisrengas, otsikko, vaiheet
// pisteinä sekä Tiedot ja Tuki. Päivittyy reaaliajassa.
export default function TrackingScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const { status, order, refresh } = useTrackedOrder(id ? String(id) : null)
  const courierPosition = useCourierPosition(order)
  // Sovittu kuljettaja (nimi, kulkuneuvo, kuva, arvio) kuljettajaosioon.
  const { acceptedBid } = useDeliveryNegotiation(order?.delivery_method === 'delivery' ? order?.id : null)
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
  const inProgress = order.status !== 'cancelled' && isOrderInProgress(order)
  const showMap = !searching && inProgress
  const stepIndex =
    order.status === 'completed' || order.courier_status === 'picked_up' || order.courier_status === 'delivered'
      ? STEPS.length - 1
      : STEPS.indexOf(order.status)

  // ── Käynnissä (käyttäjän valinta A, 20.11.2026): kartta yläosassa noin
  // puolet näytöstä, sen alla tiivis valkoinen osa - iso kellonaika, tila,
  // vaiheet pisteinä, ravintola ja tilauksen tiedot. Ei kelluvaa korttia eikä
  // isoa kelloa.
  if (showMap) {
    const minutesLeft = arrivalAt ? Math.max(0, Math.ceil((arrivalAt.getTime() - now) / 60000)) : null
    const shop = order.restaurants
    const home = isDelivery ? { lat: order.delivery_lat, lng: order.delivery_lng } : null
    const km =
      shop?.lat != null && home?.lat != null
        ? haversineKm({ lat: Number(shop.lat), lng: Number(shop.lng) }, { lat: Number(home.lat), lng: Number(home.lng) })
        : null
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <Pressable
            onPress={close}
            hitSlop={8}
            style={({ pressed }) => [styles.close, { position: 'relative', left: 0 }, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Sulje"
          >
            <X size={18} strokeWidth={2.2} color={colors.black} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
          {/* Kartta pyöreäkulmaisena korttina (20.11.2026, Uber Eatsin mallista):
              kaareva reitti ja matka kartalla. */}
          <View style={styles.mapCard}>
            <TrackingMap
              restaurant={shop}
              destination={home}
              courier={courierPosition}
              hideRestaurant={courierHasFood(order)}
              distanceLabel={km != null ? formatKmLabel(km) : null}
              bottomInset={40}
            />
          </View>

          <View style={styles.body}>
            <Text style={styles.bigHeadline}>{trackingHeadline(order)}</Text>
            <Text style={styles.tagLine}>
              {[isDelivery ? 'Kotiinkuljetus' : 'Nouto', order.restaurants?.name, order.order_number ? `#${order.order_number}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>

            {stepIndex >= 0 ? <IconSteps index={stepIndex} isDelivery={isDelivery} /> : null}

            {/* Rivit kuvakkeineen ja ohuin erottimin */}
            <View style={styles.rows}>
              <ListRow
                Icon={Clock}
                title={arrivalAt ? `${isDelivery ? 'Perillä' : 'Noudettavissa'} noin klo ${clock(arrivalAt)}` : 'Aika tarkentuu pian'}
                sub={trackingMessage(order)}
                right={minutesLeft != null ? <Text style={styles.rowAccent}>{minutesLeft > 0 ? `${minutesLeft} min` : 'Pian'}</Text> : null}
              />
              {isDelivery && (acceptedBid || order.courier_id) ? (
                <ListRow
                  Icon={Bike}
                  title={acceptedBid?.courier_name ?? 'Kuljettaja'}
                  sub={[
                    VEHICLE_LABELS[acceptedBid?.vehicle] ?? null,
                    acceptedBid?.courier_rating != null && (acceptedBid?.courier_review_count ?? 0) > 0
                      ? `★ ${formatStars(acceptedBid.courier_rating)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  right={order.delivery_price_cents ? <Text style={styles.rowValue}>{formatPrice(order.delivery_price_cents)}</Text> : null}
                />
              ) : null}
              <ListRow
                Icon={MapPin}
                title={isDelivery ? order.delivery_address : order.restaurants?.address}
                sub={isDelivery ? 'Toimitusosoite' : 'Noutopaikka'}
              />
              {order.delivery_notes ? <ListRow Icon={MessageSquareText} title={order.delivery_notes} sub="Ohjeet kuljettajalle" /> : null}
              <ListRow
                Icon={Receipt}
                title={`${itemCount(order)} ${itemCount(order) === 1 ? 'tuote' : 'tuotetta'} · ${formatPrice(order.total_cents)}`}
                sub="Tilauksen tiedot"
                onPress={() => setDetailsOpen((v) => !v)}
                right={
                  detailsOpen ? (
                    <ChevronUp size={18} strokeWidth={2} color={colors.textMuted} />
                  ) : (
                    <ChevronRight size={18} strokeWidth={2} color={colors.textMuted} />
                  )
                }
              />
              {detailsOpen ? (
                <View style={{ paddingLeft: 50, paddingBottom: 8 }}>
                  <OrderDetails order={order} arrivalAt={null} isDelivery={isDelivery} />
                </View>
              ) : null}
              <ListRow
                Icon={Headset}
                title="Asiakastuki"
                sub="Kysy tilauksesta, vastaamme nopeasti"
                onPress={() => Linking.openURL('mailto:tuki@bidrop.fi')}
                right={<ChevronRight size={18} strokeWidth={2} color={colors.textMuted} />}
                last
              />
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  // ── Kuljettajan etsintä, peruttu tai valmis ─────────────────────────────
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
            <View style={styles.stateRow}>
              <RestaurantLogo name={order.restaurants?.name} imageUrl={order.restaurants?.image_url} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={styles.muted}>{order.restaurants?.name ?? 'Ravintola'}</Text>
                <Text style={styles.stateLabel}>{customerStatusLabel(order)}</Text>
              </View>
            </View>
            <Text style={styles.headline}>{trackingHeadline(order)}</Text>
            <Text style={styles.message}>{trackingMessage(order)}</Text>
          </>
        )}

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
              <OrderDetails order={order} arrivalAt={null} isDelivery={isDelivery} />
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

// Vaiheet kuvakkeina (20.11.2026): tehty musta, nykyinen oranssi, tulevat harmaat.
const STEP_ICONS = { pending: ReceiptText, confirmed: CircleCheck, preparing: ChefHat, ready: Bike }

function IconSteps({ index, isDelivery }) {
  return (
    <View style={styles.dots}>
      <View style={styles.dotLine} />
      <View style={[styles.dotLineDone, { width: `${(index / (STEPS.length - 1)) * 75}%` }]} />
      {STEPS.map((step, i) => {
        const Icon = step === 'ready' && !isDelivery ? PackageCheck : STEP_ICONS[step]
        const done = i < index
        const current = i === index
        return (
          <View key={step} style={styles.dotCol}>
            <View style={[styles.stepIcon, done && styles.stepIconDone, current && styles.stepIconCurrent]}>
              <Icon size={16} strokeWidth={2.2} color={done || current ? '#ffffff' : colors.gray400} />
            </View>
            <Text style={[styles.dotText, current && styles.dotTextOn]} numberOfLines={1}>
              {stepLabel(step, isDelivery)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function IconRow({ Icon, title, sub }) {
  if (!title) return null
  return (
    <View style={styles.iconRow}>
      <View style={styles.iconCircle}>
        <Icon size={17} strokeWidth={2} color={colors.black} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.boxTitle}>{title}</Text>
        {sub ? <Text style={styles.boxSub}>{sub}</Text> : null}
      </View>
    </View>
  )
}

// Rivi: kuvake vasemmalla, otsikko ja harmaa selite, oikealla arvo tai nuoli.
function ListRow({ Icon, title, sub, right, onPress, last = false }) {
  if (!title) return null
  const Wrapper = onPress ? Pressable : View
  return (
    <Wrapper
      onPress={onPress}
      style={onPress ? ({ pressed }) => [styles.listRow, last && styles.listRowLast, pressed && { opacity: 0.6 }] : [styles.listRow, last && styles.listRowLast]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Icon size={20} strokeWidth={1.9} color={colors.black} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {sub ? <Text style={styles.listSub}>{sub}</Text> : null}
      </View>
      {right}
    </Wrapper>
  )
}

const formatKmLabel = (km) => (km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)} m` : `${km.toFixed(1).replace('.', ',')} km`)

const itemCount = (order) => (order.order_items ?? []).reduce((sum, line) => sum + (line.quantity ?? 0), 0)

function OrderDetails({ order, arrivalAt, isDelivery }) {
  const searching = order.status === 'awaiting_courier'
  const destination = isDelivery ? order.delivery_address : order.restaurants?.address
  return (
    <View>
      {arrivalAt ? <Fact label={isDelivery ? 'Arvioitu toimitus' : 'Arvioitu nouto'} value={`n. ${clock(arrivalAt)}`} /> : null}
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
          <Sum label={`Alennus${order.promo_code ? ` (${order.promo_code})` : ''}`} value={`−${formatPrice(order.discount_cents)}`} accent />
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.total}>{searching ? 'Yhteensä ilman toimitusta' : 'Yhteensä'}</Text>
          <Text style={styles.total}>{formatPrice(order.total_cents)}</Text>
        </View>
      </View>
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
  // Kelluva näkymä
  floatClose: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 10px rgba(20, 21, 15, 0.18)',
  },
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    boxShadow: '0 10px 34px rgba(20, 21, 15, 0.22)',
  },
  body: { paddingHorizontal: SIDE, paddingTop: 18 },
  topBar: { paddingHorizontal: SIDE, paddingTop: 8, paddingBottom: 10 },
  mapCard: { height: 230, marginHorizontal: SIDE, overflow: 'hidden', borderRadius: 20, backgroundColor: colors.gray100 },
  bigHeadline: { fontFamily: fonts.headingBold, fontSize: 25, lineHeight: 30, letterSpacing: -0.5, color: colors.black },
  tagLine: { marginTop: 6, fontFamily: fonts.regular, fontSize: 13.5, color: colors.textMuted },
  rows: { marginTop: 22, borderTopWidth: 1, borderTopColor: '#ececea' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ececea',
  },
  listRowLast: { borderBottomWidth: 0 },
  listTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.black },
  listSub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, color: colors.textMuted },
  rowAccent: { fontFamily: fonts.bold, fontSize: 14, color: colors.orange },
  rowValue: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.orangeSoft,
  },
  minutesPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.orangeSoft },
  minutesText: { fontFamily: fonts.bold, fontSize: 14, color: colors.orange },
  stepIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.gray200,
    backgroundColor: '#ffffff',
  },
  stepIconDone: { borderColor: colors.black, backgroundColor: colors.black },
  stepIconCurrent: { borderColor: colors.orange, backgroundColor: colors.orange },
  section: { marginTop: 24 },
  sectionTitle: { marginBottom: 10, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.2, color: colors.textMuted },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f7f7f5',
  },
  boxTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  boxMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  boxSub: { marginTop: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  boxPrice: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: colors.gray200,
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 17, color: colors.black },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  iconCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.gray100,
  },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  minutes: { marginBottom: 6, fontFamily: fonts.semibold, fontSize: 15, color: colors.orange },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0ee',
  },
  linkText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  cardLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  cardTime: { fontFamily: fonts.headingBold, fontSize: 38, lineHeight: 42, letterSpacing: -1, color: colors.black },
  cardHeadline: { marginTop: 12, fontFamily: fonts.semibold, fontSize: 17, color: colors.black },
  cardMessage: { marginTop: 3, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  dots: { flexDirection: 'row', marginTop: 18, position: 'relative' },
  dotLine: { position: 'absolute', left: '12.5%', right: '12.5%', top: 16, height: 2, backgroundColor: colors.gray200 },
  dotLineDone: { position: 'absolute', left: '12.5%', top: 16, height: 2, backgroundColor: colors.black, maxWidth: '75%' },
  dotCol: { flex: 1, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.gray200, backgroundColor: '#ffffff' },
  dotDone: { borderColor: colors.black, backgroundColor: colors.black },
  dotCurrent: { borderColor: colors.orange, backgroundColor: colors.orange, transform: [{ scale: 1.25 }] },
  dotText: { marginTop: 6, fontFamily: fonts.medium, fontSize: 11.5, color: colors.textMuted },
  dotTextOn: { fontFamily: fonts.bold, color: colors.black },
  cardPlace: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, paddingVertical: 12 },
  cardPlaceText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: colors.gray100,
  },
  chipOn: { backgroundColor: colors.black },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
  // Muut tilat
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
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stateLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black },
  headline: { marginTop: 22, fontFamily: fonts.headingBold, fontSize: 24, letterSpacing: -0.4, color: colors.black },
  message: { marginTop: 6, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.textMuted },
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
