import { formatMontant } from "@/utils/format";
import { monthLabel } from "@/utils/monthNames";
import type { MonthSummary } from "@/services/finance";
import "./YearlyMonthsSummary.css";

interface YearlyMonthsSummaryProps {
  monthsSummary: MonthSummary[];
}

/**
 * Resume des 12 mois de l'annee selectionnee, toujours les 12 (jamais un
 * mois supprime), presente en cartes (jamais un tableau classique) pour
 * rester lisible sans defilement horizontal des 320px aux grands ecrans.
 */
export function YearlyMonthsSummary({ monthsSummary }: YearlyMonthsSummaryProps) {
  return (
    <div className="yearly-months__grid">
      {monthsSummary.map((summary) => (
        <div key={summary.month} className="yearly-months__card">
          <p className="yearly-months__card-title">{monthLabel(summary.month)}</p>
          {summary.joursEnregistres === 0 ? (
            <p className="yearly-months__card-empty">Aucune donnee</p>
          ) : (
            <div className="yearly-months__card-rows">
              <Row label="Ventes" value={summary.totals.vente} />
              <Row label="Achats" value={summary.totals.achat} />
              <Row label="Depenses" value={summary.totals.depense} />
              <Row label="Gain" value={summary.totals.gain} />
              <Row label="Reste" value={summary.totals.reste} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="yearly-months__row">
      <span className="yearly-months__row-label">{label}</span>
      <span className="yearly-months__row-value">{formatMontant(value)}</span>
    </div>
  );
}
