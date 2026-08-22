import { csvFormatRegistry } from "./formats/registry";
import { parseCsvText } from "./csvUtils";
import { storageService } from "@/services/storage";
import { DuplicateCategoryError } from "@/services/storage/indexedDbStorage";
import { DEPENSE_CATEGORIES } from "@/types";
import { normalizeLabel } from "@/utils/normalizeLabel";
import type { CsvFormatId, CsvImportPreview, CsvImportResult } from "./types";
import type { DayEntryInput, CustomDepenseCategory } from "@/types";

/**
 * Service de migration/import CSV.
 *
 * previewImport() ne touche jamais le stockage (detection de format +
 * conversion en apercu DayEntryInput[]). confirmImport() ecrit reellement
 * les journees, une fois que l'utilisateur a vu l'apercu : par defaut,
 * une date qui correspond deja a une journee active existante n'est
 * JAMAIS ecrasee (voir confirmImport), pour rester sur un comportement
 * sur en cas de doublon entre le fichier importe et les donnees locales.
 */
export { parseCsvText };

export function detectFormat(headers: string[]): CsvFormatId {
  const detector = csvFormatRegistry.find((candidate) => candidate.matches(headers));
  return detector?.id ?? "inconnu";
}

/**
 * Prepare un apercu avant import. Ne modifie jamais le stockage.
 * L'utilisateur doit explicitement confirmer via confirmImport() pour que
 * des donnees soient ecrites.
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

  const { entries, issues } = detector.toDayEntries(headers, rows);
  return {
    format: formatId,
    totalLignes: rows.length,
    apercu: entries,
    issues,
    peutContinuer: entries.length > 0,
  };
}

/**
 * Ecrit reellement les journees d'un apercu deja valide. Une date qui
 * correspond deja a une journee active n'est jamais ecrasee (comportement
 * sur par defaut) : elle est comptee dans `skipped` plutot qu'importee.
 * saveDay() (storageService) recalcule automatiquement les totaux via le
 * moteur financier, comme pour toute saisie manuelle.
 */
export async function confirmImport(preview: CsvImportPreview): Promise<CsvImportResult> {
  const imported: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const customCategories = await storageService.getCustomCategories();

  for (const entry of preview.apercu) {
    try {
      const existing = await storageService.getDay(entry.date);
      if (existing) {
        skipped.push(entry.date);
        continue;
      }
      const resolvedEntry = await resolveEntryCategories(entry, customCategories);
      await storageService.saveDay(resolvedEntry);
      imported.push(entry.date);
    } catch (error) {
      errors.push(`${entry.date} : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  }

  return { imported, skipped, errors };
}

/**
 * Fait correspondre les categories de depense provenant du CSV (valeur
 * interne comme lors de notre propre export, ou label saisi a la main
 * dans un fichier modifie) aux categories reellement stockees, en creant
 * une categorie personnalisee au besoin (reutilise addCustomCategory :
 * jamais un deuxieme mecanisme de categories).
 */
async function resolveEntryCategories(entry: DayEntryInput, customCategories: CustomDepenseCategory[]): Promise<DayEntryInput> {
  const depenses = await Promise.all(
    entry.depenses.map(async (item) => {
      if (!item.categorie) return item;
      const value = await resolveCategorieValue(item.categorie, customCategories);
      return { ...item, categorie: value };
    })
  );
  return { ...entry, depenses };
}

async function resolveCategorieValue(raw: string, customCategories: CustomDepenseCategory[]): Promise<string> {
  const normalized = normalizeLabel(raw);

  const fixed = DEPENSE_CATEGORIES.find((cat) => cat.value === raw || normalizeLabel(cat.label) === normalized);
  if (fixed) return fixed.value;

  const custom = customCategories.find((cat) => cat.value === raw || normalizeLabel(cat.label) === normalized);
  if (custom) return custom.value;

  try {
    const created = await storageService.addCustomCategory(raw);
    customCategories.push(created);
    return created.value;
  } catch (error) {
    if (error instanceof DuplicateCategoryError) {
      const refreshed = await storageService.getCustomCategories();
      const match = refreshed.find((cat) => cat.value === raw || normalizeLabel(cat.label) === normalized);
      if (match) return match.value;
    }
    throw error;
  }
}

export const csvMigrationService = { parseCsvText, detectFormat, previewImport, confirmImport };
