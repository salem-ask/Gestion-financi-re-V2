const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formate un montant pour l'affichage. La devise reste a definir plus tard. */
export function formatMontant(value: number): string {
  return currencyFormatter.format(value);
}
