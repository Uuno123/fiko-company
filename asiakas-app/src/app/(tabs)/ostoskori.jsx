import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Rect } from 'react-native-svg'
import { useRouter } from 'expo-router'
import {
  Building2,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  DoorClosed,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Smartphone,
  Store,
  Trash2,
  User,
  UtensilsCrossed,
} from 'lucide-react-native'
import AddressSheet from '../../components/AddressSheet'
import { Toggle } from '../../components/SettingsUI'
import { FadeImage } from '../../components/RestaurantCard'
import StrikePrice from '../../components/StrikePrice'
import { dealPercent } from '../../../../frontend/src/lib/dailyDeals'
import { DELIVERY_PRICE_RANGE, SERVICE_FEE_CENTS } from '../../../../frontend/src/lib/delivery'
import { haversineKm } from '../../../../frontend/src/lib/deliveryTime'
import {
  formatDisplayAddress,
  formatPrice,
  internationalPhone,
  joinAddress,
  nationalPhone,
  splitAddress,
} from '../../../../frontend/src/lib/format'
import { savedApartmentLine, savedCourierNotes } from '../../../../frontend/src/lib/customerAddress'
import { clearRestaurant, groupCount, groupTotalCents, lineUnitPriceCents, setQuantity, useCart } from '../../lib/cart'
import { useRestaurant } from '../../lib/restaurant'
import { imageUri } from '../../lib/restaurants'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { checkPromoCode } from '../../lib/promo'
import { addAddress, removeAddress, selectAddress, updateAddress, useDeliveryAddresses } from '../../lib/deliveryAddresses'
import { colors, fonts } from '../../theme'

const SIDE = 16
const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })
const useNativeDriver = Platform.OS !== 'web'

// Maksutavat kuten verkkosivun kassalla. Apple/Google Pay: TILAPÄINEN
// simuloitu maksu kuten verkkosivun placeOrderWithSimulatedPayment - tilaus on
// oikea orders-rivi (ravintolan dashboard, kuljettaja-app ja seuranta näkevät
// sen), vain veloitus puuttuu. Kortti (oikea Stripe) tulee myöhemmin.
const PAY_METHODS = [
  ...(Platform.OS !== 'android' ? [{ key: 'apple', label: 'Apple Pay' }] : []),
  ...(Platform.OS !== 'ios' ? [{ key: 'google', label: 'Google Pay' }] : []),
  { key: 'card', label: 'Kortti', soon: true },
]

// Ostoskori ja kassa (käyttäjän pyyntö 17.11.2026: "samat kuin webissä ja
// myös maksut"): toimitustapa, tuotteet, toimitus- ja yhteystiedot,
// yhteenveto, alennuskoodi ja maksu. Sama tilauksen tallennus kuin
// verkkosivun saveOrderRows (orders + order_items).
export default function CartScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { groups } = useCart()
  const { session, customer } = useAuth()
  const { addresses, selected } = useDeliveryAddresses(customer)
  const [activeId, setActiveId] = useState(null)
  const activeGroup = groups.find((g) => g.restaurantId === activeId) ?? groups[0] ?? null
  const { restaurant } = useRestaurant(activeGroup?.restaurantId)

  const [method, setMethod] = useState('delivery')
  const [apartment, setApartment] = useState('')
  const [notes, setNotes] = useState('')
  const [leaveAtDoor, setLeaveAtDoor] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [payMethod, setPayMethod] = useState(PAY_METHODS[0].key)
  const [errors, setErrors] = useState({})
  const [payError, setPayError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [payAnim, setPayAnim] = useState(null)
  const [addressOpen, setAddressOpen] = useState(false)
  const touched = useRef(false)

  // Yhteystiedot ja osoitteen lisätiedot esitäytetään (kuten verkkosivulla).
  useEffect(() => {
    if (!customer) return
    Promise.resolve().then(() => {
      setName((n) => n || customer.name || '')
      setPhone((p) => p || nationalPhone(customer.phone))
    })
  }, [customer])
  useEffect(() => {
    if (!selected || touched.current) return
    const source = selected.home
      ? customer
      : { address_type: selected.type, address_details: selected.details, courier_instructions: selected.instructions }
    Promise.resolve().then(() => {
      setApartment(savedApartmentLine(source))
      setNotes(savedCourierNotes(source))
    })
  }, [selected, customer])

  const subtotal = activeGroup ? groupTotalCents(activeGroup) : 0
  const promoApplies = Boolean(promo) && (!promo.pickupOnly || method === 'pickup')
  const discount = promoApplies ? Math.min(promo.discountCents, subtotal) : 0
  const serviceFee = activeGroup ? SERVICE_FEE_CENTS : 0
  const total = subtotal + serviceFee - discount
  const closed = restaurant?.is_open === false
  const pickupMinutes = restaurant?.pickup_estimate_minutes ?? 25
  const parts = useMemo(() => splitAddress(selected?.full ?? ''), [selected])
  const fullAddress = selected ? joinAddress({ ...parts, apartment }) : ''
  const distanceKm =
    restaurant?.lat && restaurant?.lng && selected
      ? haversineKm({ lat: Number(restaurant.lat), lng: Number(restaurant.lng) }, { lat: selected.lat, lng: selected.lng })
      : null

  if (!activeGroup) return <EmptyCart onBrowse={() => router.navigate('/ravintolat')} insetsTop={insets.top} />

  function validate() {
    const next = {}
    if (name.trim().length < 2) next.name = 'Anna nimesi'
    if (phone.trim().length < 6) next.phone = 'Anna puhelinnumero'
    if (method === 'delivery') {
      if (!selected) next.address = 'Valitse toimitusosoite'
      else if (!/\d/.test(parts.street)) next.address = 'Osoitteesta puuttuu talon numero - valitse osoite uudelleen'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function applyPromo() {
    Keyboard.dismiss()
    const result = await checkPromoCode(promoInput, { subtotalCents: subtotal, method, customerId: customer?.id })
    if (result.error) {
      setPromoError(result.error)
      return
    }
    setPromo(result.promo)
    setPromoError('')
  }

  // Sama tallennus kuin verkkosivun saveOrderRows.
  async function saveOrder() {
    const isDelivery = method === 'delivery'
    const deliveryNotes = [isDelivery && leaveAtDoor ? 'Jätä ovelle' : null, notes.trim() || null].filter(Boolean).join(' - ')
    const estimatedReadyAt = new Date(Date.now() + pickupMinutes * 60 * 1000)
    const { data: orderRow, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: activeGroup.restaurantId,
        customer_id: customer.id,
        delivery_method: method,
        delivery_name: name.trim(),
        delivery_phone: internationalPhone(phone),
        delivery_address: isDelivery ? fullAddress : null,
        delivery_lat: isDelivery ? selected.lat : null,
        delivery_lng: isDelivery ? selected.lng : null,
        delivery_notes: deliveryNotes || null,
        subtotal_cents: subtotal,
        delivery_fee_cents: 0,
        service_fee_cents: serviceFee,
        discount_cents: discount,
        promo_code: promoApplies ? promo.code : null,
        total_cents: total,
        estimated_ready_at: estimatedReadyAt.toISOString(),
      })
      .select()
      .single()
    if (error || !orderRow) throw error ?? new Error('Tilausriviä ei palautettu')
    const { error: itemsError } = await supabase.from('order_items').insert(
      activeGroup.lines.map((line) => ({
        order_id: orderRow.id,
        menu_item_id: line.item.id,
        name: line.item.name,
        price_cents: line.item.price_cents,
        unit_price_cents: lineUnitPriceCents(line),
        selected_options: line.selectedOptions ?? [],
        quantity: line.quantity,
      })),
    )
    if (itemsError) throw itemsError
    return { ...orderRow, readyAt: estimatedReadyAt }
  }

  async function pay() {
    if (placing || closed) return
    setPayError('')
    if (!session || !customer) {
      router.push('/kirjautuminen')
      return
    }
    if (payMethod === 'card') {
      setPayError('Korttimaksu tulee sovellukseen pian. Valitse toistaiseksi toinen maksutapa.')
      return
    }
    if (!validate()) return
    setPlacing(true)
    const started = Date.now()
    setPayAnim({ phase: 'processing', method: payMethod, amount: total })
    try {
      const orderRow = await saveOrder()
      await wait(Math.max(0, 900 - (Date.now() - started)))
      setPayAnim((a) => a && { ...a, phase: 'done' })
      await wait(1700)
      setPayAnim(null)
      // Suoraan seurantaan kuten verkkosivulla: kuljettajan etsintä alkaa (17.11.2026).
      clearRestaurant(activeGroup.restaurantId)
      router.push(`/tilaus/${orderRow.id}`)
      setPromo(null)
      setPromoInput('')
    } catch (err) {
      setPayAnim(null)
      if (err?.message === 'restaurant_closed') setPayError('Ravintola sulkeutui juuri. Tilausta ei tehty.')
      else setPayError('Tilauksen tallennus epäonnistui. Yritä uudelleen.')
    } finally {
      setPlacing(false)
    }
  }

  const payLabel =
    payMethod === 'apple' ? 'Maksa Apple Paylla' : payMethod === 'google' ? 'Maksa Google Paylla' : 'Maksa kortilla'

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
        <Text style={styles.title}>
          Ostoskori<Text style={{ color: colors.orange }}>.</Text>
        </Text>

        {groups.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupTabs}>
            {groups.map((g) => {
              const on = g.restaurantId === activeGroup.restaurantId
              return (
                <Pressable key={g.restaurantId} onPress={() => setActiveId(g.restaurantId)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                    {g.restaurantName} · {groupCount(g)}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        {/* Toimitustapa */}
        <View style={styles.segment}>
          {[
            ['delivery', 'Kotiinkuljetus'],
            ['pickup', 'Nouto'],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setMethod(key)}
              style={[styles.segmentItem, method === key && styles.segmentOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: method === key }}
            >
              <Text style={[styles.segmentText, method === key && styles.segmentTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {closed ? <Text style={styles.closed}>Ravintola on juuri nyt suljettu, eikä tilaaminen ole mahdollista.</Text> : null}

        <Section
          title="Tilaus"
          action={
            <Pressable onPress={() => router.push(`/ravintola/${activeGroup.restaurantId}`)} hitSlop={8} style={styles.link}>
              <Plus size={15} strokeWidth={2.4} color={colors.black} />
              <Text style={styles.linkText}>Lisää tuotteita</Text>
            </Pressable>
          }
        >
          <Text style={styles.restaurantName}>{activeGroup.restaurantName}</Text>
          {activeGroup.lines.map((line) => (
            <View key={line.item.id + (line.optionsKey ?? '')} style={styles.line}>
              <View style={styles.lineMedia}>
                {imageUri(line.item.image_url) ? (
                  <FadeImage uri={imageUri(line.item.image_url)} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <UtensilsCrossed size={18} strokeWidth={1.8} color={colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.lineName} numberOfLines={2}>
                  {line.item.name}
                </Text>
                {line.selectedOptions?.length ? (
                  <Text style={styles.lineOptions} numberOfLines={2}>
                    {line.selectedOptions.map((o) => o.name).join(', ')}
                  </Text>
                ) : null}
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => setQuantity(activeGroup.restaurantId, line.item.id, line.quantity - 1, line.optionsKey)}
                    hitSlop={6}
                    style={styles.stepButton}
                    accessibilityLabel={line.quantity === 1 ? `Poista ${line.item.name} korista` : 'Vähennä määrää'}
                  >
                    {line.quantity === 1 ? (
                      <Trash2 size={14} strokeWidth={2} color={colors.black} />
                    ) : (
                      <Minus size={14} strokeWidth={2.4} color={colors.black} />
                    )}
                  </Pressable>
                  <Text style={styles.qty}>{line.quantity}</Text>
                  <Pressable
                    onPress={() => setQuantity(activeGroup.restaurantId, line.item.id, line.quantity + 1, line.optionsKey)}
                    hitSlop={6}
                    style={styles.stepButton}
                    accessibilityLabel="Lisää määrää"
                  >
                    <Plus size={14} strokeWidth={2.4} color={colors.black} />
                  </Pressable>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={[styles.linePrice, dealPercent(line.item.id) > 0 && { color: '#d9420f' }]}>
                  {formatPrice(lineUnitPriceCents(line) * line.quantity)}
                </Text>
                {/* Tarjoustuotteen alkuperäinen hinta yliviivattuna */}
                {dealPercent(line.item.id) > 0 ? (
                  <StrikePrice>{formatPrice(originalUnitCents(line) * line.quantity)}</StrikePrice>
                ) : null}
              </View>
            </View>
          ))}
        </Section>

        <Section title={method === 'delivery' ? 'Toimitustiedot' : 'Nouto'}>
          {method === 'delivery' ? (
            <View style={styles.group}>
              <Pressable onPress={() => setAddressOpen(true)} style={styles.groupRow} accessibilityRole="button">
                <MapPin size={19} strokeWidth={1.9} color={colors.black} />
                <View style={{ flex: 1 }}>
                  {selected ? <Text style={styles.rowStrong}>{selected.label}</Text> : null}
                  <Text style={selected ? styles.rowSub : styles.rowMain}>
                    {selected ? formatDisplayAddress(selected.full) : 'Valitse toimitusosoite'}
                  </Text>
                </View>
                <ChevronRight size={18} strokeWidth={1.9} color={colors.textMuted} />
              </Pressable>
              <Field icon={Building2} label="Porras ja asunto" placeholder="Esim. A 7" value={apartment} onChange={(v) => { touched.current = true; setApartment(v) }} />
              <Field icon={MessageCircle} label="Ohjeet kuljettajalle" placeholder="Esim. ovikoodi tai kerros" value={notes} onChange={(v) => { touched.current = true; setNotes(v) }} />
              <View style={[styles.groupRow, styles.groupRowLast]}>
                <DoorClosed size={19} strokeWidth={1.9} color={colors.black} />
                <Text style={[styles.rowMain, { flex: 1 }]}>Jätä tilaus ovelle</Text>
                <Toggle value={leaveAtDoor} onChange={setLeaveAtDoor} label="Jätä tilaus ovelle" />
              </View>
            </View>
          ) : (
            <View style={[styles.group, { padding: 14, gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Store size={20} strokeWidth={1.9} color={colors.black} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowStrong}>{activeGroup.restaurantName}</Text>
                  {restaurant?.address ? <Text style={styles.rowSub}>{formatDisplayAddress(restaurant.address)}</Text> : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={16} strokeWidth={2} color={colors.textMuted} />
                <Text style={styles.rowSub}>
                  Valmis noin klo {clock(new Date(Date.now() + pickupMinutes * 60000))} · n. {pickupMinutes} min
                </Text>
              </View>
            </View>
          )}
          {errors.address ? <Text style={styles.error}>{errors.address}</Text> : null}
        </Section>

        <Section title="Yhteystiedot">
          <View style={styles.group}>
            <Field icon={User} label="Nimi" placeholder="Etunimi Sukunimi" value={name} onChange={setName} />
            <Field icon={Phone} label="Puhelin" prefix="+358" placeholder="40 123 4567" value={phone} onChange={setPhone} keyboardType="phone-pad" last />
          </View>
          {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
          {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}
        </Section>

        <Section title="Yhteenveto">
          <Row label={`Tuotteet (${groupCount(activeGroup)} kpl)`} value={formatPrice(subtotal)} />
          {promoApplies ? <Row label={`Alennus (${promo.code})`} value={`−${formatPrice(discount)}`} accent /> : null}
          <Row
            label={`Kuljetus${method === 'delivery' && distanceKm != null ? ` (${distanceKm.toFixed(1).replace('.', ',')} km)` : ''}`}
            value={method === 'delivery' ? DELIVERY_PRICE_RANGE : 'Ei toimitusta'}
          />
          <Row label="Palvelumaksu" value={formatPrice(serviceFee)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Yhteensä</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
          {method === 'delivery' ? <Text style={styles.note}>Kuljetuksen hinta sovitaan kuljettajan kanssa tilauksen jälkeen.</Text> : null}

          {promo ? (
            <View style={styles.promoOn}>
              <Text style={styles.promoOnText}>
                {promo.code} · {promo.label}
                {!promoApplies ? ' (vain noudossa)' : ''}
              </Text>
              <Pressable onPress={() => { setPromo(null); setPromoInput('') }} hitSlop={8}>
                <Text style={styles.promoRemove}>Poista</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.promo}>
              <TextInput
                value={promoInput}
                onChangeText={(v) => { setPromoInput(v); setPromoError('') }}
                placeholder="Alennuskoodi"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[styles.promoInput, webOutline]}
                onSubmitEditing={applyPromo}
                accessibilityLabel="Alennuskoodi"
              />
              <Pressable onPress={applyPromo} disabled={!promoInput.trim()} style={[styles.promoButton, !promoInput.trim() && { opacity: 0.4 }]}>
                <Text style={styles.promoButtonText}>Käytä</Text>
              </Pressable>
            </View>
          )}
          {promoError ? <Text style={styles.error}>{promoError}</Text> : null}
        </Section>

        <Section title="Maksutapa">
          <View style={styles.group}>
            {PAY_METHODS.map((m, i) => {
              const on = payMethod === m.key
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setPayMethod(m.key)}
                  style={[styles.groupRow, i === PAY_METHODS.length - 1 && styles.groupRowLast]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                >
                  {m.key === 'card' ? (
                    <CreditCard size={19} strokeWidth={1.9} color={colors.black} />
                  ) : (
                    <Smartphone size={19} strokeWidth={1.9} color={colors.black} />
                  )}
                  <Text style={[styles.rowMain, { flex: 1 }]}>
                    {m.label}
                    {m.soon ? <Text style={styles.soon}>  tulossa</Text> : null}
                  </Text>
                  <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={12} strokeWidth={3} color="#ffffff" /> : null}</View>
                </Pressable>
              )
            })}
          </View>
        </Section>

        {payError ? <Text style={[styles.error, { marginHorizontal: SIDE, marginTop: 14 }]}>{payError}</Text> : null}
        {Object.keys(errors).length ? (
          <Text style={[styles.error, { marginHorizontal: SIDE, marginTop: 8 }]}>Täydennä puuttuvat tiedot ennen maksamista.</Text>
        ) : null}
      </ScrollView>

      {/* Maksupalkki alhaalla */}
      <View style={styles.payBar}>
        <Pressable
          onPress={pay}
          disabled={placing || closed}
          style={({ pressed }) => [styles.payButton, (placing || closed) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.payText}>{!session ? 'Kirjaudu tilataksesi' : payLabel}</Text>
          <Text style={styles.payTotal}>{formatPrice(total)}</Text>
        </Pressable>
      </View>

      <AddressSheet
        visible={addressOpen}
        onClose={() => setAddressOpen(false)}
        addresses={addresses}
        selectedId={selected?.id ?? null}
        onSelect={(id) => {
          touched.current = false
          selectAddress(id)
          setAddressOpen(false)
        }}
        onAdd={(picked) => {
          touched.current = false
          addAddress(picked)
          setAddressOpen(false)
        }}
        onUpdate={updateAddress}
        onRemove={removeAddress}
        onEditHome={
          session
            ? () => {
                setAddressOpen(false)
                router.push('/asetukset/osoite')
              }
            : null
        }
      />

      {payAnim ? <PayOverlay phase={payAnim.phase} method={payAnim.method} amount={payAnim.amount} /> : null}
    </View>
  )
}

// Rivin hinta ilman päivän tarjousta (perushinta + lisävalinnat).
const originalUnitCents = (line) =>
  line.item.price_cents + (line.selectedOptions ?? []).reduce((sum, o) => sum + (o.priceDeltaCents ?? 0), 0)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const clock = (date) => date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })

function Section({ title, action, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  )
}

function Field({ icon: Icon, label, value, onChange, placeholder, prefix, keyboardType, last }) {
  return (
    <View style={[styles.groupRow, last && styles.groupRowLast]}>
      <Icon size={19} strokeWidth={1.9} color={colors.black} />
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Suomen lippu numeron edessä, kuten verkkosivulla (17.11.2026). */}
          {prefix === '+358' ? (
            <Svg width={20} height={12} viewBox="0 0 18 11" style={styles.flag}>
              <Rect width="18" height="11" fill="#ffffff" />
              <Rect x="5" width="3" height="11" fill="#002f6c" />
              <Rect y="4" width="18" height="3" fill="#002f6c" />
            </Svg>
          ) : null}
          {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.gray400}
            keyboardType={keyboardType}
            style={[styles.fieldInput, webOutline]}
            accessibilityLabel={label}
          />
        </View>
      </View>
    </View>
  )
}

function Row({ label, value, accent }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumLabel, accent && { color: colors.offerRed }]}>{label}</Text>
      <Text style={[styles.sumValue, accent && { color: colors.offerRed }]}>{value}</Text>
    </View>
  )
}

// Musta maksuanimaatio kuten verkkosivun PaySuccessOverlay: ensin
// "Maksetaan…", sitten valkoinen ruksi ja "Maksu onnistui".
function PayOverlay({ phase, method, amount }) {
  const scale = useRef(new Animated.Value(0.6)).current
  useEffect(() => {
    if (phase === 'done') {
      scale.setValue(0.6)
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver }).start()
    }
  }, [phase, scale])
  const label = method === 'apple' ? 'Apple Pay' : method === 'google' ? 'Google Pay' : 'Kortti'
  return (
    <View style={styles.overlay}>
      {phase === 'processing' ? (
        <>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.overlayTitle}>Maksetaan…</Text>
          <Text style={styles.overlaySub}>
            {label} · {formatPrice(amount)}
          </Text>
        </>
      ) : (
        <>
          <Animated.View style={[styles.overlayCheck, { transform: [{ scale }] }]}>
            <Check size={40} strokeWidth={3} color={colors.black} />
          </Animated.View>
          <Text style={styles.overlayTitle}>Maksu onnistui</Text>
          <Text style={styles.overlaySub}>{formatPrice(amount)}</Text>
        </>
      )}
    </View>
  )
}

function EmptyCart({ onBrowse, insetsTop }) {
  return (
    <View style={[styles.empty, { paddingTop: insetsTop }]}>
      {/* Tyhjän korin kuva: käyttäjän 3D-ruokakassi (16.11.2026). */}
      <Image source={require('../../../assets/images/empty/cart-bag.png')} style={styles.emptyImage} resizeMode="contain" />
      <Text style={styles.emptyTitle}>
        Kassi huutaa tyhjyyttään<Text style={{ color: colors.orange }}>.</Text>
      </Text>
      <Text style={styles.emptyText}>Nälkä? Hoidetaan. Valitse lähiravintola, niin täytetään tämä yhdessä.</Text>
      <Pressable onPress={onBrowse} style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8 }]} accessibilityRole="button">
        <Text style={styles.emptyButtonText}>Selaa ravintoloita</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  title: { marginHorizontal: SIDE, fontFamily: fonts.headingBold, fontSize: 30, letterSpacing: -0.6, color: colors.black },
  groupTabs: { gap: 8, paddingHorizontal: SIDE, paddingTop: 14 },
  chip: { justifyContent: 'center', height: 34, maxWidth: 240, paddingHorizontal: 13, borderRadius: 17, backgroundColor: colors.gray100 },
  chipOn: { backgroundColor: colors.black },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
  chipTextOn: { color: '#ffffff' },
  segment: { flexDirection: 'row', marginTop: 16, marginHorizontal: SIDE, padding: 4, borderRadius: 24, backgroundColor: colors.gray100 },
  segmentItem: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  segmentOn: { backgroundColor: '#ffffff', boxShadow: '0 1px 4px rgba(20, 21, 15, 0.12)' },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted },
  segmentTextOn: { color: colors.black },
  closed: {
    marginTop: 14,
    marginHorizontal: SIDE,
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: '#8a1c22',
    backgroundColor: '#fde8e9',
  },
  section: { marginTop: 28, paddingHorizontal: SIDE },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.headingBold, fontSize: 20, letterSpacing: -0.3, color: colors.black },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black },
  restaurantName: { marginBottom: 4, fontFamily: fonts.medium, fontSize: 13.5, color: colors.textMuted },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e3',
  },
  lineMedia: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  lineName: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black },
  lineOptions: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
  },
  stepButton: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 16, textAlign: 'center', fontFamily: fonts.bold, fontSize: 13.5, color: colors.black },
  linePrice: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: '#ececea', borderRadius: 16 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0ee',
  },
  groupRowLast: { borderBottomWidth: 0 },
  rowMain: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  rowStrong: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black },
  rowSub: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textMuted },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  fieldInput: { flex: 1, paddingVertical: 2, fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  prefix: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  flag: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#d9d9d6', borderRadius: 2 },
  error: { marginTop: 6, fontFamily: fonts.medium, fontSize: 13, color: colors.offerRed },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  sumLabel: { fontFamily: fonts.regular, fontSize: 14.5, color: colors.black },
  sumValue: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.black },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ececea',
  },
  totalLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  totalValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  note: { marginTop: 6, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  promoInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    fontFamily: fonts.medium,
    fontSize: 14.5,
    color: colors.black,
    backgroundColor: colors.gray100,
  },
  promoButton: { height: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.black },
  promoButtonText: { fontFamily: fonts.semibold, fontSize: 14, color: '#ffffff' },
  promoOn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  promoOnText: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black },
  promoRemove: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.textMuted, textDecorationLine: 'underline' },
  soon: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c9c9c5',
    borderRadius: 11,
  },
  radioOn: { borderColor: colors.black, backgroundColor: colors.black },
  payBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SIDE,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e6e6e3',
    backgroundColor: colors.surface,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: colors.black,
  },
  payText: { fontFamily: fonts.semibold, fontSize: 15, color: '#ffffff' },
  payTotal: { fontFamily: fonts.bold, fontSize: 15, color: '#ffffff' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b0b0a',
  },
  overlayCheck: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', borderRadius: 42, backgroundColor: '#ffffff' },
  overlayTitle: { marginTop: 8, fontFamily: fonts.headingBold, fontSize: 24, color: '#ffffff' },
  overlaySub: { fontFamily: fonts.medium, fontSize: 15, color: 'rgba(255, 255, 255, 0.7)' },
  doneScreen: { flex: 1, alignItems: 'center', paddingHorizontal: 28, backgroundColor: colors.surface },
  doneCheck: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36, backgroundColor: colors.black },
  doneTitle: { marginTop: 20, fontFamily: fonts.headingBold, fontSize: 27, letterSpacing: -0.5, color: colors.black, textAlign: 'center' },
  doneText: { marginTop: 8, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },
  doneButton: { marginTop: 26, height: 46, justifyContent: 'center', paddingHorizontal: 24, borderRadius: 23, backgroundColor: colors.black },
  doneButtonText: { fontFamily: fonts.semibold, fontSize: 15, color: '#ffffff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: colors.surface },
  emptyImage: { width: 180, height: 180 },
  emptyTitle: { marginTop: 12, fontFamily: fonts.heading, fontSize: 25, letterSpacing: -0.5, color: colors.black, textAlign: 'center' },
  emptyText: { marginTop: 8, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },
  emptyButton: { marginTop: 22, height: 44, paddingHorizontal: 22, justifyContent: 'center', borderRadius: 22, backgroundColor: colors.black },
  emptyButtonText: { fontFamily: fonts.semibold, fontSize: 14.5, color: '#ffffff' },
})
