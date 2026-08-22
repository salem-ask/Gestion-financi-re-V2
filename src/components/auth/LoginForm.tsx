import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth/authService";
import "@/pages/AccountPage.css";

type Mode = "signin" | "signup";

/**
 * Extrait un message d'erreur exploitable, que l'erreur soit une vraie
 * instance Error ou un objet Supabase-like ({message, details, hint,
 * code} -- jamais instanceof Error). "Erreur inconnue." reste le dernier
 * recours si rien d'exploitable n'est trouve.
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
 * Formulaire connexion/inscription par email + mot de passe, extrait
 * d'AccountPage.tsx pour etre reutilisable ailleurs (voir AuthGate) sans
 * afficher toute la page Compte. Reutilise les classes account-page__*
 * (voir AccountPage.css) : aucune regle CSS dupliquee.
 *
 * Entierement autonome : une fois signIn/signUp reussi, c'est
 * AuthContext.onAuthStateChange (deja en place) qui met a jour `session`
 * partout dans l'app -- ce composant n'a besoin d'aucun callback de
 * succes, l'appelant (AccountPage ou AuthGate) reagit automatiquement.
 */
export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

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
          setPendingEmail(email);
        }
      }
    } catch (err) {
      console.error("Erreur de connexion/inscription :", err);
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await authService.resendConfirmationEmail(pendingEmail);
      setInfo("E-mail de confirmation renvoye. Verifiez votre boite mail (et vos courriers indesirables).");
    } catch (err) {
      console.error("Erreur lors du renvoi de l'e-mail de confirmation :", err);
      setError(extractErrorMessage(err));
    } finally {
      setResending(false);
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
              setPendingEmail(null);
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
              setPendingEmail(null);
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

          {pendingEmail && (
            <Button type="button" variant="secondary" onClick={handleResend} disabled={resending}>
              {resending ? "Envoi en cours..." : "Renvoyer l'e-mail de confirmation"}
            </Button>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Veuillez patienter..." : mode === "signin" ? "Se connecter" : "Creer un compte"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
