import { formatMontant } from "@/utils/format";
import type { WeeklyDiagnostic, DiagnosticNiveau } from "@/services/finance";
import "./WeeklyDiagnosticSection.css";

interface WeeklyDiagnosticSectionProps {
  diagnostic: WeeklyDiagnostic;
}

const NIVEAU_ICON: Record<DiagnosticNiveau, string> = {
  positif: "✅",
  attention: "⚠️",
  alerte: "🔴",
};

/**
 * "Objectif" = somme des montants PREVUS des 3 affectations de la semaine
 * (seule cible deja presente dans le moteur financier). La projection de
 * fin de semaine est une simple extrapolation lineaire a partir des
 * journees deja enregistrees : clairement presentee comme une estimation.
 */
export function WeeklyDiagnosticSection({ diagnostic }: WeeklyDiagnosticSectionProps) {
  return (
    <div className="weekly-diagnostic">
      <div className="weekly-diagnostic__grid">
        <Stat label="Objectif affectations (prevue)" value={formatMontant(diagnostic.objectifAffectations)} />
        <Stat label="Realise" value={formatMontant(diagnostic.realiseAffectations)} />
        <Stat label="Progression" value={`${diagnostic.progression.toFixed(0)}%`} />
        <Stat
          label="Projection gain fin de semaine"
          value={diagnostic.projectionGainFinSemaine !== null ? formatMontant(diagnostic.projectionGainFinSemaine) : "—"}
        />
        <Stat
          label="Projection reste fin de semaine"
          value={diagnostic.projectionResteFinSemaine !== null ? formatMontant(diagnostic.projectionResteFinSemaine) : "—"}
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
