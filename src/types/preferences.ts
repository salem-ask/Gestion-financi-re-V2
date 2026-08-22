/**
 * Types pour la page Parametres (preferences locales uniquement).
 *
 * Ces donnees sont volontairement independantes du moteur financier
 * (services/finance, useSummary) et de la synchronisation cloud
 * (syncService) : ce sont de simples preferences/indicateurs, jamais des
 * entrees qui modifient un calcul existant.
 */

/** Devise d'affichage : 4 choix fixes, voir formatMontant. */
export type Devise = "FC" | "$" | "€" | "FCFA";

/** Format de rapport prefere (preference seule, pas encore branchee sur l'export reel). */
export type FormatRapport = "pdf" | "csv";

/** Preference d'apparence (preference seule, pas encore branchee sur le rendu reel). */
export type Theme = "systeme" | "clair" | "sombre";

export interface AppPreferences {
  devise: Devise;
  pourcentageEpargne: number;
  pourcentageDime: number;
  formatRapportPrefere: FormatRapport;
  theme: Theme;
}

export type ObjectifType = "epargne" | "ventes" | "depenses" | "personnalise";

export interface Objectif {
  id: string;
  type: ObjectifType;
  nom: string;
  montantCible: number;
  /** Date cible optionnelle, format ISO (YYYY-MM-DD). */
  dateCible?: string;
  createdAt: string;
  updatedAt: string;
}

export type ObjectifInput = Omit<Objectif, "id" | "createdAt" | "updatedAt">;
