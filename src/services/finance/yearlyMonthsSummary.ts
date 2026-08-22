import type { DayEntry, DayTotals } from "@/types";
import { aggregatePeriodTotals } from "./aggregatePeriod";

export interface MonthSummary {
  /** Mois calendaire, 1 (janvier) a 12 (decembre). */
  month: number;
  totals: DayTotals;
  joursEnregistres: number;
}

export interface MonthHighlight {
  month: number;
  montant: number;
}

export interface YearlyBestMonths {
  /** null si aucun mois de l'annee ne contient de journee enregistree. */
  meilleurMoisVentes: MonthHighlight | null;
  meilleurMoisGain: MonthHighlight | null;
  moisPlusDepenses: MonthHighlight | null;
  moyenneMensuelleVentes: number;
  moyenneMensuelleAchats: number;
  moyenneMensuelleDepenses: number;
  moyenneMensuelleGain: number;
}

/**
 * Repartit les journees d'une annee sur ses 12 mois calendaires (toujours
 * les 12, meme sans aucune donnee pour certains). Reutilise directement
 * aggregatePeriodTotals (deja valide) pour chaque mois : aucune nouvelle
 * formule de calcul, seulement un regroupement par mois.
 */
export function computeYearlyMonthsSummary(days: DayEntry[], year: number): MonthSummary[] {
  const summaries: MonthSummary[] = [];
  for (let month = 1; month <= 12; month++) {
    const monthDays = days.filter(
      (day) => day.date.slice(0, 4) === String(year) && Number(day.date.slice(5, 7)) === month
    );
    summaries.push({ month, totals: aggregatePeriodTotals(monthDays), joursEnregistres: monthDays.length });
  }
  return summaries;
}

/**
 * Meilleurs/plus faibles mois de l'annee, calcules uniquement a partir des
 * mois contenant au moins une journee enregistree (un mois vide ne peut
 * jamais etre "le meilleur"). Moyennes mensuelles = total annuel / 12
 * mois calendaires (jamais recalculees a partir des seuls mois actifs).
 */
export function computeYearlyBestMonths(summaries: MonthSummary[], yearlyTotals: DayTotals): YearlyBestMonths {
  const active = summaries.filter((s) => s.joursEnregistres > 0);

  return {
    meilleurMoisVentes: bestMonth(active, (s) => s.totals.vente),
    meilleurMoisGain: bestMonth(active, (s) => s.totals.gain),
    moisPlusDepenses: bestMonth(active, (s) => s.totals.depense),
    moyenneMensuelleVentes: yearlyTotals.vente / 12,
    moyenneMensuelleAchats: yearlyTotals.achat / 12,
    moyenneMensuelleDepenses: yearlyTotals.depense / 12,
    moyenneMensuelleGain: yearlyTotals.gain / 12,
  };
}

function bestMonth(summaries: MonthSummary[], selector: (summary: MonthSummary) => number): MonthHighlight | null {
  if (summaries.length === 0) return null;
  let best = summaries[0];
  for (const summary of summaries) {
    if (selector(summary) > selector(best)) best = summary;
  }
  return { month: best.month, montant: selector(best) };
}
