import { getDeviseAffichage } from "./currency";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formate un montant pour l'affichage, suffixe de la devise preferentielle
 * (voir Parametres > Devise, utils/currency.ts). Affichage uniquement :
 * aucune conversion/recalcul du montant, qui reste stocke et calcule tel
 * quel (voir services/finance, useSummary).
 */
export function formatMontant(value: number): string {
  return `${currencyFormatter.format(value)} ${getDeviseAffichage()}`;
}
