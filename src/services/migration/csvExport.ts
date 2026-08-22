import { storageService } from "@/services/storage";
import { buildCsvText } from "./csvUtils";
import { V2_DETAILLE_HEADERS } from "./formats/v2Detaille";
import type { DayEntry, OperationItem, OperationType } from "@/types";

/**
 * Construit le CSV detaille du quotidien (une ligne par operation reelle,
 * pas un simple resume) : achats/ventes/depenses de toutes les journees
 * actives, plus les affectations financieres (prevue = informative,
 * recalculee a l'import ; realisee = donnee reelle). Une journee sans
 * aucune operation produit quand meme une ligne (Type vide), pour ne
 * jamais perdre ses affectations a l'export.
 */
export async function buildDetailedCsv(): Promise<string> {
  const days = await storageService.getAllDays();
  const rows: string[][] = [];

  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const affectationCols = [
      String(day.totals.affectations.dime.prevue),
      String(day.affectationsRealisees.dime),
      String(day.totals.affectations.epargne.prevue),
      String(day.affectationsRealisees.epargne),
      String(day.totals.affectations.generosite.prevue),
      String(day.affectationsRealisees.generosite),
    ];

    const lines = [
      ...operationRows(day, "achat", day.achats, affectationCols),
      ...operationRows(day, "vente", day.ventes, affectationCols),
      ...operationRows(day, "depense", day.depenses, affectationCols),
    ];

    rows.push(...(lines.length > 0 ? lines : [[day.date, "", "", "", "", ...affectationCols]]));
  }

  return buildCsvText([...V2_DETAILLE_HEADERS], rows);
}

function operationRows(day: DayEntry, type: OperationType, items: OperationItem[], affectationCols: string[]): string[][] {
  return items.map((item) => [day.date, type, item.libelle, item.categorie ?? "", String(item.montant), ...affectationCols]);
}

/** Declenche le telechargement du CSV detaille dans le navigateur. */
export async function downloadDetailedCsv(): Promise<void> {
  const csv = await buildDetailedCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `quotidien-detaille-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
