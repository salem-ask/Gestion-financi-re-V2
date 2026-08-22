import type { DayEntry } from "@/types";

export interface DayHighlight {
  date: string;
  montant: number;
}

export interface WeeklyStatistics {
  totalVentes: number;
  totalAchats: number;
  totalDepenses: number;
  gain: number;
  reste: number;
  joursEnregistres: number;
  moyenneVentesParJour: number;
  moyenneAchatsParJour: number;
  moyenneDepensesParJour: number;
  /** null si aucune journee enregistree cette semaine (jamais une valeur inventee). */
  meilleurJourVente: DayHighlight | null;
  jourPlusDepenses: DayHighlight | null;
}

/**
 * Statistiques d'une semaine, calculees uniquement a partir des journees
 * reellement enregistrees pour cette periode (corbeille deja exclue en
 * amont par storageService.getAllDays). gain/reste sont recus tels quels
 * (deja calcules par aggregatePeriodTotals) pour ne jamais dupliquer la
 * formule du reste ici.
 */
export function computeWeeklyStatistics(days: DayEntry[], gain: number, reste: number): WeeklyStatistics {
  const totalVentes = sum(days, (d) => d.totals.vente);
  const totalAchats = sum(days, (d) => d.totals.achat);
  const totalDepenses = sum(days, (d) => d.totals.depense);
  const joursEnregistres = days.length;

  return {
    totalVentes,
    totalAchats,
    totalDepenses,
    gain,
    reste,
    joursEnregistres,
    moyenneVentesParJour: joursEnregistres > 0 ? totalVentes / joursEnregistres : 0,
    moyenneAchatsParJour: joursEnregistres > 0 ? totalAchats / joursEnregistres : 0,
    moyenneDepensesParJour: joursEnregistres > 0 ? totalDepenses / joursEnregistres : 0,
    meilleurJourVente: bestDay(days, (d) => d.totals.vente),
    jourPlusDepenses: bestDay(days, (d) => d.totals.depense),
  };
}

function sum(days: DayEntry[], selector: (day: DayEntry) => number): number {
  return days.reduce((total, day) => total + selector(day), 0);
}

function bestDay(days: DayEntry[], selector: (day: DayEntry) => number): DayHighlight | null {
  if (days.length === 0) return null;
  let best = days[0];
  for (const day of days) {
    if (selector(day) > selector(best)) best = day;
  }
  return { date: best.date, montant: selector(best) };
}
