import { StyleSheet, Text, View } from 'react-native'
import { Star } from 'lucide-react-native'
import { Card, Screen } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import { useT } from '../lib/i18n'
import { courierRating, formatRating, useCourierReviews } from '../lib/photo'
import { colors, fonts } from '../theme'

const STAR_COLOR = '#f5a524'

function Stars({ value, size = 14 }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={2}
          color={STAR_COLOR}
          fill={n <= Math.round(value) ? STAR_COLOR : 'none'}
        />
      ))}
    </View>
  )
}

// Asiakkaiden arviot kuljettajasta (migraatio 0062): keskiarvo ylhäällä, sitten
// arviot uusin ensin. Arvioijan nimeä ei näytetä. Samat tiedot näkyvät
// asiakkaalle hintatarjouksessa.
export default function ReviewsScreen() {
  const t = useT()
  const { courier } = useAuth()
  const { settings } = useCourier()
  const { reviews, loaded, error } = useCourierReviews()
  const rating = courierRating(courier)
  const locale = settings.language === 'en' ? 'en-GB' : 'fi-FI'

  return (
    <Screen title={t('reviews.title')}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.summary}>
        {rating ? (
          <>
            <Text style={styles.average}>{formatRating(rating.average, settings.language)}</Text>
            <View style={styles.summaryText}>
              <Stars value={rating.average} size={18} />
              <Text style={styles.count}>
                {rating.count === 1 ? t('reviews.countOne') : t('reviews.count', { count: rating.count })}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.summaryText}>
            <Text style={styles.noneTitle}>{t('reviews.none')}</Text>
            <Text style={styles.noneText}>{t('reviews.empty')}</Text>
          </View>
        )}
      </View>

      {loaded && reviews.length ? (
        <Card>
          {reviews.map((review, index) => (
            <View key={review.id} style={[styles.review, index > 0 && styles.reviewBorder]}>
              <View style={styles.reviewHead}>
                <Stars value={review.stars} />
                <Text style={styles.date}>
                  {new Date(review.created_at).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={review.comment ? styles.comment : styles.starsOnly}>
                {review.comment || t('reviews.starsOnly')}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Text style={styles.note}>{t('reviews.note')}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
  },
  summary: {
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
  average: {
    fontFamily: fonts.display,
    fontSize: 44,
    letterSpacing: -1,
    color: colors.black,
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  noneTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.black,
  },
  noneText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  review: {
    gap: 6,
    paddingVertical: 12,
  },
  reviewBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  comment: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.black,
  },
  starsOnly: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  note: {
    marginHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
})
