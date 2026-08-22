import { formatMontant } from "@/utils/format";
import { monthLabel } from "@/utils/monthNames";
import type { YearlyBestMonths as YearlyBestMonthsData } from "@/services/finance";
import "./YearlyBestMonths.css";

interface YearlyBestMonthsProps {
  bestMonths: YearlyBestMonthsData;
}

export function YearlyBestMonths({ bestMonths }: YearlyBestMonthsProps) {
  return (
    <div className="yearly-best-months">
      <div className="yearly-best-months__highlights">
        <Highlight icon="🏆" label="Meilleur mois en ventes" highlight={bestMonths.meilleurMoisVentes} />
        <Highlight icon="🏆" label="Meilleur mois en gain" highlight={bestMonths.meilleurMoisGain} />
        <Highlight icon="⚠️" label="Mois avec le plus de depenses" highlight={bestMonths.moisPlusDepenses} />
      </div>

      <div className="yearly-best-months__averages">
        <Average label="Moyenne mensuelle ventes" value={bestMonths.moyenneMensuelleVentes} />
        <Average label="Moyenne mensuelle achats" value={bestMonths.moyenneMensuelleAchats} />
        <Average label="Moyenne mensuelle depenses" value={bestMonths.moyenneMensuelleDepenses} />
        <Average label="Moyenne mensuelle gain" value={bestMonths.moyenneMensuelleGain} />
      </div>
    </div>
  );
}

function Highlight({
  icon,
  label,
  highlight,
}: {
  icon: string;
  label: string;
  highlight: { month: number; montant: number } | null;
}) {
  return (
    <div className="yearly-best-months__highlight">
      <span className="yearly-best-months__highlight-label">
        {icon} {label}
      </span>
      <span className="yearly-best-months__highlight-value">
        {highlight ? `${monthLabel(highlight.month)} (${formatMontant(highlight.montant)})` : "—"}
      </span>
    </div>
  );
}

function Average({ label, value }: { label: string; value: number }) {
  return (
    <div className="yearly-best-months__item">
      <span className="yearly-best-months__label">{label}</span>
      <span className="yearly-best-months__value">{formatMontant(value)}</span>
    </div>
  );
}
