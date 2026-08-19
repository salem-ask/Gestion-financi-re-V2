import { notesService } from "@/services/notesService";
import { formatDateFr } from "@/utils/date";
import type { DayEntry, Note, CustomDepenseCategory } from "@/types";

export interface DailyReportData {
  day: DayEntry;
  dateLabel: string;
  notes: Note[];
  customCategories: CustomDepenseCategory[];
}

/**
 * Assemble les donnees du rapport quotidien d'une journee deja enregistree
 * (day.totals, deja calcule par calculateFinancials au moment de la
 * sauvegarde). N'ajoute que ce qui manque encore : les notes liees a la
 * date (services/notesService, jamais melangees aux champs financiers).
 */
export async function buildDailyReport(day: DayEntry, customCategories: CustomDepenseCategory[]): Promise<DailyReportData> {
  const notes = await notesService.listNotesByDate(day.date);
  return { day, dateLabel: formatDateFr(day.date), notes, customCategories };
}
