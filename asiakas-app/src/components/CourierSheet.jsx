import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Headset, Phone } from 'lucide-react-native'
import BottomSheet from './BottomSheet'
import { ScoreSmiley } from './Smiley'
import { VEHICLE_LABELS, courierPhotoUrl, fetchBidCourierProfile } from '../lib/deliveryBids'
import { formatReviewStars, formatStars } from '../../../frontend/src/lib/score'
import { formatPrice } from '../../../frontend/src/lib/format'
import { colors, fonts } from '../theme'

// Arvion ikä lyhyesti (sama kuin verkkosivun CourierProfileSheet).
function timeAgo(value) {
  const days = Math.floor((Date.now() - Date.parse(value)) / 86_400_000)
  if (days <= 0) return 'Tänään'
  if (days === 1) return 'Eilen'
  if (days < 7) return `${days} pv sitten`
  if (days < 35) return `${Math.floor(days / 7)} vk sitten`
  return new Date(value).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

// Kuljettajan profiili seurannassa (käyttäjän pyyntö 20.11.2026: kuljettajanapille
// toiminto). Sama sisältö kuin verkkosivun CourierProfileSheetissä: kuva, nimi,
// kulkuneuvo, arvio ja jakauma, toimitukset ja uusimmat arviot. Alhaalla sovittu
// kuljetushinta, asiakastuki ja Soita (numero migraatiosta 0068, vain toimituksen aikana).
export default function CourierSheet({ visible, onClose, bid, priceCents, phone }) {
  const [profile, setProfile] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!visible || !bid?.id || profile) return undefined
    let cancelled = false
    fetchBidCourierProfile(bid.id).then(
      (data) => {
        if (cancelled) return
        if (data) setProfile(data)
        else setFailed(true)
      },
      () => !cancelled && setFailed(true),
    )
    return () => {
      cancelled = true
    }
  }, [visible, bid?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const name = bid?.courier_name ?? 'Kuljettaja'
  const photo = courierPhotoUrl(profile?.photo_path ?? bid?.courier_photo_path)
  const rating = profile?.rating ?? bid?.courier_rating
  const count = profile?.review_count ?? bid?.courier_review_count ?? 0
  const hasRating = count > 0 && rating != null
  const distribution = profile?.distribution ?? null
  const reviews = profile?.reviews ?? []

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Kuljettaja" dragFromHeaderOnly>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.photo}>
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={styles.photoText}>{name.charAt(0)}</Text>
            )}
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.sub}>{VEHICLE_LABELS[bid?.vehicle] ?? 'Kuljettaja'}</Text>
          {!hasRating ? <Text style={styles.newTag}>Uusi kuljettaja</Text> : null}
        </View>

        <View style={styles.stats}>
          <Stat label="Arvio">
            {hasRating ? (
              <View style={styles.statRow}>
                <ScoreSmiley rating={rating} size={16} />
                <Text style={styles.statValue}>{formatStars(rating)}</Text>
              </View>
            ) : (
              <Text style={styles.statValue}>–</Text>
            )}
          </Stat>
          <Stat label="Arviot">
            <Text style={styles.statValue}>{count}</Text>
          </Stat>
          {profile?.deliveries != null ? (
            <Stat label="Toimitukset">
              <Text style={styles.statValue}>{profile.deliveries}</Text>
            </Stat>
          ) : null}
        </View>

        {distribution && hasRating ? (
          <View style={styles.bars}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const n = distribution[stars] ?? 0
              return (
                <View key={stars} style={styles.barRow}>
                  <Text style={styles.barLabel}>{formatReviewStars(stars)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(n / count) * 100}%` }]} />
                  </View>
                  <Text style={styles.barCount}>{n}</Text>
                </View>
              )
            })}
          </View>
        ) : null}

        <Text style={styles.section}>Asiakkaiden arviot</Text>
        {!profile && !failed ? (
          <ActivityIndicator color={colors.orange} style={{ marginTop: 14 }} />
        ) : reviews.length ? (
          reviews.map((review) => (
            <View key={review.created_at} style={styles.review}>
              <View style={styles.reviewHead}>
                <View style={styles.statRow}>
                  <ScoreSmiley rating={review.stars} size={14} />
                  <Text style={styles.reviewScore}>{formatReviewStars(review.stars)}</Text>
                </View>
                <Text style={styles.reviewTime}>{timeAgo(review.created_at)}</Text>
              </View>
              <Text style={styles.reviewText}>“{review.comment}”</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>
            {failed
              ? 'Arvioita ei saatu ladattua.'
              : hasRating
                ? 'Asiakkaat ovat antaneet vain arvosanoja, ei kirjoitettuja arvioita.'
                : 'Ei vielä arvioita. Asiakkaat arvioivat kuljettajan toimituksen jälkeen.'}
          </Text>
        )}

        <View style={styles.footer}>
          {priceCents ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.footLabel}>Sovittu kuljetus</Text>
              <Text style={styles.footPrice}>{formatPrice(priceCents)}</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            onPress={() => Linking.openURL('mailto:tuki@bidrop.fi')}
            style={({ pressed }) => [styles.support, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <Headset size={16} strokeWidth={2} color={colors.black} />
            <Text style={styles.supportText}>Asiakastuki</Text>
          </Pressable>
          {phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`)}
              style={({ pressed }) => [styles.call, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
            >
              <Phone size={16} strokeWidth={2} color="#ffffff" />
              <Text style={styles.callText}>Soita</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </BottomSheet>
  )
}

function Stat({ label, children }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', paddingTop: 4 },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  photoText: { fontFamily: fonts.semibold, fontSize: 32, color: colors.black },
  name: { marginTop: 12, fontFamily: fonts.headingBold, fontSize: 22, letterSpacing: -0.3, color: colors.black },
  sub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  newTag: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.black,
  },
  stats: { flexDirection: 'row', marginTop: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.gray50 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { marginTop: 3, fontFamily: fonts.semibold, fontSize: 16, color: colors.black },
  bars: { marginTop: 16, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 14, fontFamily: fonts.medium, fontSize: 13, color: colors.black },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.gray100 },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.orange },
  barCount: { width: 24, textAlign: 'right', fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  section: { marginTop: 22, marginBottom: 4, fontFamily: fonts.semibold, fontSize: 16, color: colors.black },
  review: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewScore: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black },
  reviewTime: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  reviewText: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.black },
  muted: { marginTop: 8, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  footLabel: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  footPrice: { marginTop: 1, fontFamily: fonts.semibold, fontSize: 18, color: colors.black },
  support: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 40,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e3e3e0',
    borderRadius: 20,
  },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 40,
    marginLeft: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.black,
  },
  callText: { fontFamily: fonts.semibold, fontSize: 14, color: '#ffffff' },
  supportText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
})
