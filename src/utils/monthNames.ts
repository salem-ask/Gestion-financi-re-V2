/** Noms des mois francais (index 0 = janvier), utilises par le module Annuel (resume des 12 mois, meilleurs mois). */
export const MONTH_NAMES_FR = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

/** Libelle d'un mois calendaire (1 = janvier ... 12 = decembre). */
export function monthLabel(month: number): string {
  return MONTH_NAMES_FR[month - 1] ?? String(month);
}
