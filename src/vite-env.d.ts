/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase (synchronisation cloud). Absent = sync desactivee, voir services/auth/supabaseClient.ts. */
  readonly VITE_SUPABASE_URL?: string;
  /** Cle publique "anon" du projet Supabase. Jamais la cle service_role. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
