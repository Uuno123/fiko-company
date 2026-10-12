import { useEffect, useState } from 'react'
import { ActivityIndicator, Keyboard, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, House, MessageSquareText, Navigation, Phone, Utensils } from 'lucide-react-native'
import CollapsibleCard from './CollapsibleCard'
import SlideToConfirm from './SlideToConfirm'
import { formatEuro, formatKm, formatMinutes, formatTime } from '../lib/format'
import { jobSchedule } from '../lib/jobs'
// Näppäimistön korkeus, jotta noutokoodin kenttä ei jää sen alle (kortti on ruudun alareunassa).
import { useKeyboardHeight } from '../lib/keyboard'
import { colors, fonts } from '../theme'

const SUPPORT_EMAIL = 'tuki@delivo.fi'

// Vaiheet edistymispalkkia varten.
const STEPS = ['toRestaurant', 'atRestaurant', 'toCustomer']

function useNow() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

// "8 min", alle minuutin "45 s"; myöhässä minuutteina.
function durationText(ms) {
  const seconds = Math.ceil(Math.abs(ms) / 1000)
  return seconds < 60 && ms >= 0 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`
}

// Aikalaskuri: musta, viimeiset 2 min oranssi, myöhässä punainen.
function DeadlinePill({ remainingMs, label = 'aikaa', doneLabel }) {
  const late = remainingMs < 0
  if (doneLabel && late) {
    return (
      <View style={[styles.pill, styles.pillDone]}>
        <Check size={20} strokeWidth={2.6} color="#ffffff" />
        <Text style={styles.pillLabel}>{doneLabel}</Text>
      </View>
    )
  }
  const hurry = !late && remainingMs < 2 * 60000
  const value = durationText(remainingMs)
  return (
    <View
      style={[styles.pill, hurry && styles.pillHurry, late && styles.pillLate]}
      accessible
      accessibilityLabel={late ? `Myöhässä ${value}` : `${label} ${value}`}
    >
      <Text style={styles.pillValue}>{late ? `+${value}` : value}</Text>
      <Text style={styles.pillLabel}>{late ? 'myöhässä' : label}</Text>
    </View>
  )
}

function Progress({ phase }) {
  const index = STEPS.indexOf(phase)
  return (
    <View style={styles.progress}>
      {STEPS.map((step, i) => (
        <View key={step} style={[styles.progressStep, i <= index && styles.progressStepDone]} />
      ))}
    </View>
  )
}

function Place({ Icon, iconStyle, title, detail, note }) {
  return (
    <View style={styles.place}>
      <View style={[styles.placeIcon, iconStyle]}>
        <Icon size={16} strokeWidth={2.2} color="#ffffff" />
      </View>
      <View style={styles.placeText}>
        <Text style={styles.placeTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.placeDetail} numberOfLines={1}>
          {detail}
        </Text>
        {note ? <Text style={styles.placeNote}>{note}</Text> : null}
      </View>
    </View>
  )
}

function NavigateButton({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navigate, pressed && styles.navigatePressed]}
      accessibilityRole="button"
    >
      <Navigation size={18} strokeWidth={2.2} color={colors.black} />
      <Text style={styles.navigateText}>Navigoi · {label}</Text>
    </Pressable>
  )
}

function TextButton({ title, onPress, Icon, disabled = false }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.textButton} accessibilityRole="button" hitSlop={6}>
      {Icon ? <Icon size={15} strokeWidth={2} color={colors.textMuted} /> : null}
      <Text style={styles.textButtonText}>{title}</Text>
    </Pressable>
  )
}

// Ravintolan nelinumeroinen noutokoodi ja vahvistusnappi. onSubmit palauttaa
// virhetekstin tai null.
function CodeConfirm({ label, hint, buttonTitle, busy, onSubmit }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const ready = code.length === 4 && !busy

  const submit = async () => {
    if (!ready) return
    Keyboard.dismiss()
    const message = await onSubmit(code)
    setError(message ?? '')
    if (message) setCode('')
  }

  return (
    <View style={styles.codeBlock}>
      <Text style={styles.codeLabel}>{label}</Text>
      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={(value) => {
          setCode(value.replace(/\D/g, '').slice(0, 4))
          setError('')
        }}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="• • • •"
        placeholderTextColor={colors.gray400}
        textAlign="center"
        accessibilityLabel={label}
        onSubmitEditing={submit}
      />
      {error ? <Text style={styles.codeError}>{error}</Text> : <Text style={styles.codeHint}>{hint}</Text>}
      <Pressable
        onPress={submit}
        disabled={!ready}
        style={({ pressed }) => [styles.confirm, !ready && styles.confirmDisabled, pressed && styles.confirmPressed]}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.confirmText}>{buttonTitle}</Text>}
      </Pressable>
    </View>
  )
}

// Hyväksytyn keikan vaiheet Woltin kuljettaja-appin tapaan:
// 1. Aja ravintolaan (laskuri saapumiseen) -> "Saavuin ravintolaan"
// 2. Nouda tilaus: ravintolan noutokoodi todisteeksi (tai ravintola merkitsee
//    tilauksen luovutetuksi, jolloin nouto kuittautuu itsestään)
// 3. Aja asiakkaalle -> "Toimitettu": todisteena sijainti osoitteessa
//    (tietokanta tarkistaa; asiakkaalla ei ole koodia)
// 4. Keikka valmis: ansio ja ajoissa/myöhässä.
// Kortin voi pienentää kuten alapaneelin: vaihe, aikalaskuri ja pääpainike jäävät
// näkyviin, osoitteet ja muut tiedot piiloutuvat. Seuraava vaihe avaa kortin.
export default function ActiveGigCard({
  phase,
  job,
  busy,
  navigationLabel,
  haptics,
  onNavigate,
  onArrived,
  onPickUp,
  onDeliver,
  onFinish,
  onCancel,
  onHeightChange,
}) {
  const insets = useSafeAreaInsets()
  const now = useNow()
  const keyboardHeight = useKeyboardHeight()
  const schedule = jobSchedule(job)
  const [deliverError, setDeliverError] = useState('')

  useEffect(() => {
    setDeliverError('')
  }, [job.id, phase])

  const confirmDelivery = async () => setDeliverError((await onDeliver()) ?? '')
  const cancelButton = <TextButton title="Peru keikka" onPress={onCancel} disabled={busy} />

  let header = null
  let details = null
  let footer = null
  if (phase === 'toRestaurant') {
    const remaining = schedule.arriveBy.getTime() - now
    header = (
      <TitleRow
        phase={phase}
        step="Vaihe 1/3"
        title="Aja ravintolaan"
        subtitle={`${remaining < 0 ? 'Saapumisaika oli' : 'Saavu viimeistään'} klo ${formatTime(schedule.arriveBy)}`}
        late={remaining < 0}
        pill={<DeadlinePill remainingMs={remaining} />}
      />
    )
    details = (
      <>
        <View style={styles.places}>
          <Place
            Icon={Utensils}
            iconStyle={styles.iconPickup}
            title={job.restaurant.name}
            detail={job.approachKnown ? `${job.restaurant.address} · ${formatKm(job.approachKm)}` : job.restaurant.address}
            note={`Ruoka valmis klo ${formatTime(schedule.foodReadyAt)}`}
          />
          <View style={styles.placeLine} />
          <Place
            Icon={House}
            iconStyle={styles.iconDropoff}
            title={`Toimitus viimeistään klo ${formatTime(schedule.deliverBy)}`}
            detail={`${job.dropoff.area} · ${job.dropoff.address}`}
          />
        </View>
        <NavigateButton label={navigationLabel} onPress={onNavigate} />
      </>
    )
    footer = (
      <>
        <View style={styles.slider}>
          <SlideToConfirm key="arrived" label="Saavuin ravintolaan" color={colors.orange} onConfirm={onArrived} haptics={haptics} />
        </View>
        {cancelButton}
      </>
    )
  } else if (phase === 'atRestaurant') {
    const untilReady = schedule.foodReadyAt.getTime() - now
    header = (
      <TitleRow
        phase={phase}
        step="Vaihe 2/3"
        title="Nouda tilaus"
        subtitle={`${job.restaurant.name} · tilaus ${job.orderNumber}`}
        pill={<DeadlinePill remainingMs={untilReady} label="valmiiksi" doneLabel="valmis" />}
      />
    )
    details = (
      <View style={styles.order}>
        <Text style={styles.orderLabel}>Tilaus</Text>
        <Text style={styles.orderNumber}>{job.orderNumber}</Text>
        <Text style={styles.orderMeta}>
          {job.itemCount ? `${job.itemCount} ${job.itemCount === 1 ? 'tuote' : 'tuotetta'} · ` : ''}
          {job.customerName} · tarkista että kaikki on mukana
        </Text>
      </View>
    )
    footer = (
      <>
        <CodeConfirm
          label="Ravintolan noutokoodi"
          hint="Kysy koodi henkilökunnalta. Jos ravintola merkitsee tilauksen luovutetuksi, nouto kuittautuu itsestään."
          buttonTitle="Vahvista nouto"
          busy={busy}
          onSubmit={onPickUp}
        />
        {cancelButton}
      </>
    )
  } else if (phase === 'toCustomer') {
    const remaining = schedule.deliverBy.getTime() - now
    header = (
      <TitleRow
        phase={phase}
        step="Vaihe 3/3"
        title="Aja asiakkaalle"
        subtitle={`${remaining < 0 ? 'Toimitusaika oli' : 'Toimita viimeistään'} klo ${formatTime(schedule.deliverBy)}`}
        late={remaining < 0}
        pill={<DeadlinePill remainingMs={remaining} />}
      />
    )
    details = (
      <>
        <View style={styles.places}>
          <Place
            Icon={House}
            iconStyle={styles.iconDropoff}
            title={job.dropoff.address}
            detail={`${job.customerName} · ${job.dropoff.area}${job.deliveryKm ? ` · ${formatKm(job.deliveryKm)}` : ''}`}
          />
        </View>
        {job.instructions ? (
          <View style={styles.instructions}>
            <Text style={styles.instructionsLabel}>Asiakkaan ohje</Text>
            <Text style={styles.instructionsText}>{job.instructions}</Text>
          </View>
        ) : null}
        <View style={styles.actionRow}>
          <View style={styles.actionGrow}>
            <NavigateButton label={navigationLabel} onPress={onNavigate} />
          </View>
          {job.customerPhone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${job.customerPhone}`).catch(() => {})}
              style={({ pressed }) => [styles.call, pressed && styles.navigatePressed]}
              accessibilityRole="button"
              accessibilityLabel="Soita asiakkaalle"
            >
              <Phone size={18} strokeWidth={2.2} color={colors.black} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.deliverHint}>Liu’uta kun tilaus on luovutettu tai jätetty ovelle - sijaintisi tarkistetaan.</Text>
        <TextButton
          title="Ongelma toimituksessa? Ota yhteyttä tukeen"
          Icon={MessageSquareText}
          onPress={() =>
            Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Tilaus ${job.orderNumber}`)}`).catch(() => {})
          }
        />
      </>
    )
    footer = (
      <>
        {deliverError ? <Text style={styles.deliverError}>{deliverError}</Text> : null}
        <View style={styles.slider}>
          {busy ? (
            <View style={styles.checking} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.black} />
              <Text style={styles.checkingText}>Tarkistetaan sijaintia…</Text>
            </View>
          ) : (
            <SlideToConfirm key="delivered" label="Toimitettu" color={colors.orange} onConfirm={confirmDelivery} haptics={haptics} />
          )}
        </View>
      </>
    )
  } else if (phase === 'completed') {
    const deliveredAt = job.deliveredAt ?? now
    const lateMin = Math.round((deliveredAt - schedule.deliverBy.getTime()) / 60000)
    const durationMin = Math.max(1, Math.round((deliveredAt - (job.acceptedAt ?? deliveredAt)) / 60000))
    header = (
      <View style={styles.done}>
        <View style={styles.doneIcon}>
          <Check size={34} strokeWidth={2.6} color="#ffffff" />
        </View>
        <Text style={styles.doneTitle}>Keikka valmis!</Text>
        <Text style={styles.doneEarnings}>+{formatEuro(job.pay.total + (job.tip ?? 0))}</Text>
        <View style={styles.chips}>
          <View style={[styles.chip, lateMin > 0 ? styles.chipLate : styles.chipOk]}>
            <Text style={[styles.chipText, lateMin > 0 ? styles.chipTextLate : styles.chipTextOk]}>
              {lateMin > 0 ? `Myöhässä ${lateMin} min` : 'Toimitettu ajoissa'}
            </Text>
          </View>
        </View>
        <View style={styles.doneStats}>
          <View style={styles.doneStat}>
            <Text style={styles.doneStatValue}>{formatKm(job.routeKm)}</Text>
            <Text style={styles.doneStatLabel}>Matka</Text>
          </View>
          <View style={styles.doneStatDivider} />
          <View style={styles.doneStat}>
            <Text style={styles.doneStatValue}>{formatMinutes(durationMin)}</Text>
            <Text style={styles.doneStatLabel}>Kesto</Text>
          </View>
        </View>
        <Pressable onPress={onFinish} style={({ pressed }) => [styles.finish, pressed && styles.finishPressed]} accessibilityRole="button">
          <Text style={styles.finishText}>Jatka keikkojen hakua</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <CollapsibleCard
      header={header}
      footer={footer}
      expandKey={phase}
      onHeightChange={onHeightChange}
      // Koodikenttä ei jää näppäimistön alle (kortti on ruudun alareunassa).
      style={keyboardHeight ? { bottom: keyboardHeight } : null}
      paddingBottom={keyboardHeight ? 14 : insets.bottom + 10}
    >
      {details}
    </CollapsibleCard>
  )
}

// Edistymispalkki, vaihe ja otsikko sekä aikalaskuri - näkyy myös pienennettynä.
function TitleRow({ phase, step, title, subtitle, late = false, pill }) {
  return (
    <>
      <Progress phase={phase} />
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={styles.stepLabel}>{step}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.subtitle, late && styles.subtitleLate]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {pill}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  progressStep: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray200,
  },
  progressStepDone: {
    backgroundColor: colors.orange,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleText: {
    flex: 1,
  },
  stepLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 27,
    letterSpacing: -0.6,
    color: colors.black,
  },
  subtitle: {
    marginTop: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  subtitleLate: {
    color: colors.danger,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.black,
  },
  pillHurry: {
    backgroundColor: colors.orange,
  },
  pillLate: {
    backgroundColor: colors.danger,
  },
  pillDone: {
    backgroundColor: colors.open,
  },
  pillValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: '#ffffff',
  },
  pillLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  places: {
    marginTop: 14,
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
  iconPickup: {
    backgroundColor: colors.black,
  },
  iconDropoff: {
    backgroundColor: colors.orange,
  },
  placeLine: {
    width: 2,
    height: 10,
    marginLeft: 15,
    marginVertical: 3,
    backgroundColor: colors.gray200,
  },
  placeText: {
    flex: 1,
  },
  placeTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  placeDetail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  placeNote: {
    marginTop: 2,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.orangeDark,
  },
  order: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  orderLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  orderNumber: {
    marginTop: 2,
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: 0.5,
    color: colors.black,
  },
  orderMeta: {
    paddingHorizontal: 12,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  codeBlock: {
    marginTop: 14,
  },
  codeLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  codeInput: {
    height: 58,
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: 10,
    color: colors.black,
  },
  codeHint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  codeError: {
    marginTop: 6,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  confirm: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginTop: 10,
    borderRadius: 28,
    backgroundColor: colors.orange,
  },
  confirmDisabled: {
    backgroundColor: colors.gray200,
  },
  confirmPressed: {
    transform: [{ scale: 0.98 }],
  },
  confirmText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#ffffff',
  },
  deliverHint: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  deliverError: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  checking: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray100,
  },
  checkingText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  instructions: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.orangeSoft,
  },
  instructionsLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.orangeDark,
  },
  instructionsText: {
    marginTop: 2,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.black,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  actionGrow: {
    flex: 1,
  },
  call: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.surface,
  },
  navigate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.surface,
  },
  navigatePressed: {
    backgroundColor: colors.gray50,
  },
  navigateText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.black,
  },
  slider: {
    marginTop: 14,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  textButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
  },
  done: {
    alignItems: 'center',
    paddingTop: 6,
  },
  doneIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.open,
  },
  doneTitle: {
    marginTop: 12,
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.black,
  },
  doneEarnings: {
    marginTop: 2,
    fontFamily: fonts.display,
    fontSize: 44,
    letterSpacing: -1.2,
    color: colors.black,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  chipOk: {
    backgroundColor: '#e8f6ec',
  },
  chipLate: {
    backgroundColor: '#fdecef',
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  chipTextOk: {
    color: '#1f7a37',
  },
  chipTextLate: {
    color: colors.danger,
  },
  doneStats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.gray50,
  },
  doneStat: {
    flex: 1,
    alignItems: 'center',
  },
  doneStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.gray200,
  },
  doneStatValue: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.black,
  },
  doneStatLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  finish: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 28,
    backgroundColor: colors.black,
  },
  finishPressed: {
    transform: [{ scale: 0.98 }],
  },
  finishText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#ffffff',
  },
})
