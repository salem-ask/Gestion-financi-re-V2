import { csvFormatRegistry } from "./formats/registry";
import { parseCsvText } from "./csvUtils";
import { storageService } from "@/services/storage";
import { DuplicateCategoryError } from "@/services/storage/indexedDbStorage";
import { DEPENSE_CATEGORIES } from "@/types";
import { normalizeLabel } from "@/utils/normalizeLabel";
import { startOfWeekIso, startOfMonthIso, startOfYearIso } from "@/utils/date";
import type { CsvFormatId, CsvImportPreview, CsvImportResult, CsvDayEntry, CsvConflictResolution } from "./types";
import type { DayEntryInput, CustomDepenseCategory } from "@/types";

/**
 * Service de migration/import CSV.
 *
 * previewImport() ne modifie jamais le stockage (detection de format +
 * conversion en apercu + detection en LECTURE SEULE des dates deja actives
 * localement, voir `conflicts`). confirmImport() ecrit reellement les
 * journees, une fois que l'utilisateur a vu l'apercu et, s'il y a des
 * conflits, choisi une resolution unique ("keep" ou "replace") applicable
 * a tout le fichier -- jamais une confirmation par date (voir
 * CsvConflictResolution). Par defaut (aucune resolution fournie), une date
 * en conflit n'est jamais ecrasee, pour rester sur un comportement sur.
 */
export { parseCsvText };

export function detectFormat(headers: string[]): CsvFormatId {
  const detector = csvFormatRegistry.find((candidate) => candidate.matches(headers));
  return detector?.id ?? "inconnu";
}

/**
 * Prepare un apercu avant import. N'ecrit jamais dans le stockage ; lit
 * seulement (getDay) pour detecter, par date, un conflit avec une journee
 * active existante -- sans quoi l'utilisateur ne verrait un conflit qu'une
 * fois l'import deja en cours, trop tard pour choisir en une seule fois
 * (voir CsvImportPreview.conflicts / CsvConflictModal).
 */
export async function previewImport(text: string): Promise<CsvImportPreview> {
  const { headers, rows } = parseCsvText(text);
  const formatId = detectFormat(headers);
  const detector = csvFormatRegistry.find((candidate) => candidate.id === formatId);

  if (!detector) {
    return {
      format: "inconnu",
      totalLignes: rows.length,
      apercu: [],
      issues: [{ ligne: 0, message: "Format de fichier CSV non reconnu." }],
      conflicts: [],
      peutContinuer: false,
    };
  }

  const { entries, issues } = detector.toDayEntries(headers, rows);
  const conflicts: string[] = [];
  for (const entry of entries) {
    const existing = await storageService.getDay(entry.date);
    if (existing) conflicts.push(entry.date);
  }

  return {
    format: formatId,
    totalLignes: rows.length,
    apercu: entries,
    issues,
    conflicts,
    peutContinuer: entries.length > 0,
  };
}

/**
 * Ecrit reellement les journees d'un apercu deja valide.
 *
 * - Date sans journee active existante : importee normalement (`imported`).
 * - Date en conflit (journee active deja existante) :
 *   - `conflictResolution: "keep"` (ou omis, valeur par defaut sure) :
 *     donnees V2 existantes conservees telles quelles (`skipped`).
 *   - `conflictResolution: "replace"` : la journee existante est remplacee
 *     par le contenu du CSV, EN PLACE (meme `id`, voir mergeForReplace) --
 *     jamais une nouvelle ligne, jamais de doublon. Bloque si la semaine/le
 *     mois/l'annee de cette date est cloture (`errors`), memes garanties
 *     que la modification manuelle d'une journee (voir DailyPage).
 *
 * saveDay() (storageService) recalcule automatiquement les totaux via le
 * moteur financier, comme pour toute saisie manuelle.
 */
export async function confirmImport(
  preview: CsvImportPreview,
  options: { conflictResolution?: CsvConflictResolution } = {}
): Promise<CsvImportResult> {
  const conflictResolution = options.conflictResolution ?? "keep";
  const imported: string[] = [];
  const replaced: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const customCategories = await storageService.getCustomCategories();

  for (const entry of preview.apercu) {
    try {
      const existing = await storageService.getDay(entry.date);

      if (existing) {
        if (conflictResolution === "keep") {
          skipped.push(entry.date);
          continue;
        }

        const [weekClosed, monthClosed, yearClosed] = await Promise.all([
          storageService.getWeekClosure(startOfWeekIso(entry.date)),
          storageService.getMonthClosure(startOfMonthIso(entry.date)),
          storageService.getYearClosure(startOfYearIso(entry.date)),
        ]);
        if (weekClosed || monthClosed || yearClosed) {
          errors.push(`${entry.date} : periode cloturee, remplacement impossible.`);
          continue;
        }

        const resolvedEntry = await resolveEntryCategories(entry, customCategories);
        await storageService.saveDay(mergeForReplace(resolvedEntry, entry, existing.id, existing.affectationsRealisees));
        replaced.push(entry.date);
        continue;
      }

      const resolvedEntry = await resolveEntryCategories(entry, customCategories);
      await storageService.saveDay(resolvedEntry);
      imported.push(entry.date);
    } catch (error) {
      errors.push(`${entry.date} : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  }

  return { imported, replaced, skipped, errors };
}

/**
 * Construit l'entree a ecrire pour un remplacement de conflit : reprend
 * l'id de la journee existante (mise a jour EN PLACE via saveDay, jamais
 * une creation -- evite tout doublon et preserve `createdAt`), et ne
 * remplace `affectationsRealisees` que si le CSV en portait explicitement
 * (voir CsvDayEntry.affectationsProvided) -- sinon les affectations
 * reellement saisies dans V2 (jamais presentes dans l'ancien CSV V1
 * minimal) restent intactes plutot que d'etre silencieusement remises a
 * zero.
 */
function mergeForReplace(
  resolvedEntry: DayEntryInput,
  original: CsvDayEntry,
  existingId: string,
  existingAffectations: DayEntryInput["affectationsRealisees"]
): DayEntryInput & { id: string } {
  return {
    ...resolvedEntry,
    id: existingId,
    affectationsRealisees: original.affectationsProvided ? resolvedEntry.affectationsRealisees : existingAffectations,
  };
}

/**
 * Fait correspondre les categories de depense provenant du CSV (valeur
 * interne comme lors de notre propre export, ou label saisi a la main
 * dans un fichier modifie) aux categories reellement stockees, en creant
 * une categorie personnalisee au besoin (reutilise addCustomCategory :
 * jamais un deuxieme mecanisme de categories).
 */
async function resolveEntryCategories(entry: CsvDayEntry, customCategories: CustomDepenseCategory[]): Promise<DayEntryInput> {
  const depenses = await Promise.all(
    entry.depenses.map(async (item) => {
      if (!item.categorie) return item;
      const value = await resolveCategorieValue(item.categorie, customCategories);
      return { ...item, categorie: value };
    })
  );
  // affectationsProvided n'existe pas sur DayEntry/DayEntryInput (voir
  // CsvDayEntry) : jamais transmis a saveDay(), qui stockerait sinon ce
  // champ etranger tel quel dans IndexedDB.
  const { affectationsProvided: _affectationsProvided, ...rest } = entry;
  return { ...rest, depenses };
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
