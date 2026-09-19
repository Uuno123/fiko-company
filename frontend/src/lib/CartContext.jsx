import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'delivo-cart'

function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.groups)) return parsed.groups
    // Vanha, yhden ravintolan muoto - muunnetaan uudeksi ryhmämuodoksi.
    if (parsed?.restaurantId && parsed?.lines?.length) {
      return [{ restaurantId: parsed.restaurantId, restaurantName: parsed.restaurantName, lines: parsed.lines }]
    }
    return null
  } catch {
    return null
  }
}

export function CartProvider({ children }) {
  const [groups, setGroups] = useState(() => readStoredCart() ?? [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups }))
    } catch {
      // localStorage ei käytettävissä (esim. yksityinen selaus) - kori toimii silti istunnon ajan.
    }
  }, [groups])

  // options: valinnainen { selectedOptions: [{groupId, groupName, optionId, name, priceDeltaCents}], unitPriceCents }
  // - ks. lib/menuOptions.js. Eri optionsKey (eri valinnat) pitää rivit erillään, sama
  // optionsKey (mukaan lukien "ei valintoja") yhdistää määrän samalle riville kuten ennenkin.
  function addItem(restaurant, item, quantity, options) {
    const selectedOptions = options?.selectedOptions ?? []
    const unitPriceCents = options?.unitPriceCents ?? item.price_cents
    const optionsKey = selectedOptions.length
      ? selectedOptions
          .map((o) => o.optionId)
          .sort()
          .join(',')
      : null

    setGroups((current) => {
      const idx = current.findIndex((g) => g.restaurantId === restaurant.id)
      const newLine = { item, quantity, selectedOptions, unitPriceCents, optionsKey }
      if (idx === -1) {
        return [...current, { restaurantId: restaurant.id, restaurantName: restaurant.name, lines: [newLine] }]
      }
      const group = current[idx]
      const existing = group.lines.find((line) => line.item.id === item.id && (line.optionsKey ?? null) === optionsKey)
      const nextLines = existing
        ? group.lines.map((line) =>
            line.item.id === item.id && (line.optionsKey ?? null) === optionsKey
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          )
        : [...group.lines, newLine]
      return current.map((g, i) => (i === idx ? { ...g, lines: nextLines } : g))
    })
  }

  // optionsKey: sama avain kuin lisättäessä (rivin tunniste kun samalla tuotteella on
  // useita eri valintayhdistelmiä ostoskorissa). Jätä pois/anna null perus (ei-valintainen) rivi.
  function setQuantity(restaurantId, itemId, quantity, optionsKey = null) {
    setGroups((current) =>
      current
        .map((g) => {
          if (g.restaurantId !== restaurantId) return g
          const matches = (line) => line.item.id === itemId && (line.optionsKey ?? null) === optionsKey
          const nextLines =
            quantity <= 0 ? g.lines.filter((line) => !matches(line)) : g.lines.map((line) => (matches(line) ? { ...line, quantity } : line))
          return { ...g, lines: nextLines }
        })
        .filter((g) => g.lines.length > 0),
    )
  }

  function removeItem(restaurantId, itemId, optionsKey = null) {
    setQuantity(restaurantId, itemId, 0, optionsKey)
  }

  function clearRestaurant(restaurantId) {
    setGroups((current) => current.filter((g) => g.restaurantId !== restaurantId))
  }

  function clear() {
    setGroups([])
  }

  const lines = groups.flatMap((g) => g.lines)
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const totalCents = lines.reduce((sum, line) => sum + line.quantity * (line.unitPriceCents ?? line.item.price_cents), 0)

  return (
    <CartContext.Provider
      value={{
        groups,
        lines,
        count,
        totalCents,
        addItem,
        setQuantity,
        removeItem,
        clearRestaurant,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
