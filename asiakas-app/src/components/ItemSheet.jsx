import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Check, Minus, Plus } from 'lucide-react-native'
import BottomSheet from './BottomSheet'
import { FadeImage } from './RestaurantCard'
import DealPrice from './DealPrice'
import {
  areAllGroupsValid,
  buildSelectedOptionsPayload,
  computeTotalDeltaCents,
  getDefaultSelection,
  getOptionGroups,
  isGroupValid,
} from '../../../frontend/src/lib/menuOptions'
import { dealPriceCents } from '../../../frontend/src/lib/dailyDeals'
import { formatPrice } from '../../../frontend/src/lib/format'
import { addItem } from '../lib/cart'
import { imageUri } from '../lib/restaurants'
import { colors, fonts } from '../theme'

// Tuotteen paneeli kuten verkkosivun tuoteikkuna (RestaurantPage.jsx): kuva,
// kuvaus, hinta päivän tarjouksella, valintaryhmät (lib/menuOptions.js:
// pakolliset, yksi/monta, ilmaiset valinnat), määrä ja Lisää tilaukseen.
export default function ItemSheet({ restaurant, item, onClose, closed }) {
  const groups = useMemo(() => (item ? getOptionGroups(item) : []), [item])
  const [selections, setSelections] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!item) return
    Promise.resolve().then(() => {
      setSelections(Object.fromEntries(groups.map((g) => [g.id, getDefaultSelection(g)])))
      setQuantity(1)
      setAdded(false)
    })
  }, [item, groups])

  if (!item) return <BottomSheet visible={false} onClose={onClose} title="" />

  const deltaCents = computeTotalDeltaCents(groups, selections)
  const unitPriceCents = dealPriceCents(item) + deltaCents
  const valid = areAllGroupsValid(groups, selections)
  const soldOut = item.is_available === false
  const uri = imageUri(item.image_url)

  function toggle(group, optionId) {
    setSelections((current) => {
      const selected = current[group.id] ?? []
      if (group.selection_type === 'single') {
        if (selected.includes(optionId) && group.min_selections === 0) return { ...current, [group.id]: [] }
        return { ...current, [group.id]: [optionId] }
      }
      if (selected.includes(optionId)) return { ...current, [group.id]: selected.filter((id) => id !== optionId) }
      if (selected.length >= (group.max_selections ?? Infinity)) return current
      return { ...current, [group.id]: [...selected, optionId] }
    })
  }

  function add() {
    if (soldOut || closed || !valid || added) return
    addItem(restaurant, item, quantity, {
      selectedOptions: buildSelectedOptionsPayload(groups, selections),
      unitPriceCents,
    })
    // Pieni vahvistus napissa, sitten paneeli sulkeutuu (kuten verkkosivulla).
    setAdded(true)
    setTimeout(onClose, 350)
  }

  return (
    <BottomSheet
      visible={Boolean(item)}
      onClose={onClose}
      title={item.name}
      dragFromHeaderOnly
      footer={
        <View style={styles.footer}>
          {soldOut || closed ? (
            <View style={[styles.addButton, styles.addDisabled]}>
              <Text style={styles.addText}>{soldOut ? 'Loppu valikoimasta' : 'Ravintola on suljettu'}</Text>
            </View>
          ) : (
            <>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  hitSlop={6}
                  style={styles.stepButton}
                  accessibilityLabel="Vähennä määrää"
                >
                  <Minus size={16} strokeWidth={2.4} color={quantity > 1 ? colors.black : colors.gray400} />
                </Pressable>
                <Text style={styles.qty}>{quantity}</Text>
                <Pressable onPress={() => setQuantity((q) => q + 1)} hitSlop={6} style={styles.stepButton} accessibilityLabel="Lisää määrää">
                  <Plus size={16} strokeWidth={2.4} color={colors.black} />
                </Pressable>
              </View>
              <Pressable
                onPress={add}
                disabled={!valid}
                style={({ pressed }) => [
                  styles.addButton,
                  !valid && styles.addDisabled,
                  pressed && { opacity: 0.85 },
                  added && { transform: [{ scale: 0.97 }] },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.addText}>Lisää tilaukseen · {formatPrice(unitPriceCents * quantity)}</Text>
              </Pressable>
            </>
          )}
        </View>
      }
    >
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {uri ? (
          <View style={styles.media}>
            <FadeImage uri={uri} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        ) : null}
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        <DealPrice item={item} size={18} style={{ marginTop: 12 }} />

        {groups.map((group) => {
          const selected = selections[group.id] ?? []
          const max = group.max_selections ?? Infinity
          const hint =
            group.selection_type === 'single'
              ? group.min_selections > 0
                ? 'Valitse yksi'
                : 'Valitse yksi (valinnainen)'
              : group.max_selections
                ? `Valitse ${group.min_selections}-${group.max_selections}`
                : group.min_selections > 0
                  ? `Valitse vähintään ${group.min_selections}`
                  : 'Valitse haluamasi'
          return (
            <View key={group.id} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={[styles.groupHint, !isGroupValid(group, selected) && styles.groupHintError]}>
                  {hint}
                  {group.free_selections > 0 ? ` · ${group.free_selections} ilmaiseksi` : ''}
                </Text>
              </View>
              {group.menu_item_options.map((option) => {
                const on = selected.includes(option.id)
                const disabled = !on && group.selection_type === 'multi' && selected.length >= max
                const radio = group.selection_type === 'single'
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => !disabled && toggle(group, option.id)}
                    style={({ pressed }) => [styles.option, disabled && { opacity: 0.4 }, pressed && { opacity: 0.6 }]}
                    accessibilityRole={radio ? 'radio' : 'checkbox'}
                    accessibilityState={{ checked: on, disabled }}
                  >
                    <Text style={styles.optionName}>
                      {option.name}
                      {option.price_delta_cents > 0 ? (
                        <Text style={styles.optionPrice}>  +{formatPrice(option.price_delta_cents)}</Text>
                      ) : null}
                    </Text>
                    <View style={[radio ? styles.radio : styles.checkbox, on && styles.controlOn]}>
                      {on ? <Check size={13} strokeWidth={3} color="#ffffff" /> : null}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          )
        })}
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  media: { width: '100%', aspectRatio: 1.6, marginTop: 6, overflow: 'hidden', borderRadius: 16, backgroundColor: colors.gray100 },
  description: { marginTop: 14, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.textMuted },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  price: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
  oldPrice: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textDecorationLine: 'line-through' },
  dealBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.offerRed },
  dealBadgeText: { fontFamily: fonts.bold, fontSize: 12, color: '#ffffff' },
  group: { marginTop: 22 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  groupName: { flexShrink: 1, fontFamily: fonts.headingBold, fontSize: 17, color: colors.black },
  groupHint: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textMuted },
  groupHintError: { color: colors.offerRed },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e3',
  },
  optionName: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  optionPrice: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c9c9c5',
    borderRadius: 11,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c9c9c5',
    borderRadius: 6,
  },
  controlOn: { borderColor: colors.black, backgroundColor: colors.black },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e6e6e3',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 46, borderRadius: 12, backgroundColor: colors.gray100 },
  stepButton: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 18, textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  // Vähemmän pyöreät kulmat (käyttäjän pyyntö 17.11.2026).
  addButton: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.black },
  addDisabled: { backgroundColor: colors.gray400 },
  addText: { fontFamily: fonts.semibold, fontSize: 14.5, color: '#ffffff' },
})
