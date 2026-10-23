import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { tr } from './i18n'
import { unregisterPushToken } from './notifications'
import { supabase } from './supabase'

// Kuljettajan kirjautuminen. Kuljettaja kirjautuu samoilla tunnuksilla kuin
// delivon verkkosivulla, mutta keikkoja saa vain hyväksytty kuljettaja: tilillä
// pitää olla rivi couriers-taulussa (delivo lisää sen, migraatio 0043).
// status: 'loading' | 'signed-out' | 'not-courier' | 'ready'.

const AuthContext = createContext(null)

async function fetchCourier(userId) {
  const { data, error } = await supabase.from('couriers').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [courier, setCourier] = useState(null)
  const [status, setStatus] = useState(supabase ? 'loading' : 'signed-out')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return undefined
    let cancelled = false

    async function apply(nextSession) {
      if (cancelled) return
      setSession(nextSession)
      if (!nextSession) {
        setCourier(null)
        setStatus('signed-out')
        return
      }
      try {
        const row = await fetchCourier(nextSession.user.id)
        if (cancelled) return
        setCourier(row)
        setStatus(row ? 'ready' : 'not-courier')
        setError('')
      } catch (err) {
        if (cancelled) return
        // Esim. tietokantamuutosta 0043 ei ole vielä ajettu tai verkko puuttuu.
        setCourier(null)
        setStatus('not-courier')
        setError(err?.message ?? tr('auth.fetchFailed'))
      }
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Supabase suosittelee, ettei kuuntelijassa odoteta muita kutsuja suoraan.
      setTimeout(() => apply(nextSession), 0)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  // Kuljettajatiedot uudelleen (esim. kun delivo on hyväksynyt muutospyynnön).
  // Pysyvä funktio, jotta näkymät voivat kutsua sitä tullessaan esiin.
  const userId = session?.user.id ?? null
  const refreshCourier = useCallback(async () => {
    if (!supabase || !userId) return
    try {
      const row = await fetchCourier(userId)
      if (row) setCourier(row)
    } catch {
      // Verkkovirhe: vanhat tiedot jäävät näkyviin.
    }
  }, [userId])

  const value = {
    session,
    user: session?.user ?? null,
    courier,
    status,
    error,
    async signIn(email, password) {
      if (!supabase) throw new Error('Supabase-yhteyttä ei ole määritetty (kuljettaja-app/.env).')
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) throw signInError
    },
    async signOut() {
      // Ensin push-tunnus pois, ettei puhelin saa enää tämän kuljettajan ilmoituksia.
      await unregisterPushToken()
      await supabase?.auth.signOut()
    },
    refreshCourier,
    // Kuljettaja saa päivittää itse vain puhelinnumeronsa ja kielensä (0051).
    async updateCourier(patch) {
      if (!supabase || !courier) throw new Error('Ei kirjautunutta kuljettajaa.')
      const { data, error: updateError } = await supabase.from('couriers').update(patch).eq('id', courier.id).select().single()
      if (updateError) throw updateError
      setCourier(data)
      return data
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth on kutsuttava AuthProviderin sisältä.')
  return context
}
