import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { SUPABASE_KEY, SUPABASE_URL, supabase } from './supabase'

// Kirjautuminen Googlella (ja myöhemmin Applella/Facebookilla) Supabasen kautta,
// kuten verkkosivun GoogleAuthButton: kirjautumissivu aukeaa puhelimen
// selaimeen, ja Supabase palauttaa sovellukseen (bidrop://kirjautuminen,
// Expo Gossa exp://.../--/kirjautuminen). Osoitteen pitää olla Supabasen
// sallituissa paluuosoitteissa (Authentication -> URL Configuration -> Redirect
// URLs: bidrop://** ja exp://**), muuten selain palaa verkkosivulle.

// Selainversiossa kirjautumisikkuna sulkeutuu itse paluun jälkeen.
WebBrowser.maybeCompleteAuthSession()

// Onko kirjautumistapa otettu käyttöön Supabasessa (Authentication -> Providers)?
// Ilman tarkistusta käytöstä poistettu tapa avaisi Supabasen raakaan virhesivuun.
// Jos tarkistus ei onnistu, yritetään silti.
export async function providerEnabled(provider) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
    if (!response.ok) return true
    const settings = await response.json()
    return settings.external?.[provider] !== false
  } catch {
    return true
  }
}

// Palauttaa { session } onnistuessa, { cancelled: true } jos käyttäjä sulki
// ikkunan, tai { error } virheessä.
export async function signInWithProvider(provider) {
  const redirectTo = Linking.createURL('kirjautuminen')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error || !data?.url) return { error: error ?? new Error('no url') }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success') return { cancelled: true }

  // Supabase palauttaa joko tunnukset (#access_token=...) tai koodin (?code=...).
  const [beforeHash, hash = ''] = result.url.split('#')
  const params = new URLSearchParams(hash)
  new URLSearchParams(beforeHash.split('?')[1] ?? '').forEach((value, key) => {
    if (!params.has(key)) params.set(key, value)
  })
  if (params.get('error')) return { error: new Error(params.get('error_description') ?? params.get('error')) }

  if (params.get('code')) {
    const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.get('code'))
    return exchangeError ? { error: exchangeError } : { session: exchanged.session }
  }
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return { error: new Error('missing tokens') }
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  return sessionError ? { error: sessionError } : { session: sessionData.session }
}
