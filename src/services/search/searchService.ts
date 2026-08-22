import type { SearchFilters, SearchResult } from "@/types";
import { storageService } from "@/services/storage";
import { normalizeLabel } from "@/utils/normalizeLabel";

/**
 * Service de recherche globale.
 *
 * Parcourt les jours et notes ACTIFS (le storageService exclut deja la
 * corbeille de getAllDays/getAllNotes, la recherche ne peut donc pas
 * remonter d'element supprime). La comparaison passe par normalizeLabel
 * (insensible a la casse et aux accents) plutot qu'un simple toLowerCase,
 * pour rester coherente avec la future normalisation des libelles.
 *
 * Le CONTRAT (search(query, filters) -> SearchResult[]) ne change pas :
 * seule l'implementation s'enrichit (categorie, filtres) au fil des phases.
 */
export async function search(query: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
  const needle = normalizeLabel(query);
  if (!needle) return [];

  const [days, notes] = await Promise.all([storageService.getAllDays(), storageService.getAllNotes()]);
  const results: SearchResult[] = [];

  for (const day of days) {
    if (normalizeLabel(day.date).includes(needle)) {
      results.push({ kind: "jour", id: day.id, date: day.date, label: `Journee du ${day.date}` });
    }

    for (const item of day.achats) {
      if (normalizeLabel(item.libelle).includes(needle)) {
        results.push({ kind: "achat", id: item.id, date: day.date, label: item.libelle, montant: item.montant });
      }
    }
    for (const item of day.ventes) {
      if (normalizeLabel(item.libelle).includes(needle)) {
        results.push({ kind: "vente", id: item.id, date: day.date, label: item.libelle, montant: item.montant });
      }
    }
    for (const item of day.depenses) {
      const matchesLibelle = normalizeLabel(item.libelle).includes(needle);
      const matchesCategorie = item.categorie ? normalizeLabel(item.categorie).includes(needle) : false;
      if (matchesLibelle || matchesCategorie) {
        results.push({
          kind: "depense",
          id: item.id,
          date: day.date,
          label: item.libelle,
          montant: item.montant,
          categorie: item.categorie,
        });
      }
    }
  }

  for (const note of notes) {
    if (normalizeLabel(note.texte).includes(needle)) {
      results.push({ kind: "note", id: note.id, date: note.date, label: note.texte });
    }
  }

  return applyFilters(results, filters);
}

function applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
  return results.filter((result) => {
    if (filters.types && !filters.types.includes(result.kind)) return false;
    if (filters.dateFrom && result.date < filters.dateFrom) return false;
    if (filters.dateTo && result.date > filters.dateTo) return false;
    if (filters.montantMin !== undefined && (result.montant ?? 0) < filters.montantMin) return false;
    if (filters.montantMax !== undefined && (result.montant ?? 0) > filters.montantMax) return false;
    if (filters.categorie && result.categorie !== filters.categorie) return false;
    return true;
  });
}

export const searchService = { search };
