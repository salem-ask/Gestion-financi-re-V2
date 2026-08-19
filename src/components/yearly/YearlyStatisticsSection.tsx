import { formatMontant } from "@/utils/format";
import { formatDateFr } from "@/utils/date";
import type { WeeklyStatistics } from "@/services/finance";
import "./YearlyStatisticsSection.css";

interface YearlyStatisticsSectionProps {
  statistics: WeeklyStatistics;
}

export function YearlyStatisticsSection({ statistics }: YearlyStatisticsSectionProps) {
  if (statistics.joursEnregistres === 0) {
    return <p className="yearly-statistics__empty">Aucune journee enregistree cette annee.</p>;
  }

  return (
    <div className="yearly-statistics__grid">
      <Stat label="Total ventes" value={formatMontant(statistics.totalVentes)} />
      <Stat label="Total achats" value={formatMontant(statistics.totalAchats)} />
      <Stat label="Total depenses" value={formatMontant(statistics.totalDepenses)} />
      <Stat label="Gain" value={formatMontant(statistics.gain)} />
      <Stat label="Reste" value={formatMontant(statistics.reste)} />
      <Stat label="Jours enregistres" value={String(statistics.joursEnregistres)} />
      <Stat label="Moyenne ventes / jour" value={formatMontant(statistics.moyenneVentesParJour)} />
      <Stat label="Moyenne achats / jour" value={formatMontant(statistics.moyenneAchatsParJour)} />
      <Stat label="Moyenne depenses / jour" value={formatMontant(statistics.moyenneDepensesParJour)} />
      <Stat
        label="Meilleur jour de vente"
        value={
          statistics.meilleurJourVente
            ? `${formatDateFr(statistics.meilleurJourVente.date)} (${formatMontant(statistics.meilleurJourVente.montant)})`
            : "—"
        }
      />
      <Stat
        label="Jour avec le plus de depenses"
        value={
          statistics.jourPlusDepenses
            ? `${formatDateFr(statistics.jourPlusDepenses.date)} (${formatMontant(statistics.jourPlusDepenses.montant)})`
            : "—"
        }
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="yearly-statistics__item">
      <span className="yearly-statistics__label">{label}</span>
      <span className="yearly-statistics__value">{value}</span>
    </div>
  );
}
