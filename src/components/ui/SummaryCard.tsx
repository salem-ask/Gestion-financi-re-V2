import { Card } from "./Card";
import { formatMontant } from "@/utils/format";
import type { PeriodSummary } from "@/hooks/useSummary";
import "./SummaryCard.css";

interface SummaryCardProps {
  titre: string;
  data: PeriodSummary;
}

/**
 * Carte de synthese d'une periode (Accueil) : 5 lignes, dans cet ordre --
 * Ventes / Achats / Gain / Depenses / Reste -- toutes issues telles
 * quelles de useSummary.ts (lui-meme base sur aggregatePeriodTotals, la
 * meme primitive que Quotidien/Semaine/Mois/Annee). Aucune formule
 * recalculee ici : purement de l'affichage.
 */
export function SummaryCard({ titre, data }: SummaryCardProps) {
  return (
    <Card className="summary-card">
      <p className="summary-card__title">{titre}</p>
      <div className="summary-card__details">
        <DetailRow label="Ventes" value={data.ventes} />
        <DetailRow label="Achats" value={data.achats} />
        <DetailRow label="Gain" value={data.gain} />
        <DetailRow label="Depenses" value={data.depenses} />
        <DetailRow label="Reste" value={data.beneficeReste} emphasize />
      </div>
    </Card>
  );
}

function DetailRow({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return (
    <div className={`summary-card__detail-row ${emphasize ? "summary-card__detail-row--emphasize" : ""}`.trim()}>
      <span className="summary-card__detail-label">{label}</span>
      <span className="summary-card__detail-value">{formatMontant(value)}</span>
    </div>
  );
}
