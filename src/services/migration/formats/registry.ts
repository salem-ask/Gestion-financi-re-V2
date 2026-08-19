import type { CsvFormatDetector } from "../types";

/**
 * Registre des formats CSV V1 reconnus.
 *
 * Vide pour l'instant : chaque ancien format (simple, detaille, etc.)
 * sera ajoute ici sous forme d'un CsvFormatDetector independant, dans
 * un fichier dedie (ex: `v1Simple.ts`, `v1Detaille.ts`). Le coeur de
 * l'application (csvMigrationService) n'a jamais besoin d'etre modifie
 * pour supporter un nouveau format : il suffit de l'enregistrer ici.
 */
export const csvFormatRegistry: CsvFormatDetector[] = [];
