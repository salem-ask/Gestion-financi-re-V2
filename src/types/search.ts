/**
 * Types partages par le service de recherche globale.
 * La recherche restera independante de l'UI et de la logique metier :
 * elle consomme les donnees via les services de stockage et retourne
 * des resultats normalises, quelle que soit leur source (jour, note,
 * ligne de detail...).
 */
export type SearchResultKind = "jour" | "note" | "achat" | "vente" | "depense";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  date: string;
  label: string;
  /** Montant associe, si pertinent (absent pour une note). */
  montant?: number;
}

export interface SearchFilters {
  types?: SearchResultKind[];
  dateFrom?: string;
  dateTo?: string;
  montantMin?: number;
  montantMax?: number;
}
