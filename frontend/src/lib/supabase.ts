import { createClient } from '@supabase/supabase-js'

// Used for sign-in only; all data goes through the FastAPI backend.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
