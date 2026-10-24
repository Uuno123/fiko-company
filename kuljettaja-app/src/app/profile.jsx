import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  CircleAlert,
  Clock,
  FileText,
  Image as ImageIcon,
  Landmark,
  Lock,
  Mail,
  MapPin,
  Phone,
  Star,
  Trash2,
  User,
} from 'lucide-react-native'
import ChoiceSheet from '../components/ChoiceSheet'
import { Card, ListRow, LockedRow, Screen, StatRow, StatusPill } from '../components/ui'
import { vehicleIcon } from '../components/vehicleIcons'
import { useAuth } from '../lib/auth'
import { changeRowStatus, useChangeRequests } from '../lib/changeRequests'
import { billingMethodLabel, cityLabel, useCourier, vehicleLabel } from '../lib/courier'
import { missingDocuments, pickDocumentImage, useDocuments } from '../lib/documents'
import { formatEuro, formatKm, initials } from '../lib/format'
import { summarize, useGigs } from '../lib/gigs'
import { useT } from '../lib/i18n'
import {
  courierPhotoUrl,
  courierRating,
  formatRating,
  photoErrorText,
  removeProfilePhoto,
  uploadProfilePhoto,
} from '../lib/photo'
import { colors, fonts } from '../theme'

const STAR_COLOR = '#f5a524'

// Profiili: ylhäällä kuljettajan kortti (kuva keskellä, sen alla nimi,
// kulkuneuvo, tähtiarvio ja hyväksynnän tila), sitten omat tiedot. Kuvan kuljettaja vaihtaa itse
// napauttamalla sitä (asiakas näkee sen hintatarjouksessa, migraatio 0062).
// Nimi, sähköposti, kulkuneuvo ja kaupunki ovat tarkistettuja: rivi avaa
// muutospyynnön, jonka Bidrop hyväksyy (migraatio 0051), ja kesken oleva tai
// hylätty pyyntö näkyy rivillä tilana. Puhelinnumeron kuljettaja vaihtaa itse.
export default function ProfileScreen() {
  const router = useRouter()
  const t = useT()
  const { courier, refreshCourier } = useAuth()
  const [photoSheet, setPhotoSheet] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
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
      ? {
          tone: 'danger',
          icon: CircleAlert,
          header: t('profile.docsMissingHeader'),
          row: t('profile.docsMissingCount', { count: toUpload.length }),
        }
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

  const photoUrl = courierPhotoUrl(courier?.photo_path)
  const rating = courierRating(courier)
  const ratingText = rating
    ? `${formatRating(rating.average, settings.language)} · ${
        rating.count === 1 ? t('reviews.countOne') : t('reviews.count', { count: rating.count })
      }`
    : t('reviews.none')

  // Kuva kamerasta tai galleriasta neliöksi rajattuna, tai kuvan poisto.
  const choosePhoto = async (key) => {
    setPhotoSheet(false)
    setPhotoError('')
    try {
      if (key === 'remove') {
        setUploading(true)
        await removeProfilePhoto()
      } else {
        const asset = await pickDocumentImage(key, { allowsEditing: true, aspect: [1, 1], quality: 0.6 })
        if (!asset) return
        setUploading(true)
        await uploadProfilePhoto(courier.id, asset)
      }
      await refreshCourier()
    } catch (err) {
      setPhotoError(photoErrorText(err))
    } finally {
      setUploading(false)
    }
  }

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
        <Pressable
          onPress={() => setPhotoSheet(true)}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={photoUrl ? t('photo.change') : t('photo.add')}
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials(profile.name || t('common.courier'))}</Text>
            )}
            {uploading ? (
              <View style={styles.avatarBusy}>
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : null}
          </View>
          <View style={styles.cameraBadge}>
            <Camera size={15} strokeWidth={2.2} color="#ffffff" />
          </View>
        </Pressable>
        <View style={styles.heroText}>
          <Text style={styles.heroName} numberOfLines={1}>
            {profile.name || t('common.courier')}
          </Text>
          <Text style={styles.heroMeta} numberOfLines={1}>
            {vehicleLabel(profile.vehicle)} · {cityLabel(profile.city)}
          </Text>
          <Pressable
            onPress={() => router.push('/reviews')}
            accessibilityRole="button"
            accessibilityLabel={`${t('reviews.title')}: ${ratingText}`}
            style={({ pressed }) => [styles.ratingRow, pressed && styles.pressed]}
          >
            <Star size={14} strokeWidth={2} color={STAR_COLOR} fill={rating ? STAR_COLOR : 'none'} />
            <Text style={[styles.ratingText, !rating && styles.ratingMuted]}>{ratingText}</Text>
          </Pressable>
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
      {photoError ? (
        <Text style={styles.photoError}>{photoError}</Text>
      ) : !photoUrl ? (
        <Text style={styles.photoHint}>{t('photo.hint')}</Text>
      ) : null}

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
        <ListRow icon={Star} label={t('reviews.title')} value={ratingText} onPress={() => router.push('/reviews')} />
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
        onPress={() => router.push('/earnings')}
        items={[
          { label: t('profile.gigs'), value: String(stats.count) },
          { label: t('profile.earnings'), value: formatEuro(stats.total) },
          { label: t('common.distance'), value: formatKm(stats.km) },
        ]}
      />

      <ChoiceSheet
        visible={photoSheet}
        title={t('photo.title')}
        options={[
          { key: 'camera', label: t('docs.takePhoto'), icon: Camera },
          { key: 'library', label: t('docs.fromLibrary'), icon: ImageIcon },
          ...(photoUrl ? [{ key: 'remove', label: t('photo.remove'), icon: Trash2 }] : []),
        ]}
        onSelect={choosePhoto}
        onClose={() => setPhotoSheet(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  // Kuva ylhäällä keskellä, nimi ja tiedot sen alla (käyttäjän pyyntö 24.10.2026,
  // samaan malliin kuin asiakkaan näkemä kuljettajan profiili).
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  avatarWrap: {
    width: 104,
    height: 104,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 104,
    height: 104,
    overflow: 'hidden',
    borderRadius: 52,
    backgroundColor: colors.orange,
  },
  avatarImage: {
    width: 104,
    height: 104,
  },
  avatarBusy: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 21, 15, 0.45)',
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderWidth: 3,
    borderColor: colors.surface,
    borderRadius: 16,
    backgroundColor: colors.black,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  ratingText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.black,
  },
  ratingMuted: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  photoHint: {
    marginTop: -4,
    marginHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.textMuted,
  },
  photoError: {
    marginTop: -4,
    marginHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.danger,
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: -0.6,
    color: '#ffffff',
  },
  heroText: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 2,
  },
  heroName: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: -0.4,
    textAlign: 'center',
    color: colors.black,
  },
  heroMeta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    color: colors.textMuted,
  },
  heroBadge: {
    flexDirection: 'row',
    marginTop: 10,
  },
  since: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
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
