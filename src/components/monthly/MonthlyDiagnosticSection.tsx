import { formatMontant } from "@/utils/format";
import type { MonthlyDiagnostic, DiagnosticNiveau } from "@/services/finance";
import "./MonthlyDiagnosticSection.css";

interface MonthlyDiagnosticSectionProps {
  diagnostic: MonthlyDiagnostic;
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
 * Diagnostic centre sur l'OBJECTIF DE VENTE MENSUEL saisi par l'utilisateur
 * (storageService.getMonthlySalesGoal/saveMonthlySalesGoal) : reference
 * principale demandee, jamais remplacee par un objectif d'affectations.
 * Meme logique que WeeklyDiagnosticSection, adaptee au mois.
 */
export function MonthlyDiagnosticSection({
  diagnostic,
  editable = false,
  objectifRaw = "",
  onObjectifChange,
  onObjectifCommit,
}: MonthlyDiagnosticSectionProps) {
  return (
    <div className="monthly-diagnostic">
      {editable && (
        <div className="monthly-diagnostic__goal">
          <label className="monthly-diagnostic__goal-label" htmlFor="monthly-sales-goal">
            🎯 Objectif de vente mensuel
          </label>
          <input
            id="monthly-sales-goal"
            type="text"
            inputMode="decimal"
            className="monthly-diagnostic__goal-input"
            value={objectifRaw}
            onChange={(event) => onObjectifChange?.(event.target.value)}
            onBlur={onObjectifCommit}
            placeholder="Ex: 2000000"
          />
        </div>
      )}

      <div className="monthly-diagnostic__grid">
        <Stat label="Objectif ventes" value={formatMontant(diagnostic.objectifVente)} />
        <Stat label="Ventes realisees" value={formatMontant(diagnostic.ventesRealisees)} />
        <Stat label="Progression" value={fmtPct(diagnostic.progression)} />
        <Stat label="Reste a atteindre" value={formatMontant(diagnostic.resteAAtteindre)} />
        <Stat
          label="Projection fin de mois"
          value={diagnostic.projectionVenteFinMois !== null ? formatMontant(diagnostic.projectionVenteFinMois) : "—"}
        />
      </div>
      <ul className={`monthly-diagnostic__messages monthly-diagnostic__messages--${diagnostic.niveau}`}>
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
    <div className="monthly-diagnostic__item">
      <span className="monthly-diagnostic__label">{label}</span>
      <span className="monthly-diagnostic__value">{value}</span>
    </div>
  );
}
