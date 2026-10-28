import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HOME_PATH } from './links'
import { supabase } from './supabase'

// Kirjautuminen kuten verkkosivulla (frontend/src/lib/AuthContext.jsx): istunto
// Supabasesta ja asiakkaan oma rivi customers-taulusta. Rivi syntyy tyhjänä
// heti sähköpostin vahvistuksessa (handle_new_customer-trigger), ja nimi,
// puhelin ja syntymäaika täytetään rekisteröitymisen tietovaiheessa.
const AuthContext = createContext(null)

async function fetchCustomer(userId) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.warn('[bidrop] Asiakastietojen haku epäonnistui:', error.message)
    return null
  }
  return data
}

// Rekisteröityminen on kesken, kunnes nimi on tallennettu tilin tietoihin
// (salasana asetetaan samassa vaiheessa) ja asiakasrivillä on nimi, puhelin
// ja syntymäaika - sama sääntö kuin verkkosivun Register.jsx:ssä.
export function profileComplete(session, customer) {
  if (!session?.user.user_metadata?.name) return false
  return Boolean(customer?.name?.trim() && customer?.phone?.trim() && customer?.birth_date)
}

// Minne kirjautunut ohjataan: kesken jäänyt rekisteröityminen jatkuu tietovaiheesta.
export function nextPath(session, customer) {
  return profileComplete(session, customer) ? HOME_PATH : '/rekisteroidy'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  // Asiakasrivi ja käyttäjä, jolle se haettiin: rivi kuuluu nykyiselle
  // istunnolle vasta kun haku sille on valmis (rivi voi myös puuttua).
  const [loaded, setLoaded] = useState({ userId: null, row: null })
  const setCustomer = useCallback((userId, row) => setLoaded({ userId, row }), [])
  // 'loading' kunnes tallennettu istunto ja asiakasrivi on luettu.
  const [status, setStatus] = useState(supabase ? 'loading' : 'ready')

  useEffect(() => {
    if (!supabase) return undefined
    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      if (data.session) {
        const row = await fetchCustomer(data.session.user.id)
        if (cancelled) return
        setCustomer(data.session.user.id, row)
      }
      setStatus('ready')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled || event === 'INITIAL_SESSION') return
      setSession(nextSession)
      if (!nextSession) return
      // Supabasen ohje: ei odoteta muita Supabase-kutsuja tämän kuuntelijan sisällä.
      setTimeout(async () => {
        const row = await fetchCustomer(nextSession.user.id)
        if (!cancelled) setCustomer(nextSession.user.id, row)
      }, 0)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [setCustomer])

  const refreshCustomer = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return null
    const row = await fetchCustomer(data.session.user.id)
    setCustomer(data.session.user.id, row)
    return row
  }, [setCustomer])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const userId = session?.user.id ?? null
  // customerReady: asiakasrivin haku on valmis nykyiselle istunnolle (ilman istuntoa aina).
  const customerReady = !userId || loaded.userId === userId
  const customer = userId && loaded.userId === userId ? loaded.row : null

  const value = useMemo(
    () => ({ session, customer, customerReady, status, refreshCustomer, signOut }),
    [session, customer, customerReady, status, refreshCustomer, signOut],
  )
  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth on kutsuttava AuthProviderin sisältä.')
  return context
}
