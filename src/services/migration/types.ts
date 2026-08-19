import type { DayEntryInput } from "@/types";

/**
 * Identifiant d'un format de CSV reconnu. "inconnu" quand aucun
 * detecteur enregistre ne reconnait le fichier.
 */
export type CsvFormatId = "inconnu" | (string & {});

export interface CsvValidationIssue {
  ligne: number;
  message: string;
}

export interface CsvFormatDetector {
  /** Identifiant stable du format (ex: "v2-detaille"). */
  id: string;
  /** Doit renvoyer true si les en-tetes correspondent a ce format. */
  matches(headers: string[]): boolean;
  /** Convertit les lignes CSV (deja decoupees) vers le modele de journees, en signalant les lignes invalides sans bloquer les autres. */
  toDayEntries(headers: string[], rows: string[][]): { entries: DayEntryInput[]; issues: CsvValidationIssue[] };
}

export interface CsvImportPreview {
  format: CsvFormatId;
  totalLignes: number;
  apercu: DayEntryInput[];
  issues: CsvValidationIssue[];
  /** false si le format n'est pas reconnu ou si aucune journee exploitable n'a ete produite. */
  peutContinuer: boolean;
}

export interface CsvImportResult {
  /** Dates effectivement creees. */
  imported: string[];
  /** Dates ignorees car une journee active existait deja (jamais ecrasee par defaut). */
  skipped: string[];
  errors: string[];
}
