import { useState } from "react";
import { Button } from "@/components/ui/Button";
import "./ResetHistoryModal.css";

interface ResetHistoryModalProps {
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

const CONFIRM_KEYWORD = "SUPPRIMER";

/**
 * Double confirmation obligatoire avant une reinitialisation globale de
 * l'historique (deplacement en masse vers la corbeille, restaurable) : un
 * premier ecran d'avertissement, puis une saisie exacte du mot "SUPPRIMER"
 * avant que le bouton final ne devienne cliquable. Annuler a n'importe
 * quelle etape ne modifie rien (onCancel ferme simplement la fenetre,
 * aucun appel de stockage).
 */
export function ResetHistoryModal({ onCancel, onConfirm }: ResetHistoryModalProps) {
  const [step, setStep] = useState<"warning" | "confirm-text">("warning");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === CONFIRM_KEYWORD;

  async function handleConfirmFinal() {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="reset-history-modal__overlay" onClick={onCancel}>
      <div
        className="reset-history-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        {step === "warning" ? (
          <>
            <h3 id="reset-history-title" className="reset-history-modal__title reset-history-modal__title--warning">
              ⚠️ ATTENTION
            </h3>
            <p className="reset-history-modal__text">
              Vous etes sur le point de deplacer tout l'historique financier vers la corbeille.
            </p>
            <p className="reset-history-modal__text">
              Toutes les journees actives seront deplacees vers la corbeille. Vous pourrez restaurer chaque journee
              individuellement tant que vous ne videz pas la corbeille.
            </p>
            <p className="reset-history-modal__text">Voulez-vous vraiment continuer ?</p>
            <div className="reset-history-modal__actions">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="button" className="reset-history-modal__danger" onClick={() => setStep("confirm-text")}>
                Continuer
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 id="reset-history-title" className="reset-history-modal__title">
              Confirmation
            </h3>
            <p className="reset-history-modal__text">Pour confirmer, tapez :</p>
            <p className="reset-history-modal__keyword">{CONFIRM_KEYWORD}</p>
            <input
              type="text"
              className="reset-history-modal__input"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              aria-label={`Tapez ${CONFIRM_KEYWORD} pour confirmer`}
              autoFocus
              disabled={deleting}
            />
            <div className="reset-history-modal__actions">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={deleting}>
                Annuler
              </Button>
              <Button
                type="button"
                className="reset-history-modal__danger"
                onClick={handleConfirmFinal}
                disabled={!canDelete || deleting}
              >
                {deleting ? "Deplacement..." : "Deplacer vers la corbeille"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
