import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/AuthContext";
import { authService } from "@/services/auth/authService";
import { syncService } from "@/services/sync/syncService";
import type { PushResult } from "@/services/sync/syncService";
import "./AccountPage.css";

type Mode = "signin" | "signup";

/**
 * Page Compte : connexion/inscription par email + mot de passe, etat
 * "connecte", et synchronisation manuelle (PHASE 4 : PUSH local -> cloud
 * uniquement, jamais l'inverse pour l'instant). Ne touche a aucune donnee
 * financiere directement : delegue entierement a syncService, qui lui-meme
 * ne fait que lire storageService (aucune ecriture locale).
 */
export function AccountPage() {
  const { session, loading, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<PushResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await syncService.pushLocalChanges();
      setSyncResult(result);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Erreur inconnue.");
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
            Envoie une copie des donnees locales (journees, notes, categories, objectifs, clotures) vers le compte.
            Aucune donnee locale n'est modifiee ni supprimee. Rien n'est encore recupere depuis le cloud.
          </p>
          <Button type="button" onClick={handleSync} disabled={syncing}>
            {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
          </Button>
          {syncResult && (
            <p className="account-page__info">
              Envoye : {syncResult.days} journee(s), {syncResult.notes} note(s), {syncResult.categories} categorie(s),{" "}
              {syncResult.settings} reglage(s), {syncResult.closures} cloture(s).
            </p>
          )}
          {syncError && <p className="account-page__error">{syncError}</p>}
        </Card>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await authService.signIn(email, password);
      } else {
        const result = await authService.signUp(email, password);
        if (!result.session) {
          setInfo("Compte cree. Verifiez votre boite mail pour confirmer votre compte avant de vous connecter.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="account-page">
      <Card>
        <div className="account-page__tabs">
          <button
            type="button"
            className={`account-page__tab ${mode === "signin" ? "account-page__tab--active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError(null);
              setInfo(null);
            }}
          >
            Se connecter
          </button>
          <button
            type="button"
            className={`account-page__tab ${mode === "signup" ? "account-page__tab--active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfo(null);
            }}
          >
            Creer un compte
          </button>
        </div>

        <form className="account-page__form" onSubmit={handleSubmit}>
          <label className="account-page__label" htmlFor="account-email">
            Email
          </label>
          <input
            id="account-email"
            type="email"
            className="account-page__input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label className="account-page__label" htmlFor="account-password">
            Mot de passe
          </label>
          <input
            id="account-password"
            type="password"
            className="account-page__input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            required
          />

          {error && <p className="account-page__error">{error}</p>}
          {info && <p className="account-page__info">{info}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Veuillez patienter..." : mode === "signin" ? "Se connecter" : "Creer un compte"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
