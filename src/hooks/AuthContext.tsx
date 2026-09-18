import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { authService } from "@/services/auth/authService";
import { isSupabaseConfigured } from "@/services/auth/supabaseClient";

/**
 * Delai maximum accorde a la verification de session initiale
 * (authService.getCurrentSession()) avant de debloquer l'ecran de
 * chargement de force (voir AuthGate). Sans cette limite, un rafraichissement
 * de jeton qui echoue au niveau reseau (pas une reponse HTTP, un vrai echec
 * de connexion) fait retenter le SDK Supabase indefiniment en interne, et la
 * promesse de getCurrentSession() ne se resout jamais -- l'ecran "Verification
 * de la session..." resterait alors bloque pour toujours (diagnostic confirme
 * empiriquement : voir l'audit d'authentification).
 *
 * 8 secondes : assez long pour ne jamais interrompre une verification qui
 * aboutit normalement (y compris sur un reseau mobile lent, ou apres un
 * rafraichissement de jeton expire qui reussit), assez court pour rester
 * acceptable a l'ouverture de l'application plutot que de laisser l'usager
 * face a un ecran fige sans issue.
 */
const SESSION_CHECK_TIMEOUT_MS = 8000;

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
 *
 * La verification initiale de session (getCurrentSession()) et le delai
 * de secours (SESSION_CHECK_TIMEOUT_MS) sont en course l'un contre
 * l'autre : le premier des deux a se produire fait sortir de l'etat de
 * chargement (voir `settled`, qui garantit que ce n'est jamais fait deux
 * fois). Une erreur ou un timeout ne sont JAMAIS traites comme une preuve
 * que le compte n'existe plus ou que l'utilisateur est deconnecte : ils se
 * contentent de debloquer l'ecran (AuthGate affiche alors le formulaire de
 * connexion) sans jamais toucher a `session` -- si getCurrentSession()
 * finit par aboutir plus tard (reseau retabli) ou si onAuthStateChange
 * emet un evenement entre-temps, `session` est mis a jour normalement et
 * l'application se debloque toute seule, sans reconnexion manuelle.
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
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    /** Fait sortir de l'etat de chargement une seule fois, quelle que soit la source (succes, erreur, ou timeout). */
    function settleLoading() {
      if (settled || !active) return;
      settled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      setLoading(false);
    }

    timeoutId = setTimeout(settleLoading, SESSION_CHECK_TIMEOUT_MS);

    authService
      .getCurrentSession()
      .then((current) => {
        if (active) setSession(current);
      })
      .catch((error) => {
        // Erreur HTTP ou reseau pendant la verification/le rafraichissement :
        // journalisee, mais jamais traitee comme une deconnexion -- `session`
        // n'est jamais modifie ici (voir le commentaire de fonction ci-dessus).
        console.error("Echec de la verification de session :", error);
      })
      .finally(settleLoading);

    const unsubscribe = authService.onAuthStateChange((next) => {
      if (active) setSession(next);
    });

    return () => {
      active = false;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
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
