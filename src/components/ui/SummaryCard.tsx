import { Card } from "./Card";
import { formatMontant } from "@/utils/format";
import type { PeriodSummary } from "@/hooks/useSummary";
import "./SummaryCard.css";

interface SummaryCardProps {
  titre: string;
  data: PeriodSummary;
}

export function SummaryCard({ titre, data }: SummaryCardProps) {
  return (
    <Card className="summary-card">
      <p className="summary-card__title">{titre}</p>
      <p className="summary-card__gain">{formatMontant(data.gain)}</p>
      <div className="summary-card__row">
        <span>Ventes {formatMontant(data.ventes)}</span>
        <span>Depenses {formatMontant(data.depenses)}</span>
      </div>
    </Card>
  );
}
