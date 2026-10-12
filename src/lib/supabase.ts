import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://exhwropgwwaeybzfeyei.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_O3AK5OjWHTXGqXMmgliykg_PeZvLvQV";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret_PE2Q-TvYy3dkKHORmdi-AQ_mehfKCPi";

// Client-side / public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side / administrative operations (Service Role)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
