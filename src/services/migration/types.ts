import type { DayEntryInput } from "@/types";

/**
 * Identifiant d'un format de CSV V1 reconnu. "inconnu" quand aucun
 * detecteur enregistre ne reconnait le fichier.
 */
export type CsvFormatId = "inconnu" | (string & {});

export interface CsvFormatDetector {
  /** Identifiant stable du format (ex: "v1-simple", "v1-detaille"). */
  id: string;
  /** Doit renvoyer true si les en-tetes correspondent a ce format. */
  matches(headers: string[]): boolean;
  /** Convertit les lignes CSV (deja decoupees) vers le modele V2. */
  toDayEntries(headers: string[], rows: string[][]): DayEntryInput[];
}

export interface CsvValidationIssue {
  ligne: number;
  message: string;
}

export interface CsvImportPreview {
  format: CsvFormatId;
  totalLignes: number;
  apercu: DayEntryInput[];
  issues: CsvValidationIssue[];
  /** false si le format n'est pas reconnu ou si des erreurs bloquantes existent. */
  peutContinuer: boolean;
}
