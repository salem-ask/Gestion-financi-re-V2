import { DEPENSE_CATEGORIES } from "./finance";

/**
 * Categorie de depense ajoutee par l'utilisateur (en plus des categories
 * fixes definies dans DEPENSE_CATEGORIES, qui restent inchangees).
 *
 * `value` est la valeur normalisee (voir utils/normalizeLabel) : c'est a
 * la fois la cle de stockage (empeche les doublons insensibles a la
 * casse/accents des la couche de stockage) et la valeur ecrite dans
 * OperationItem.categorie. `label` conserve la saisie originale de
 * l'utilisateur pour l'affichage.
 */
export interface CustomDepenseCategory {
  value: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export type CategoryOption = { value: string; label: string };

/** Fusionne categories fixes et personnalisees pour l'affichage dans un selecteur. */
export function mergeCategories(customCategories: CustomDepenseCategory[]): CategoryOption[] {
  return [
    ...DEPENSE_CATEGORIES.map((cat) => ({ value: cat.value, label: cat.label })),
    ...customCategories.map((cat) => ({ value: cat.value, label: cat.label })),
  ];
}

/** Libelle affichable pour une valeur de categorie (fixe ou personnalisee), avec repli sur la valeur brute. */
export function getCategoryLabel(value: string, customCategories: CustomDepenseCategory[] = []): string {
  const fixed = DEPENSE_CATEGORIES.find((cat) => cat.value === value);
  if (fixed) return fixed.label;
  const custom = customCategories.find((cat) => cat.value === value);
  if (custom) return custom.label;
  return value;
}
