import { Linking, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { CircleAlert, MapPin, Navigation, Store } from 'lucide-react-native'
import MapView from '../../components/MapView'
import { Card, ListRow, Screen, StatRow } from '../../components/ui'
import { useCourier } from '../../lib/courier'
import { formatEuro, formatKm, formatMinutes, formatTime } from '../../lib/format'
import { useGigs } from '../../lib/gigs'
import { useT } from '../../lib/i18n'
import { navigationAppLabel, openRoute } from '../../lib/navigationApps'
import { colors, fonts } from '../../theme'

const SUPPORT_EMAIL = 'tuki@bidrop.fi'

// Yhden keikan tiedot: reitti kartalla, nouto ja toimitus, ansion erittely.
export default function GigScreen() {
  const { id } = useLocalSearchParams()
  const t = useT()
  const { settings } = useCourier()
  const gig = useGigs().find((item) => item.id === String(id))

  if (!gig) {
    return (
      <Screen title={t('gigInfo.titleShort')}>
        <Card style={styles.missing}>
          <Text style={styles.missingText}>{t('gigInfo.notFound')}</Text>
        </Card>
      </Screen>
    )
  }

  const route = {
    from: { lat: gig.restaurant.lat, lng: gig.restaurant.lng },
    to: { lat: gig.dropoff.lat, lng: gig.dropoff.lng },
  }
  const reportProblem = () => {
    const subject = encodeURIComponent(t('gigInfo.title', { number: gig.number }))
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {})
  }

  return (
    <Screen title={t('gigInfo.title', { number: gig.number })}>
      {/* Pelkkä esikatselukuva: kosketukset menevät sivun vieritykselle. */}
      <View style={[styles.map, { pointerEvents: 'none' }]}>
        <MapView route={route} interactive={false} />
      </View>

      <Card style={styles.steps}>
        <Step
          Icon={Store}
          iconStyle={styles.stepIconPickup}
          title={t('gigInfo.pickup')}
          time={formatTime(gig.pickedUpAt)}
          name={gig.restaurant.name}
          detail={gig.restaurant.address}
        />
        <View style={styles.stepLine} />
        <Step
          Icon={MapPin}
          iconStyle={styles.stepIconDropoff}
          title={t('gigInfo.dropoff')}
          time={formatTime(gig.deliveredAt)}
          name={gig.dropoff.address}
          detail={gig.dropoff.area}
        />
      </Card>

      <StatRow
        items={[
          { label: t('common.distance'), value: formatKm(gig.distanceKm) },
          { label: t('common.duration'), value: formatMinutes(gig.durationMin) },
          { label: t('gigInfo.earning'), value: formatEuro(gig.pay.total) },
        ]}
      />

      <Card title={t('gigInfo.earning')}>
        <View style={styles.pay}>
          {gig.pay.price != null ? (
            <>
              <PayRow label={t('gigInfo.agreedPrice')} value={formatEuro(gig.pay.price)} />
              {gig.pay.price !== gig.pay.total ? (
                <PayRow label={t('gigInfo.delivoShare')} value={`−${formatEuro(gig.pay.price - gig.pay.total)}`} />
              ) : null}
            </>
          ) : (
            <PayRow label={t('gigInfo.fee')} value={formatEuro(gig.pay.total)} />
          )}
          <View style={styles.payDivider} />
          <View style={styles.payTotalRow}>
            <Text style={styles.payTotalLabel}>{t('gigInfo.total')}</Text>
            <Text style={styles.payTotal}>{formatEuro(gig.pay.total)}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <ListRow
          icon={Navigation}
          label={t('gigInfo.showRoute')}
          value={navigationAppLabel(settings.navigationApp)}
          onPress={() => openRoute(settings.navigationApp, route.from, route.to, settings.vehicle)}
        />
        <ListRow icon={CircleAlert} label={t('gigInfo.reportProblem')} onPress={reportProblem} />
      </Card>
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
    borderRadius: 16,
    overflow: 'hidden',
  },
  steps: {
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
  pay: {
    gap: 10,
    paddingBottom: 8,
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
  missing: {
    padding: 18,
  },
  missingText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
})
