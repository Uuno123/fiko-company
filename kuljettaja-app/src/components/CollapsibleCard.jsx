import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Keyboard, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme'
import { tr } from '../lib/i18n'

const useNativeDriver = Platform.OS !== 'web'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// Kartan päällä oleva kortti (tarjous, keikan vaiheet), jonka voi pienentää ja
// suurentaa samalla tavalla kuin alapaneelin: vetämällä tai kahvaa napauttamalla.
// header (mitä tehdään, aikalaskuri) ja footer (pääpainike) näkyvät aina;
// children eli yksityiskohdat piiloutuvat pienennettynä, jolloin karttaa näkyy
// enemmän. Ilman childreniä kortti ei pienene eikä kahvaa näytetä.
//
// Pienennys tehdään siirroilla kuten alapaneelissa (natiivi animaatio): otsikko
// ja kortin tausta liukuvat alas yksityiskohtien päälle ja yksityiskohdat
// häivytetään. Kortin korkeutta ei animoida: korkeusanimaatio ja kartan
// uudelleenkeskitys kesken animaation saivat kortin tärisemään puhelimessa.
//   expandKey: kortti avautuu, kun arvo vaihtuu (esim. keikan seuraava vaihe).
//   onHeightChange: näkyvä korkeus kartan reunusta varten - vain asettunut koko.
//   style: lisätyyli (esim. tarjouskortin nousuanimaatio, näppäimistön nosto).
export default function CollapsibleCard({ header, children, footer, expandKey, onHeightChange, style, paddingBottom }) {
  const insets = useSafeAreaInsets()
  const collapsible = Boolean(children)
  // Kuinka paljon otsikko ja tausta ovat liukuneet alas: 0 = auki,
  // yksityiskohtien korkeus = pienennetty.
  const offset = useRef(new Animated.Value(0)).current
  const [cardHeight, setCardHeight] = useState(0)
  const [detailsHeight, setDetailsHeight] = useState(0)
  const [expanded, setExpanded] = useState(true)
  const maxOffset = collapsible ? detailsHeight : 0
  const state = useRef({ value: 0, max: 0, expanded: true })
  state.current.max = maxOffset
  const reportHeight = useRef(onHeightChange)
  reportHeight.current = onHeightChange
  const cardHeightRef = useRef(0)
  cardHeightRef.current = cardHeight

  function snapTo(next) {
    const s = state.current
    s.expanded = next
    s.value = next ? 0 : s.max
    if (!next) Keyboard.dismiss()
    setExpanded(next)
    Animated.spring(offset, { toValue: s.value, bounciness: 0, speed: 14, useNativeDriver }).start()
    // Kartalle kerrotaan vain lopullinen korkeus, ei animaation välivaiheita.
    if (cardHeightRef.current) reportHeight.current?.(cardHeightRef.current - s.value)
  }

  // Sisällön korkeus voi muuttua (esim. virheteksti): pienennetty kortti pysyy
  // pienennettynä ja kartta saa uuden näkyvän korkeuden.
  useEffect(() => {
    const s = state.current
    if (!s.expanded) {
      s.value = maxOffset
      offset.setValue(maxOffset)
    }
    if (cardHeight) reportHeight.current?.(cardHeight - s.value)
  }, [cardHeight, maxOffset, offset])

  // Seuraava vaihe näytetään kokonaan, vaikka edellinen olisi ollut pienennetty.
  const firstKey = useRef(true)
  useEffect(() => {
    if (firstKey.current) {
      firstKey.current = false
      return
    }
    if (!state.current.expanded) snapTo(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandKey])

  const pan = useRef(
    PanResponder.create({
      // Vain pystysuuntainen veto muuttaa kokoa; napautukset ja liukukytkin toimivat.
      onMoveShouldSetPanResponder: (_, g) =>
        state.current.max > 0 && Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
      onPanResponderGrant: () => offset.stopAnimation((value) => (state.current.value = value)),
      onPanResponderMove: (_, g) => offset.setValue(clamp(state.current.value + g.dy, 0, state.current.max)),
      onPanResponderRelease: (_, g) => {
        const s = state.current
        const position = clamp(s.value + g.dy, 0, s.max)
        snapTo(g.vy < -0.4 ? true : g.vy > 0.4 ? false : position < s.max / 2)
      },
      onPanResponderTerminate: () => snapTo(state.current.expanded),
    }),
  ).current

  // Yksityiskohdat häviävät ennen kuin otsikko on liukunut niiden päälle.
  const detailsOpacity = useMemo(
    () => offset.interpolate({ inputRange: [0, Math.max(1, maxOffset * 0.6)], outputRange: [1, 0], extrapolate: 'clamp' }),
    [offset, maxOffset],
  )
  const slide = useMemo(() => ({ transform: [{ translateY: offset }] }), [offset])
  // Alareunan väli kuuluu viimeiselle osalle eikä kortille, jotta sekin on
  // valkoinen (katso styles.section).
  const bottomPad = { paddingBottom: paddingBottom ?? insets.bottom + 10 }

  return (
    <Animated.View
      style={[styles.card, style]}
      onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
      {...(collapsible ? pan.panHandlers : null)}
    >
      {/* Tausta liukuu otsikon mukana; pienennettynä sen alaosa jää ruudun alle. */}
      <Animated.View style={[styles.background, slide]} />

      <Animated.View style={[styles.top, !collapsible && styles.topStatic, !collapsible && !footer && bottomPad, slide]}>
        {collapsible ? (
          <Pressable
            onPress={() => snapTo(!state.current.expanded)}
            style={styles.handleArea}
            accessibilityRole="button"
            accessibilityLabel={expanded ? tr('common.collapseCard') : tr('common.expandCard')}
            accessibilityState={{ expanded }}
            hitSlop={{ top: 8, bottom: 4 }}
          >
            <View style={styles.handle} />
          </Pressable>
        ) : null}
        {header}
      </Animated.View>

      {collapsible ? (
        <Animated.View
          style={[
            styles.section,
            !footer && bottomPad,
            { opacity: detailsOpacity, pointerEvents: expanded ? 'auto' : 'none' },
          ]}
          onLayout={(e) => setDetailsHeight(e.nativeEvent.layout.height)}
          aria-hidden={!expanded}
        >
          {children}
        </Animated.View>
      ) : null}

      {footer ? <View style={[styles.section, bottomPad]}>{footer}</View> : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  // Kortin alue ei itse ota kosketuksia: pienennettynä sen yläosa on tyhjää
  // (kartta näkyy ja toimii), sisältö ja tausta ottavat ne.
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
    boxShadow: '0 -6px 28px rgba(20, 21, 15, 0.18)',
  },
  // Otsikko piirretään yksityiskohtien päälle ja peittää ne liukuessaan.
  top: {
    zIndex: 1,
    paddingHorizontal: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  topStatic: {
    paddingTop: 18,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d5d8dd',
  },
  // Jokaisella osalla on oma valkoinen tausta: pelkän erillisen taustakerroksen
  // varassa kartta näkyi Androidilla kortin sisällön läpi (tarjouskortti).
  section: {
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
  },
})
