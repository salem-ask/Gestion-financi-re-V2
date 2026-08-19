import { Card } from "@/components/ui/Card";
import { formatMontant } from "@/utils/format";
import type { DayTotals } from "@/types";
import "./FinancialSummary.css";

interface FinancialSummaryProps {
  totals: DayTotals;
}

/**
 * Synthese financiere : achats/ventes/depenses/gain/reste uniquement.
 * Les affectations financieres (dime/epargne/generosite) sont affichees
 * separement par AffectationsSummary (voir section 8 de la demande) : ce
 * ne sont pas des depenses et elles ne doivent pas etre melangees ici.
 */
export function FinancialSummary({ totals }: FinancialSummaryProps) {
  return (
    <Card className="financial-summary">
      <div className="financial-summary__grid">
        <div className="financial-summary__item">
          <span className="financial-summary__label">Gain</span>
          <span className="financial-summary__value">{formatMontant(totals.gain)}</span>
        </div>
        <div className="financial-summary__item financial-summary__item--highlight">
          <span className="financial-summary__label">Reste</span>
          <span className="financial-summary__value">{formatMontant(totals.reste)}</span>
        </div>
      </div>
    </Card>
  );
}
