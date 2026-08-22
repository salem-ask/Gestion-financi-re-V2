import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/AuthContext";
import { authService } from "@/services/auth/authService";
import { syncService } from "@/services/sync/syncService";
import type { SyncNowResult } from "@/services/sync/syncService";
import { storageService } from "@/services/storage";
import "./AccountPage.css";

type Mode = "signin" | "signup";

// --- DIAGNOSTIC TEMPORAIRE (lecture seule) -------------------------------
// Ajoute uniquement pour identifier l'id local IndexedDB d'une journee
// precise, dans le cadre du diagnostic RLS 42501 sur "days". N'appelle que
// des methodes storageService deja existantes et deja en lecture seule
// (getDay/getTrashDays) : aucune ecriture IndexedDB, aucun appel Supabase.
// A SUPPRIMER une fois le diagnostic termine.
const DIAGNOSTIC_DATE = "2026-08-20";
// Id orphelin identifie en corbeille pour DIAGNOSTIC_DATE (associe a un
// ancien user_id cote Supabase) : reste en corbeille apres reattribution,
// jamais reactive. Distinct de la journee active deja corrigee separement.
const ORPHAN_DAY_ID = "8cde26b7-0f6c-4d78-95d9-2de28511b831";
// --------------------------------------------------------------------------

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
 * Page Compte : connexion/inscription par email + mot de passe, etat
 * "connecte", et synchronisation manuelle (PHASE 5 : PULL cloud -> local
 * puis PUSH local -> cloud, dans cet ordre, en un seul cycle). Ne touche a
 * aucune donnee financiere directement : delegue entierement a
 * syncService, qui lui-meme passe exclusivement par storageService pour
 * toute lecture/ecriture locale.
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
  const [syncResult, setSyncResult] = useState<SyncNowResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [reassignResult, setReassignResult] = useState<string | null>(null);
  const [listResult, setListResult] = useState<string[] | null>(null);
  const [orphanReassignResult, setOrphanReassignResult] = useState<string | null>(null);

  // DIAGNOSTIC TEMPORAIRE : lecture seule, storageService.listDaysForDate()
  // n'ouvre qu'une seule transaction IndexedDB readonly (getAll() puis
  // filtre par date) -- aucune ecriture, aucun add/put/delete.
  async function handleListDaysForDate() {
    const days = await storageService.listDaysForDate(DIAGNOSTIC_DATE);
    setListResult(
      days.length === 0
        ? [`Aucun enregistrement trouve pour ${DIAGNOSTIC_DATE}.`]
        : days.map(
            (day, index) =>
              `#${index + 1} — id: ${day.id} | date: ${day.date} | deletedAt: ${
                day.deletedAt ?? "undefined (active)"
              } | createdAt: ${day.createdAt} | updatedAt: ${day.updatedAt}`
          )
    );
  }

  // DIAGNOSTIC TEMPORAIRE : lecture seule, getDay()/getTrashDays() existent
  // deja et n'ecrivent rien. A supprimer avec le bloc UI correspondant.
  async function handleDiagnosticCheck() {
    const active = await storageService.getDay(DIAGNOSTIC_DATE);
    const trash = await storageService.getTrashDays();
    const trashed = trash.find((day) => day.date === DIAGNOSTIC_DATE);
    const found = active ?? trashed;
    setDiagnostic(
      found
        ? `date: ${found.date} | id: ${found.id} | deletedAt: ${found.deletedAt ?? "undefined (active)"}`
        : `Aucune journee locale trouvee pour ${DIAGNOSTIC_DATE}.`
    );
  }

  // DIAGNOSTIC TEMPORAIRE : reattribue un nouvel id local (IndexedDB
  // uniquement) a la journee DIAGNOSTIC_DATE pour resoudre la collision
  // RLS 42501. Aucune requete Supabase, aucune synchronisation declenchee
  // ici -- storageService.reassignDayId() verifie qu'une seule journee
  // correspond avant d'ecrire quoi que ce soit (voir indexedDbStorage.ts).
  async function handleReassignId() {
    try {
      const { oldId, newId } = await storageService.reassignDayId(DIAGNOSTIC_DATE);
      setReassignResult(`Ancien id: ${oldId} -> Nouvel id: ${newId}`);
    } catch (err) {
      console.error("Erreur de reattribution d'id :", err);
      setReassignResult(extractErrorMessage(err));
    }
  }

  // DIAGNOSTIC TEMPORAIRE : reattribue un nouvel id local a l'enregistrement
  // orphelin ORPHAN_DAY_ID (en corbeille, associe a un ancien user_id cote
  // Supabase). Distinct de handleReassignId() : cible par id exact, pas par
  // date, et ne touche a aucun autre enregistrement du 2026-08-20. Aucune
  // requete Supabase, aucune synchronisation declenchee ici.
  async function handleReassignOrphanId() {
    try {
      const { oldId, newId } = await storageService.reassignOrphanDayId(ORPHAN_DAY_ID);
      setOrphanReassignResult(`Ancien id: ${oldId} -> Nouvel id: ${newId}`);
    } catch (err) {
      console.error("Erreur de reattribution de l'id orphelin :", err);
      setOrphanReassignResult(extractErrorMessage(err));
    }
  }

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
                cloture(s).
                {syncResult.pull.days.dateConflictsResolved > 0 &&
                  ` ${syncResult.pull.days.dateConflictsResolved} conflit(s) de date resolu(s) automatiquement (voir la corbeille).`}
              </p>
              <p className="account-page__info">
                Envoye : {syncResult.push.days} journee(s), {syncResult.push.notes} note(s),{" "}
                {syncResult.push.categories} categorie(s), {syncResult.push.settings} reglage(s),{" "}
                {syncResult.push.closures} cloture(s).
              </p>
            </>
          )}
          {syncError && <p className="account-page__error">{syncError}</p>}
        </Card>

        {/* DIAGNOSTIC TEMPORAIRE : a supprimer une fois le diagnostic RLS termine. */}
        <Card className="account-page__sync">
          <p className="account-page__sync-title">🔍 Diagnostic temporaire</p>
          <p className="account-page__notice">
            "Verifier" et "Lister" sont en lecture seule. "Reattribuer" modifie uniquement l'id local (IndexedDB) de
            cette journee, sans aucune requete Supabase ni synchronisation. A retirer une fois le diagnostic
            termine.
          </p>
          <Button type="button" variant="secondary" onClick={handleDiagnosticCheck}>
            Verifier la journee {DIAGNOSTIC_DATE}
          </Button>
          {diagnostic && <p className="account-page__info">{diagnostic}</p>}
          <Button type="button" variant="secondary" onClick={handleListDaysForDate}>
            Lister toutes les journees ({DIAGNOSTIC_DATE})
          </Button>
          {listResult && (
            <div className="account-page__info">
              {listResult.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          )}
          <Button type="button" variant="secondary" onClick={handleReassignId}>
            Reattribuer un nouvel ID ({DIAGNOSTIC_DATE})
          </Button>
          {reassignResult && <p className="account-page__info">{reassignResult}</p>}
          <Button type="button" variant="secondary" onClick={handleReassignOrphanId}>
            Reattribuer l'ID orphelin ({ORPHAN_DAY_ID.slice(0, 8)}...)
          </Button>
          {orphanReassignResult && <p className="account-page__info">{orphanReassignResult}</p>}
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
      console.error("Erreur de connexion/inscription :", err);
      setError(extractErrorMessage(err));
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
