import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { Bike, Clock, Tag } from 'lucide-react-native'
import Smiley from './Smiley'
import { colors, fonts } from '../theme'

// Harmaat pikavalintapillerit headerin ja kuvapromojen välissä (käyttäjän
// pyyntö 15.11.2026, Uber Eatsin tapaan). query: sama hakusana kuin
// verkkosivun pikavalinnoissa (lib/quickFilters.js, isDealsQuery).
export const QUICK_PILLS = [
  { id: 'deals', label: 'Tarjoukset', query: 'Tarjoukset', Icon: Tag },
  { id: 'fast', label: 'Alle 30 min', query: 'Alle 30 min', Icon: Clock },
  { id: 'top', label: 'Parhaat arviot', query: 'Arvio 9+', Icon: SmileyIcon },
  { id: 'free', label: 'Ilmainen kuljetus', query: 'Ilmainen kuljetus', Icon: Bike },
]

function SmileyIcon({ size, color }) {
  return <Smiley face="great" size={size} color={color} strokeWidth={2} />
}

export default function QuickPills({ onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {QUICK_PILLS.map(({ id, label, query, Icon }) => (
        <Pressable
          key={id}
          onPress={() => onSelect?.(query)}
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Icon size={16} strokeWidth={2.1} color={colors.black} />
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: colors.gray100,
  },
  pressed: { backgroundColor: colors.gray200 },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black },
})
