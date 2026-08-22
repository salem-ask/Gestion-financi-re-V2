import { Card } from "./Card";
import { formatMontant } from "@/utils/format";
import type { PeriodSummary, PeriodEvolution } from "@/hooks/useSummary";
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
 * recalculee ici : purement de l'affichage. La progression (data.evolution)
 * s'intercale entre Gain et Depenses, avec exactement la meme logique
 * qu'avant (voir EvolutionLine) : aucun nouveau calcul de progression.
 */
export function SummaryCard({ titre, data }: SummaryCardProps) {
  return (
    <Card className="summary-card">
      <p className="summary-card__title">{titre}</p>
      <div className="summary-card__details">
        <DetailRow label="Ventes" value={data.ventes} />
        <DetailRow label="Achats" value={data.achats} />
        <DetailRow label="Gain" value={data.gain} />
        <EvolutionLine evolution={data.evolution} />
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

/**
 * "+12 % par rapport a la semaine precedente" (ou variante negative), sans
 * jamais diviser par zero : si la comparaison n'a pas de sens (periode
 * precedente a reste=0, voir useSummary.computeEvolution), affiche
 * "Nouvelle activite" plutot que d'inventer un pourcentage. Logique
 * identique a celle presente avant le retrait de ce commit -- rien de
 * recalcule differemment.
 */
function EvolutionLine({ evolution }: { evolution: PeriodEvolution }) {
  if (evolution.pourcentage === null) {
    return <p className="summary-card__evolution summary-card__evolution--neutral">Nouvelle activite</p>;
  }
  const rounded = Math.round(evolution.pourcentage);
  const variant = rounded > 0 ? "up" : rounded < 0 ? "down" : "neutral";
  const sign = rounded > 0 ? "+" : "";
  return (
    <p className={`summary-card__evolution summary-card__evolution--${variant}`}>
      {sign}
      {rounded} % par rapport {evolution.comparaisonLabel}
    </p>
  );
}
