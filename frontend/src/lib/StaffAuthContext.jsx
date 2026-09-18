import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const StaffAuthContext = createContext(undefined)

async function fetchStaffRow(userId) {
  const { data, error } = await supabase.from('staff_accounts').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.error('[fiko-frontend] Henkilökuntatilin haku epäonnistui:', error.message)
    return null
  }
  return data
}

export function StaffAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [staffAccount, setStaffAccount] = useState(null)
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'ready')

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) {
        const staffRow = await fetchStaffRow(data.session.user.id)
        if (cancelled) return
        setStaffAccount(staffRow)
      }
      setStatus('ready')
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return
      setSession(nextSession)
      if (nextSession) {
        const staffRow = await fetchStaffRow(nextSession.user.id)
        if (cancelled) return
        setStaffAccount(staffRow)
      } else {
        setStaffAccount(null)
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

  const value = {
    session,
    // Vain "onko Supabase-sessio olemassa" - EI riitä henkilökuntapääsyyn, koska sama sessio on
    // yhteinen asiakas- ja kumppanipuolen kanssa. Käytä isStaff-kenttää pääsynhallintaan.
    isAuthenticated: Boolean(session),
    isStaff: Boolean(staffAccount),
    staffAccount,
    status,
    signOut,
  }

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext)
  if (ctx === undefined) {
    throw new Error('useStaffAuth on kutsuttava StaffAuthProviderin sisältä.')
  }
  return ctx
}
