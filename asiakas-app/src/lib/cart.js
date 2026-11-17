import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Ostoskori sovelluksessa (17.11.2026): sama rakenne ja toiminta kuin
// verkkosivun lib/CartContext.jsx - ryhmät ravintoloittain, rivit valintoineen
// (optionsKey erottaa eri valintayhdistelmät), unitPriceCents sisältää päivän
// tarjouksen ja lisävalinnat. Tallennetaan laitteelle.
const KEY = 'bidrop-cart'

let groups = []
let loaded = false
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener(groups)
}

function setGroups(next) {
  groups = typeof next === 'function' ? next(groups) : next
  if (groups.length === 0) AsyncStorage.removeItem(KEY).catch(() => {})
  else AsyncStorage.setItem(KEY, JSON.stringify({ groups })).catch(() => {})
  emit()
}

function load() {
  if (loaded) return
  loaded = true
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      const parsed = raw ? JSON.parse(raw) : null
      if (Array.isArray(parsed?.groups) && groups.length === 0) {
        groups = parsed.groups
        emit()
      }
    })
    .catch(() => {})
}

const keyOf = (selectedOptions) =>
  selectedOptions?.length
    ? selectedOptions
        .map((o) => o.optionId)
        .sort()
        .join(',')
    : null

export function addItem(restaurant, item, quantity, options) {
  const selectedOptions = options?.selectedOptions ?? []
  const unitPriceCents = options?.unitPriceCents ?? item.price_cents
  const optionsKey = keyOf(selectedOptions)
  // Kori tallentaa vain tarvittavat tuotetiedot (ei valintaryhmiä).
  const stored = { id: item.id, name: item.name, price_cents: item.price_cents, image_url: item.image_url ?? null }
  setGroups((current) => {
    const idx = current.findIndex((g) => g.restaurantId === restaurant.id)
    const newLine = { item: stored, quantity, selectedOptions, unitPriceCents, optionsKey }
    if (idx === -1) {
      return [...current, { restaurantId: restaurant.id, restaurantName: restaurant.name, lines: [newLine] }]
    }
    const group = current[idx]
    const same = (line) => line.item.id === item.id && (line.optionsKey ?? null) === optionsKey
    const nextLines = group.lines.some(same)
      ? group.lines.map((line) => (same(line) ? { ...line, quantity: line.quantity + quantity } : line))
      : [...group.lines, newLine]
    return current.map((g, i) => (i === idx ? { ...g, lines: nextLines } : g))
  })
}

export function setQuantity(restaurantId, itemId, quantity, optionsKey = null) {
  setGroups((current) =>
    current
      .map((g) => {
        if (g.restaurantId !== restaurantId) return g
        const matches = (line) => line.item.id === itemId && (line.optionsKey ?? null) === optionsKey
        const lines =
          quantity <= 0
            ? g.lines.filter((line) => !matches(line))
            : g.lines.map((line) => (matches(line) ? { ...line, quantity } : line))
        return { ...g, lines }
      })
      .filter((g) => g.lines.length > 0),
  )
}

export function clearRestaurant(restaurantId) {
  setGroups((current) => current.filter((g) => g.restaurantId !== restaurantId))
}

export function lineUnitPriceCents(line) {
  return line.unitPriceCents ?? line.item.price_cents
}

export function groupTotalCents(group) {
  return group.lines.reduce((sum, line) => sum + lineUnitPriceCents(line) * line.quantity, 0)
}

export function groupCount(group) {
  return group.lines.reduce((sum, line) => sum + line.quantity, 0)
}

export function useCart() {
  const [snapshot, setSnapshot] = useState(groups)
  useEffect(() => {
    listeners.add(setSnapshot)
    load()
    setSnapshot(groups)
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])
  const count = snapshot.reduce((sum, g) => sum + groupCount(g), 0)
  return { groups: snapshot, count }
}
