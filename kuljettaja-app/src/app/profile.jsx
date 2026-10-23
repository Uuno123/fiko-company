import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { BadgeCheck, ChevronRight, CircleAlert, Clock, FileText, Landmark, Lock, Mail, MapPin, Phone, User } from 'lucide-react-native'
import { Card, ListRow, LockedRow, Screen, StatRow, StatusPill } from '../components/ui'
import { vehicleIcon } from '../components/vehicleIcons'
import { useAuth } from '../lib/auth'
import { changeRowStatus, useChangeRequests } from '../lib/changeRequests'
import { billingMethodLabel, cityLabel, useCourier, vehicleLabel } from '../lib/courier'
import { missingDocuments, useDocuments } from '../lib/documents'
import { formatEuro, formatKm, initials } from '../lib/format'
import { summarize, useGigs } from '../lib/gigs'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

// Profiili: ylhäällä kuljettajan kortti (nimi, kulkuneuvo, hyväksynnän tila),
// sitten omat tiedot. Nimi, sähköposti, kulkuneuvo ja kaupunki ovat
// tarkistettuja: rivi avaa muutospyynnön, jonka delivo hyväksyy (migraatio
// 0051), ja kesken oleva tai hylätty pyyntö näkyy rivillä tilana. Puhelinnumeron
// kuljettaja vaihtaa itse.
export default function ProfileScreen() {
  const router = useRouter()
  const t = useT()
  const { courier } = useAuth()
  const { profile, settings } = useCourier()
  const { pendingFor, rejectedFor } = useChangeRequests()
  const docs = useDocuments()
  const stats = summarize(useGigs())

  // Dokumenttien tila: puuttuvat (ei kuvaa tarkastettavana), tarkastuksessa tai kunnossa.
  const missing = docs.loaded ? missingDocuments(docs.documents, profile) : []
  const toUpload = missing.filter(({ key }) => docs.latestOf(key)?.status !== 'pending')
  const docState = !docs.loaded
    ? null
    : toUpload.length
      ? { tone: 'danger', icon: CircleAlert, header: t('profile.docsMissingHeader'), row: t('profile.docsMissingCount', { count: toUpload.length }) }
      : missing.length
        ? { tone: 'pending', icon: Clock, header: t('profile.docsInReview'), row: t('status.pending') }
        : { tone: 'success', icon: BadgeCheck, header: t('profile.verified'), row: t('status.approved') }

  const since = courier?.created_at
    ? new Date(courier.created_at).toLocaleDateString(settings.language === 'en' ? 'en-GB' : 'fi-FI', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      })
    : null

  const lockedRow = (field, Icon, label, value) => (
    <LockedRow
      icon={Icon}
      label={label}
      value={value}
      {...changeRowStatus(field, pendingFor(field), rejectedFor(field))}
      onPress={() => router.push({ pathname: '/change-request', params: { field } })}
    />
  )

  return (
    <Screen title={t('profile.title')}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(profile.name || t('common.courier'))}</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroName} numberOfLines={1}>
            {profile.name || t('common.courier')}
          </Text>
          <Text style={styles.heroMeta} numberOfLines={1}>
            {vehicleLabel(profile.vehicle)} · {cityLabel(profile.city)}
          </Text>
          {docState ? (
            <View style={styles.heroBadge}>
              <StatusPill tone={docState.tone} icon={docState.icon}>
                {docState.header}
              </StatusPill>
            </View>
          ) : null}
          {since ? <Text style={styles.since}>{t('profile.since', { date: since })}</Text> : null}
        </View>
      </View>

      <Card title={t('profile.details')}>
        {lockedRow('name', User, t('profile.name'), profile.name)}
        {lockedRow('email', Mail, t('profile.email'), profile.email)}
        {lockedRow('vehicle', vehicleIcon(profile.vehicle), t('profile.vehicle'), vehicleLabel(profile.vehicle))}
        {lockedRow('city', MapPin, t('profile.city'), cityLabel(profile.city))}
        <LockedRow
          icon={Phone}
          label={t('profile.phone')}
          value={profile.phone || t('common.notSet')}
          locked={false}
          onPress={() => router.push('/phone')}
        />
        <View style={styles.lockedNote}>
          <Lock size={13} strokeWidth={2} color={colors.textMuted} />
          <Text style={styles.lockedNoteText}>{t('profile.lockedNote')}</Text>
        </View>
      </Card>

      <Card title={t('profile.account')}>
        <ListRow
          icon={Landmark}
          label={t('profile.billing')}
          value={billingMethodLabel(profile.billingMethod) ?? t('common.notSet')}
          onPress={() => router.push('/billing')}
        />
        <ListRow
          icon={FileText}
          label={t('profile.documents')}
          onPress={() => router.push('/documents')}
          right={
            <View style={styles.rowEnd}>
              {docState ? <StatusPill tone={docState.tone}>{docState.row}</StatusPill> : null}
              <ChevronRight size={20} strokeWidth={1.75} color={colors.textMuted} />
            </View>
          }
        />
      </Card>

      <StatRow
        title={t('profile.stats')}
        items={[
          { label: t('profile.gigs'), value: String(stats.count) },
          { label: t('profile.earnings'), value: formatEuro(stats.total) },
          { label: t('common.distance'), value: formatKm(stats.km) },
        ]}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orange,
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.4,
    color: '#ffffff',
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.black,
  },
  heroMeta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  heroBadge: {
    flexDirection: 'row',
    marginTop: 8,
  },
  since: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  lockedNote: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.gray50,
  },
  lockedNoteText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  rowEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
})
