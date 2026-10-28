import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import OptionSheet from './OptionSheet'
import { colors, fonts } from '../theme'

// Syntymäaika kolmena valintana kuten verkkosivulla (AuthInputs.jsx
// BirthDateField): "1." "syyskuuta" "2000". Valinta avaa alhaalta nousevan
// listan. value: { day, month, year } merkkijonoina ('' = valitsematta).

const MONTHS = [
  'tammikuuta',
  'helmikuuta',
  'maaliskuuta',
  'huhtikuuta',
  'toukokuuta',
  'kesäkuuta',
  'heinäkuuta',
  'elokuuta',
  'syyskuuta',
  'lokakuuta',
  'marraskuuta',
  'joulukuuta',
]

const DAYS = Array.from({ length: 31 }, (_, index) => ({ key: String(index + 1), label: `${index + 1}.` }))
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ key: String(index + 1), label }))

export default function BirthDateField({ label, value, onChange, latestYear, error, hint }) {
  const [open, setOpen] = useState(null)
  // Viimeksi avattu osa: lista pitää sisältönsä myös sulkeutumisen ajan.
  const [shown, setShown] = useState('day')
  const years = Array.from({ length: 100 }, (_, index) => {
    const year = String(latestYear - index)
    return { key: year, label: year }
  })

  const parts = [
    { key: 'day', placeholder: 'Päivä', options: DAYS, title: 'Päivä', flex: 1.05 },
    { key: 'month', placeholder: 'Kuukausi', options: MONTH_OPTIONS, title: 'Kuukausi', flex: 1.45 },
    { key: 'year', placeholder: 'Vuosi', options: years, title: 'Vuosi', flex: 1.1 },
  ]
  const current = parts.find((part) => part.key === shown)

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {parts.map((part) => {
          const selected = part.options.find((option) => option.key === value[part.key])
          return (
            <Pressable
              key={part.key}
              onPress={() => {
                setShown(part.key)
                setOpen(part.key)
              }}
              style={({ pressed }) => [
                styles.select,
                { flex: part.flex },
                open === part.key && styles.selectOpen,
                error && !selected && styles.selectError,
                pressed && styles.selectPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${label ?? ''} ${part.title}: ${selected ? selected.label : 'valitsematta'}`}
            >
              <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
                {selected ? selected.label : part.placeholder}
              </Text>
              <ChevronDown size={16} strokeWidth={2.2} color={colors.textMuted} />
            </Pressable>
          )
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <OptionSheet
        visible={open !== null}
        title={current.title}
        options={current.options}
        value={value[current.key]}
        onSelect={(key) => onChange({ ...value, [shown]: key })}
        onClose={() => setOpen(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.black,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    height: 56,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  selectOpen: {
    borderColor: '#b9bcb3',
  },
  selectError: {
    borderColor: '#c2334a',
  },
  selectPressed: {
    backgroundColor: colors.gray50,
  },
  value: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  placeholder: {
    color: colors.gray400,
  },
  hint: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  error: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#c2334a',
  },
})
