import { storageService } from "@/services/storage";
import {
  aggregatePeriodTotals,
  filterDaysInRange,
  topOperations,
  groupOperations,
  computeWeeklyStatistics,
  computeMonthlyDiagnostic,
} from "@/services/finance";
import type { OperationTotal, WeeklyStatistics, MonthlyDiagnostic } from "@/services/finance";
import { formatMonthLabel } from "@/utils/date";
import type { DayEntry, DayTotals, CustomDepenseCategory } from "@/types";

export interface MonthlyReportData {
  startIso: string;
  endIso: string;
  periodeLabel: string;
  days: DayEntry[];
  totals: DayTotals;
  statistics: WeeklyStatistics;
  diagnostic: MonthlyDiagnostic;
  topVentes: OperationTotal[];
  topAchats: OperationTotal[];
  topDepenses: OperationTotal[];
  detailVentes: OperationTotal[];
  detailAchats: OperationTotal[];
  detailDepenses: OperationTotal[];
  customCategories: CustomDepenseCategory[];
}

/**
 * Assemble toutes les donnees d'un rapport mensuel (synthese, affectations,
 * statistiques, top 5, diagnostic, details) pour une plage [startIso, endIso]
 * couvrant un mois calendaire complet. Meme principe que buildWeeklyReport :
 * fonction unique reutilisee A LA FOIS par l'apercu en page et par l'export
 * PDF, pour garantir qu'ils affichent toujours les memes donnees.
 *
 * Reutilise directement aggregatePeriodTotals/groupOperations/
 * computeWeeklyStatistics (deja periode-agnostiques) : aucune duplication
 * de la logique de calcul deja validee pour l'hebdomadaire. Ne lit que
 * storageService.getAllDays() (deja filtre la corbeille) : pas de nouveau
 * store, pas de nouvelle base de donnees pour les statistiques.
 */
export async function buildMonthlyReport(startIso: string, endIso: string): Promise<MonthlyReportData> {
  const [allDays, customCategories, objectifVente] = await Promise.all([
    storageService.getAllDays(),
    storageService.getCustomCategories(),
    storageService.getMonthlySalesGoal(),
  ]);

  const days = filterDaysInRange(allDays, startIso, endIso);
  const totals = aggregatePeriodTotals(days);
  const statistics = computeWeeklyStatistics(days, totals.gain, totals.reste);
  const totalJoursMois = Number(endIso.slice(8, 10));
  const diagnostic = computeMonthlyDiagnostic(totals, statistics.joursEnregistres, objectifVente, totalJoursMois);

  return {
    startIso,
    endIso,
    periodeLabel: formatMonthLabel(startIso),
    days,
    totals,
    statistics,
    diagnostic,
    topVentes: topOperations(days, "ventes", 5),
    topAchats: topOperations(days, "achats", 5),
    topDepenses: topOperations(days, "depenses", 5),
    detailVentes: groupOperations(days, "ventes"),
    detailAchats: groupOperations(days, "achats"),
    detailDepenses: groupOperations(days, "depenses"),
    customCategories,
  };
}
