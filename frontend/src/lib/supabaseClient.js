import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[fiko-frontend] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY puuttuvat .env-tiedostosta.\n' +
      '  -> Asiakkaan kirjautuminen ja rekisteröityminen eivät toimi ennen kuin nämä on asetettu.',
  )
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
