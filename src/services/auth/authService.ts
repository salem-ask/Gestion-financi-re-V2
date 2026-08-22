import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

/** Levee par toute methode d'authentification tant que Supabase n'est pas configure (voir supabaseClient.ts). */
export class AuthNotConfiguredError extends Error {
  constructor() {
    super(
      "La synchronisation cloud n'est pas encore configuree (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants)."
    );
    this.name = "AuthNotConfiguredError";
  }
}

function requireClient() {
  if (!supabase) throw new AuthNotConfiguredError();
  return supabase;
}

/**
 * Cree un compte par email/mot de passe. Selon la configuration du projet
 * Supabase, une confirmation par email peut etre requise : dans ce cas
 * data.session reste null jusqu'a la confirmation (l'appelant doit geler
 * ce cas, voir AccountPage).
 */
export async function signUp(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Renvoie l'email de confirmation d'inscription (utilise quand data.session
 * reste null apres signUp, voir ci-dessus). Passe par l'endpoint /resend
 * dedie de Supabase plutot que par un nouvel appel a signUp.
 */
export async function resendConfirmationEmail(email: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.auth.resend({ type: "signup", email });
  if (error) throw error;
}

/**
 * null si Supabase n'est pas configure ou si personne n'est connecte
 * (jamais une erreur dans ce cas). En revanche, si getSession() (y compris
 * son rafraichissement automatique interne du jeton) echoue, l'erreur est
 * levee au lieu d'etre ignoree : mieux vaut echouer explicitement que de
 * continuer avec une session/un jeton invalide (voir diagnostic 401 sur
 * les requetes de synchronisation).
 */
export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** S'abonne aux changements de session (connexion/deconnexion/rafraichissement). Retourne une fonction de desabonnement. */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export const authService = {
  signUp,
  signIn,
  signOut,
  resendConfirmationEmail,
  getCurrentSession,
  onAuthStateChange,
  isSupabaseConfigured,
};
