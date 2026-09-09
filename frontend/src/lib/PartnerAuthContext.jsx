import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const PartnerAuthContext = createContext(undefined)

async function fetchOwnedRestaurants(ownerId) {
  const { data, error } = await supabase
    .from('restaurant_owners')
    .select('restaurant_id, restaurants(*)')
    .eq('owner_id', ownerId)

  if (error) {
    console.error('[fiko-frontend] Kumppanin ravintoloiden haku epäonnistui:', error.message)
    return []
  }

  return (data ?? []).map((row) => row.restaurants).filter(Boolean)
}

export function PartnerAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'ready')

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) {
        const owned = await fetchOwnedRestaurants(data.session.user.id)
        if (cancelled) return
        setRestaurants(owned)
      }
      setStatus('ready')
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      if (nextSession) {
        const owned = await fetchOwnedRestaurants(nextSession.user.id)
        if (cancelled) return
        setRestaurants(owned)
      } else {
        setRestaurants([])
      }
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function refreshRestaurants() {
    if (!session) return
    const owned = await fetchOwnedRestaurants(session.user.id)
    setRestaurants(owned)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    restaurants,
    isAuthenticated: Boolean(session),
    status,
    signOut,
    refreshRestaurants,
  }

  return <PartnerAuthContext.Provider value={value}>{children}</PartnerAuthContext.Provider>
}

export function usePartnerAuth() {
  const ctx = useContext(PartnerAuthContext)
  if (ctx === undefined) {
    throw new Error('usePartnerAuth on kutsuttava PartnerAuthProviderin sisältä.')
  }
  return ctx
}
