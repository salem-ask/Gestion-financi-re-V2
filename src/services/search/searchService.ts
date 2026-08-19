import type { SearchFilters, SearchResult } from "@/types";
import { storageService } from "@/services/storage";

/**
 * Service de recherche globale.
 *
 * Volontairement minimal a ce stade : il parcourt les jours et les notes
 * deja charges par le storageService et fait une comparaison texte simple.
 * L'important est le CONTRAT (search(query, filters) -> SearchResult[])
 * qui ne changera pas quand l'implementation deviendra plus riche
 * (index inverse, recherche par plage de dates/montant, etc.).
 */
export async function search(query: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const [days, notes] = await Promise.all([storageService.getAllDays(), storageService.getAllNotes()]);
  const results: SearchResult[] = [];

  for (const day of days) {
    if (day.date.toLowerCase().includes(trimmed)) {
      results.push({ kind: "jour", id: day.id, date: day.date, label: `Journee du ${day.date}` });
    }

    for (const item of day.details.achat) {
      if (item.libelle.toLowerCase().includes(trimmed)) {
        results.push({ kind: "achat", id: item.id, date: day.date, label: item.libelle, montant: item.montant });
      }
    }
    for (const item of day.details.vente) {
      if (item.libelle.toLowerCase().includes(trimmed)) {
        results.push({ kind: "vente", id: item.id, date: day.date, label: item.libelle, montant: item.montant });
      }
    }
    for (const item of day.details.depense) {
      if (item.libelle.toLowerCase().includes(trimmed)) {
        results.push({ kind: "depense", id: item.id, date: day.date, label: item.libelle, montant: item.montant });
      }
    }
  }

  for (const note of notes) {
    if (note.texte.toLowerCase().includes(trimmed)) {
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
    return true;
  });
}

export const searchService = { search };
