import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[fiko-backend] SUPABASE_URL / SUPABASE_ANON_KEY puuttuvat .env-tiedostosta.\n' +
      '  -> Käytetään paikallista esimerkkidataa (backend/src/data/seedRestaurants.js).\n' +
      '  -> Aja "supabase/migrations" ja "supabase/seed.sql", täytä backend/.env, ja käynnistä backend uudelleen.',
  )
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null
