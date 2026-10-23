import { useEffect, useState } from 'react'
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, Minus, Plus, Utensils } from 'lucide-react-native'
import CollapsibleCard from './CollapsibleCard'
import { DELIVERY_BID, clampBidCents, courierShareCents } from '../../../frontend/src/lib/deliveryTime'
import { formatEuro, formatKm } from '../lib/format'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
// Hinnan säätö 50 sentin askelin.
const STEP_CENTS = 50

// Ehdotus matkan mukaan: 1,99 € + 0,60 €/km, x,49- tai x,99-hintana haarukassa.
function suggestedPrice(request) {
  const km = request.approachKm + request.deliveryKm
  return clampBidCents(Math.round((DELIVERY_BID.minCents + 1 + km * 60) / STEP_CENTS) * STEP_CENTS - 1)
}

function secondsLeft(expiresAt) {
  return expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : null
}

function formatClock(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// Kuljetuspyyntö (migraatio 0058): ravintola, ruoan summa, matka ja alue
// (tarkka osoite näkyy vasta kun asiakas valitsee). Kuljettaja tarjoaa hinnan
// tai hyväksyy asiakkaan oman hinnan. Avoin tarjous odottaa asiakkaan vastausta.
export default function BidCard({ request, position, total, busy, onBid, onWithdraw, onHeightChange }) {
  const insets = useSafeAreaInsets()
  const t = useT()
  // Animaatioarvo tilassa (ei ref-lukua renderöinnissä); kortti nousee alhaalta.
  const [enter] = useState(() => new Animated.Value(1))
  const hasOpenBid = request.myBidStatus === 'offered'
  const [draft, setDraft] = useState(() => request.myBidCents ?? suggestedPrice(request))
  const [error, setError] = useState(null)
  const [seconds, setSeconds] = useState(() => secondsLeft(request.expiresAt))

  useEffect(() => {
    enter.setValue(1)
    Animated.spring(enter, { toValue: 0, bounciness: 4, speed: 14, useNativeDriver }).start()
  }, [request.id, enter])

  useEffect(() => {
    const timer = setInterval(() => setSeconds(secondsLeft(request.expiresAt)), 1000)
    return () => clearInterval(timer)
  }, [request.expiresAt])

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 420] })
  const customerOffer = request.customerOfferCents
  const unchanged = hasOpenBid && draft === request.myBidCents

  async function submit(price) {
    setError(null)
    const message = await onBid(price)
    if (message) setError(message)
  }

  const header = (
    <>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>
            {hasOpenBid ? t('bid.waiting') : t('bid.new')}
            {total > 1 ? ` · ${position}/${total}` : ''}
          </Text>
        </View>
        {seconds != null ? <Text style={styles.timer}>{t('bid.timeLeft', { time: formatClock(seconds) })}</Text> : null}
      </View>
      <Text style={styles.restaurant} numberOfLines={1}>
        {request.restaurant.name}
      </Text>
      <Text style={styles.food}>
        {t('bid.food', { amount: formatEuro(request.foodCents), count: request.itemCount })}
      </Text>
    </>
  )

  const footer = (
    <View>
      {/* Asiakkaan hinnan voi hyväksyä myös oman tarjouksen jälkeen (esim. tarjosit
          4,99 €, asiakas vastasi 3,99 €): sama hinta = kauppa syntyy heti. */}
      {customerOffer && customerOffer !== request.myBidCents ? (
        <Pressable
          onPress={() => submit(customerOffer)}
          disabled={busy}
          style={({ pressed }) => [styles.customerOffer, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.customerOfferLabel}>{t('bid.customerOffers', { amount: formatEuro(customerOffer) })}</Text>
          <Text style={styles.customerOfferAction}>
            {t('bid.acceptCustomer', { amount: formatEuro(courierShareCents(customerOffer)) })}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.priceRow}>
        <Pressable
          onPress={() => setDraft((value) => clampBidCents(value - STEP_CENTS))}
          disabled={draft <= DELIVERY_BID.minCents}
          style={({ pressed }) => [styles.stepButton, pressed && styles.pressed, draft <= DELIVERY_BID.minCents && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={t('bid.lower')}
          hitSlop={6}
        >
          <Minus size={20} strokeWidth={2.4} color={colors.black} />
        </Pressable>
        <View style={styles.priceBox}>
          <Text style={styles.price}>{formatEuro(draft)}</Text>
          {DELIVERY_BID.courierSharePercent < 100 ? (
            <Text style={styles.share}>{t('bid.youGet', { amount: formatEuro(courierShareCents(draft)) })}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => setDraft((value) => clampBidCents(value + STEP_CENTS))}
          disabled={draft >= DELIVERY_BID.maxCents}
          style={({ pressed }) => [styles.stepButton, pressed && styles.pressed, draft >= DELIVERY_BID.maxCents && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={t('bid.raise')}
          hitSlop={6}
        >
          <Plus size={20} strokeWidth={2.4} color={colors.black} />
        </Pressable>
      </View>

      <Pressable
        onPress={() => submit(draft)}
        disabled={busy || unchanged}
        style={({ pressed }) => [styles.submit, unchanged && styles.submitWaiting, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={[styles.submitText, unchanged && styles.submitTextWaiting]}>
            {unchanged
              ? t('bid.waitingCustomer')
              : hasOpenBid
                ? t('bid.update', { amount: formatEuro(draft) })
                : t('bid.offer', { amount: formatEuro(draft) })}
          </Text>
        )}
      </Pressable>

      {hasOpenBid ? (
        <Pressable onPress={onWithdraw} disabled={busy} style={styles.withdraw} accessibilityRole="button" hitSlop={6}>
          <Text style={styles.withdrawText}>{t('bid.withdraw')}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )

  return (
    <CollapsibleCard
      header={header}
      footer={footer}
      onHeightChange={onHeightChange}
      paddingBottom={insets.bottom + 16}
      style={{ transform: [{ translateY }] }}
    >
      <View style={styles.places}>
        <Place
          Icon={Utensils}
          iconStyle={styles.placeIconPickup}
          label={t('bid.pickup', { km: formatKm(request.approachKm) })}
          name={request.restaurant.name}
          detail={request.restaurant.address}
        />
        <View style={styles.placeLine} />
        <Place
          Icon={House}
          iconStyle={styles.placeIconDropoff}
          label={t('bid.dropoff', { km: formatKm(request.deliveryKm) })}
          name={request.dropoff.area}
          detail={t('bid.addressLater')}
        />
      </View>
      <Text style={styles.hint}>{t('bid.hint')}</Text>
    </CollapsibleCard>
  )
}

function Place({ Icon, iconStyle, label, name, detail }) {
  return (
    <View style={styles.place}>
      <View style={[styles.placeIcon, iconStyle]}>
        <Icon size={16} strokeWidth={2.2} color="#ffffff" />
      </View>
      <View style={styles.placeText}>
        <Text style={styles.placeLabel}>{label}</Text>
        <Text style={styles.placeName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.placeDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.orangeSoft,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.orangeDark,
  },
  timer: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  restaurant: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.6,
    color: colors.black,
  },
  food: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  customerOffer: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  customerOfferLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.orangeDark,
  },
  customerOfferAction: {
    marginTop: 2,
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.black,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  stepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gray50,
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: -1,
    color: colors.black,
  },
  share: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  submit: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginTop: 14,
    borderRadius: 30,
    backgroundColor: colors.orange,
  },
  submitWaiting: {
    backgroundColor: colors.gray50,
  },
  submitText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#ffffff',
  },
  submitTextWaiting: {
    color: colors.textMuted,
  },
  withdraw: {
    alignSelf: 'center',
    marginTop: 12,
  },
  withdrawText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  error: {
    marginTop: 10,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    color: colors.danger,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.35,
  },
  places: {
    marginTop: 16,
  },
  place: {
    flexDirection: 'row',
    gap: 12,
  },
  placeIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 2,
  },
  placeIconPickup: {
    backgroundColor: colors.black,
  },
  placeIconDropoff: {
    backgroundColor: colors.orange,
  },
  placeLine: {
    width: 2,
    height: 12,
    marginLeft: 15,
    marginVertical: 3,
    backgroundColor: colors.gray200,
  },
  placeText: {
    flex: 1,
  },
  placeLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  placeName: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  placeDetail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  hint: {
    marginTop: 14,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
})
