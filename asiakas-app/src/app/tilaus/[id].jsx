import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Headset,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  ReceiptText,
  X,
} from 'lucide-react-native'
import CourierSearch from '../../components/CourierSearch'
import CourierSheet from '../../components/CourierSheet'
import BottomSheet from '../../components/BottomSheet'
import RestaurantLogo from '../../components/RestaurantLogo'
import TrackingMap from '../../components/TrackingMap'
import { courierHasFood, useCourierPosition } from '../../lib/courierPosition'
import { VEHICLE_LABELS, courierPhotoUrl, useCourierPhone, useDeliveryNegotiation } from '../../lib/deliveryBids'
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
// Vaiheet ilman Tilattu-vaihetta, lopussa Valmis (käyttäjän pyyntö 20.11.2026).
const STEPS = ORDER_STATUS_FLOW.slice(1, 5)
const clock = (value) => new Date(value).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })

function stepLabel(status, isDelivery) {
  if (status === 'confirmed') return 'Hyväksytty'
  if (status === 'preparing') return 'Valmistus'
  if (status === 'ready') return isDelivery ? 'Matkalla' : 'Valmis'
  if (status === 'completed') return isDelivery ? 'Valmis' : 'Noudettu'
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
  const [orderSheetOpen, setOrderSheetOpen] = useState(false)
  const [courierOpen, setCourierOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const courierPhone = useCourierPhone(order)

  // Seurannan paneeli vedetään alas piiloon (vain aika näkyy) tai ylös
  // näkyviin (käyttäjän pyyntö 20.11.2026). Kahva-alueen napautus vaihtaa tilaa.
  // Korkeus sisällön mukaan, jotta vaiheet ja tiedot näkyvät kokonaan avattuna
  // (20.11.2026); enintään 80 % näytöstä, sen yli vieritetään.
  const [headH, setHeadH] = useState(0)
  const [bodyH, setBodyH] = useState(0)
  const sheetHeight = Math.round(
    Math.min(screenHeight * 0.8, Math.max(screenHeight * 0.45, headH + bodyH)),
  )
  const sheetPeek = 112 + insets.bottom
  const sheetHidden = Math.max(0, sheetHeight - sheetPeek)
  const sheetY = useRef(new Animated.Value(0)).current
  const sheetPos = useRef(0)
  const [sheetDown, setSheetDown] = useState(false)
  const sheetPan = useMemo(() => {
    const snap = (down) => {
      sheetPos.current = down ? sheetHidden : 0
      setSheetDown(down)
      Animated.spring(sheetY, {
        toValue: sheetPos.current,
        useNativeDriver: Platform.OS !== 'web',
        bounciness: 0,
        speed: 16,
      }).start()
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        sheetY.setValue(Math.min(sheetHidden, Math.max(0, sheetPos.current + g.dy)))
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) < 5) return snap(sheetPos.current === 0)
        const at = sheetPos.current + g.dy
        if (g.vy > 0.5) return snap(true)
        if (g.vy < -0.5) return snap(false)
        return snap(at > sheetHidden / 2)
      },
      onPanResponderTerminate: () => snap(sheetPos.current !== 0),
    })
  }, [sheetHidden, sheetY])
  // Piilossa oleva paneeli pysyy piilossa, vaikka korkeus muuttuu.
  useEffect(() => {
    if (sheetDown) {
      sheetPos.current = sheetHidden
      sheetY.setValue(sheetHidden)
    }
  }, [sheetHidden]) // eslint-disable-line react-hooks/exhaustive-deps
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
    // Kotiinkuljetuksessa Valmis vasta kun kuljettaja on toimittanut: ravintola
    // merkitsee tilauksen valmiiksi jo luovuttaessaan sen kuljettajalle.
    (isDelivery ? order.courier_status === 'delivered' : order.status === 'completed')
      ? STEPS.length - 1
      : isDelivery && (order.courier_status === 'picked_up' || order.status === 'completed')
        ? STEPS.indexOf('ready')
        : STEPS.indexOf(order.status)
  // Odottaa hyväksyntää: palkit näkyvät harmaina.
  const showSteps = stepIndex >= 0 || order.status === 'pending'

  // ── Käynnissä (käyttäjän valinta A, 20.11.2026): kartta yläosassa noin
  // puolet näytöstä, sen alla tiivis valkoinen osa - iso kellonaika, tila,
  // vaiheet pisteinä, ravintola ja tilauksen tiedot. Ei kelluvaa korttia eikä
  // isoa kelloa.
  if (showMap) {
    const minutesLeft = arrivalAt ? Math.max(0, Math.ceil((arrivalAt.getTime() - now) / 60000)) : null
    const shop = order.restaurants
    const home = isDelivery ? { lat: order.delivery_lat, lng: order.delivery_lng } : null
    const hasCourier = isDelivery && Boolean(acceptedBid || order.courier_id)
    const courierName = acceptedBid?.courier_name ?? 'Kuljettaja'
    const rating =
      acceptedBid?.courier_rating != null && (acceptedBid?.courier_review_count ?? 0) > 0 ? formatStars(acceptedBid.courier_rating) : null
    const photo = courierPhotoUrl(acceptedBid?.courier_photo_path)
    const avatar = (size) => (
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{courierName.charAt(0)}</Text>
        )}
      </View>
    )
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        {/* Kartta koko näytöllä (käyttäjän mallikuva 20.11.2026). */}
        <View style={StyleSheet.absoluteFill}>
          <TrackingMap
            restaurant={shop}
            destination={home}
            courier={courierPosition}
            courierVehicle={acceptedBid?.vehicle}
            hideRestaurant={courierHasFood(order)}
            bottomInset={(sheetDown ? sheetPeek : sheetHeight) + 16}
          />
        </View>

        {/* Valkoinen paneeli kartan päällä: vedä alas piiloon tai ylös näkyviin */}
        <Animated.View style={[styles.sheet, { height: sheetHeight, transform: [{ translateY: sheetY }] }]}>
          <View {...sheetPan.panHandlers} style={styles.dragArea} onLayout={(e) => setHeadH(e.nativeEvent.layout.height)}>
            <View style={styles.handle} />
            {/* Piilotettuna tiivis rivi: aika, tila ja ohut edistymispalkki
                (käyttäjän pyyntö 20.11.2026). Vaihtuu ristiin häivyttäen. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.peek,
                { opacity: sheetY.interpolate({ inputRange: [sheetHidden * 0.5, sheetHidden || 1], outputRange: [0, 1], extrapolate: 'clamp' }) },
              ]}
            >
              <View style={styles.peekRow}>
                {minutesLeft != null ? (
                  <Text style={styles.peekMinutes}>
                    {minutesLeft > 0 ? minutesLeft : '<1'}
                    <Text style={styles.peekUnit}> min</Text>
                  </Text>
                ) : null}
                <View style={styles.peekText}>
                  <Text style={styles.peekStatus} numberOfLines={1}>
                    {customerStatusLabel(order)}
                  </Text>
                  {arrivalAt ? (
                    <Text style={styles.peekSub} numberOfLines={1}>
                      {isDelivery ? 'Perillä' : 'Noudettavissa'} noin klo {clock(arrivalAt)}
                    </Text>
                  ) : null}
                </View>
                <ChevronUp size={20} strokeWidth={2} color={colors.textMuted} />
              </View>
              {showSteps ? (
                <View style={styles.peekBars}>
                  {STEPS.map((step, i) => (
                    <View key={step} style={[styles.peekBar, i <= stepIndex && styles.obarOn]} />
                  ))}
                </View>
              ) : null}
            </Animated.View>
            <Animated.View
              style={[
                styles.timeRow,
                { opacity: sheetY.interpolate({ inputRange: [0, sheetHidden * 0.5 || 1], outputRange: [1, 0], extrapolate: 'clamp' }) },
              ]}
            >
              <View style={{ flex: 1 }}>
                {minutesLeft != null ? (
                  <Text style={styles.bigMinutes}>
                    {minutesLeft > 0 ? minutesLeft : '<1'}
                    <Text style={styles.bigUnit}> min</Text>
                  </Text>
                ) : null}
                {arrivalAt ? (
                  <Text style={styles.bigSub}>
                    {isDelivery ? 'Perillä' : 'Noudettavissa'} noin klo {clock(arrivalAt)}
                  </Text>
                ) : null}
              </View>
            </Animated.View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
            onContentSizeChange={(_, h) => setBodyH(h)}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.cardHeadline}>{trackingHeadline(order)}</Text>
            {/* Selittävän lauseen tilalle pelkät tiedot (20.11.2026): ravintola,
                ja kuljettajan matka perille, kun sijainti tiedetään. */}
            <Text style={styles.cardMessage} numberOfLines={1}>
              {trackingFacts(order, courierPosition)}
            </Text>

            {showSteps ? <OrangeSteps index={stepIndex} isDelivery={isDelivery} /> : null}

            {hasCourier ? (
              <Pressable
                onPress={() => acceptedBid && setCourierOpen(true)}
                style={({ pressed }) => [styles.courierRow, pressed && acceptedBid && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Kuljettajan tiedot"
              >
                {avatar(46)}
                <View style={{ flex: 1 }}>
                  <Text style={styles.courierName}>{courierName}</Text>
                  <Text style={styles.courierSub}>
                    {[VEHICLE_LABELS[acceptedBid?.vehicle], rating ? `★ ${rating}` : null].filter(Boolean).join(' · ') || 'Kuljettaja'}
                  </Text>
                </View>
                {order.delivery_price_cents ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.courierPrice}>{formatPrice(order.delivery_price_cents)}</Text>
                    <Text style={styles.priceCaption}>kuljetus</Text>
                  </View>
                ) : null}
                {courierPhone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${courierPhone.replace(/\s+/g, '')}`)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Soita kuljettajalle"
                  >
                    <Phone size={17} strokeWidth={2.1} color={colors.black} />
                  </Pressable>
                ) : acceptedBid ? (
                  <ChevronRight size={18} strokeWidth={2} color={colors.textMuted} />
                ) : null}
              </Pressable>
            ) : null}

            {/* Ohjeet kuljettajalle omana linkkinään kuljettajaosiossa (20.11.2026) */}
            {isDelivery && order.delivery_notes ? (
              <Pressable
                onPress={() => setNotesOpen(true)}
                style={({ pressed }) => [styles.notesLink, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
              >
                <MessageSquareText size={18} strokeWidth={1.9} color={colors.black} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notesTitle}>Ohjeet kuljettajalle</Text>
                  <Text style={styles.notesPreview} numberOfLines={1}>
                    {order.delivery_notes}
                  </Text>
                </View>
                <ChevronRight size={18} strokeWidth={2} color={colors.textMuted} />
              </Pressable>
            ) : null}

            <View style={styles.notesLink}>
              <MapPin size={18} strokeWidth={1.9} color={colors.black} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notesTitle}>{isDelivery ? order.delivery_address : order.restaurants?.address}</Text>
                <Text style={styles.notesPreview}>
                  {isDelivery ? 'Toimitusosoite' : 'Noutopaikka'}
                </Text>
              </View>
            </View>

            {/* Tilaus linkkirivinä kuten Ohjeet kuljettajalle (20.11.2026) */}
            <Pressable
              onPress={() => setOrderSheetOpen(true)}
              style={({ pressed }) => [styles.notesLink, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              <ReceiptText size={18} strokeWidth={1.9} color={colors.black} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notesTitle}>Tilaus</Text>
                <Text style={styles.notesPreview} numberOfLines={1}>
                  {`${itemCount(order)} ${itemCount(order) === 1 ? 'tuote' : 'tuotetta'} · ruoka ${formatPrice(order.total_cents)}${
                    order.delivery_price_cents && !order.delivery_fee_cents ? ` + kuljetus ${formatPrice(order.delivery_price_cents)}` : ''
                  }`}
                </Text>
              </View>
              <ChevronRight size={18} strokeWidth={2} color={colors.textMuted} />
            </Pressable>

            <View style={styles.pillRow}>
              <Pressable
                onPress={() => Linking.openURL('mailto:tuki@bidrop.fi')}
                style={({ pressed }) => [styles.outlinePill, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
              >
                <Headset size={16} strokeWidth={2} color={colors.black} />
                <Text style={styles.outlinePillText}>Asiakastuki</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Kelluva kuljettajapilleri kartan yläosassa */}
        {hasCourier ? (
          <Pressable
            onPress={() => acceptedBid && setCourierOpen(true)}
            style={({ pressed }) => [styles.courierPill, { top: insets.top + 10 }, pressed && acceptedBid && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Kuljettajan tiedot"
          >
            {avatar(34)}
            <View>
              <Text style={styles.pillName}>
                {courierName}
              </Text>
              <Text style={styles.pillSub}>{VEHICLE_LABELS[acceptedBid?.vehicle] ?? 'Kuljettaja'}</Text>
            </View>
          </Pressable>
        ) : null}

        {/* Tilauksen tiedot omana paneelinaan (20.11.2026): ravintola ylhäällä,
            tuotteet määrälaatikoineen ja summat kuittimaisesti. */}
        <BottomSheet visible={orderSheetOpen} onClose={() => setOrderSheetOpen(false)} title="Tilaus" dragFromHeaderOnly>
          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.osHead}>
              <RestaurantLogo name={order.restaurants?.name} imageUrl={order.restaurants?.image_url} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.osName}>{order.restaurants?.name ?? 'Ravintola'}</Text>
                <Text style={styles.osSub}>
                  {[
                    order.order_number ? `#${order.order_number}` : null,
                    `tilattu klo ${clock(order.placed_at ?? order.created_at)}`,
                    `${itemCount(order)} ${itemCount(order) === 1 ? 'tuote' : 'tuotetta'}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </View>
            <OrderDetails order={order} arrivalAt={null} isDelivery={isDelivery} itemsOnly />
          </ScrollView>
        </BottomSheet>

        <BottomSheet visible={notesOpen} onClose={() => setNotesOpen(false)} title="Ohjeet kuljettajalle">
          <View style={{ paddingBottom: 8 }}>
            {(order.delivery_notes ?? '')
              .split(' - ')
              .filter(Boolean)
              .map((line) => (
                <Text key={line} style={styles.noteLine}>
                  {line}
                </Text>
              ))}
            <Text style={styles.noteHint}>Kuljettaja näkee nämä ohjeet sovelluksessaan.</Text>
          </View>
        </BottomSheet>

        <CourierSheet
          visible={courierOpen}
          onClose={() => setCourierOpen(false)}
          bid={acceptedBid}
          phone={courierPhone}
          priceCents={order.delivery_price_cents}
        />

        <Pressable
          onPress={close}
          hitSlop={8}
          style={({ pressed }) => [styles.floatClose, { top: insets.top + 12 }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Sulje"
        >
          <X size={18} strokeWidth={2.4} color={colors.black} />
        </Pressable>
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
              <ReceiptText size={18} strokeWidth={1.8} color={colors.black} />
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

// Vaiheet oransseina pisteinä viivalla (käyttäjän mallikuva 20.11.2026):
// tehdyt oranssireunaiset, nykyinen täytetty oranssi, tuleva musta pieni piste.
// n. 1,2 km perille (kun ruoka on kyydissä ja sijainti tiedossa) · ravintola. Ei tilausnumeroa.
function trackingFacts(order, courier) {
  const home = order.delivery_lat != null ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) } : null
  const km =
    courierHasFood(order) && courier && home ? haversineKm({ lat: Number(courier.lat), lng: Number(courier.lng) }, home) : null
  const dist = km == null ? null : km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)} m` : `${km.toFixed(1).replace('.', ',')} km`
  return [dist ? `n. ${dist} perille` : null, order.restaurants?.name]
    .filter(Boolean)
    .join(' · ')
}

function OrangeSteps({ index, isDelivery }) {
  // Oranssit pyöristetyt palkit, nimi keskellä alla (käyttäjän kuva 20.11.2026).
  return (
    <View style={styles.osteps}>
      {STEPS.map((step, i) => (
        <View key={step} style={styles.ocol}>
          <View style={[styles.obar, i <= index && styles.obarOn]} />
          <Text style={[styles.otext, i === index && styles.otextOn]} numberOfLines={1}>
            {stepLabel(step, isDelivery)}
          </Text>
        </View>
      ))}
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
      {Icon ? <Icon size={20} strokeWidth={1.9} color={colors.black} style={{ marginTop: 1 }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {sub ? <Text style={styles.listSub}>{sub}</Text> : null}
      </View>
      {right}
    </Wrapper>
  )
}


const itemCount = (order) => (order.order_items ?? []).reduce((sum, line) => sum + (line.quantity ?? 0), 0)

function OrderDetails({ order, arrivalAt, isDelivery, itemsOnly = false }) {
  const searching = order.status === 'awaiting_courier'
  const agreedDelivery = order.delivery_price_cents > 0 && !order.delivery_fee_cents
  const destination = isDelivery ? order.delivery_address : order.restaurants?.address
  return (
    <View>
      {arrivalAt ? <Fact label={isDelivery ? 'Arvioitu toimitus' : 'Arvioitu nouto'} value={`n. ${clock(arrivalAt)}`} /> : null}
      {destination && !itemsOnly ? <Fact label={isDelivery ? 'Toimitusosoite' : 'Noutopaikka'} value={destination} /> : null}
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
        {order.service_fee_cents > 0 ? <Sum label="Palvelumaksu" value={formatPrice(order.service_fee_cents)} /> : null}
        {order.discount_cents > 0 ? (
          <Sum label={`Alennus${order.promo_code ? ` (${order.promo_code})` : ''}`} value={`−${formatPrice(order.discount_cents)}`} accent />
        ) : null}
        {/* Kaksi hintaa selitettynä (20.11.2026): ruoka ravintolalta ja kuljetus
            kuljettajalta erikseen sovittuna; lopuksi mitä asiakas maksaa yhteensä. */}
        {agreedDelivery ? (
          <>
            <Sum label="Ruoka yhteensä" value={formatPrice(order.total_cents)} strong />
            <Sum label="Kuljetus, sovittu kuljettajan kanssa" value={formatPrice(order.delivery_price_cents)} />
            <View style={styles.totalRow}>
              <Text style={styles.total}>Maksat yhteensä</Text>
              <Text style={styles.total}>{formatPrice(order.total_cents + order.delivery_price_cents)}</Text>
            </View>
          </>
        ) : (
          <View style={styles.totalRow}>
            <Text style={styles.total}>{searching ? 'Yhteensä ilman toimitusta' : 'Yhteensä'}</Text>
            <Text style={styles.total}>{formatPrice(order.total_cents)}</Text>
          </View>
        )}
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

function Sum({ label, value, accent, strong }) {
  const tone = [styles.sumText, strong && { fontFamily: fonts.semibold }, accent && { color: colors.offerRed }]
  return (
    <View style={styles.sumRow}>
      <Text style={tone}>{label}</Text>
      <Text style={tone}>{value}</Text>
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
  body: { paddingHorizontal: SIDE, paddingTop: 20 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#ffffff',
    boxShadow: '0 -6px 20px rgba(20, 21, 15, 0.08)',
  },
  dragArea: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2, userSelect: 'none' },
  peek: { position: 'absolute', left: 20, right: 20, top: 26 },
  peekRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  peekMinutes: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 32, lineHeight: 36, letterSpacing: -1, color: colors.black },
  peekUnit: { fontFamily: fonts.headingBold, fontSize: 15, letterSpacing: -0.2, color: colors.black },
  peekText: { flex: 1, paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: colors.gray200 },
  peekStatus: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  peekSub: { marginTop: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  peekBars: { flexDirection: 'row', gap: 4, marginTop: 14 },
  peekBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.gray200 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 12, backgroundColor: colors.gray200 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  osteps: { flexDirection: 'row', gap: 6, marginTop: 20 },
  ocol: { flex: 1, alignItems: 'center' },
  obar: { alignSelf: 'stretch', height: 5, borderRadius: 3, backgroundColor: colors.gray200 },
  obarOn: { backgroundColor: colors.orange },
  otext: { marginTop: 8, fontFamily: fonts.medium, fontSize: 12, color: colors.black },
  otextOn: { fontFamily: fonts.bold },
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0ee',
  },
  courierName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black },
  courierSub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13.5, color: colors.textMuted },
  notesLink: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingVertical: 4 },
  notesTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black },
  notesPreview: { marginTop: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  noteLine: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    fontFamily: fonts.regular,
    fontSize: 15.5,
    lineHeight: 21,
    color: colors.black,
  },
  noteHint: { marginTop: 14, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  priceCaption: { marginTop: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  courierPrice: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#f6f6f4',
  },
  addressTitle: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black },
  addressSub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  pillRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20, marginBottom: 6 },
  outlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    // Leijuva valkoinen nappi varjolla (20.11.2026)
    boxShadow: '0 4px 14px rgba(20, 21, 15, 0.12), 0 1px 3px rgba(20, 21, 15, 0.08)',
  },
  outlinePillText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  courierPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
    paddingRight: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 16px rgba(20, 21, 15, 0.18)',
  },
  pillName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  pillSub: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  bigTime: { marginBottom: 14 },
  bigMinutes: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 64, lineHeight: 68, letterSpacing: -2, color: colors.black },
  bigUnit: { fontFamily: fonts.headingBold, fontSize: 26, letterSpacing: -0.4, color: colors.black },
  bigSub: { marginTop: -6, fontFamily: fonts.medium, fontSize: 14.5, color: colors.textMuted },
  bars: { flexDirection: 'row', gap: 6, marginTop: 18 },
  bar: { height: 5, borderRadius: 3, backgroundColor: colors.gray200 },
  barDone: { backgroundColor: colors.black },
  barCurrent: { backgroundColor: colors.orange },
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
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 9 },
  lineQty: { minWidth: 24, marginTop: 3, fontFamily: fonts.semibold, fontSize: 14.5, color: colors.textMuted },
  osHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  osName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.black },
  osSub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  lineName: { marginTop: 3, fontFamily: fonts.medium, fontSize: 14.5, color: colors.black },
  linePrice: { marginTop: 3, fontFamily: fonts.medium, fontSize: 14.5, color: colors.black },
  sums: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0ee' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  sumText: { fontFamily: fonts.regular, fontSize: 14, color: colors.black },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  total: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  support: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginTop: 22, padding: 8 },
  supportText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black, textDecorationLine: 'underline' },
})
