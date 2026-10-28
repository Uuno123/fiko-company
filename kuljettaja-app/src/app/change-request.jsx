import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ArrowDown,
  Building,
  Camera,
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  Image as ImageIcon,
  Landmark,
  Mail,
  MapPin,
  ReceiptText,
  User,
} from 'lucide-react-native'
import ChoiceSheet from '../components/ChoiceSheet'
import { Button, Card, Group, Screen, StatusPill } from '../components/ui'
import { vehicleIcon } from '../components/vehicleIcons'
import { useAuth } from '../lib/auth'
import {
  CHANGE_FIELDS,
  changeFieldLabel,
  changeRequestErrorText,
  displayChangeValue,
  requiredDocumentFor,
  submitChangeRequest,
  useChangeRequests,
} from '../lib/changeRequests'
import { BILLING_METHODS, VEHICLES, billingMethodLabel, useCourier, vehicleLabel } from '../lib/courier'
import {
  documentErrorText,
  documentStatusLabel,
  documentTypeLabel,
  pickDocumentImage,
  uploadDocument,
  useDocuments,
} from '../lib/documents'
import { formatShortDate, formatTime } from '../lib/format'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

// Muutospyyntö tarkistettuun tietoon (migraatio 0051). Ylhäällä kentän ikoni ja
// nimi, sen alla "Nykyinen -> Uusi" -kortti, jonka alaosaan uusi arvo kirjoitetaan
// tai valitaan korteista. Perustelu on vapaaehtoinen, ja tarvittaessa liite
// (ajokortti tai pankkitodiste) lisätään suoraan pyyntöön. Lähetysnappi on
// kiinni alareunassa. Kun pyyntö on lähetetty tai kesken, näkymä näyttää
// pyydetyn arvon ja etenemisen aikajanana: lähetetty -> tarkastuksessa -> voimassa.

const normalizeIban = (value) => value.replace(/\s+/g, '').toUpperCase()

// Samat ikonit kuin Profiilin ja Laskutustietojen riveillä.
const FIELD_ICONS = { name: User, email: Mail, city: MapPin, business_id: Building, billing_method: ReceiptText, iban: Landmark }
const BILLING_ICONS = { own_company: Building }

const FOCUS_BORDER = '#b9bcb3'
const LINE = '#ececec'

// Uuden arvon tarkistus ennen lähetystä. Palauttaa virheen tai tyhjän.
function validate(field, value, t) {
  const trimmed = value.trim()
  if (!trimmed) return t('change.errEmpty')
  if (field === 'name' && trimmed.length < 2) return t('change.errName')
  if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return t('change.errEmail')
  if (field === 'business_id' && !/^\d{7}-\d$/.test(trimmed)) return t('change.errBusinessId')
  if (field === 'iban' && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalizeIban(trimmed))) return t('change.errIban')
  return ''
}

export default function ChangeRequestScreen() {
  const router = useRouter()
  const t = useT()
  const { field: fieldParam } = useLocalSearchParams()
  const field = CHANGE_FIELDS[fieldParam] ? fieldParam : 'name'
  const { courier } = useAuth()
  const { profile } = useCourier()
  const { loaded, pendingFor, rejectedFor, reload } = useChangeRequests()
  const pending = pendingFor(field)
  const rejected = rejectedFor(field)

  const current = {
    name: profile.name,
    email: profile.email,
    vehicle: profile.vehicle,
    city: profile.city,
    business_id: profile.businessId,
    billing_method: profile.billingMethod,
    iban: profile.iban,
  }[field]

  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [focus, setFocus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const fieldLabel = changeFieldLabel(field)
  const icon = field === 'vehicle' ? vehicleIcon(current) : FIELD_ICONS[field]

  const submit = async () => {
    const problem = validate(field, value, t)
    if (problem) return setError(problem)
    const newValue = field === 'iban' ? normalizeIban(value) : value.trim()
    if (current && String(newValue).toLowerCase() === String(current).toLowerCase()) {
      return setError(t('change.errSame'))
    }
    setBusy(true)
    setError('')
    try {
      await submitChangeRequest(courier.id, field, newValue, reason.trim())
      // Haetaan pyyntö heti, jolloin näkymä vaihtuu tilan aikajanaan.
      await reload()
      setSent(true)
    } catch (err) {
      setError(changeRequestErrorText(err))
    } finally {
      setBusy(false)
    }
  }

  // Ennen ensimmäistä hakua ei tiedetä, onko pyyntö jo kesken.
  if (!loaded) {
    return (
      <Screen title={t('change.title')}>
        <ActivityIndicator style={styles.loading} color={colors.black} />
      </Screen>
    )
  }

  // Lähetetty tai kesken oleva pyyntö: pyydetty arvo ja eteneminen, liite voi vielä puuttua.
  if (pending) {
    return (
      <Screen title={t('change.title')}>
        <Hero icon={icon} title={fieldLabel}>
          <StatusPill tone="pending" icon={Clock}>
            {t('status.pending')}
          </StatusPill>
        </Hero>
        {sent ? <Banner tone="success" icon={CircleCheck} title={t('change.sentTitle')} /> : null}
        <Compare currentText={displayChangeValue(field, current)} newLabel={t('change.requestedValue')}>
          <Text style={styles.compareNew} numberOfLines={1}>
            {displayChangeValue(field, pending.new_value)}
          </Text>
        </Compare>
        <Progress request={pending} />
        <RequiredDocument type={requiredDocumentFor(field, pending.new_value)} />
      </Screen>
    )
  }

  // Lähetys onnistui, mutta pyyntö ei vielä näy listassa (hidas yhteys).
  if (sent) {
    return (
      <Screen title={t('change.title')} footer={<Button title={t('common.back')} onPress={() => router.back()} />}>
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <Check size={34} strokeWidth={2.6} color="#1a8a4a" />
          </View>
          <Text style={styles.doneTitle}>{t('change.sentTitle')}</Text>
          <Text style={styles.doneText}>{t('change.sentText')}</Text>
        </View>
      </Screen>
    )
  }

  // Nykyinen arvo ei ole vaihtoehto: muutospyyntö samaan arvoon on turha.
  const choices = (
    field === 'vehicle'
      ? VEHICLES.map(({ key }) => ({ key, label: vehicleLabel(key), icon: vehicleIcon(key) }))
      : field === 'billing_method'
        ? BILLING_METHODS.map(({ key }) => ({ key, label: billingMethodLabel(key), icon: BILLING_ICONS[key] ?? ReceiptText }))
        : null
  )?.filter((choice) => choice.key !== current)
  const requiredDoc = requiredDocumentFor(field, value)
  const newLabel = t(`change.new.${field}`)
  const chosen = choices?.find((choice) => choice.key === value)

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        title={t('change.title')}
        footer={
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={busy ? t('change.sending') : t('change.send')} onPress={submit} disabled={busy || !value} />
          </>
        }
      >
        <Hero icon={icon} title={fieldLabel}>
          <Text style={styles.heroHint}>{t('change.heroHint')}</Text>
        </Hero>

        {rejected ? (
          <Banner
            tone="danger"
            icon={CircleAlert}
            title={t('change.rejectedBanner')}
            text={rejected.admin_note ? t('change.rejectedReason', { note: rejected.admin_note }) : t('change.rejectedNoReason')}
          />
        ) : null}

        <Compare currentText={displayChangeValue(field, current)} newLabel={newLabel} focused={focus === 'value'}>
          {choices ? (
            <Text style={[styles.compareNew, !chosen && styles.compareNewEmpty]} numberOfLines={1}>
              {chosen ? chosen.label : t('change.choose')}
            </Text>
          ) : (
            <TextInput
              style={styles.valueInput}
              value={value}
              onChangeText={(next) => {
                setValue(next)
                setError('')
              }}
              onFocus={() => setFocus('value')}
              onBlur={() => setFocus(null)}
              autoCapitalize={field === 'name' || field === 'city' ? 'words' : field === 'iban' ? 'characters' : 'none'}
              keyboardType={field === 'email' ? 'email-address' : 'default'}
              placeholder={
                {
                  name: t('change.phName'),
                  email: t('change.phEmail'),
                  city: t('change.phCity'),
                  business_id: '1234567-8',
                  iban: 'FI00 1234 5600 0007 85',
                }[field]
              }
              placeholderTextColor={colors.gray400}
              accessibilityLabel={newLabel}
            />
          )}
        </Compare>

        {choices ? (
          <View style={styles.options} accessibilityRole="radiogroup">
            {choices.map((choice) => (
              <Option
                key={choice.key}
                icon={choice.icon}
                label={choice.label}
                selected={value === choice.key}
                onPress={() => {
                  setValue(choice.key)
                  setError('')
                }}
              />
            ))}
          </View>
        ) : null}

        <Group title={`${t('change.reason')} ${t('change.optional')}`}>
          <TextInput
            style={[styles.reason, focus === 'reason' && styles.focused]}
            value={reason}
            onChangeText={setReason}
            onFocus={() => setFocus('reason')}
            onBlur={() => setFocus(null)}
            multiline
            placeholder={t('change.reasonPlaceholder')}
            placeholderTextColor={colors.gray400}
            accessibilityLabel={t('change.reason')}
          />
        </Group>

        {requiredDoc ? <RequiredDocument type={requiredDoc} /> : null}
      </Screen>
    </KeyboardAvoidingView>
  )
}

// Yläosa: kentän ikoni oranssissa pallossa, kentän nimi ja sen alla lyhyt ohje tai tila.
function Hero({ icon: Icon, title, children }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroIcon}>{Icon ? <Icon size={28} strokeWidth={1.8} color={colors.orange} /> : null}</View>
      <Text style={styles.heroTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  )
}

// Nykyinen arvo ylhäällä harmaalla ja uusi alhaalla, välissä nuoli: muutos
// näkyy yhdellä silmäyksellä. focused: uuden arvon kenttä on aktiivinen.
function Compare({ currentText, newLabel, focused = false, children }) {
  const t = useT()
  return (
    <View style={[styles.compare, focused && styles.focused]}>
      <View style={[styles.compareHalf, styles.compareHalfCurrent]}>
        <Text style={styles.compareLabel}>{t('change.current')}</Text>
        <Text style={styles.compareCurrent} numberOfLines={1}>
          {currentText}
        </Text>
      </View>
      <View style={styles.compareSeam}>
        <View style={styles.compareArrow}>
          <ArrowDown size={16} strokeWidth={2.4} color={colors.orange} />
        </View>
      </View>
      <View style={styles.compareHalf}>
        <Text style={styles.compareLabel}>{newLabel}</Text>
        {children}
      </View>
    </View>
  )
}

// Valintakortti (kulkuneuvo, laskutustapa): ikoni, nimi ja pyöreä valintamerkki.
function Option({ icon: Icon, label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={label}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Icon size={22} strokeWidth={1.8} color={selected ? colors.orange : colors.black} />
      </View>
      <Text style={styles.optionLabel} numberOfLines={2}>
        {label}
      </Text>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <Check size={13} strokeWidth={3} color="#ffffff" /> : null}</View>
    </Pressable>
  )
}

const BANNER_TONES = {
  success: { background: '#e8f6ee', color: '#1a8a4a' },
  danger: { background: '#fdecef', color: '#c2334a' },
}

// Ilmoitus (lähetetty / edellinen pyyntö hylättiin).
function Banner({ tone, icon: Icon, title, text }) {
  const { background, color } = BANNER_TONES[tone]
  return (
    <View style={[styles.banner, { backgroundColor: background }]} accessibilityLiveRegion="polite">
      <Icon size={20} strokeWidth={2} color={color} />
      <View style={styles.bannerText}>
        <Text style={[styles.bannerTitle, { color }]}>{title}</Text>
        {text ? <Text style={styles.bannerBody}>{text}</Text> : null}
      </View>
    </View>
  )
}

// Kesken olevan pyynnön eteneminen aikajanana.
function Progress({ request }) {
  const t = useT()
  const sentAt = new Date(request.created_at)
  const steps = [
    {
      state: 'done',
      title: t('change.step.sent'),
      text: t('change.dateTime', { date: formatShortDate(sentAt), time: formatTime(sentAt) }),
    },
    { state: 'current', title: t('change.step.review'), text: t('change.step.reviewText') },
    { state: 'todo', title: t('change.step.done'), text: t('change.step.doneText') },
  ]
  const dotStyle = { done: styles.stepDotDone, current: styles.stepDotCurrent, todo: styles.stepDotTodo }

  return (
    <Card title={t('change.progress')} style={styles.progress}>
      {steps.map((step, index) => (
        <View key={step.state} style={styles.step}>
          <View style={styles.stepRail}>
            <View style={[styles.stepDot, dotStyle[step.state]]}>
              {step.state === 'done' ? <Check size={13} strokeWidth={3} color="#ffffff" /> : null}
              {step.state === 'current' ? <View style={styles.stepDotInner} /> : null}
            </View>
            {index < steps.length - 1 ? <View style={[styles.stepLine, step.state === 'done' && styles.stepLineDone]} /> : null}
          </View>
          <View style={styles.stepText}>
            <Text style={[styles.stepTitle, step.state === 'todo' && styles.stepTitleTodo]}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.text}</Text>
          </View>
        </View>
      ))}
    </Card>
  )
}

const DOCUMENT_TONES = { approved: 'success', pending: 'pending', rejected: 'danger', missing: 'neutral' }

// Muutoksen hyväksymiseen tarvittava dokumentti suoraan pyynnössä. Puuttuva tai
// hylätty: katkoviivainen latausruutu (kamera tai galleria, tallentuu
// Dokumentteihin). Ladattu: dokumentin tila.
function RequiredDocument({ type }) {
  const t = useT()
  const { courier } = useAuth()
  const { latestOf, reload } = useDocuments()
  const [picking, setPicking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  if (!type) return null

  const latest = latestOf(type)
  const status = latest?.status ?? 'missing'
  const docName = t(`doc.${type}`)
  const canUpload = status === 'missing' || status === 'rejected'

  const pick = async (source) => {
    setPicking(false)
    setError('')
    try {
      const asset = await pickDocumentImage(source)
      if (!asset) return
      setUploading(true)
      await uploadDocument(courier.id, type, asset)
      await reload()
    } catch (err) {
      setError(documentErrorText(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Group title={t('change.attachTitle')}>
      {canUpload ? (
        <Pressable
          onPress={() => setPicking(true)}
          disabled={uploading}
          style={({ pressed }) => [styles.upload, pressed && styles.uploadPressed]}
          accessibilityRole="button"
          accessibilityLabel={status === 'rejected' ? t('change.attachReplace') : t('change.attachAdd', { doc: docName })}
        >
          <View style={styles.uploadIcon}>
            {uploading ? <ActivityIndicator color={colors.orange} /> : <Camera size={22} strokeWidth={1.9} color={colors.orange} />}
          </View>
          <View style={styles.uploadText}>
            <Text style={styles.uploadTitle}>
              {uploading ? t('change.attachUploading') : status === 'rejected' ? t('change.attachReplace') : t('change.attachAdd', { doc: docName })}
            </Text>
            {status === 'rejected' && latest?.admin_note ? (
              <Text style={[styles.uploadHint, styles.uploadHintDanger]}>{latest.admin_note}</Text>
            ) : (
              <Text style={styles.uploadHint}>{t('change.attachNeeded')}</Text>
            )}
          </View>
          {status === 'rejected' ? <StatusPill tone="danger">{documentStatusLabel(status)}</StatusPill> : null}
        </Pressable>
      ) : (
        <View style={styles.docCard}>
          <View style={styles.docIcon}>
            <FileText size={18} strokeWidth={1.8} color={colors.black} />
          </View>
          <Text style={styles.docName}>{documentTypeLabel(type)}</Text>
          <StatusPill tone={DOCUMENT_TONES[status]}>{documentStatusLabel(status)}</StatusPill>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ChoiceSheet
        visible={picking}
        title={documentTypeLabel(type)}
        options={[
          { key: 'camera', label: t('docs.takePhoto'), icon: Camera },
          { key: 'library', label: t('docs.fromLibrary'), icon: ImageIcon },
        ]}
        onSelect={pick}
        onClose={() => setPicking(false)}
      />
    </Group>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    marginTop: 40,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  heroIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    marginBottom: 4,
    borderRadius: 32,
    backgroundColor: colors.orangeSoft,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: colors.black,
  },
  heroHint: {
    maxWidth: 360,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.textMuted,
  },
  focused: {
    borderColor: FOCUS_BORDER,
  },
  compare: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  compareHalf: {
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  compareHalfCurrent: {
    backgroundColor: '#fafafa',
  },
  // Raja puoliskojen välissä ja sen päällä oikeassa reunassa nuolipallo.
  compareSeam: {
    height: 1,
    backgroundColor: LINE,
  },
  compareArrow: {
    position: 'absolute',
    top: -16,
    right: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  compareLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  compareCurrent: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.textMuted,
  },
  compareNew: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.black,
  },
  compareNewEmpty: {
    color: colors.gray400,
  },
  valueInput: {
    minHeight: 30,
    padding: 0,
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.black,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.orange,
    backgroundColor: '#fff8f5',
  },
  optionPressed: {
    transform: [{ scale: 0.985 }],
  },
  optionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f4f4f4',
  },
  optionIconSelected: {
    backgroundColor: colors.orangeSoft,
  },
  optionLabel: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  radio: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d6d8d2',
    borderRadius: 12,
  },
  radioOn: {
    borderColor: colors.orange,
    backgroundColor: colors.orange,
  },
  reason: {
    minHeight: 110,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.black,
    textAlignVertical: 'top',
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
  error: {
    marginBottom: 10,
    marginHorizontal: 4,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
  },
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  bannerBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
  },
  progress: {
    paddingTop: 18,
    paddingBottom: 2,
  },
  step: {
    flexDirection: 'row',
    gap: 14,
  },
  stepRail: {
    alignItems: 'center',
    width: 24,
  },
  stepDot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  stepDotDone: {
    backgroundColor: colors.open,
  },
  stepDotCurrent: {
    borderWidth: 2,
    borderColor: colors.orange,
    backgroundColor: colors.surface,
  },
  stepDotTodo: {
    borderWidth: 2,
    borderColor: colors.gray200,
    backgroundColor: colors.surface,
  },
  stepDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orange,
  },
  stepLine: {
    flex: 1,
    width: 2,
    minHeight: 20,
    marginVertical: 4,
    borderRadius: 1,
    backgroundColor: colors.gray200,
  },
  stepLineDone: {
    backgroundColor: colors.open,
  },
  stepText: {
    flex: 1,
    paddingBottom: 18,
  },
  stepTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15.5,
    color: colors.black,
  },
  stepTitleTodo: {
    color: colors.textMuted,
  },
  stepBody: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textMuted,
  },
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#d6d8d2',
    borderRadius: 16,
    backgroundColor: '#fcfcfb',
  },
  uploadPressed: {
    backgroundColor: '#f2f2f1',
  },
  uploadIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orangeSoft,
  },
  uploadText: {
    flex: 1,
    gap: 2,
  },
  uploadTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  uploadHint: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textMuted,
  },
  uploadHintDanger: {
    color: '#c2334a',
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  docIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f4f4f4',
  },
  docName: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15.5,
    color: colors.black,
  },
  done: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 48,
    paddingHorizontal: 12,
  },
  doneIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    marginBottom: 8,
    borderRadius: 40,
    backgroundColor: '#e8f6ee',
  },
  doneTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: colors.black,
  },
  doneText: {
    maxWidth: 320,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
  },
})
