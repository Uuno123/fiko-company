import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect, useRouter } from 'expo-router'
import { FileText, History, MessageSquareText, Timer, X } from 'lucide-react-native'
import ActiveGigCard from '../components/ActiveGigCard'
import BottomSheet from '../components/BottomSheet'
import MapView from '../components/MapView'
import OfferCard from '../components/OfferCard'
import SideMenu from '../components/SideMenu'
import SlideToConfirm from '../components/SlideToConfirm'
import TopBar from '../components/TopBar'
import DelivoLogo from '../components/DelivoLogo'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import { formatEuro, formatTime } from '../lib/format'
import { useGigs } from '../lib/gigs'
import { DEMAND_LEVELS, demandDetail, useAreaDemand } from '../lib/demand'
import { missingDocuments, useDocuments } from '../lib/documents'
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
// oikeita keikkatarjouksia ravintoloiden hyväksymistä tilauksista (lib/jobs.js):
// alapaneelin tilalle nousee tarjouskortti, kartalle reitti ja yläkulmaan
// Hylkää-nappi. Hyväksytty keikka etenee vaihekortilla (ActiveGigCard):
// ravintolaan -> nouto (noutokoodi) -> asiakkaalle (sijainti osoitteessa) -> valmis.
// Tarjous- ja vaihekortin voi pienentää kuten alapaneelin (CollapsibleCard).
// Vaatii kirjautumisen hyväksytyllä kuljettajatilillä. Alueen kysyntä tulee
// palvelimelta (lib/demand.js): tilaukset ja online-kuljettajat 8 km säteellä.
export default function HomeScreen() {
  const insets = useSafeAreaInsets()
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
  const showApproach = phase === 'offer' || phase === 'toRestaurant'
  // Pisteet, joilla ei ole koordinaatteja (esim. osoite ilman sijaintia), jätetään pois.
  const route =
    offer && hasCoords(offer.restaurant) && (showApproach || phase === 'atRestaurant' || phase === 'toCustomer')
      ? {
          ...(showApproach && hasCoords(offer.start) ? { start: offer.start } : {}),
          from: { lat: offer.restaurant.lat, lng: offer.restaurant.lng },
          ...(hasCoords(offer.dropoff) ? { to: { lat: offer.dropoff.lat, lng: offer.dropoff.lng } } : {}),
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
      label: 'Edellinen keikka',
      Icon: History,
      value: latestGig ? formatEuro(latestGig.pay.total) : null,
      onPress: () => router.push(latestGig ? `/gig/${latestGig.id}` : '/history'),
    },
    {
      key: 'scheduled',
      label: 'Ajastettu offline',
      Icon: Timer,
      value: offlineAt ? `klo ${formatTime(offlineAt)}` : null,
      onPress: () => router.push('/scheduled-offline'),
    },
    { key: 'support', label: 'Tuki', Icon: MessageSquareText, onPress: () => router.push('/help') },
  ]

  // Keikat jaetaan sijainnin mukaan (lähin ensin), joten ilman sijaintia ei tule tarjouksia.
  const searchingText = !location.position
    ? 'Salli sijainti, niin saat keikkoja lähelläsi.'
    : offlineAt
      ? `Etsitään keikkoja · offline klo ${formatTime(offlineAt)}`
      : 'Etsitään keikkoja lähelläsi…'

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
        title={location.address ?? 'Haetaan sijaintia…'}
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
            accessibilityLabel="Hylkää keikka"
            hitSlop={6}
          >
            <X size={18} strokeWidth={2.4} color={colors.danger} />
            <Text style={styles.declineText}>Hylkää</Text>
          </Pressable>
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
              <Text style={styles.areaLabel}>Toimitusalue</Text>
              <Text style={styles.areaName}>{location.city ?? 'Kuopio'}</Text>
              <Text style={[styles.areaInfo, demand && styles.areaInfoWithDetail]}>
                {online ? searchingText : demandLevel ? `Alueen kysyntä: ${demandLevel.label}` : 'Alueen kysyntä: ei tiedossa'}
              </Text>
              {demand ? (
                <View style={styles.demandRow}>
                  <View style={[styles.demandDot, { backgroundColor: demandLevel.color }]} />
                  <Text style={styles.demandDetail} numberOfLines={1}>
                    {online ? `${demandLevel.label} · ` : ''}
                    {demandDetail(demand)}
                  </Text>
                </View>
              ) : null}
              {!online && missingDocs.length > 0 ? (
                <DocumentsGate missing={missingDocs} latestOf={docs.latestOf} onOpen={() => router.push('/documents')} />
              ) : (
                <SlideToConfirm
                  label={online ? 'Liu’uta offline-tilaan' : 'Liu’uta online-tilaan'}
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
  const toUpload = missing.filter(({ key }) => latestOf(key)?.status !== 'pending')
  const names = toUpload.map(({ label }) => label.toLowerCase()).join(', ')
  return (
    <View style={styles.docsGate}>
      <View style={styles.docsGateHead}>
        <FileText size={20} strokeWidth={1.9} color={colors.orangeDark} />
        <Text style={styles.docsGateTitle}>{toUpload.length ? 'Dokumentit puuttuvat' : 'Dokumentit tarkastettavana'}</Text>
      </View>
      <Text style={styles.docsGateText}>
        {toUpload.length
          ? `Pääset online-tilaan, kun delivo on hyväksynyt dokumenttisi. Lataa: ${names}.`
          : 'delivo tarkastaa dokumenttisi yleensä 1–2 arkipäivässä. Pääset online-tilaan, kun ne on hyväksytty.'}
      </Text>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.docsGateButton, pressed && styles.declinePressed]}
        accessibilityRole="button"
      >
        <Text style={styles.gateButtonText}>{toUpload.length ? 'Lataa dokumentit' : 'Näytä dokumentit'}</Text>
      </Pressable>
    </View>
  )
}

// Kirjautunut, mutta tiliä ei ole hyväksytty kuljettajaksi (ei riviä couriers-taulussa).
function NotCourier({ email, error, onSignOut, topInset }) {
  return (
    <View style={[styles.screen, styles.gate, { paddingTop: topInset + 48 }]}>
      <DelivoLogo size={26} />
      <Text style={styles.gateTitle}>Tiliäsi ei ole vielä hyväksytty kuljettajaksi</Text>
      <Text style={styles.gateText}>
        Keikkoja saavat delivon hyväksymät kuljettajat. Pyydä delivoa lisäämään tilisi{email ? ` (${email})` : ''}
        {' '}kuljettajaksi.
      </Text>
      {error ? <Text style={styles.gateError}>Tekninen syy: {error}</Text> : null}
      <Pressable onPress={onSignOut} style={({ pressed }) => [styles.gateButton, pressed && styles.declinePressed]} accessibilityRole="button">
        <Text style={styles.gateButtonText}>Kirjaudu ulos</Text>
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
