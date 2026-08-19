import { storageService } from "@/services/storage";
import {
  aggregatePeriodTotals,
  filterDaysInRange,
  topOperations,
  groupOperations,
  computeWeeklyStatistics,
  computeYearlyDiagnostic,
  computeYearlyMonthsSummary,
  computeYearlyBestMonths,
} from "@/services/finance";
import type { OperationTotal, WeeklyStatistics, YearlyDiagnostic, MonthSummary, YearlyBestMonths } from "@/services/finance";
import { formatYearLabel } from "@/utils/date";
import type { DayEntry, DayTotals, CustomDepenseCategory } from "@/types";

export interface YearlyReportData {
  startIso: string;
  endIso: string;
  periodeLabel: string;
  days: DayEntry[];
  totals: DayTotals;
  statistics: WeeklyStatistics;
  diagnostic: YearlyDiagnostic;
  topVentes: OperationTotal[];
  topAchats: OperationTotal[];
  topDepenses: OperationTotal[];
  detailVentes: OperationTotal[];
  detailAchats: OperationTotal[];
  detailDepenses: OperationTotal[];
  monthsSummary: MonthSummary[];
  bestMonths: YearlyBestMonths;
  customCategories: CustomDepenseCategory[];
}

/**
 * Assemble toutes les donnees d'un rapport annuel (synthese, affectations,
 * statistiques, top 5, resume des 12 mois, meilleurs mois, diagnostic,
 * details) pour une plage [startIso, endIso] couvrant une annee civile
 * complete. Meme principe que buildMonthlyReport : fonction unique
 * reutilisee A LA FOIS par l'apercu en page et par l'export PDF, pour
 * garantir qu'ils affichent toujours les memes donnees.
 *
 * Reutilise directement aggregatePeriodTotals/groupOperations/
 * computeWeeklyStatistics (deja periode-agnostiques) : aucune duplication
 * de la logique de calcul deja validee pour l'hebdomadaire et le mensuel.
 * Ne lit que storageService.getAllDays() (deja filtre la corbeille) :
 * pas de nouveau store, pas de nouvelle base de donnees pour les rapports.
 */
export async function buildYearlyReport(startIso: string, endIso: string): Promise<YearlyReportData> {
  const [allDays, customCategories, objectifVente] = await Promise.all([
    storageService.getAllDays(),
    storageService.getCustomCategories(),
    storageService.getYearlySalesGoal(),
  ]);

  const days = filterDaysInRange(allDays, startIso, endIso);
  const totals = aggregatePeriodTotals(days);
  const statistics = computeWeeklyStatistics(days, totals.gain, totals.reste);
  const year = Number(startIso.slice(0, 4));
  const totalJoursAnnee = isLeapYear(year) ? 366 : 365;
  const diagnostic = computeYearlyDiagnostic(totals, statistics.joursEnregistres, objectifVente, totalJoursAnnee);
  const monthsSummary = computeYearlyMonthsSummary(days, year);
  const bestMonths = computeYearlyBestMonths(monthsSummary, totals);

  return {
    startIso,
    endIso,
    periodeLabel: formatYearLabel(startIso),
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
    monthsSummary,
    bestMonths,
    customCategories,
  };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
