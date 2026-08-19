import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { authService } from "@/services/auth/authService";
import { isSupabaseConfigured } from "@/services/auth/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  /** true pendant la recuperation de la session initiale (evite un "non connecte" trompeur au premier rendu). */
  loading: boolean;
  isSupabaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  isSupabaseConfigured: false,
});

/**
 * Fournit l'etat d'authentification a toute l'application (session
 * courante + etat de chargement). Ne touche jamais a storageService ni
 * IndexedDB : c'est une couche entierement separee, purement liee au
 * compte utilisateur Supabase.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    authService.getCurrentSession().then((current) => {
      if (active) {
        setSession(current);
        setLoading(false);
      }
    });

    const unsubscribe = authService.onAuthStateChange((next) => setSession(next));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, isSupabaseConfigured }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
