import { useState } from "react";
import { Button } from "@/components/ui/Button";
import "./MonthClosureModal.css";

interface MonthClosureModalProps {
  mode: "close" | "reopen";
  periodeLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation avant cloture/reouverture d'un mois. Meme principe que
 * WeekClosureModal (deja valide pour l'hebdomadaire) : Annuler ferme
 * simplement la fenetre (aucun appel de stockage). Reimplemente ici (texte
 * "mois" au lieu de "semaine") plutot que de parametrer WeekClosureModal,
 * pour ne jamais risquer de modifier le composant hebdomadaire deja valide.
 */
export function MonthClosureModal({ mode, periodeLabel, onCancel, onConfirm }: MonthClosureModalProps) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="month-closure-modal__overlay" onClick={onCancel}>
      <div
        className="month-closure-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="month-closure-title"
        onClick={(event) => event.stopPropagation()}
      >
        {mode === "close" ? (
          <>
            <h3 id="month-closure-title" className="month-closure-modal__title">
              ⚠️ Cloturer ce mois ?
            </h3>
            <p className="month-closure-modal__period">{periodeLabel}</p>
            <p className="month-closure-modal__text">
              La cloture verrouille le mois sans supprimer les donnees.
            </p>
            <p className="month-closure-modal__text">Les donnees ne seront PAS supprimees.</p>
            <div className="month-closure-modal__actions">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
                Annuler
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={busy}>
                {busy ? "Cloture..." : "🔒 Confirmer la cloture"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 id="month-closure-title" className="month-closure-modal__title">
              ⚠️ Ce mois est actuellement cloture.
            </h3>
            <p className="month-closure-modal__period">{periodeLabel}</p>
            <p className="month-closure-modal__text">
              Voulez-vous le rouvrir afin de permettre a nouveau les modifications ?
            </p>
            <div className="month-closure-modal__actions">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
                Annuler
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={busy}>
                {busy ? "Reouverture..." : "🔓 Rouvrir"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
