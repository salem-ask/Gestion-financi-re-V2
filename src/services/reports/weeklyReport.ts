import { storageService } from "@/services/storage";
import {
  aggregatePeriodTotals,
  filterDaysInRange,
  topOperations,
  groupOperations,
  computeWeeklyStatistics,
  computeWeeklyDiagnostic,
} from "@/services/finance";
import type { OperationTotal, WeeklyStatistics, WeeklyDiagnostic } from "@/services/finance";
import { formatDateRangeFr } from "@/utils/date";
import type { DayEntry, DayTotals, CustomDepenseCategory } from "@/types";

export interface WeeklyReportData {
  startIso: string;
  endIso: string;
  periodeLabel: string;
  days: DayEntry[];
  totals: DayTotals;
  statistics: WeeklyStatistics;
  diagnostic: WeeklyDiagnostic;
  topVentes: OperationTotal[];
  topAchats: OperationTotal[];
  topDepenses: OperationTotal[];
  detailVentes: OperationTotal[];
  detailAchats: OperationTotal[];
  detailDepenses: OperationTotal[];
  customCategories: CustomDepenseCategory[];
}

/**
 * Assemble toutes les donnees d'un rapport hebdomadaire (synthese,
 * affectations, statistiques, top 5, diagnostic, details) pour une plage
 * [startIso, endIso]. Fonction unique reutilisee A LA FOIS par l'apercu en
 * page et par l'export PDF : les deux consomment exactement le meme objet,
 * ce qui garantit qu'ils affichent toujours les memes donnees.
 *
 * Ne lit que storageService.getAllDays() (deja filtre la corbeille) : pas
 * de nouveau store, pas de nouvelle base de donnees pour les statistiques.
 */
export async function buildWeeklyReport(startIso: string, endIso: string): Promise<WeeklyReportData> {
  const [allDays, customCategories] = await Promise.all([
    storageService.getAllDays(),
    storageService.getCustomCategories(),
  ]);

  const days = filterDaysInRange(allDays, startIso, endIso);
  const totals = aggregatePeriodTotals(days);
  const statistics = computeWeeklyStatistics(days, totals.gain, totals.reste);
  const diagnostic = computeWeeklyDiagnostic(totals, statistics.joursEnregistres);

  return {
    startIso,
    endIso,
    periodeLabel: formatDateRangeFr(startIso, endIso),
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
