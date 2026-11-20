import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Dices } from 'lucide-react-native'
import { formatEtaRange } from '../../../frontend/src/lib/delivery'
import { formatStars } from '../../../frontend/src/lib/score'
import { FadeImage } from './RestaurantCard'
import { ScoreSmiley } from './Smiley'
import { SectionTitle } from './HomeSection'
import { imageUri } from '../lib/restaurants'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
const SPIN_STEPS = 14

// Mieliteko-arpa (käyttäjän valinta 16.11.2026): "Ei hajua mitä syödä?" ja
// nappi, joka pyörittää ravintoloiden nimiä hetken (hidastuen) ja pysähtyy
// yhteen. Tuloksesta pääsee ravintolaan tai arpomaan uudelleen.
// restaurants: arvonnan ravintolat (auki olevat, ei täytepohjia).
export default function CravingPicker({ restaurants, onOpen }) {
  const [phase, setPhase] = useState('idle') // idle | spinning | done
  const [shown, setShown] = useState(null)
  const timers = useRef([])
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function roll() {
    if (restaurants.length === 0 || phase === 'spinning') return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('spinning')
    spin.setValue(0)
    Animated.timing(spin, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    }).start()

    // Nimet vaihtuvat ensin nopeasti, sitten yhä hitaammin kuin onnenpyörässä.
    let elapsed = 0
    for (let step = 0; step < SPIN_STEPS; step++) {
      elapsed += 45 + step * step * 1.6
      const last = step === SPIN_STEPS - 1
      timers.current.push(
        setTimeout(() => {
          const pick = restaurants[Math.floor(Math.random() * restaurants.length)]
          setShown(pick)
          if (last) setPhase('done')
        }, elapsed),
      )
    }
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] })
  const uri = imageUri(shown?.image_url)
  const eta = formatEtaRange(shown?.pickup_estimate_minutes)

  return (
    <View style={styles.card}>
      <SectionTitle title="Ei hajua mitä syödä?" style={styles.title} dot={false} />
      <Text style={styles.text}>Anna Bidropin arpoa. Hyvä ruoka löytyy yllättävistä paikoista.</Text>

      {shown ? (
        <Pressable
          onPress={phase === 'done' ? () => onOpen?.(shown) : undefined}
          style={({ pressed }) => [styles.result, pressed && phase === 'done' && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={phase === 'done' ? `Avaa ${shown.name}` : 'Arvotaan'}
        >
          <View style={styles.thumb}>{uri ? <FadeImage key={uri} uri={uri} style={styles.thumbImage} /> : null}</View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.name, phase === 'spinning' && styles.nameSpinning]} numberOfLines={1}>
              {shown.name}
            </Text>
            {phase === 'done' ? (
              <View style={styles.meta}>
                {shown.rating != null ? (
                  <>
                    <ScoreSmiley rating={shown.rating} size={13} color={colors.textMuted} />
                    <Text style={styles.metaText}>{formatStars(shown.rating)}</Text>
                  </>
                ) : null}
                {eta ? <Text style={styles.metaText}>{shown.rating != null ? '· ' : ''}{eta}</Text> : null}
              </View>
            ) : (
              <Text style={styles.metaText}>Arvotaan...</Text>
            )}
          </View>
          {phase === 'done' ? <Text style={styles.open}>Avaa</Text> : null}
        </Pressable>
      ) : null}

      <Pressable
        onPress={roll}
        disabled={phase === 'spinning' || restaurants.length === 0}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        accessibilityRole="button"
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Dices size={18} strokeWidth={2.2} color="#ffffff" />
        </Animated.View>
        <Text style={styles.buttonText}>{phase === 'done' ? 'Arvo uudelleen' : 'Arvo minulle ravintola'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 34,
    marginHorizontal: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 20,
    backgroundColor: colors.gray50,
  },
  title: { fontSize: 20 },
  text: { marginTop: 4, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, color: colors.textMuted },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  thumb: { width: 52, height: 52, overflow: 'hidden', borderRadius: 10, backgroundColor: colors.gray100 },
  thumbImage: { width: '100%', height: '100%' },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  nameSpinning: { color: colors.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { marginTop: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.textMuted },
  open: { fontFamily: fonts.semibold, fontSize: 14, color: colors.orange, paddingRight: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    height: 44,
    marginTop: 14,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.black,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 14.5, color: '#ffffff' },
})
