import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[delivo-backend] SUPABASE_URL / SUPABASE_ANON_KEY puuttuvat .env-tiedostosta.\n' +
      '  -> Käytetään paikallista esimerkkidataa (backend/src/data/seedRestaurants.js).\n' +
      '  -> Aja "supabase/migrations" ja "supabase/seed.sql", täytä backend/.env, ja käynnistä backend uudelleen.',
  )
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null

// Palvelimen oma avain veloituksiin (settlement.js): lukee kaikkien asiakkaiden
// tilausten maksutilan ja kirjaa veloitukset. Ohittaa RLS:n, joten se on vain
// backend/.env-tiedostossa - ei koskaan frontendissä, kuljettaja-appissa tai gitissä.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null
