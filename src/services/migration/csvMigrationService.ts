import { csvFormatRegistry } from "./formats/registry";
import type { CsvFormatId, CsvImportPreview } from "./types";

/**
 * Service de migration CSV (V1 -> V2).
 *
 * Etape actuelle : uniquement l'architecture (detection de format,
 * squelette d'apercu). La logique complete d'import (parsing detaille,
 * validation fine, ecriture via storageService apres confirmation
 * utilisateur) sera ajoutee dans une etape ulterieure, sans avoir a
 * changer ce contrat public.
 */

/** Decoupe naive d'un CSV (separateur virgule, pas d'echappement complexe). */
export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [headerLine, ...rest] = lines;
  const headers = (headerLine ?? "").split(",").map((h) => h.trim());
  const rows = rest.map((line) => line.split(",").map((cell) => cell.trim()));
  return { headers, rows };
}

export function detectFormat(headers: string[]): CsvFormatId {
  const detector = csvFormatRegistry.find((candidate) => candidate.matches(headers));
  return detector?.id ?? "inconnu";
}

/**
 * Prepare un apercu avant import. Ne modifie jamais le stockage.
 * L'utilisateur doit explicitement confirmer via confirmImport()
 * (pas encore implemente) pour que des donnees soient ecrites.
 */
export function previewImport(text: string): CsvImportPreview {
  const { headers, rows } = parseCsvText(text);
  const formatId = detectFormat(headers);
  const detector = csvFormatRegistry.find((candidate) => candidate.id === formatId);

  if (!detector) {
    return {
      format: "inconnu",
      totalLignes: rows.length,
      apercu: [],
      issues: [{ ligne: 0, message: "Format de fichier CSV non reconnu." }],
      peutContinuer: false,
    };
  }

  const apercu = detector.toDayEntries(headers, rows);
  return {
    format: formatId,
    totalLignes: rows.length,
    apercu,
    issues: [],
    peutContinuer: true,
  };
}

export const csvMigrationService = { parseCsvText, detectFormat, previewImport };
