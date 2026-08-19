import { Card } from "@/components/ui/Card";
import { formatMontant } from "@/utils/format";
import { getGenerosityDisplay } from "@/services/finance";
import type { DayTotals } from "@/types";
import "./FinancialSummary.css";

interface FinancialSummaryProps {
  totals: DayTotals;
}

export function FinancialSummary({ totals }: FinancialSummaryProps) {
  const generosity = getGenerosityDisplay(totals);

  return (
    <Card className="financial-summary">
      <div className="financial-summary__grid">
        <div className="financial-summary__item">
          <span className="financial-summary__label">Gain</span>
          <span className="financial-summary__value">{formatMontant(totals.gain)}</span>
        </div>
        <div className="financial-summary__item">
          <span className="financial-summary__label">Dime</span>
          <span className="financial-summary__value">{formatMontant(totals.dime)}</span>
        </div>
        <div className="financial-summary__item">
          <span className="financial-summary__label">Epargne</span>
          <span className="financial-summary__value">{formatMontant(totals.epargne)}</span>
        </div>
        <div className="financial-summary__item financial-summary__item--highlight">
          <span className="financial-summary__label">Reste</span>
          <span className="financial-summary__value">{formatMontant(totals.reste)}</span>
        </div>
      </div>

      <div className="financial-summary__generosity">
        <p className="financial-summary__generosity-title">Generosite</p>
        <div className="financial-summary__generosity-grid">
          <div>
            <span className="financial-summary__label">Prevue</span>
            <span className="financial-summary__value">{formatMontant(generosity.planned)}</span>
          </div>
          <div>
            <span className="financial-summary__label">Deja donnee</span>
            <span className="financial-summary__value">{formatMontant(generosity.given)}</span>
          </div>
          <div>
            <span className="financial-summary__label">Restante</span>
            <span className="financial-summary__value">{formatMontant(generosity.remaining)}</span>
          </div>
          {generosity.overage > 0 && (
            <div className="financial-summary__overage">
              <span className="financial-summary__label">Depassement</span>
              <span className="financial-summary__value">{formatMontant(generosity.overage)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
