import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, Modal, PanResponder, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Card, ListRow } from './ui'
import { tr } from '../lib/i18n'
import { colors, fonts } from '../theme'

const useNativeDriver = Platform.OS !== 'web'
// Näin pitkä veto alas (tai nopea pyyhkäisy) sulkee valikon, lyhyempi palauttaa sen.
const CLOSE_DISTANCE = 80
const CLOSE_VELOCITY = 0.6
// Vain selvästi pystysuuntainen veto alaspäin liikuttaa valikkoa.
const isDownwardDrag = (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// Alhaalta nouseva valintavalikko (esim. navigointisovellus, kieli, kuvan
// lähde). options: [{ key, label, icon }]. value: valittu avain, jolloin rivillä
// näkyy ruksi (ilman valueta pelkkä toimintolista). Valinta sulkee valikon
// heti, samoin taustan napautus, Androidin takaisin-nappi ja veto alaspäin
// mistä kohtaa paneelia tahansa (kahva, otsikko tai rivit).
//
// Toteutus samaan malliin kuin sivuvalikko (SideMenu): yksi animaatioarvo
// liikuttaa paneelia ja tummentaa taustan, ja Modal pysyy auki
// sulkeutumisanimaation ajan.
export default function ChoiceSheet({ visible, title, options, value, onSelect, onClose }) {
  const insets = useSafeAreaInsets()
  // Tummennuksen korkeus: koko näyttö. Androidin Modal voi antaa sisällölle vain
  // paneelin korkeuden, jolloin absoluteFill-tausta jäi kokonaan paneelin taakse
  // eikä tummennusta näkynyt. Tausta ankkuroidaan alareunaan ja ulottuu ylös.
  const windowSize = useWindowDimensions()
  const backdropHeight = Math.max(windowSize.height, Dimensions.get('screen').height)
  // 0 = kiinni, 1 = auki.
  const [progress] = useState(() => new Animated.Value(0))
  const [sheetHeight, setSheetHeight] = useState(400)

  // Sulkeutuessa Modal pysyy näkyvissä, kunnes paneeli on liukunut alas.
  const [prevVisible, setPrevVisible] = useState(visible)
  const [closing, setClosing] = useState(false)
  if (visible !== prevVisible) {
    setPrevVisible(visible)
    setClosing(!visible)
  }

  // Eleen käsittelijä luodaan kerran (uudelleen luotu käsittelijä nollaisi
  // vetomatkan kesken vedon); se lukee viimeisimmät arvot tästä vasta eleen aikana.
  const latest = useRef({ onClose, sheetHeight, visible })
  useEffect(() => {
    latest.current = { onClose, sheetHeight, visible }
  })

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }).start()
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver,
      }).start(() => {
        // Ei piiloteta, jos valikko avattiin uudelleen kesken sulkeutumisen.
        if (!latest.current.visible) setClosing(false)
      })
    }
  }, [visible, progress])

  // latest luetaan vain eleen aikana, ei piirrossa.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    const springBack = () => Animated.spring(progress, { toValue: 1, bounciness: 0, speed: 18, useNativeDriver }).start()
    return PanResponder.create({
      // Kosketus paneelin kahvaan tai otsikkoon kuuluu paneelille; rivit ovat
      // syvemmällä, joten niiden napautukset menevät edelleen riveille.
      onStartShouldSetPanResponder: () => true,
      // Kaappausvaihe: veto otetaan paneelille myös, kun se alkaa rivin päältä.
      onMoveShouldSetPanResponderCapture: isDownwardDrag,
      onMoveShouldSetPanResponder: isDownwardDrag,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => progress.stopAnimation(),
      onPanResponderMove: (_, g) => progress.setValue(clamp(1 - Math.max(0, g.dy) / latest.current.sheetHeight, 0, 1)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) latest.current.onClose()
        else springBack()
      },
      onPanResponderTerminate: springBack,
    })
  })

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] })

  return (
    <Modal
      visible={visible || closing}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.sheetRoot}>
        {/* Muu sisältö tummenee paneelin taakse; kosketus sulkee valikon. */}
        <Animated.View
          style={[styles.sheetBackdrop, { height: backdropHeight, opacity: progress }]}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onClose}
          accessible
          accessibilityRole="button"
          accessibilityLabel={tr('common.close')}
          onAccessibilityTap={onClose}
        />
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY }] }]}
          onLayout={(e) => setSheetHeight(Math.max(1, e.nativeEvent.layout.height))}
          {...pan.panHandlers}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <Card flat>
            {options.map((option) => (
              <ListRow
                key={option.key}
                icon={option.icon}
                label={option.label}
                selected={value === undefined ? undefined : value === option.key}
                onPress={() => {
                  onSelect(option.key)
                  onClose()
                }}
                role="radio"
              />
            ))}
          </Card>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    // Tummennus ulottuu tarvittaessa juuren yläpuolelle (ks. backdropHeight).
    overflow: 'visible',
  },
  sheetBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 21, 15, 0.55)',
  },
  sheet: {
    paddingTop: 8,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray200,
  },
  sheetTitle: {
    marginTop: 16,
    marginBottom: 10,
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.black,
  },
})
