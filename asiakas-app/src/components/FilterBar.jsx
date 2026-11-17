import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SlidersHorizontal, X } from 'lucide-react-native'
import { activeFilterChips, clearChip } from '../lib/restaurantFilters'
import { colors, fonts } from '../theme'

// Suodata-nappi ja valitut rajaukset poistettavina pillereinä (17.11.2026).
// showButton=false: vain pillerit (haussa Suodata-nappi on hakukentän vieressä).
export default function FilterBar({ filters, onOpen, onChange, style, showButton = true }) {
  const chips = activeFilterChips(filters)
  if (!showButton && chips.length === 0) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {showButton ? (
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.button, pressed && { backgroundColor: colors.gray200 }]}
        accessibilityRole="button"
        accessibilityLabel={chips.length ? `Suodata, ${chips.length} valittu` : 'Suodata'}
      >
        <SlidersHorizontal size={15} strokeWidth={2.3} color={colors.black} />
        <Text style={styles.buttonText}>Suodata</Text>
        {chips.length ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{chips.length}</Text>
          </View>
        ) : null}
      </Pressable>
      ) : null}
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          onPress={() => onChange(clearChip(filters, chip))}
          style={({ pressed }) => [styles.chip, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel={`Poista rajaus ${chip.label}`}
        >
          <Text style={styles.chipText}>{chip.label}</Text>
          <X size={13} strokeWidth={2.6} color="#ffffff" />
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black },
  count: {
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.black,
  },
  countText: { fontFamily: fonts.bold, fontSize: 11, color: '#ffffff' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingLeft: 13,
    paddingRight: 11,
    borderRadius: 18,
    backgroundColor: colors.black,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: '#ffffff' },
})
