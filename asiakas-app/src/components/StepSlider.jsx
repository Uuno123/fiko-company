import { useRef, useState } from 'react'
import { PanResponder, StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'

const THUMB = 26

// Portaittainen liukusäädin (etäisyys suodatuksessa, 17.11.2026). Oma
// toteutus PanResponderilla, ettei tarvita natiivikirjastoa (toimii Expo
// Gossa). Napin voi vetää tai painaa raitaa; arvo hyppää lähimpään askeleeseen.
export default function StepSlider({ count, index, onChange, labels = [], disabled = false }) {
  const [width, setWidth] = useState(0)
  const trackRef = useRef(null)
  const trackX = useRef(0)
  const widthRef = useRef(0)
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  const indexRef = useRef(index)
  indexRef.current = index
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  function pick(pageX) {
    const w = widthRef.current
    if (!w) return
    const ratio = Math.min(1, Math.max(0, (pageX - trackX.current) / w))
    const next = Math.round(ratio * (count - 1))
    if (next !== indexRef.current) changeRef.current(next)
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const pageX = e.nativeEvent.pageX
        trackRef.current?.measureInWindow?.((x) => {
          trackX.current = x
          pick(pageX)
        })
      },
      onPanResponderMove: (e) => pick(e.nativeEvent.pageX),
    }),
  ).current

  const at = (i) => (count > 1 ? (i / (count - 1)) * width : 0)

  return (
    <View style={[styles.wrap, disabled && { opacity: 0.45 }]} {...pan.panHandlers}>
      <View
        ref={trackRef}
        style={styles.hit}
        onLayout={(e) => {
          setWidth(e.nativeEvent.layout.width)
          widthRef.current = e.nativeEvent.layout.width
          trackRef.current?.measureInWindow?.((x) => {
            trackX.current = x
          })
        }}
      >
        <View style={styles.track} />
        <View style={[styles.fill, { width: at(index) }]} />
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.stop, { left: at(i) - 3 }, i <= index && styles.stopOn]} />
        ))}
        {width ? <View style={[styles.thumb, { left: at(index) - THUMB / 2 }]} /> : null}
      </View>
      <View style={styles.labels}>
        {labels.map((label, i) => (
          <Text
            key={label}
            style={[
              styles.label,
              { left: at(i) - 36 },
              i === 0 && { left: -THUMB / 2 + 2, textAlign: 'left' },
              i === count - 1 && { left: undefined, right: -THUMB / 2 + 2, textAlign: 'right' },
              i === index && styles.labelOn,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: THUMB / 2, paddingTop: 6 },
  hit: { height: THUMB + 8, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.gray200 },
  fill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: colors.black },
  stop: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#c9c9c5' },
  stopOn: { backgroundColor: colors.black },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    borderColor: colors.black,
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 6px rgba(20, 21, 15, 0.2)',
  },
  labels: { height: 18, marginTop: 2 },
  label: { position: 'absolute', width: 72, textAlign: 'center', fontFamily: fonts.medium, fontSize: 11.5, color: colors.textMuted },
  labelOn: { fontFamily: fonts.bold, color: colors.black },
})
