import { useEffect, useState } from 'react'
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Card, ListRow } from './ui'
import { colors, fonts } from '../theme'

// Alhaalta nouseva valintavalikko (esim. navigointisovellus, kieli, kuvan
// lähde). options: [{ key, label, icon }]. value: valittu avain, jolloin rivillä
// näkyy ruksi (ilman valueta pelkkä toimintolista). Valinta sulkee valikon
// heti, samoin taustan napautus ja Androidin takaisin-nappi.
export default function ChoiceSheet({ visible, title, options, value, onSelect, onClose }) {
  const insets = useSafeAreaInsets()
  // Animaation arvo pysyy samana koko valikon eliniän (ei refiä renderöinnissä).
  const [rise] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (!visible) return
    rise.setValue(0)
    Animated.timing(rise, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }, [visible, rise])

  const sheetStyle = {
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }],
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Sulje" />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }, sheetStyle]}>
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
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 21, 15, 0.45)',
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
