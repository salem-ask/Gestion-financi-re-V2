import { formatMontant } from "@/utils/format";
import type { WeeklyDiagnostic, DiagnosticNiveau } from "@/services/finance";
import "./WeeklyDiagnosticSection.css";

interface WeeklyDiagnosticSectionProps {
  diagnostic: WeeklyDiagnostic;
  /** Saisie/modification de l'objectif : uniquement dans la page (pas dans l'apercu/PDF, lecture seule). */
  editable?: boolean;
  objectifRaw?: string;
  onObjectifChange?: (raw: string) => void;
  onObjectifCommit?: () => void;
}

const NIVEAU_ICON: Record<DiagnosticNiveau, string> = {
  positif: "✅",
  attention: "⚠️",
  alerte: "🔴",
};

function fmtPct(value: number): string {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Diagnostic centre sur l'OBJECTIF DE VENTE HEBDOMADAIRE saisi par
 * l'utilisateur (storageService.getWeeklySalesGoal/saveWeeklySalesGoal) :
 * reference principale demandee, jamais remplacee par un objectif
 * d'affectations. La projection de fin de semaine est une simple
 * extrapolation lineaire a partir des journees deja enregistrees.
 */
export function WeeklyDiagnosticSection({
  diagnostic,
  editable = false,
  objectifRaw = "",
  onObjectifChange,
  onObjectifCommit,
}: WeeklyDiagnosticSectionProps) {
  return (
    <div className="weekly-diagnostic">
      {editable && (
        <div className="weekly-diagnostic__goal">
          <label className="weekly-diagnostic__goal-label" htmlFor="weekly-sales-goal">
            Objectif de vente hebdomadaire
          </label>
          <input
            id="weekly-sales-goal"
            type="text"
            inputMode="decimal"
            className="weekly-diagnostic__goal-input"
            value={objectifRaw}
            onChange={(event) => onObjectifChange?.(event.target.value)}
            onBlur={onObjectifCommit}
            placeholder="Ex: 500000"
          />
        </div>
      )}

      <div className="weekly-diagnostic__grid">
        <Stat label="Objectif ventes" value={formatMontant(diagnostic.objectifVente)} />
        <Stat label="Ventes realisees" value={formatMontant(diagnostic.ventesRealisees)} />
        <Stat label="Progression" value={fmtPct(diagnostic.progression)} />
        <Stat label="Reste a atteindre" value={formatMontant(diagnostic.resteAAtteindre)} />
        <Stat
          label="Projection fin de semaine"
          value={diagnostic.projectionVenteFinSemaine !== null ? formatMontant(diagnostic.projectionVenteFinSemaine) : "—"}
        />
      </div>
      <ul className={`weekly-diagnostic__messages weekly-diagnostic__messages--${diagnostic.niveau}`}>
        {diagnostic.messages.map((message) => (
          <li key={message}>
            {NIVEAU_ICON[diagnostic.niveau]} {message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="weekly-diagnostic__item">
      <span className="weekly-diagnostic__label">{label}</span>
      <span className="weekly-diagnostic__value">{value}</span>
    </div>
  );
}
