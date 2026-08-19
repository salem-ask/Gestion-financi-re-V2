/**
 * Configuration centrale des taux financiers. Le moteur financier
 * (calculateFinancials) ne doit jamais recevoir de pourcentage code en
 * dur : tout passe par cet objet, afin de pouvoir le rendre configurable
 * (par l'utilisateur, par devise, etc.) dans une etape future sans toucher
 * a la logique de calcul.
 */
export interface FinancialSettings {
  dimeRate: number;
  savingsRate: number;
  generosityRate: number;
}

export const defaultFinancialSettings: FinancialSettings = {
  dimeRate: 0.1,
  savingsRate: 0.1,
  generosityRate: 0.05,
};
