/**
 * Fonctions partagees de validation/parsing des montants. Toute saisie de
 * montant dans l'application doit passer par ici : evite les NaN affiches
 * et centralise la regle de validite (nombre fini, non negatif).
 */

/** Convertit une saisie utilisateur (virgule ou point decimal) en nombre, ou null si invalide. */
export function parseMontant(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function isValidMontant(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}
