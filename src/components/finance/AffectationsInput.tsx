import { useState } from "react";
import { parseMontant, isValidMontant } from "@/utils/amount";
import type { AffectationKind } from "@/types";
import "./AffectationsInput.css";

export type AffectationsRaw = Record<AffectationKind, string>;

interface AffectationsInputProps {
  values: AffectationsRaw;
  onChange: (key: AffectationKind, value: string) => void;
}

const FIELDS: { key: AffectationKind; icon: string; label: string }[] = [
  { key: "dime", icon: "✝️", label: "Dime realisee" },
  { key: "epargne", icon: "💰", label: "Epargne realisee" },
  { key: "generosite", icon: "❤️", label: "Generosite realisee" },
];

/**
 * Saisie des montants REALISES des affectations financieres. Volontairement
 * distincte du formulaire "Depenses" : la dime/epargne/generosite ne sont
 * pas des depenses (voir calculateFinancials), l'utilisateur doit pouvoir
 * les distinguer immediatement au premier coup d'oeil.
 *
 * Repliable (fermee par defaut) pour garder le formulaire compact quand
 * cette section n'est pas utilisee : les valeurs saisies restent dans
 * l'etat du parent (DailyPage) meme quand le panneau est ferme, replier
 * n'efface donc jamais rien.
 */
export function AffectationsInput({ values, onChange }: AffectationsInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="affectations-input">
      <button
        type="button"
        className="affectations-input__toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="affectations-input-panel"
      >
        <span aria-hidden="true">💼</span> Affectations financieres{" "}
        <span className="affectations-input__chevron" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div id="affectations-input-panel" className="affectations-input__panel">
          <p className="affectations-input__hint">
            Montants reellement verses (dime, epargne, generosite). Ce ne sont pas des depenses.
          </p>
          <div className="affectations-input__fields">
            {FIELDS.map(({ key, icon, label }) => {
              const raw = values[key];
              const parsed = parseMontant(raw);
              const hasError = raw.trim() !== "" && !isValidMontant(parsed);
              return (
                <div key={key} className="affectations-input__field">
                  <label className="affectations-input__label" htmlFor={`affectation-${key}`}>
                    {icon} {label}
                  </label>
                  <input
                    id={`affectation-${key}`}
                    type="text"
                    inputMode="decimal"
                    className={`affectations-input__control ${hasError ? "has-error" : ""}`}
                    value={raw}
                    onChange={(event) => onChange(key, event.target.value)}
                    placeholder="0"
                  />
                  {hasError && <p className="affectations-input__error">Montant invalide</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
