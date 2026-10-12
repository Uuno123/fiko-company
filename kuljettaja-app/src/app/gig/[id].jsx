import { Linking, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { CircleAlert, MapPin, Navigation, Store } from 'lucide-react-native'
import MapView from '../../components/MapView'
import { Button, Card, Screen } from '../../components/ui'
import { useCourier } from '../../lib/courier'
import { formatDayLabel, formatEuro, formatKm, formatMinutes, formatTime } from '../../lib/format'
import { PAY, useGigs } from '../../lib/gigs'
import { navigationAppLabel, openRoute } from '../../lib/navigationApps'
import { colors, fonts } from '../../theme'

const SUPPORT_EMAIL = 'tuki@delivo.fi'

// Yhden keikan tiedot: reitti kartalla, nouto ja toimitus, ansion erittely.
export default function GigScreen() {
  const { id } = useLocalSearchParams()
  const { settings } = useCourier()
  const gig = useGigs().find((item) => item.id === String(id))

  if (!gig) {
    return (
      <Screen title="Keikka">
        <Card style={styles.missing}>
          <Text style={styles.missingText}>Keikkaa ei löytynyt.</Text>
        </Card>
      </Screen>
    )
  }

  const route = {
    from: { lat: gig.restaurant.lat, lng: gig.restaurant.lng },
    to: { lat: gig.dropoff.lat, lng: gig.dropoff.lng },
  }
  const reportProblem = () => {
    const subject = encodeURIComponent(`Keikka #${gig.number}`)
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {})
  }

  return (
    <Screen title={`Keikka #${gig.number}`} subtitle={`${formatDayLabel(gig.deliveredAt)} klo ${formatTime(gig.acceptedAt)}`}>
      {/* Pelkkä esikatselukuva: kosketukset menevät sivun vieritykselle. */}
      <View style={[styles.map, { pointerEvents: 'none' }]}>
        <MapView route={route} interactive={false} />
      </View>

      <Card style={styles.steps}>
        <Step
          Icon={Store}
          iconStyle={styles.stepIconPickup}
          title="Nouto"
          time={formatTime(gig.pickedUpAt)}
          name={gig.restaurant.name}
          detail={gig.restaurant.address}
        />
        <View style={styles.stepLine} />
        <Step
          Icon={MapPin}
          iconStyle={styles.stepIconDropoff}
          title="Toimitus"
          time={formatTime(gig.deliveredAt)}
          name={gig.dropoff.address}
          detail={gig.dropoff.area}
        />
      </Card>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{formatKm(gig.distanceKm)}</Text>
          <Text style={styles.statLabel}>Matka</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statValue}>{formatMinutes(gig.durationMin)}</Text>
          <Text style={styles.statLabel}>Kesto</Text>
        </Card>
      </View>

      <Card style={styles.pay}>
        <PayRow label="Perusmaksu" value={formatEuro(gig.pay.base)} />
        <PayRow
          label={`Matkalisä (${formatKm(gig.distanceKm)} × ${formatEuro(PAY.perKmCents)})`}
          value={formatEuro(gig.pay.distance)}
        />
        <PayRow label="Tippi" value={gig.pay.tip ? formatEuro(gig.pay.tip) : '–'} />
        <View style={styles.payDivider} />
        <View style={styles.payTotalRow}>
          <Text style={styles.payTotalLabel}>Yhteensä</Text>
          <Text style={styles.payTotal}>{formatEuro(gig.pay.total)}</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title={`Näytä reitti: ${navigationAppLabel(settings.navigationApp)}`}
          icon={Navigation}
          variant="secondary"
          onPress={() => openRoute(settings.navigationApp, route.from, route.to, settings.vehicle)}
        />
        <Button title="Ilmoita ongelmasta" icon={CircleAlert} variant="secondary" onPress={reportProblem} />
      </View>

    </Screen>
  )
}

function Step({ Icon, iconStyle, title, time, name, detail }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepIcon, iconStyle]}>
        <Icon size={18} strokeWidth={2} color="#ffffff" />
      </View>
      <View style={styles.stepText}>
        <Text style={styles.stepTitle}>
          {title} · {time}
        </Text>
        <Text style={styles.stepName}>{name}</Text>
        <Text style={styles.stepDetail}>{detail}</Text>
      </View>
    </View>
  )
}

function PayRow({ label, value }) {
  return (
    <View style={styles.payRow}>
      <Text style={styles.payLabel}>{label}</Text>
      <Text style={styles.payValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  map: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  steps: {
    marginTop: 12,
    padding: 16,
  },
  step: {
    flexDirection: 'row',
    gap: 14,
  },
  stepIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  stepIconPickup: {
    backgroundColor: colors.black,
  },
  stepIconDropoff: {
    backgroundColor: colors.orange,
  },
  stepLine: {
    width: 2,
    height: 18,
    marginLeft: 17,
    marginVertical: 4,
    backgroundColor: colors.gray200,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  stepName: {
    marginTop: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  stepDetail: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  stat: {
    flex: 1,
    padding: 14,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.black,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  pay: {
    marginTop: 10,
    padding: 16,
    gap: 10,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  payLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  payValue: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.black,
  },
  payDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray200,
  },
  payTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  payTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.black,
  },
  payTotal: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.black,
  },
  actions: {
    gap: 10,
    marginTop: 16,
  },
  missing: {
    padding: 18,
  },
  missingText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
})
