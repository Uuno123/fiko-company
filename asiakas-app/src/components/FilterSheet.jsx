import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Check, MapPin } from 'lucide-react-native'
import BottomSheet from './BottomSheet'
import StepSlider from './StepSlider'
import { Toggle } from './SettingsUI'
import {
  DISTANCE_STEPS,
  EMPTY_FILTERS,
  ETA_OPTIONS,
  OFFER_OPTIONS,
  SCORE_OPTIONS,
  SORTS,
  distanceLabel,
} from '../lib/restaurantFilters'
import { colors, fonts } from '../theme'

// Suodatuspaneeli (käyttäjän pyyntö 17.11.2026): järjestys, etäisyys
// valitusta osoitteesta metreinä/kilometreinä, toimitusaika, arvio, avoinna
// nyt, ilmainen kuljetus, tarjoukset ja keittiöt. Muutokset näkyvät heti;
// alhaalla tulosmäärä ja Tyhjennä.
export default function FilterSheet({ visible, onClose, value, onChange, resultCount, categories = [], address, showOffers = true }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const toggleIn = (key, item) =>
    set({ [key]: value[key].includes(item) ? value[key].filter((v) => v !== item) : [...value[key], item] })
  const kmIndex = Math.max(0, DISTANCE_STEPS.indexOf(value.maxKm))

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Suodata"
      dragFromHeaderOnly
      footer={
        <View style={styles.footer}>
          <Pressable onPress={() => onChange(EMPTY_FILTERS)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.clear}>Tyhjennä</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.show, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
          >
            <Text style={styles.showText}>
              {resultCount === 0 ? 'Ei tuloksia' : `Näytä ${resultCount} ${resultCount === 1 ? 'ravintola' : 'ravintolaa'}`}
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <Section title="Järjestys">
          {SORTS.map((sort) => {
            const on = value.sort === sort.key
            const disabled = sort.key === 'distance' && !address
            return (
              <Pressable
                key={sort.key}
                onPress={() => !disabled && set({ sort: sort.key })}
                style={({ pressed }) => [styles.radioRow, disabled && { opacity: 0.4 }, pressed && { opacity: 0.6 }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, disabled }}
              >
                <Text style={[styles.radioText, on && styles.radioTextOn]}>{sort.label}</Text>
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={13} strokeWidth={3} color="#ffffff" /> : null}</View>
              </Pressable>
            )
          })}
        </Section>

        <Section
          title="Etäisyys"
          aside={<Text style={styles.aside}>{value.maxKm == null ? 'Ei rajaa' : `Enintään ${distanceLabel(value.maxKm)}`}</Text>}
        >
          <View style={styles.from}>
            <MapPin size={14} strokeWidth={2.2} color={colors.textMuted} />
            <Text style={styles.fromText} numberOfLines={1}>
              {address ? `Osoitteesta ${address.label}` : 'Lisää toimitusosoite, niin etäisyydet näkyvät.'}
            </Text>
          </View>
          <StepSlider
            count={DISTANCE_STEPS.length}
            index={kmIndex}
            onChange={(i) => set({ maxKm: DISTANCE_STEPS[i] })}
            labels={DISTANCE_STEPS.map(distanceLabel)}
            disabled={!address}
          />
        </Section>

        <Section title="Toimitusaika">
          <Chips
            options={ETA_OPTIONS.map((m) => ({ key: String(m), label: m == null ? 'Kaikki' : `Alle ${m} min`, on: value.maxEta === m }))}
            onPress={(key) => set({ maxEta: key === 'null' ? null : Number(key) })}
          />
        </Section>

        <Section title="Arvio">
          <Chips
            options={SCORE_OPTIONS.map((s) => ({ key: String(s), label: s == null ? 'Kaikki' : `${s}+`, on: value.minScore === s }))}
            onPress={(key) => set({ minScore: key === 'null' ? null : Number(key) })}
          />
        </Section>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Avoinna nyt</Text>
          <Toggle value={value.openNow} onChange={(v) => set({ openNow: v })} label="Avoinna nyt" />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Ilmainen kuljetus</Text>
          <Toggle value={value.freeDelivery} onChange={(v) => set({ freeDelivery: v })} label="Ilmainen kuljetus" />
        </View>

        {showOffers ? (
          <Section title="Tarjous">
            <Chips
              options={OFFER_OPTIONS.map((o) => ({ key: o.value, label: o.label, on: value.offers.includes(o.value) }))}
              onPress={(key) => toggleIn('offers', key)}
            />
          </Section>
        ) : null}

        {categories.length > 0 ? (
          <Section title="Keittiö">
            <Chips
              options={categories.map((c) => ({ key: c, label: c, on: value.categories.includes(c) }))}
              onPress={(key) => toggleIn('categories', key)}
            />
          </Section>
        ) : null}
      </ScrollView>
    </BottomSheet>
  )
}

function Section({ title, aside, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {aside}
      </View>
      {children}
    </View>
  )
}

function Chips({ options, onPress }) {
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          onPress={() => onPress(option.key)}
          style={({ pressed }) => [styles.chip, option.on && styles.chipOn, pressed && !option.on && { backgroundColor: colors.gray200 }]}
          accessibilityRole="button"
          accessibilityState={{ selected: option.on }}
        >
          <Text style={[styles.chipText, option.on && styles.chipTextOn]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.headingBold, fontSize: 17, letterSpacing: -0.2, color: colors.black },
  aside: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black },
  radioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  radioText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  radioTextOn: { fontFamily: fonts.semibold },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c9c9c5',
    borderRadius: 11,
  },
  radioOn: { borderColor: colors.black, backgroundColor: colors.black },
  from: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  fromText: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { justifyContent: 'center', height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.gray100 },
  chipOn: { backgroundColor: colors.black },
  chipText: { fontFamily: fonts.semibold, fontSize: 13.5, color: colors.black },
  chipTextOn: { color: '#ffffff' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingVertical: 4,
  },
  toggleText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.black },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e6e6e3',
  },
  clear: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' },
  show: { height: 44, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 22, backgroundColor: colors.black },
  showText: { fontFamily: fonts.semibold, fontSize: 14.5, color: '#ffffff' },
})
