import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

export const AuthContext = createContext(undefined)

async function fetchCustomerProfile(userId) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.error('[fiko-frontend] Asiakastietojen haku epäonnistui:', error.message)
    return null
  }
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'ready')

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) {
        const profile = await fetchCustomerProfile(data.session.user.id)
        if (cancelled) return
        setCustomer(profile)
      }
      setStatus('ready')
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      if (nextSession) {
        const profile = await fetchCustomerProfile(nextSession.user.id)
        if (cancelled) return
        setCustomer(profile)
      } else {
        setCustomer(null)
      }
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshCustomer() {
    if (!session) return
    const profile = await fetchCustomerProfile(session.user.id)
    setCustomer(profile)
  }

  const value = {
    session,
    customer,
    isAuthenticated: Boolean(session),
    status,
    signOut,
    refreshCustomer,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth on kutsuttava AuthProviderin sisältä.')
  }
  return ctx
}
