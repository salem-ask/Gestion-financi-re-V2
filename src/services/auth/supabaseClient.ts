import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * true uniquement si les deux variables d'environnement sont renseignees
 * (voir .env.example). Tant que ce n'est pas le cas, l'authentification
 * reste desactivee sans jamais faire planter l'application : IndexedDB
 * continue de fonctionner seul, exactement comme avant cette phase.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Client Supabase partage par toute la couche auth/sync. null tant que
 * VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ne sont pas definis (voir
 * isSupabaseConfigured) : chaque appelant doit gerer ce cas, jamais
 * supposer que le client existe.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
  : null;
