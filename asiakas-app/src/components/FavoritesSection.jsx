import { useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Heart } from 'lucide-react-native'
import { SettingsSection } from './SettingsUI'
import { ScoreSmiley } from './Smiley'
import { formatStars } from '../../../frontend/src/lib/score'
import { formatEtaRange } from '../../../frontend/src/lib/delivery'
import { restaurantThumb } from '../../../frontend/src/lib/brandLogos'
import { loadFavoriteRestaurants, removeFavorite } from '../lib/favorites'
import { imageUri } from '../lib/restaurants'
import { colors, fonts } from '../theme'

// Lempipaikat Omat tiedot -sivulla kuten verkkosivun FavoritesSection.jsx:
// tiivis lista (kuva tai ketjun logo, nimi, arvosana, kategoria ja aika), ja
// sydämestä suosikin voi poistaa.
export default function FavoritesSection({ customerId, onOpen }) {
  const [favorites, setFavorites] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!customerId) return undefined
    let cancelled = false
    loadFavoriteRestaurants(customerId)
      .then((list) => {
        if (cancelled) return
        setFavorites(list)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [customerId])

  async function remove(restaurant) {
    const previous = favorites
    setFavorites((list) => list.filter((r) => r.id !== restaurant.id))
    const ok = await removeFavorite(customerId, restaurant.id)
    if (!ok) setFavorites(previous)
  }

  return (
    <SettingsSection title="Lempipaikat">
      {status === 'loading' ? (
        <Text style={styles.note}>Ladataan...</Text>
      ) : status === 'error' ? (
        <Text style={styles.note}>Lempipaikkojen haku epäonnistui.</Text>
      ) : favorites.length === 0 ? (
        <View style={styles.empty}>
          <Heart size={18} strokeWidth={1.8} color={colors.textMuted} />
          <Text style={styles.emptyText}>Lisää ravintoloita suosikkeihin sydämestä, niin ne näkyvät täällä.</Text>
        </View>
      ) : (
        favorites.map((restaurant, index) => {
          const thumb = restaurantThumb(restaurant.name, restaurant.image_url)
          const uri = imageUri(thumb?.src)
          const meta = [restaurant.category, formatEtaRange(restaurant.pickup_estimate_minutes)].filter(Boolean).join(' · ')
          return (
            <View key={restaurant.id} style={[styles.row, index > 0 && styles.divided]}>
              <Pressable
                onPress={() => onOpen?.(restaurant.id)}
                style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel={restaurant.name}
              >
                <View style={styles.thumb}>
                  {uri ? (
                    <Image source={{ uri }} style={thumb.logo ? styles.logo : styles.photo} resizeMode={thumb.logo ? 'contain' : 'cover'} />
                  ) : (
                    <Text style={styles.letter}>{restaurant.name.charAt(0)}</Text>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                  <View style={styles.meta}>
                    {restaurant.rating != null ? (
                      <>
                        <ScoreSmiley rating={restaurant.rating} size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>{formatStars(restaurant.rating)}</Text>
                        {meta ? <Text style={styles.metaText}>·</Text> : null}
                      </>
                    ) : null}
                    <Text style={styles.metaText} numberOfLines={1}>
                      {meta}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <Pressable
                onPress={() => remove(restaurant)}
                hitSlop={8}
                style={styles.heart}
                accessibilityRole="button"
                accessibilityLabel={`Poista ${restaurant.name} suosikeista`}
              >
                <Heart size={18} strokeWidth={2} color={colors.orange} fill={colors.orange} />
              </Pressable>
            </View>
          )
        })
      )}
    </SettingsSection>
  )
}

const styles = StyleSheet.create({
  note: { padding: 16, fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  emptyText: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  divided: { borderTopWidth: 1, borderTopColor: '#efefef' },
  link: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16 },
  thumb: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#f4f4f4',
  },
  photo: { width: '100%', height: '100%' },
  logo: { width: '78%', height: '78%' },
  letter: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  heart: { padding: 6 },
})
