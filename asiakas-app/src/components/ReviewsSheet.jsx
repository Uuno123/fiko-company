import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import BottomSheet from './BottomSheet'
import { ScoreSmiley } from './Smiley'
import { formatReviewScore, formatScore } from '../../../frontend/src/lib/score'
import { formatReviewAge, getDemoReviews } from '../../../frontend/src/lib/demoReviews'
import { supabase } from '../lib/supabase'
import { colors, fonts } from '../theme'

// Ravintolan arvostelut (käyttäjän pyyntö 17.11.2026: arvio linkiksi) kuten
// verkkosivun ReviewsModal: yhteenveto ja lista. Oikeat arvostelut
// tietokannasta (restaurant_reviews), esittelyravintolalle myös esimerkit.
export default function ReviewsSheet({ visible, onClose, restaurant, rating, countLabel }) {
  const [reviews, setReviews] = useState(null)

  useEffect(() => {
    if (!visible || !restaurant?.id || reviews) return
    let cancelled = false
    const load = supabase
      ? supabase
          .from('restaurant_reviews')
          .select('id, author_name, rating, comment, reply, created_at')
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] })
    load.then(({ data }) => {
      if (cancelled) return
      const own = (data ?? []).map((r) => ({
        id: r.id,
        name: r.author_name || 'Asiakas',
        rating: r.rating,
        text: r.comment,
        reply: r.reply,
        daysAgo: Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)),
      }))
      setReviews([...own, ...getDemoReviews(restaurant.id)])
    })
    return () => {
      cancelled = true
    }
  }, [visible, restaurant, reviews])

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Arvostelut" dragFromHeaderOnly>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {rating != null ? (
          <View style={styles.summary}>
            <ScoreSmiley rating={rating} size={40} color={colors.black} />
            <Text style={styles.score}>{formatScore(rating)}</Text>
            <View>
              <Text style={styles.scale}>/ 10</Text>
              <Text style={styles.count}>{countLabel}</Text>
            </View>
          </View>
        ) : null}

        {reviews == null ? (
          <ActivityIndicator color={colors.orange} style={{ marginTop: 24 }} />
        ) : reviews.length === 0 ? (
          <Text style={styles.empty}>Ei vielä arvosteluja.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.item}>
              <View style={styles.itemHead}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{review.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{review.name}</Text>
                  <Text style={styles.age}>{formatReviewAge(review.daysAgo)}</Text>
                </View>
                <View style={styles.itemScore}>
                  <ScoreSmiley rating={review.rating} size={14} color={colors.black} />
                  <Text style={styles.itemScoreText}>{formatReviewScore(review.rating)}</Text>
                </View>
              </View>
              {review.text ? <Text style={styles.text}>{review.text}</Text> : null}
              {review.reply ? (
                <View style={styles.reply}>
                  <Text style={styles.replyTitle}>Ravintolan vastaus</Text>
                  <Text style={styles.text}>{review.reply}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 6 },
  score: { fontFamily: fonts.headingBold, fontSize: 36, letterSpacing: -0.8, color: colors.black },
  scale: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  count: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  empty: { marginTop: 24, textAlign: 'center', fontFamily: fonts.regular, fontSize: 14.5, color: colors.textMuted },
  item: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e6e6e3' },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.gray100,
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  name: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.black },
  age: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  itemScore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemScoreText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.black },
  text: { marginTop: 8, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.black },
  reply: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: colors.gray100 },
  replyTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.black },
})
