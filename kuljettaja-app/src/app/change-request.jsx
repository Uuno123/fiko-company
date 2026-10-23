import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Camera, Check, CircleAlert, CircleCheck, Clock, FileText, Image as ImageIcon } from 'lucide-react-native'
import ChoiceSheet from '../components/ChoiceSheet'
import { Button, Card, ListRow, Screen, StatusPill } from '../components/ui'
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

// Muutospyyntö tarkistettuun tietoon (migraatio 0051). Lomake: nykyinen arvo,
// uusi arvo, vapaaehtoinen perustelu ja tarvittaessa liite (ajokortti tai
// pankkitodiste) suoraan pyyntöön. Kun pyyntö on lähetetty tai kesken, näkymä
// näyttää sen tilan aikajanana: lähetetty -> tarkastuksessa -> voimassa.

const normalizeIban = (value) => value.replace(/\s+/g, '').toUpperCase()

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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

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

  // Lähetetty tai kesken oleva pyyntö: tila ja eteneminen, liite voi vielä puuttua.
  if (pending) {
    return (
      <Screen title={t('change.title')}>
        {sent ? <Banner tone="success" icon={CircleCheck} title={t('change.sentTitle')} /> : null}
        <PendingRequest field={field} current={current} request={pending} />
        <RequiredDocument type={requiredDocumentFor(field, pending.new_value)} />
      </Screen>
    )
  }

  // Lähetys onnistui, mutta pyyntö ei vielä näy listassa (hidas yhteys).
  if (sent) {
    return (
      <Screen title={t('change.title')}>
        <Card style={styles.done}>
          <CircleCheck size={40} strokeWidth={1.75} color={colors.open} />
          <Text style={styles.doneTitle}>{t('change.sentTitle')}</Text>
          <Text style={styles.doneText}>{t('change.sentText')}</Text>
          <View style={styles.doneButton}>
            <Button title={t('common.back')} onPress={() => router.back()} />
          </View>
        </Card>
      </Screen>
    )
  }

  // Nykyinen arvo ei ole vaihtoehto: muutospyyntö samaan arvoon on turha.
  const choices = (
    field === 'vehicle'
      ? VEHICLES.map(({ key }) => ({ key, label: vehicleLabel(key), icon: vehicleIcon(key) }))
      : field === 'billing_method'
        ? BILLING_METHODS.map(({ key }) => ({ key, label: billingMethodLabel(key) }))
        : null
  )?.filter((choice) => choice.key !== current)
  const requiredDoc = requiredDocumentFor(field, value)
  const newLabel = t(`change.new.${field}`)

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={t('change.title')}>
        {rejected ? (
          <Banner
            tone="danger"
            icon={CircleAlert}
            title={t('change.rejectedBanner')}
            text={rejected.admin_note ? t('change.rejectedReason', { note: rejected.admin_note }) : t('change.rejectedNoReason')}
          />
        ) : null}

        <Card title={changeFieldLabel(field)}>
          <View style={styles.current}>
            <Text style={styles.currentLabel}>{t('change.current')}</Text>
            <Text style={styles.currentValue} numberOfLines={1}>
              {displayChangeValue(field, current)}
            </Text>
          </View>

          <Text style={styles.fieldLabel}>{newLabel}</Text>
          {choices ? (
            choices.map((choice) => (
              <ListRow
                key={choice.key}
                icon={choice.icon}
                label={choice.label}
                selected={value === choice.key}
                onPress={() => {
                  setValue(choice.key)
                  setError('')
                }}
                role="radio"
              />
            ))
          ) : (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(next) => {
                setValue(next)
                setError('')
              }}
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

          <Text style={styles.fieldLabel}>
            {t('change.reason')} <Text style={styles.optional}>{t('change.optional')}</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.reason]}
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder={t('change.reasonPlaceholder')}
            placeholderTextColor={colors.gray400}
            accessibilityLabel={t('change.reason')}
          />
        </Card>

        {requiredDoc ? <RequiredDocument type={requiredDoc} /> : null}

        <View style={styles.info}>
          <Clock size={16} strokeWidth={2} color={colors.textMuted} />
          <Text style={styles.infoText}>{t('change.processInfo')}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={busy ? t('change.sending') : t('change.send')} onPress={submit} disabled={busy || !value} />
      </Screen>
    </KeyboardAvoidingView>
  )
}

const BANNER_TONES = {
  success: { background: '#e8f6ee', color: '#1a8a4a' },
  danger: { background: '#fdecef', color: '#c2334a' },
}

// Ilmoitus näkymän yläreunassa (lähetetty / edellinen pyyntö hylättiin).
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

// Kesken oleva pyyntö: nykyinen ja pyydetty arvo sekä eteneminen aikajanana.
function PendingRequest({ field, current, request }) {
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
    <Card style={styles.pendingCard}>
      <View style={styles.pendingHead}>
        <Text style={styles.pendingTitle}>{changeFieldLabel(field)}</Text>
        <StatusPill tone="pending" icon={Clock}>
          {t('status.pending')}
        </StatusPill>
      </View>

      <View style={styles.compare}>
        <View style={styles.compareRow}>
          <Text style={styles.compareLabel}>{t('change.current')}</Text>
          <Text style={styles.compareValue} numberOfLines={1}>
            {displayChangeValue(field, current)}
          </Text>
        </View>
        <View style={[styles.compareRow, styles.compareRowLast]}>
          <Text style={styles.compareLabel}>{t('change.requestedValue')}</Text>
          <Text style={[styles.compareValue, styles.compareValueNew]} numberOfLines={1}>
            {displayChangeValue(field, request.new_value)}
          </Text>
        </View>
      </View>

      <View>
        {steps.map((step, index) => (
          <View key={step.state} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, dotStyle[step.state]]}>
                {step.state === 'done' ? <Check size={12} strokeWidth={3} color="#ffffff" /> : null}
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
      </View>
    </Card>
  )
}

const DOCUMENT_TONES = { approved: 'success', pending: 'pending', rejected: 'danger', missing: 'neutral' }

// Muutoksen hyväksymiseen tarvittava dokumentti suoraan pyynnössä: tila ja
// kuvan lisäys kamerasta tai galleriasta (tallentuu Dokumentteihin).
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
    <Card title={t('change.attachTitle')}>
      <View style={styles.docRow}>
        <View style={styles.docIcon}>
          <FileText size={18} strokeWidth={1.75} color={colors.black} />
        </View>
        <View style={styles.docText}>
          <Text style={styles.docName}>{documentTypeLabel(type)}</Text>
          {status === 'missing' ? <Text style={styles.docHint}>{t('change.attachHint', { doc: docName })}</Text> : null}
          {status === 'rejected' && latest?.admin_note ? (
            <Text style={[styles.docHint, styles.docHintDanger]}>{latest.admin_note}</Text>
          ) : null}
        </View>
        <StatusPill tone={DOCUMENT_TONES[status]}>{documentStatusLabel(status)}</StatusPill>
      </View>

      {canUpload ? (
        <View style={styles.docButton}>
          <Button
            variant="secondary"
            icon={Camera}
            title={
              uploading
                ? t('change.attachUploading')
                : status === 'rejected'
                  ? t('change.attachReplace')
                  : t('change.attachAdd', { doc: docName })
            }
            onPress={() => setPicking(true)}
            disabled={uploading}
          />
        </View>
      ) : null}
      {error ? <Text style={[styles.error, styles.docError]}>{error}</Text> : null}

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
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    marginTop: 40,
  },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.gray50,
  },
  currentLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  currentValue: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.black,
  },
  optional: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: colors.gray50,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
    ...Platform.select({ web: { outlineStyle: 'none' }, default: null }),
  },
  reason: {
    minHeight: 96,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  info: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  error: {
    marginHorizontal: 4,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
  },
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
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
  pendingCard: {
    paddingTop: 18,
    paddingBottom: 10,
  },
  pendingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingTitle: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 21,
    letterSpacing: -0.2,
    color: colors.black,
  },
  compare: {
    marginTop: 14,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.gray50,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  compareRowLast: {
    borderBottomWidth: 0,
  },
  compareLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  compareValue: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.black,
  },
  compareValueNew: {
    fontFamily: fonts.bold,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  stepRail: {
    alignItems: 'center',
    width: 22,
  },
  stepDot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  stepLine: {
    flex: 1,
    width: 2,
    minHeight: 18,
    marginVertical: 3,
    backgroundColor: colors.gray200,
  },
  stepLineDone: {
    backgroundColor: colors.open,
  },
  stepText: {
    flex: 1,
    paddingBottom: 16,
  },
  stepTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  stepTitleTodo: {
    color: colors.textMuted,
  },
  stepBody: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  docIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#f4f4f4',
  },
  docText: {
    flex: 1,
    gap: 2,
  },
  docName: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  docHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  docHintDanger: {
    color: '#c2334a',
  },
  docButton: {
    marginTop: 6,
    marginBottom: 10,
  },
  docError: {
    marginBottom: 10,
  },
  done: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  doneTitle: {
    marginTop: 4,
    fontFamily: fonts.display,
    fontSize: 21,
    color: colors.black,
  },
  doneText: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
})
