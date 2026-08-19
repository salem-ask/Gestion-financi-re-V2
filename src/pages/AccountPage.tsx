import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/AuthContext";
import { authService } from "@/services/auth/authService";
import "./AccountPage.css";

type Mode = "signin" | "signup";

/**
 * Page Compte : connexion/inscription par email + mot de passe, et etat
 * "connecte" une fois authentifie. Ne touche a aucune donnee financiere
 * ni a storageService/IndexedDB : cette phase pose uniquement
 * l'authentification, la synchronisation reelle vient dans une phase
 * ulterieure (voir audit valide).
 */
export function AccountPage() {
  const { session, loading, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
