import { Card } from "@/components/ui/Card";
import { formatMontant } from "@/utils/format";
import type { AffectationsTotals, AffectationKind } from "@/types";
import "./AffectationsSummary.css";

interface AffectationsSummaryProps {
  affectations: AffectationsTotals;
}

const AFFECTATION_DISPLAY: { key: AffectationKind; icon: string; label: string }[] = [
  { key: "dime", icon: "✝️", label: "Dime" },
  { key: "epargne", icon: "💰", label: "Epargne" },
  { key: "generosite", icon: "❤️", label: "Generosite" },
];

/**
 * Blocs Prevue/Realisee/Restante(/Depassement) pour les trois
 * affectations financieres, sans mise en page de page (pas de Card ni de
 * titre) : reutilisable tel quel dans un contexte deja encarte (voir
 * DayHistoryList). AffectationsSummary ci-dessous l'utilise pour l'usage
 * "page complete" (formulaire de saisie).
 */
export function AffectationsBlocks({ affectations }: AffectationsSummaryProps) {
  return (
    <div className="affectations-summary__list">
      {AFFECTATION_DISPLAY.map(({ key, icon, label }) => {
        const totals = affectations[key];
        return (
          <div key={key} className="affectations-summary__block">
            <p className="affectations-summary__block-title">
              {icon} {label}
            </p>
            <div className="affectations-summary__grid">
              <div>
                <span className="affectations-summary__label">Prevue</span>
                <span className="affectations-summary__value">{formatMontant(totals.prevue)}</span>
              </div>
              <div>
                <span className="affectations-summary__label">Realisee</span>
                <span className="affectations-summary__value">{formatMontant(totals.realisee)}</span>
              </div>
              <div>
                <span className="affectations-summary__label">Restante</span>
                <span className="affectations-summary__value">{formatMontant(totals.restante)}</span>
              </div>
              {totals.depassement > 0 && (
                <div className="affectations-summary__overage">
                  <span className="affectations-summary__label">Depassement</span>
                  <span className="affectations-summary__value">{formatMontant(totals.depassement)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Section "Affectations financieres" complete (avec Card et titre) :
 * dime, epargne et generosite, clairement separees des achats/ventes/
 * depenses. Utilisee dans le formulaire de saisie (apercu en direct).
 */
export function AffectationsSummary({ affectations }: AffectationsSummaryProps) {
  return (
    <Card className="affectations-summary">
      <p className="affectations-summary__title">💼 Affectations financieres</p>
      <AffectationsBlocks affectations={affectations} />
    </Card>
  );
}
