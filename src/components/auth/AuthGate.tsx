import type { PropsWithChildren } from "react";
import { useAuth } from "@/hooks/AuthContext";
import { LoginForm } from "./LoginForm";
import "./AuthGate.css";

/**
 * Verrou d'acces global : place entre AuthProvider et le reste de
 * l'application (voir App.tsx). Tant que l'acces n'est pas autorise,
 * `children` (HashRouter, AppShell, toutes les routes) n'est jamais
 * rendu -- pas seulement masque visuellement. Aucune page ne monte, donc
 * aucune lecture IndexedDB de page (getAllDays, getDay, etc.) ne peut se
 * declencher avant authentification.
 *
 * Reutilise integralement l'authentification existante (AuthContext,
 * authService, supabaseClient) : aucun nouveau systeme, aucun PIN local.
 *
 * Quatre etats possibles, dans cet ordre de priorite :
 * 1. Supabase non configure -> jamais d'acces, message explicite (pas de
 *    formulaire : il n'y a rien a quoi se connecter).
 * 2. Verification de la session initiale en cours -> ecran de chargement
 *    simple, jamais l'application.
 * 3. Aucune session -> LoginForm (memes ecrans que la page Compte,
 *    reutilises tels quels).
 * 4. Session valide -> `children` rendu normalement.
 *
 * Reactif par nature : `session` vient du contexte (AuthContext.onAuthStateChange,
 * inchange). Une deconnexion (session -> null) fait donc immediatement
 * redescendre ce composant sur la branche 3, ce qui demonte reellement
 * `children` -- l'integralite de l'application (donnees financieres
 * comprises) disparait du DOM, pas seulement de l'affichage.
 */
export function AuthGate({ children }: PropsWithChildren) {
  const { session, loading, isSupabaseConfigured } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-gate">
        <div className="auth-gate__panel">
          <p className="auth-gate__title">Gestion Financiere</p>
          <p className="auth-gate__message">
            L'authentification n'est pas configuree sur cet appareil. L'acces a l'application est bloque tant que
            la synchronisation cloud n'est pas configuree.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="auth-gate">
        <div className="auth-gate__panel">
          <p className="auth-gate__title">Gestion Financiere</p>
          <p className="auth-gate__message">Verification de la session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-gate">
        <div className="auth-gate__panel">
          <p className="auth-gate__title">Gestion Financiere</p>
          <p className="auth-gate__subtitle">Connectez-vous pour acceder a vos donnees.</p>
          <LoginForm />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
