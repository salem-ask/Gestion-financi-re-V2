import type { CsvFormatDetector } from "../types";
import { v2DetailleFormat } from "./v2Detaille";

/**
 * Registre des formats CSV reconnus. Chaque format est un CsvFormatDetector
 * independant, dans un fichier dedie (ex: `v2Detaille.ts`). Le coeur de
 * l'application (csvMigrationService) n'a jamais besoin d'etre modifie
 * pour supporter un nouveau format : il suffit de l'enregistrer ici.
 */
export const csvFormatRegistry: CsvFormatDetector[] = [v2DetailleFormat];
