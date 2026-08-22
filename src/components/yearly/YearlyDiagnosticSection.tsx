import { formatMontant } from "@/utils/format";
import type { YearlyDiagnostic, DiagnosticNiveau } from "@/services/finance";
import "./YearlyDiagnosticSection.css";

interface YearlyDiagnosticSectionProps {
  diagnostic: YearlyDiagnostic;
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
 * Diagnostic centre sur l'OBJECTIF DE VENTE ANNUEL saisi par l'utilisateur
 * (storageService.getYearlySalesGoal/saveYearlySalesGoal) : reference
 * principale demandee, jamais remplacee par un objectif d'affectations.
 * Meme logique que MonthlyDiagnosticSection, adaptee a l'annee.
 */
export function YearlyDiagnosticSection({
  diagnostic,
  editable = false,
  objectifRaw = "",
  onObjectifChange,
  onObjectifCommit,
}: YearlyDiagnosticSectionProps) {
  return (
    <div className="yearly-diagnostic">
      {editable && (
        <div className="yearly-diagnostic__goal">
          <label className="yearly-diagnostic__goal-label" htmlFor="yearly-sales-goal">
            🎯 Objectif de vente annuel
          </label>
          <input
            id="yearly-sales-goal"
            type="text"
            inputMode="decimal"
            className="yearly-diagnostic__goal-input"
            value={objectifRaw}
            onChange={(event) => onObjectifChange?.(event.target.value)}
            onBlur={onObjectifCommit}
            placeholder="Ex: 10000000"
          />
        </div>
      )}

      <div className="yearly-diagnostic__grid">
        <Stat label="Objectif ventes" value={formatMontant(diagnostic.objectifVente)} />
        <Stat label="Ventes realisees" value={formatMontant(diagnostic.ventesRealisees)} />
        <Stat label="Progression" value={fmtPct(diagnostic.progression)} />
        <Stat label="Reste a atteindre" value={formatMontant(diagnostic.resteAAtteindre)} />
        <Stat
          label="Projection fin d'annee"
          value={diagnostic.projectionVenteFinAnnee !== null ? formatMontant(diagnostic.projectionVenteFinAnnee) : "—"}
        />
      </div>
      <ul className={`yearly-diagnostic__messages yearly-diagnostic__messages--${diagnostic.niveau}`}>
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
    <div className="yearly-diagnostic__item">
      <span className="yearly-diagnostic__label">{label}</span>
      <span className="yearly-diagnostic__value">{value}</span>
    </div>
  );
}
