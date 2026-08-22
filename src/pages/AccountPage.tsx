import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/AuthContext";
import { authService } from "@/services/auth/authService";
import { syncService } from "@/services/sync/syncService";
import type { SyncNowResult } from "@/services/sync/syncService";
import { LoginForm } from "@/components/auth/LoginForm";
import "./AccountPage.css";

/**
 * Extrait un message d'erreur exploitable, que l'erreur soit une vraie
 * instance Error ou un objet Supabase-like ({message, details, hint,
 * code} -- jamais instanceof Error, voir diagnostic "Erreur inconnue").
 * "Erreur inconnue." reste le dernier recours si rien d'exploitable n'est
 * trouve.
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const supabaseErr = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [supabaseErr.message, supabaseErr.details, supabaseErr.hint].filter(Boolean);
    if (parts.length > 0) {
      const code = supabaseErr.code ? ` (code ${supabaseErr.code})` : "";
      return `${parts.join(" — ")}${code}`;
    }
  }
  return "Erreur inconnue.";
}

/**
 * Page Compte : etat "connecte" + synchronisation manuelle (PHASE 5 : PULL
 * cloud -> local puis PUSH local -> cloud, dans cet ordre, en un seul
 * cycle). Le formulaire de connexion/inscription est desormais dans
 * LoginForm (voir components/auth/LoginForm.tsx), reutilise ici tel quel
 * -- AuthGate l'utilise aussi pour verrouiller l'application avant
 * authentification. Ne touche a aucune donnee financiere directement :
 * delegue entierement a syncService, qui lui-meme passe exclusivement par
 * storageService pour toute lecture/ecriture locale.
 */
export function AccountPage() {
  const { session, loading, isSupabaseConfigured } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncNowResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await syncService.syncNow();
      setSyncResult(result);
    } catch (err) {
      console.error("Erreur de synchronisation :", err);
      setSyncError(extractErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="account-page">
        <Card>
          <p className="account-page__notice">
            La synchronisation cloud n'est pas encore configuree sur cet appareil. L'application continue de
            fonctionner normalement avec les donnees locales.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="account-page">
        <p className="account-page__loading">Chargement...</p>
      </div>
    );
  }

  if (session) {
    return (
      <div className="account-page">
        <Card>
          <p className="account-page__connected">Connecte en tant que {session.user.email}</p>
          <Button type="button" variant="secondary" onClick={() => authService.signOut()}>
            Se deconnecter
          </Button>
        </Card>

        <Card className="account-page__sync">
          <p className="account-page__sync-title">🔄 Synchronisation</p>
          <p className="account-page__notice">
            Recupere d'abord les donnees des autres appareils connectes au meme compte, puis envoie une copie des
            donnees locales (journees, notes, categories, objectifs, clotures). Aucune suppression definitive n'est
            synchronisee : la corbeille reste propre a chaque appareil.
          </p>
          <Button type="button" onClick={handleSync} disabled={syncing}>
            {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
          </Button>
          {syncResult && (
            <>
              <p className="account-page__info">
                Recu : {syncResult.pull.days.appliedFromRemote} journee(s), {syncResult.pull.notes.appliedFromRemote}{" "}
                note(s), {syncResult.pull.categories.appliedFromRemote} categorie(s),{" "}
                {syncResult.pull.settings.appliedFromRemote} reglage(s), {syncResult.pull.closures.appliedFromRemote}{" "}
                cloture(s), {syncResult.pull.objectifs.appliedFromRemote} objectif(s).
                {syncResult.pull.days.dateConflictsResolved > 0 &&
                  ` ${syncResult.pull.days.dateConflictsResolved} conflit(s) de date resolu(s) automatiquement (voir la corbeille).`}
              </p>
              <p className="account-page__info">
                Envoye : {syncResult.push.days} journee(s), {syncResult.push.notes} note(s),{" "}
                {syncResult.push.categories} categorie(s), {syncResult.push.settings} reglage(s),{" "}
                {syncResult.push.closures} cloture(s), {syncResult.push.objectifs} objectif(s).
              </p>
            </>
          )}
          {syncError && <p className="account-page__error">{syncError}</p>}
        </Card>
      </div>
    );
  }

  return <LoginForm />;
}
