import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'fiko-cart'

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

  function addItem(restaurant, item, quantity) {
    setGroups((current) => {
      const idx = current.findIndex((g) => g.restaurantId === restaurant.id)
      if (idx === -1) {
        return [...current, { restaurantId: restaurant.id, restaurantName: restaurant.name, lines: [{ item, quantity }] }]
      }
      const group = current[idx]
      const existing = group.lines.find((line) => line.item.id === item.id)
      const nextLines = existing
        ? group.lines.map((line) => (line.item.id === item.id ? { ...line, quantity: line.quantity + quantity } : line))
        : [...group.lines, { item, quantity }]
      return current.map((g, i) => (i === idx ? { ...g, lines: nextLines } : g))
    })
  }

  function setQuantity(restaurantId, itemId, quantity) {
    setGroups((current) =>
      current
        .map((g) => {
          if (g.restaurantId !== restaurantId) return g
          const nextLines =
            quantity <= 0
              ? g.lines.filter((line) => line.item.id !== itemId)
              : g.lines.map((line) => (line.item.id === itemId ? { ...line, quantity } : line))
          return { ...g, lines: nextLines }
        })
        .filter((g) => g.lines.length > 0),
    )
  }

  function removeItem(restaurantId, itemId) {
    setQuantity(restaurantId, itemId, 0)
  }

  function clearRestaurant(restaurantId) {
    setGroups((current) => current.filter((g) => g.restaurantId !== restaurantId))
  }

  function clear() {
    setGroups([])
  }

  const lines = groups.flatMap((g) => g.lines)
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const totalCents = lines.reduce((sum, line) => sum + line.quantity * line.item.price_cents, 0)

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
