import { Card } from "./Card";
import { formatMontant } from "@/utils/format";
import type { PeriodSummary, PeriodEvolution } from "@/hooks/useSummary";
import "./SummaryCard.css";

interface SummaryCardProps {
  titre: string;
  data: PeriodSummary;
}

/**
 * Carte de synthese d'une periode (Accueil) : le "gros chiffre" est
 * toujours le benefice/reste (data.beneficeReste = totals.reste, le meme
 * calcul deja utilise par Quotidien/Semaine/Mois/Annee -- voir
 * useSummary.ts), jamais une autre formule. Ventes/Achats/Depenses sont
 * affiches separement, sans etre melanges entre eux.
 */
export function SummaryCard({ titre, data }: SummaryCardProps) {
  return (
    <Card className="summary-card">
      <p className="summary-card__title">{titre}</p>

      <p className="summary-card__highlight-label">Benefice / reste</p>
      <p className="summary-card__highlight-value">{formatMontant(data.beneficeReste)}</p>
      <EvolutionLine evolution={data.evolution} />

      <div className="summary-card__details">
        <DetailRow label="Ventes" value={data.ventes} />
        <DetailRow label="Achats" value={data.achats} />
        <DetailRow label="Depenses" value={data.depenses} />
      </div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-card__detail-row">
      <span className="summary-card__detail-label">{label}</span>
      <span className="summary-card__detail-value">{formatMontant(value)}</span>
    </div>
  );
}

/**
 * "+12 % par rapport a la semaine precedente" (ou variante negative), sans
 * jamais diviser par zero : si la comparaison n'a pas de sens (periode
 * precedente a reste=0, voir useSummary.computeEvolution), affiche
 * "Nouvelle activite" plutot que d'inventer un pourcentage.
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
