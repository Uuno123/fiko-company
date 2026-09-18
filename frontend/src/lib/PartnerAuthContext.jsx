import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const PartnerAuthContext = createContext(undefined)

async function fetchOwnerData(ownerId) {
  const { data, error } = await supabase
    .from('restaurant_owners')
    .select('restaurant_id, restaurants(*)')
    .eq('owner_id', ownerId)

  if (error) {
    console.error('[fiko-frontend] Kumppanin ravintoloiden haku epäonnistui:', error.message)
    return { isOwner: false, restaurants: [] }
  }

  const rows = data ?? []
  // isOwner katsotaan rivien määrästä restaurant_owners-taulussa, ei siitä montako
  // ravintolaa saatiin resolvoitua - näin "tili on kumppani mutta ravintoladataa puuttuu"
  // (oikea virhetila) erottuu "tämä tili ei ole kumppani ollenkaan" -tilasta (esim. pelkkä
  // asiakastili samalla Supabase-sessiolla), vaikka molemmissa restaurants päätyisi tyhjäksi.
  return {
    isOwner: rows.length > 0,
    restaurants: rows.map((row) => row.restaurants).filter(Boolean),
  }
}

export function PartnerAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'ready')

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) {
        const owned = await fetchOwnerData(data.session.user.id)
        if (cancelled) return
        setIsOwner(owned.isOwner)
        setRestaurants(owned.restaurants)
      }
      setStatus('ready')
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      if (nextSession) {
        const owned = await fetchOwnerData(nextSession.user.id)
        if (cancelled) return
        setIsOwner(owned.isOwner)
        setRestaurants(owned.restaurants)
      } else {
        setIsOwner(false)
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
    const owned = await fetchOwnerData(session.user.id)
    setIsOwner(owned.isOwner)
    setRestaurants(owned.restaurants)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    restaurants,
    // Vain "onko Supabase-sessio olemassa" - EI riitä kumppanipääsyyn, koska sama sessio on
    // yhteinen asiakas- ja kumppanipuolen kanssa. Käytä isOwner-kenttää pääsynhallintaan.
    isAuthenticated: Boolean(session),
    isOwner,
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
