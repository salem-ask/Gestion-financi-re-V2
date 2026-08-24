import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CsvConflictResolution } from "@/services/migration/types";
import "./CsvConflictModal.css";

interface CsvConflictModalProps {
  /** Dates du CSV qui correspondent deja a une journee active locale. */
  dates: string[];
  onCancel: () => void;
  /** Choix applique en une seule fois a TOUTES les dates de `dates` (jamais une confirmation par date). */
  onResolve: (resolution: CsvConflictResolution) => void;
}

const MAX_DATES_SHOWN = 10;

/**
 * Conflit d'import CSV : au moins une date du fichier correspond deja a
 * une journee active locale (voir csvMigrationService.previewImport). Une
 * seule decision ("Conserver" ou "Remplacer") s'applique a TOUTES les
 * dates listees ici, jamais une confirmation individuelle par date (voir
 * la demande explicite d'eviter 50 confirmations pour un import volumineux).
 */
export function CsvConflictModal({ dates, onCancel, onResolve }: CsvConflictModalProps) {
  const [resolving, setResolving] = useState<CsvConflictResolution | null>(null);
  const shown = dates.slice(0, MAX_DATES_SHOWN);
  const remaining = dates.length - shown.length;

  function handleResolve(resolution: CsvConflictResolution) {
    setResolving(resolution);
    onResolve(resolution);
  }

  return (
    <div className="csv-conflict-modal__overlay" onClick={onCancel}>
      <div
        className="csv-conflict-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-conflict-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="csv-conflict-title" className="csv-conflict-modal__title">
          {dates.length} date{dates.length > 1 ? "s" : ""} deja presente{dates.length > 1 ? "s" : ""} dans
          l'application
        </h3>
        <p className="csv-conflict-modal__text">
          Ces dates existent deja avec des donnees actives. Choisissez une seule action, appliquee a toutes les
          dates ci-dessous.
        </p>
        <ul className="csv-conflict-modal__dates">
          {shown.map((date) => (
            <li key={date}>{date}</li>
          ))}
          {remaining > 0 && <li className="csv-conflict-modal__dates-more">et {remaining} autre(s)...</li>}
        </ul>
        <div className="csv-conflict-modal__actions">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={resolving !== null}>
            Annuler l'import
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleResolve("keep")}
            disabled={resolving !== null}
          >
            {resolving === "keep" ? "Veuillez patienter..." : "Conserver les donnees V2"}
          </Button>
          <Button
            type="button"
            className="csv-conflict-modal__danger"
            onClick={() => handleResolve("replace")}
            disabled={resolving !== null}
          >
            {resolving === "replace" ? "Veuillez patienter..." : "Remplacer par le CSV"}
          </Button>
        </div>
      </div>
    </div>
  );
}
