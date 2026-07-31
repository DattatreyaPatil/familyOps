import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseAuthEnabled = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseAuthEnabled ? createClient(supabaseUrl!, supabasePublishableKey!) : null;
