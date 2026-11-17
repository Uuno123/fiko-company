import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Viimeisimmät haut hakusivulla (16.11.2026): laitteelle, uusin ensin.
const KEY = 'bidrop-recent-searches'
const MAX = 6

let recent = []
let loaded = false
const listeners = new Set()

function set(next) {
  recent = next
  AsyncStorage.setItem(KEY, JSON.stringify(recent)).catch(() => {})
  for (const listener of listeners) listener(recent)
}

export function rememberSearch(term) {
  const clean = String(term ?? '').trim()
  if (clean.length < 2) return
  set([clean, ...recent.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX))
}

export function forgetSearch(term) {
  set(recent.filter((t) => t !== term))
}

export function clearSearches() {
  set([])
}

export function useRecentSearches() {
  const [list, setList] = useState(recent)
  useEffect(() => {
    listeners.add(setList)
    if (!loaded) {
      loaded = true
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          const parsed = raw ? JSON.parse(raw) : []
          if (Array.isArray(parsed)) {
            recent = parsed
            for (const listener of listeners) listener(recent)
          }
        })
        .catch(() => {})
    }
    return () => {
      listeners.delete(setList)
    }
  }, [])
  return list
}
