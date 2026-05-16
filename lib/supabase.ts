import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This prevents the app from crashing if variables are missing
// Instead, it will log a helpful error in the console
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ SUPABASE MISSING: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not defined.\n' +
    'Please create a .env.local file with these values.'
  )
}

// Export the client with fallback strings to prevent "required" errors during initialization
export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co', 
  supabaseAnonKey || 'missing-key'
)