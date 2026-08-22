import { normalizeLabel } from "@/utils/normalizeLabel";
import type { DayEntry } from "@/types";

export interface OperationTotal {
  libelle: string;
  montant: number;
}

type OperationField = "achats" | "ventes" | "depenses";

/**
 * Regroupe les lignes d'operations d'une periode par libelle (insensible a
 * la casse/aux accents, meme regle que la recherche et les categories
 * personnalisees, voir normalizeLabel), en cumulant les montants. Classe du
 * montant le plus eleve au plus faible. N'invente jamais un libelle : ne
 * renvoie que ce qui a reellement ete saisi.
 */
export function groupOperations(days: DayEntry[], field: OperationField): OperationTotal[] {
  const totals = new Map<string, OperationTotal>();

  for (const day of days) {
    for (const item of day[field]) {
      const key = normalizeLabel(item.libelle);
      const existing = totals.get(key);
      if (existing) {
        existing.montant += item.montant;
      } else {
        totals.set(key, { libelle: item.libelle, montant: item.montant });
      }
    }
  }

  return [...totals.values()].sort((a, b) => b.montant - a.montant);
}

/** Les `limit` libelles les plus eleves d'une periode (moins si peu de donnees). */
export function topOperations(days: DayEntry[], field: OperationField, limit = 5): OperationTotal[] {
  return groupOperations(days, field).slice(0, limit);
}
