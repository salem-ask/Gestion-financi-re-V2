import { useState } from "react";
import { Button } from "@/components/ui/Button";
import "./WeekClosureModal.css";

interface WeekClosureModalProps {
  mode: "close" | "reopen";
  periodeLabel: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation avant cloture/reouverture d'une semaine. Annuler ferme
 * simplement la fenetre (aucun appel de stockage) ; les deux directions
 * partagent la meme structure de modale pour ne pas dupliquer le markup.
 */
export function WeekClosureModal({ mode, periodeLabel, onCancel, onConfirm }: WeekClosureModalProps) {
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
    <div className="week-closure-modal__overlay" onClick={onCancel}>
      <div
        className="week-closure-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="week-closure-title"
        onClick={(event) => event.stopPropagation()}
      >
        {mode === "close" ? (
          <>
            <h3 id="week-closure-title" className="week-closure-modal__title">
              ⚠️ Cloturer cette semaine ?
            </h3>
            <p className="week-closure-modal__period">{periodeLabel}</p>
            <p className="week-closure-modal__text">
              La semaine sera verrouillee afin d'eviter les modifications accidentelles.
            </p>
            <p className="week-closure-modal__text">Les donnees ne seront PAS supprimees.</p>
            <div className="week-closure-modal__actions">
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
            <h3 id="week-closure-title" className="week-closure-modal__title">
              ⚠️ Cette semaine est actuellement cloturee.
            </h3>
            <p className="week-closure-modal__period">{periodeLabel}</p>
            <p className="week-closure-modal__text">
              Voulez-vous la rouvrir afin de permettre a nouveau les modifications ?
            </p>
            <div className="week-closure-modal__actions">
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
