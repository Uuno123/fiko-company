import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import { FileText, History, MessageSquareText, Timer, X } from 'lucide-react-native'
import ActiveGigCard from '../components/ActiveGigCard'
import BidCard from '../components/BidCard'
import BottomSheet from '../components/BottomSheet'
import MapView from '../components/MapView'
import OfferCard from '../components/OfferCard'
import SideMenu from '../components/SideMenu'
import SlideToConfirm from '../components/SlideToConfirm'
import TopBar from '../components/TopBar'
import DelivoLogo from '../components/DelivoLogo'
import { useAuth } from '../lib/auth'
import { useBidRequests } from '../lib/bids'
import { useCourier } from '../lib/courier'
import { formatEuro, formatTime } from '../lib/format'
import { useGigs } from '../lib/gigs'
import { DEMAND_LEVELS, demandDetail, useAreaDemand } from '../lib/demand'
import { missingDocuments, useDocuments } from '../lib/documents'
import { useT } from '../lib/i18n'
import { useCourierLocation } from '../lib/location'
import { navigationAppLabel, openRoute } from '../lib/navigationApps'
import { ACTIVE_PHASES, hasCoords, useCourierJobs } from '../lib/jobs'
import { colors, fonts } from '../theme'

// Kartan päällä kelluvien nappien (valikko, Hylkää) varaama korkeus.
const FLOATING_BUTTONS_HEIGHT = 56

// Päänäkymä Woltin kuljettaja-appin mallin mukaan: koko näytön kartta,
// offline-tilassa yläpalkissa kuljettajan oma katuosoite (online-tilassa
// palkki piiloutuu ja jäljelle jää valikkonappi) ja alapaneeli, jonka
// liukukytkimellä mennään online- ja offline-tilaan. Online-tilassa tulee
// lähellä olevien asiakkaiden kuljetuspyyntöjä (lib/bids.js): alapaneelin
// tilalle nousee pyyntökortti, jossa kuljettaja tarjoaa hinnan, ja yläkulmaan
// Ohita-nappi. Asiakkaan valinnan jälkeen keikka on oma. Kuljettajan
// luopuma keikka tarjotaan seuraavalle tarjouskortilla (lib/jobs.js) ja
// Hylkää-napilla. Hyväksytty keikka etenee vaihekortilla (ActiveGigCard):
// ravintolaan -> nouto (noutokoodi) -> asiakkaalle (sijainti osoitteessa) -> valmis.
// Tarjous- ja vaihekortin voi pienentää kuten alapaneelin (CollapsibleCard).
// Vaatii kirjautumisen hyväksytyllä kuljettajatilillä. Alueen kysyntä tulee
// palvelimelta (lib/demand.js): tilaukset ja online-kuljettajat 8 km säteellä.
export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const t = useT()
  const router = useRouter()
  const { status: authStatus, courier, user, error: authError, signOut } = useAuth()
  const { online, setOnline, offlineAt, settings, profile } = useCourier()
  // Online-tilaan vasta, kun pakolliset dokumentit on hyväksytty (palvelin
  // tarkistaa saman, migraatio 0053). Ennen ensimmäistä hakua ei estetä.
  const docs = useDocuments()
  const missingDocs = docs.loaded ? missingDocuments(docs.documents, profile) : []
  const [menuOpen, setMenuOpen] = useState(false)
  const [barHeight, setBarHeight] = useState(0)
  const [sheetHeight, setSheetHeight] = useState(0)
  const location = useCourierLocation()
  const latestGig = useGigs()[0]
  const jobs = useCourierJobs({
    courierId: courier?.id ?? null,
    online,
    position: location.position,
    settings,
    onForcedOffline: () => setOnline(false),
  })
  const { phase, job: offer } = jobs
  const gigActive = ACTIVE_PHASES.includes(phase) && offer
  // Kuljetuspyynnöt, kun ollaan online-tilassa ilman keikkaa (migraatio 0058).
  const bids = useBidRequests({
    courierId: courier?.id ?? null,
    enabled: online && phase === 'waiting',
    haptics: settings.haptics,
    onAccepted: jobs.adoptJob,
    onNotice: jobs.showNotice,
  })
  const request = phase === 'waiting' ? bids.current : null
  // Alueen kysyntä alapaneeliin (palvelin, migraatio 0047).
  const demand = useAreaDemand(location.position, authStatus === 'ready' && !gigActive)
  const demandLevel = demand ? (DEMAND_LEVELS[demand.level] ?? DEMAND_LEVELS.normal) : null

  if (authStatus === 'loading') return <View style={styles.screen} />
  if (authStatus === 'signed-out') return <Redirect href="/login" />
  if (authStatus === 'not-courier') {
    return <NotCourier email={user?.email} error={authError} onSignOut={signOut} topInset={insets.top} />
  }
  // Reitti kartalle: tarjouksessa ja ravintolaan ajaessa kuljettaja -> ravintola
  // -> asiakas, noudon jälkeen ravintola -> asiakas. Valmiin keikan jälkeen ei reittiä.
  const showApproach = phase === 'offer' || phase === 'awaitingRestaurant' || phase === 'toRestaurant'
  // Pisteet, joilla ei ole koordinaatteja (esim. osoite ilman sijaintia), jätetään pois.
  const route =
    offer && hasCoords(offer.restaurant) && (showApproach || phase === 'atRestaurant' || phase === 'toCustomer')
      ? {
          ...(showApproach && hasCoords(offer.start) ? { start: offer.start } : {}),
          from: { lat: offer.restaurant.lat, lng: offer.restaurant.lng },
          ...(hasCoords(offer.dropoff) ? { to: { lat: offer.dropoff.lat, lng: offer.dropoff.lng } } : {}),
        }
      : request && hasCoords(request.restaurant)
        ? {
            // Pyynnössä kohde on vain alue (noin 1 km tarkkuus).
            ...(hasCoords(location.position) ? { start: location.position } : {}),
            from: { lat: request.restaurant.lat, lng: request.restaurant.lng },
            ...(hasCoords(request.dropoff) ? { to: { lat: request.dropoff.lat, lng: request.dropoff.lng } } : {}),
          }
        : null
  // Navigoi-nappi: ensin ravintolaan, noudon jälkeen asiakkaalle.
  const navigate = () => {
    if (!offer) return
    const here = location.position ?? (phase === 'toCustomer' ? offer.restaurant : offer.start)
    const target =
      phase === 'toCustomer'
        ? { lat: offer.dropoff.lat, lng: offer.dropoff.lng, address: offer.dropoff.fullAddress || offer.dropoff.address }
        : { lat: offer.restaurant.lat, lng: offer.restaurant.lng, address: offer.restaurant.address }
    openRoute(settings.navigationApp, here, target, settings.vehicle)
  }

  // Alapaneelin rivit: oikealla lyhyt tieto (viimeisin ansio, ajastuksen kellonaika).
  const rows = [
    {
      key: 'previous',
      label: t('home.previousGig'),
      Icon: History,
      value: latestGig ? formatEuro(latestGig.pay.total) : null,
      onPress: () => router.push(latestGig ? `/gig/${latestGig.id}` : '/history'),
    },
    {
      key: 'scheduled',
      label: t('home.scheduledOffline'),
      Icon: Timer,
      value: offlineAt ? t('home.atTime', { time: formatTime(offlineAt) }) : null,
      onPress: () => router.push('/scheduled-offline'),
    },
    { key: 'support', label: t('home.support'), Icon: MessageSquareText, onPress: () => router.push('/help') },
  ]

  // Keikat jaetaan sijainnin mukaan (lähin ensin), joten ilman sijaintia ei tule tarjouksia.
  const searchingText = !location.position
    ? t('home.allowLocation')
    : offlineAt
      ? t('home.searchingUntil', { time: formatTime(offlineAt) })
      : t('home.searching')

  return (
    <View style={styles.screen}>
      {/* Kartta on aina koko näytön kokoinen palkkien alla, joten se ei hypi kun
          yläpalkki piiloutuu - vain näkyvän alueen keskikohta liukuu. */}
      <MapView
        style={StyleSheet.absoluteFill}
        dimmed={!online}
        position={location.position}
        route={route}
        // Online-tilassa yläkulmissa on valikkonappi ja tarjouksen Hylkää-nappi:
        // niiden alue jätetään reitin ja oman sijainnin keskityksen ulkopuolelle.
        topInset={online ? insets.top + FLOATING_BUTTONS_HEIGHT : barHeight}
        bottomInset={sheetHeight}
      />

      <TopBar
        title={location.address ?? t('home.locating')}
        hidden={online}
        onMenuPress={() => setMenuOpen(true)}
        onHeightChange={setBarHeight}
      />

      {phase === 'offer' && offer ? (
        <>
          <OfferCard offer={offer} onAccept={jobs.accept} onHeightChange={setSheetHeight} />
          <Pressable
            onPress={jobs.decline}
            style={({ pressed }) => [styles.decline, { top: insets.top + 10 }, pressed && styles.declinePressed]}
            accessibilityRole="button"
            accessibilityLabel={t('home.declineA11y')}
            hitSlop={6}
          >
            <X size={18} strokeWidth={2.4} color={colors.danger} />
            <Text style={styles.declineText}>{t('home.decline')}</Text>
          </Pressable>
        </>
      ) : request ? (
        <>
          <BidCard
            key={request.id}
            request={request}
            position={1}
            total={bids.queueLength}
            busy={bids.busy}
            onBid={(price) => bids.placeBid(request.id, price)}
            onWithdraw={() => bids.withdrawBid(request.id)}
            onHeightChange={setSheetHeight}
          />
          {request.myBidStatus !== 'offered' ? (
            <Pressable
              onPress={() => bids.skip(request.id)}
              style={({ pressed }) => [styles.decline, styles.skip, { top: insets.top + 10 }, pressed && styles.declinePressed]}
              accessibilityRole="button"
              accessibilityLabel={t('home.skipA11y')}
              hitSlop={6}
            >
              <X size={18} strokeWidth={2.4} color={colors.black} />
              <Text style={[styles.declineText, styles.skipText]}>{t('bid.skip')}</Text>
            </Pressable>
          ) : null}
        </>
      ) : gigActive ? (
        <ActiveGigCard
          phase={phase}
          job={offer}
          busy={jobs.busy}
          navigationLabel={navigationAppLabel(settings.navigationApp)}
          haptics={settings.haptics}
          onNavigate={navigate}
          onArrived={jobs.arrivedAtRestaurant}
          onPickUp={jobs.pickUp}
          onDeliver={jobs.deliver}
          onFinish={jobs.finish}
          onCancel={jobs.release}
          onHeightChange={setSheetHeight}
        />
      ) : (
        <BottomSheet
          onHeightChange={setSheetHeight}
          peek={
            <>
              <Text style={styles.areaLabel}>{t('home.area')}</Text>
              <Text style={styles.areaName}>{location.city ?? 'Kuopio'}</Text>
              <Text style={[styles.areaInfo, demand && styles.areaInfoWithDetail]}>
                {online
                  ? searchingText
                  : demandLevel
                    ? t('home.demand', { level: t(demandLevel.labelKey) })
                    : t('home.demandUnknown')}
              </Text>
              {demand ? (
                <View style={styles.demandRow}>
                  <View style={[styles.demandDot, { backgroundColor: demandLevel.color }]} />
                  <Text style={styles.demandDetail} numberOfLines={1}>
                    {online ? `${t(demandLevel.labelKey)} · ` : ''}
                    {demandDetail(demand, t)}
                  </Text>
                </View>
              ) : null}
              {!online && missingDocs.length > 0 ? (
                <DocumentsGate missing={missingDocs} latestOf={docs.latestOf} onOpen={() => router.push('/documents')} />
              ) : (
                <SlideToConfirm
                  label={online ? t('home.goOffline') : t('home.goOnline')}
                  color={online ? colors.black : colors.orange}
                  onConfirm={() => setOnline(!online)}
                  haptics={settings.haptics}
                />
              )}
            </>
          }
        >
          <View style={styles.rows}>
            {rows.map(({ key, label, Icon, value, onPress }) => (
              <Pressable
                key={key}
                onPress={onPress}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                accessibilityRole="button"
              >
                <Icon size={22} strokeWidth={1.9} color={colors.black} />
                <Text style={styles.rowLabel}>{label}</Text>
                {value ? <Text style={styles.rowValue}>{value}</Text> : null}
              </Pressable>
            ))}
          </View>
        </BottomSheet>
      )}

      {/* Lyhyt ilmoitus, esim. "Keikka ehti mennä toiselle kuljettajalle". */}
      {jobs.notice ? (
        <View style={[styles.notice, { top: insets.top + FLOATING_BUTTONS_HEIGHT + 8 }]} accessibilityLiveRegion="polite">
          <Text style={styles.noticeText}>{jobs.notice.text}</Text>
        </View>
      ) : null}

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(path) => {
          setMenuOpen(false)
          router.push(path)
        }}
      />
    </View>
  )
}

// Pakollisia dokumentteja ei ole hyväksytty: liukukytkimen tilalla kerrotaan,
// mitä puuttuu, tai että delivo tarkastaa jo lähetettyjä.
function DocumentsGate({ missing, latestOf, onOpen }) {
  const t = useT()
  const toUpload = missing.filter(({ key }) => latestOf(key)?.status !== 'pending')
  const names = toUpload.map(({ key }) => t(`doc.${key}`)).join(', ')
  return (
    <View style={styles.docsGate}>
      <View style={styles.docsGateHead}>
        <FileText size={20} strokeWidth={1.9} color={colors.orangeDark} />
        <Text style={styles.docsGateTitle}>{toUpload.length ? t('gate.docsMissing') : t('gate.docsPending')}</Text>
      </View>
      <Text style={styles.docsGateText}>
        {toUpload.length ? t('gate.docsMissingText', { names }) : t('gate.docsPendingText')}
      </Text>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.docsGateButton, pressed && styles.declinePressed]}
        accessibilityRole="button"
      >
        <Text style={styles.gateButtonText}>{toUpload.length ? t('gate.upload') : t('gate.show')}</Text>
      </Pressable>
    </View>
  )
}

// Kirjautunut, mutta tiliä ei ole hyväksytty kuljettajaksi (ei riviä couriers-taulussa).
function NotCourier({ email, error, onSignOut, topInset }) {
  const t = useT()
  return (
    <View style={[styles.screen, styles.gate, { paddingTop: topInset + 48 }]}>
      <DelivoLogo size={26} />
      <Text style={styles.gateTitle}>{t('gate.notCourierTitle')}</Text>
      <Text style={styles.gateText}>{t('gate.notCourierText', { email: email ? ` (${email})` : '' })}</Text>
      {error ? <Text style={styles.gateError}>{t('gate.technical', { error })}</Text> : null}
      <Pressable onPress={onSignOut} style={({ pressed }) => [styles.gateButton, pressed && styles.declinePressed]} accessibilityRole="button">
        <Text style={styles.gateButtonText}>{t('menu.signOut')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  gate: {
    paddingHorizontal: 24,
  },
  gateTitle: {
    marginTop: 28,
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.black,
  },
  gateText: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  gateError: {
    marginTop: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  gateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    marginTop: 28,
    borderRadius: 27,
    backgroundColor: colors.black,
  },
  gateButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#ffffff',
  },
  docsGate: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.orangeSoft,
  },
  docsGateHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docsGateTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.black,
  },
  docsGateText: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
  },
  docsGateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: colors.black,
  },
  notice: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '88%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.black,
    boxShadow: '0 4px 16px rgba(20, 21, 15, 0.25)',
  },
  noticeText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    textAlign: 'center',
    color: '#ffffff',
  },
  // Hylkää-nappi kartan oikeassa yläkulmassa valikkonapin tasalla (Woltin "Decline").
  decline: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    boxShadow: '0 3px 12px rgba(20, 21, 15, 0.22)',
  },
  skip: {
    borderColor: colors.gray200,
  },
  skipText: {
    color: colors.black,
  },
  declinePressed: {
    transform: [{ scale: 0.96 }],
  },
  declineText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.danger,
  },
  areaLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  areaName: {
    marginTop: 2,
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.6,
    color: colors.black,
  },
  areaInfo: {
    marginTop: 2,
    marginBottom: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  areaInfoWithDetail: {
    marginBottom: 0,
  },
  demandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  demandDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  demandDetail: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  rows: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  rowPressed: {
    backgroundColor: colors.gray50,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  rowValue: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textMuted,
  },
})
