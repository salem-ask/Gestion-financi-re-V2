import { useState } from "react";
import { Button } from "@/components/ui/Button";
import "./YearClosureModal.css";

interface YearClosureModalProps {
  mode: "close" | "reopen";
  periodeLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation avant cloture/reouverture d'une annee. Meme principe que
 * WeekClosureModal et MonthClosureModal (deja valides) : Annuler ferme
 * simplement la fenetre (aucun appel de stockage). Reimplemente ici
 * (texte "annee" au lieu de "semaine"/"mois") plutot que de parametrer
 * les composants existants, pour ne jamais risquer de les modifier.
 */
export function YearClosureModal({ mode, periodeLabel, onCancel, onConfirm }: YearClosureModalProps) {
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
    <div className="year-closure-modal__overlay" onClick={onCancel}>
      <div
        className="year-closure-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="year-closure-title"
        onClick={(event) => event.stopPropagation()}
      >
        {mode === "close" ? (
          <>
            <h3 id="year-closure-title" className="year-closure-modal__title">
              ⚠️ Cloturer cette annee ?
            </h3>
            <p className="year-closure-modal__period">{periodeLabel}</p>
            <p className="year-closure-modal__text">
              La cloture verrouille l'annee sans supprimer les donnees.
            </p>
            <p className="year-closure-modal__text">Les donnees ne seront PAS supprimees.</p>
            <div className="year-closure-modal__actions">
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
            <h3 id="year-closure-title" className="year-closure-modal__title">
              ⚠️ Cette annee est actuellement cloturee.
            </h3>
            <p className="year-closure-modal__period">{periodeLabel}</p>
            <p className="year-closure-modal__text">
              Voulez-vous la rouvrir afin de permettre a nouveau les modifications ?
            </p>
            <div className="year-closure-modal__actions">
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
