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

/**
 * Journee produite par un detecteur CSV, enrichie d'une information non
 * portee par DayEntryInput : `affectationsProvided` distingue "le CSV ne
 * contenait pas de colonnes d'affectations realisees" (l'ancien format V1
 * minimal date/type/libelle/montant) de "le CSV contenait des colonnes
 * d'affectations, toutes a zero" -- necessaire pour qu'un remplacement de
 * conflit (voir csvMigrationService.confirmImport) ne vide jamais les
 * affectations reellement saisies d'une journee existante simplement parce
 * que le CSV importe ne les portait pas.
 */
export type CsvDayEntry = DayEntryInput & { affectationsProvided: boolean };

export interface CsvFormatDetector {
  /** Identifiant stable du format (ex: "v2-detaille"). */
  id: string;
  /** Doit renvoyer true si les en-tetes correspondent a ce format. */
  matches(headers: string[]): boolean;
  /** Convertit les lignes CSV (deja decoupees) vers le modele de journees, en signalant les lignes invalides sans bloquer les autres. */
  toDayEntries(headers: string[], rows: string[][]): { entries: CsvDayEntry[]; issues: CsvValidationIssue[] };
}

export interface CsvImportPreview {
  format: CsvFormatId;
  totalLignes: number;
  apercu: CsvDayEntry[];
  issues: CsvValidationIssue[];
  /**
   * Dates de `apercu` pour lesquelles une journee ACTIVE existe deja
   * localement (detectee en lecture seule, rien n'est ecrit ici). Permet a
   * l'appelant de demander a l'utilisateur, en une seule fois, s'il veut
   * conserver ou remplacer ces journees avant confirmImport() (voir
   * CsvConflictModal).
   */
  conflicts: string[];
  /** false si le format n'est pas reconnu ou si aucune journee exploitable n'a ete produite. */
  peutContinuer: boolean;
}

/** Choix applique uniformement a TOUTES les dates en conflit d'un meme import (voir CsvImportPreview.conflicts). */
export type CsvConflictResolution = "keep" | "replace";

export interface CsvImportResult {
  /** Dates effectivement creees (aucun conflit). */
  imported: string[];
  /** Dates en conflit remplacees par le contenu du CSV (resolution "replace"). */
  replaced: string[];
  /** Dates en conflit conservees telles quelles (resolution "keep", ou valeur par defaut si aucune resolution fournie). */
  skipped: string[];
  errors: string[];
}
