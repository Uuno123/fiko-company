import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Check, ChevronRight, Minus, Plus, X } from 'lucide-react-native'
import RestaurantLogo from './RestaurantLogo'
import { ScoreSmiley } from './Smiley'
import { formatPrice } from '../../../frontend/src/lib/format'
import { formatScore } from '../../../frontend/src/lib/score'
import { DELIVERY_BID, bidInputText, clampBidCents, isBidInRange, parseBidInput } from '../../../frontend/src/lib/deliveryTime'
import {
  VEHICLE_LABELS,
  acceptBid,
  bidErrorText,
  cancelNegotiation,
  courierPhotoUrl,
  setDeliveryOffer,
  useDeliveryNegotiation,
} from '../lib/deliveryBids'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
const webOutline = Platform.select({ web: { outlineStyle: 'none' }, default: null })
const OFFER_STEP_CENTS = 50
const DEFAULT_OFFER_CENTS = 399

function formatKm(km) {
  if (!Number.isFinite(km)) return null
  return km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)} m` : `${km.toFixed(1).replace('.', ',')} km`
}

function useSecondsLeft(expiresAt) {
  const target = expiresAt ? Date.parse(expiresAt) : NaN
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!Number.isFinite(target)) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [target])
  return Number.isFinite(target) ? Math.max(0, Math.ceil((target - now) / 1000)) : null
}

const clockText = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

// Kuljettajan etsintä kuten verkkosivun DeliveryBidPanel ("tutka keskellä",
// 12.11.2026): ravintolan logo sykkivien renkaiden keskellä, aika
// tarjouksille, kuljettajien tarjoukset (halvin ensin, Hyväksy), oma hinta
// ja tilauksen peruutus. Ravintola saa tilauksen, kun hinnasta on sovittu.
// onChanged: seurantasivu hakee tilauksen uudelleen (sovittu -> seuranta heti).
export default function CourierSearch({ orderId, restaurant, onCancelled, onChanged }) {
  const { order, offeredBids, acceptedBid, loaded, refresh } = useDeliveryNegotiation(orderId)
  const secondsLeft = useSecondsLeft(order?.bidding_expires_at)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [draftText, setDraftText] = useState(null)
  const [offerOpen, setOfferOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (!loaded || !order) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.orange} />
        <Text style={styles.muted}>Ladataan kuljetustarjouksia…</Text>
      </View>
    )
  }

  if (order.status !== 'awaiting_courier') {
    if (order.status === 'cancelled') {
      return (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>Tilaus peruttiin</Text>
          <Text style={styles.muted}>
            {order.cancel_reason === 'customer_cancelled'
              ? 'Peruit tilauksen ennen kuin kuljetuksesta sovittiin.'
              : 'Kuljetuksesta ei ehditty sopia ajoissa.'}{' '}
            Tilauksesta ei veloiteta mitään.
          </Text>
        </View>
      )
    }
    return (
      <View style={[styles.done, styles.agreed]}>
        <View style={styles.doneIcon}>
          <Check size={20} strokeWidth={2.6} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.doneTitle}>
            Sovittu{acceptedBid ? `: ${acceptedBid.courier_name}` : ''} ·{' '}
            {formatPrice(order.delivery_price_cents ?? acceptedBid?.price_cents ?? 0)}
          </Text>
          <Text style={styles.muted}>Ravintola sai tilauksesi. Kuljettaja hakee sen, kun ruoka on valmis.</Text>
        </View>
      </View>
    )
  }

  const activeOffer = order.customer_offer_cents
  const cheapestCents = offeredBids[0]?.price_cents
  const suggested = activeOffer ?? (cheapestCents ? clampBidCents(cheapestCents - OFFER_STEP_CENTS) : DEFAULT_OFFER_CENTS)
  const draftValue = draftText ?? bidInputText(suggested)
  const parsed = parseBidInput(draftValue)
  const draftCents = isBidInRange(parsed) ? parsed : null
  const base = clampBidCents(parsed ?? suggested)
  const expired = secondsLeft === 0

  async function run(key, action) {
    setBusy(key)
    setError('')
    try {
      await action()
      await refresh()
      onChanged?.()
      return true
    } catch (err) {
      setError(bidErrorText(err))
      refresh()
      return false
    } finally {
      setBusy(null)
    }
  }

  return (
    <View>
      <View style={styles.radarWrap}>
        <Radar compact={offeredBids.length > 0}>
          <RestaurantLogo name={restaurant?.name} imageUrl={restaurant?.image_url} size={offeredBids.length > 0 ? 54 : 72} />
        </Radar>
        <Text style={styles.title}>{offeredBids.length > 0 ? 'Valitse kuljettaja' : 'Etsitään kuljettajaa'}</Text>
        <Text style={styles.sub}>
          {expired ? 'Tarjousaika päättyi' : secondsLeft != null ? `Tarjouksia vielä ${clockText(secondsLeft)}` : 'Tarjouksia tulossa'}
        </Text>
      </View>

      {offeredBids.length === 0 ? (
        <Text style={styles.hint}>Lähellä olevien kuljettajien tarjoukset ilmestyvät tähän.</Text>
      ) : (
        <View style={{ gap: 10, marginTop: 18 }}>
          {offeredBids.map((bid, index) => {
            const cheapest = index === 0 && offeredBids.length > 1
            const reviews = bid.courier_review_count ?? 0
            const distance = formatKm(bid.distance_km)
            const photo = courierPhotoUrl(bid.courier_photo_path)
            return (
              <View key={bid.id} style={[styles.bid, cheapest && styles.bidCheapest]}>
                <View style={styles.avatar}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={styles.avatarText}>{(bid.courier_name ?? 'K').charAt(0)}</Text>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.bidName} numberOfLines={1}>
                    {bid.courier_name}
                  </Text>
                  {reviews > 0 && bid.courier_rating != null ? (
                    <View style={styles.bidRating}>
                      <ScoreSmiley rating={bid.courier_rating} size={13} color={colors.black} />
                      <Text style={styles.bidMetaStrong}>{formatScore(bid.courier_rating)}</Text>
                      <Text style={styles.bidMeta}>
                        · {reviews} {reviews === 1 ? 'arvio' : 'arviota'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.newCourier}>Uusi kuljettaja</Text>
                  )}
                  <Text style={styles.bidMeta} numberOfLines={1}>
                    {VEHICLE_LABELS[bid.vehicle] ?? 'Kuljettaja'}
                    {distance ? ` · ${distance} ravintolasta` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {cheapest ? <Text style={styles.cheapTag}>Edullisin</Text> : null}
                  <Text style={styles.bidPrice}>{formatPrice(bid.price_cents)}</Text>
                  <Pressable
                    onPress={() => run(bid.id, () => acceptBid(bid.id))}
                    disabled={Boolean(busy) || expired}
                    style={({ pressed }) => [styles.accept, (busy || expired) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Hyväksy ${bid.courier_name}, ${formatPrice(bid.price_cents)}`}
                  >
                    {busy === bid.id ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.acceptText}>Hyväksy</Text>}
                  </Pressable>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {!offerOpen && activeOffer == null ? (
        <Pressable onPress={() => setOfferOpen(true)} style={styles.offerLink} hitSlop={8} accessibilityRole="button">
          <Text style={styles.offerLinkText}>Tarjoa omaa hintaa</Text>
          <ChevronRight size={16} strokeWidth={2.2} color={colors.black} />
        </Pressable>
      ) : (
        <View style={styles.offer}>
          <View style={styles.offerHead}>
            <Text style={styles.offerTitle}>{activeOffer ? 'Oma tarjouksesi' : 'Mitä maksaisit kuljetuksesta?'}</Text>
            {activeOffer == null ? (
              <Pressable onPress={() => { setOfferOpen(false); setDraftText(null) }} hitSlop={8} accessibilityLabel="Sulje oma hinta">
                <X size={16} strokeWidth={2.2} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.offerRow}>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setDraftText(bidInputText(clampBidCents(base - OFFER_STEP_CENTS)))}
                disabled={base <= DELIVERY_BID.minCents || expired}
                style={styles.stepButton}
                accessibilityLabel="Pienennä hintaa"
              >
                <Minus size={16} strokeWidth={2.4} color={colors.black} />
              </Pressable>
              <TextInput
                value={draftValue}
                onChangeText={(v) => setDraftText(v.replace(/[^\d,.]/g, '').slice(0, 5))}
                onBlur={() => setDraftText(bidInputText(base))}
                keyboardType="decimal-pad"
                maxLength={5}
                editable={!expired}
                style={[styles.stepInput, draftCents == null && { color: colors.offerRed }, webOutline]}
                accessibilityLabel="Oma hintasi euroina"
              />
              <Text style={styles.euro}>€</Text>
              <Pressable
                onPress={() => setDraftText(bidInputText(clampBidCents(base + OFFER_STEP_CENTS)))}
                disabled={base >= DELIVERY_BID.maxCents || expired}
                style={styles.stepButton}
                accessibilityLabel="Suurenna hintaa"
              >
                <Plus size={16} strokeWidth={2.4} color={colors.black} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => run('offer', () => setDeliveryOffer(orderId, draftCents)).then((ok) => ok && setDraftText(null))}
              disabled={Boolean(busy) || expired || draftCents == null || draftCents === activeOffer}
              style={({ pressed }) => [
                styles.offerButton,
                (busy || expired || draftCents == null || draftCents === activeOffer) && { opacity: 0.45 },
                pressed && { opacity: 0.8 },
              ]}
            >
              {busy === 'offer' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.acceptText}>
                  {activeOffer ? 'Päivitä' : 'Tarjoa'}
                  {draftCents != null ? ` ${formatPrice(draftCents)}` : ''}
                </Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.offerNote}>
            {activeOffer
              ? `${formatPrice(activeOffer)} näkyy kuljettajille. Ensimmäinen sen hyväksyvä valitaan heti.`
              : `Kirjoita summa ${formatPrice(DELIVERY_BID.minCents)}–${formatPrice(DELIVERY_BID.maxCents)}.`}
          </Text>
          {activeOffer != null ? (
            <Pressable onPress={() => run('offer', () => setDeliveryOffer(orderId, null))} disabled={Boolean(busy)} hitSlop={8}>
              <Text style={styles.link}>Poista oma tarjous</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.note}>Ravintola saa tilauksen, kun hinnasta on sovittu.</Text>

      {confirmCancel ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>Perutaanko tilaus?</Text>
          <Pressable onPress={() => setConfirmCancel(false)} hitSlop={8}>
            <Text style={styles.link}>Ei</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              run('cancel', async () => {
                await cancelNegotiation(orderId)
                onCancelled?.()
              })
            }
            disabled={Boolean(busy)}
            style={styles.cancelYes}
          >
            <Text style={styles.acceptText}>Kyllä, peru</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setConfirmCancel(true)} hitSlop={8} style={{ alignSelf: 'center', marginTop: 14 }}>
          <Text style={styles.link}>Peru tilaus</Text>
        </Pressable>
      )}
    </View>
  )
}

// Kolme sykkivää rengasta logon ympärillä. Yksi jatkuva silmukka, renkaat
// kolmanneksen vaiheen päässä toisistaan (viiveelliset erilliset silmukat
// jäivät webissä jumiin loppuasentoon).
function Radar({ children, compact }) {
  const size = compact ? 150 : 210
  const master = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(master, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver }),
    )
    loop.start()
    return () => loop.stop()
  }, [master])
  const rings = [0, 1 / 3, 2 / 3].map((offset) =>
    offset === 0
      ? master
      : master.interpolate({ inputRange: [0, 1 - offset, 1 - offset + 0.0001, 1], outputRange: [offset, 1, 0, offset] }),
  )
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {rings.map((phase, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: phase.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
              transform: [{ scale: phase.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
            },
          ]}
        />
      ))}
      <View style={styles.logoRing}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  muted: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  done: { gap: 6, padding: 16, borderRadius: 16, backgroundColor: colors.gray100 },
  agreed: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.black },
  doneTitle: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.black },
  radarWrap: { alignItems: 'center' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: colors.orange, backgroundColor: 'rgba(244, 80, 30, 0.06)' },
  logoRing: {
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 999,
    boxShadow: '0 4px 16px rgba(20, 21, 15, 0.18)',
  },
  title: { marginTop: 6, fontFamily: fonts.headingBold, fontSize: 24, letterSpacing: -0.4, color: colors.black },
  sub: { marginTop: 4, fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  hint: { marginTop: 16, textAlign: 'center', fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  bid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ececea',
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  bidCheapest: { borderColor: colors.orange },
  avatar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 23,
    backgroundColor: colors.gray100,
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
  bidName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  bidRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  bidMetaStrong: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.black },
  bidMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  newCourier: { marginTop: 2, fontFamily: fonts.semibold, fontSize: 12.5, color: colors.orange },
  cheapTag: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    overflow: 'hidden',
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: '#ffffff',
    backgroundColor: colors.orange,
  },
  bidPrice: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  accept: { height: 34, minWidth: 84, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.black },
  acceptText: { fontFamily: fonts.semibold, fontSize: 13.5, color: '#ffffff' },
  offerLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 2, marginTop: 20 },
  offerLinkText: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black, textDecorationLine: 'underline' },
  offer: { marginTop: 20, padding: 14, borderRadius: 16, backgroundColor: colors.gray100 },
  offerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offerTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, backgroundColor: '#ffffff' },
  stepButton: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepInput: { width: 50, textAlign: 'right', fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  euro: { marginLeft: 3, fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  offerButton: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.black },
  offerNote: { marginTop: 8, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  link: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.textMuted, textDecorationLine: 'underline' },
  error: { marginTop: 12, textAlign: 'center', fontFamily: fonts.medium, fontSize: 13.5, color: colors.offerRed },
  note: { marginTop: 16, textAlign: 'center', fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14 },
  confirmText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  cancelYes: { height: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.offerRed },
})
