import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, Utensils } from 'lucide-react-native'
import CollapsibleCard from './CollapsibleCard'
import { formatEuro, formatKm, formatTime } from '../lib/format'
import { OFFER_SECONDS, plannedSchedule } from '../lib/jobs'
import { useCourier } from '../lib/courier'
import { useT } from '../lib/i18n'
import { useOfferSound } from '../lib/sound'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'

function secondsLeft(expiresAt) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
}

// Keikkatarjous Woltin kuljettaja-appin mallin mukaan: ansio isolla, nouto ja
// toimitus kellonaikoineen (jos hyväksyt nyt), reitin pituus ja arvioitu aika
// sekä Hyväksy-nappi, jonka sisällä aikaraja kuluu. Hylkää-nappi on kartan
// yläkulmassa (app/index.jsx). Kortin voi pienentää: ansio ja Hyväksy jäävät
// näkyviin, reitin tiedot piiloutuvat.
export default function OfferCard({ offer, onAccept, onHeightChange }) {
  const insets = useSafeAreaInsets()
  const t = useT()
  const { settings } = useCourier()
  // Ääni uudesta tarjouksesta (Asetukset > Ääni uudesta keikasta).
  useOfferSound(offer.id, settings.sound)
  const enter = useRef(new Animated.Value(1)).current
  const timeLeft = useRef(new Animated.Value(1)).current
  const [seconds, setSeconds] = useState(() => secondsLeft(offer.expiresAt))

  // Kortti nousee alhaalta ja aikapalkki alkaa kulua.
  useEffect(() => {
    enter.setValue(1)
    Animated.spring(enter, { toValue: 0, bounciness: 4, speed: 14, useNativeDriver }).start()
    const remainingMs = Math.max(0, offer.expiresAt - Date.now())
    timeLeft.setValue(remainingMs / (OFFER_SECONDS * 1000))
    Animated.timing(timeLeft, { toValue: 0, duration: remainingMs, easing: Easing.linear, useNativeDriver }).start()
    setSeconds(secondsLeft(offer.expiresAt))
    const timer = setInterval(() => setSeconds(secondsLeft(offer.expiresAt)), 250)
    return () => clearInterval(timer)
  }, [offer.id, offer.expiresAt, enter, timeLeft])

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [0, 420] })
  // Lasketaan uudelleen joka päivityksellä (laskuri päivittää korttia).
  const schedule = plannedSchedule(offer)

  const header = (
    <>
      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>{t('offer.new')}</Text>
      </View>

      <Text style={styles.pay}>{formatEuro(offer.pay.total)}</Text>
      <Text style={styles.payLabel}>{t('offer.payLabel')}</Text>
    </>
  )

  const accept = (
    <Pressable
      onPress={onAccept}
      style={({ pressed }) => [styles.accept, pressed && styles.acceptPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('offer.acceptA11y', { seconds })}
    >
      {/* Kirkas oranssi osa kutistuu vasemmalle sitä mukaa kuin aika kuluu. */}
      <Animated.View style={[styles.acceptTime, { transform: [{ scaleX: timeLeft }] }]} />
      <View style={styles.acceptContent}>
        <Text style={styles.acceptText}>{t('offer.accept')}</Text>
        <Text style={styles.acceptSeconds}>{seconds} s</Text>
      </View>
    </Pressable>
  )

  return (
    <CollapsibleCard
      header={header}
      footer={accept}
      onHeightChange={onHeightChange}
      paddingBottom={insets.bottom + 16}
      style={{ transform: [{ translateY }] }}
    >
      <View style={styles.places}>
        <Place
          Icon={Utensils}
          iconStyle={styles.placeIconPickup}
          label={t('offer.pickupAt', { time: formatTime(schedule.arriveBy) })}
          name={offer.restaurant.name}
          detail={
            offer.approachKnown
              ? t('offer.fromYou', { address: offer.restaurant.address, km: formatKm(offer.approachKm) })
              : offer.restaurant.address
          }
        />
        <View style={styles.placeLine} />
        <Place
          Icon={House}
          iconStyle={styles.placeIconDropoff}
          label={t('offer.deliverBy', { time: formatTime(schedule.deliverBy) })}
          name={offer.dropoff.area}
          detail={offer.dropoff.address}
        />
      </View>

      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>{t('offer.routeLength')}</Text>
          <Text style={styles.factValue}>{offer.deliveryKnown ? formatKm(offer.routeKm) : t('offer.unknown')}</Text>
        </View>
        <View style={styles.factDivider} />
        <View style={styles.fact}>
          <Text style={styles.factLabel}>{t('offer.estimatedTime')}</Text>
          <Text style={styles.factValue}>
            {offer.minMinutes}–{offer.maxMinutes} min
          </Text>
        </View>
      </View>
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
  pay: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 44,
    letterSpacing: -1.2,
    color: colors.black,
  },
  payLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  places: {
    marginTop: 18,
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
  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.gray50,
  },
  fact: {
    flex: 1,
    paddingHorizontal: 16,
  },
  factDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.gray200,
  },
  factLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  factValue: {
    marginTop: 2,
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.black,
  },
  accept: {
    justifyContent: 'center',
    height: 60,
    marginTop: 16,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: colors.orangeDark,
  },
  acceptPressed: {
    transform: [{ scale: 0.98 }],
  },
  acceptTime: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.orange,
    transformOrigin: 'left',
  },
  acceptContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
  },
  acceptText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#ffffff',
  },
  acceptSeconds: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
})
