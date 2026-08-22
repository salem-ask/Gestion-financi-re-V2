import { parseMontant, isValidMontant } from "@/utils/amount";
import { normalizeHeader, parseFlexibleDate } from "../csvUtils";
import { OPERATION_TYPES } from "@/types";
import type { CsvFormatDetector, CsvValidationIssue } from "../types";
import type { DayEntryInput, OperationItem, OperationType, AffectationsRealisees } from "@/types";

/** Colonnes du format CSV detaille (export/import quotidien). Les colonnes "Prevue" sont informatives : jamais relues a l'import (toujours recalculees par le moteur financier). */
export const V2_DETAILLE_HEADERS = [
  "Date",
  "Type",
  "Libelle",
  "Categorie",
  "Montant",
  "DimePrevue",
  "DimeRealisee",
  "EpargnePrevue",
  "EpargneRealisee",
  "GenerositePrevue",
  "GenerositeRealisee",
] as const;

/**
 * Colonnes minimales requises pour reconnaitre ce format : date/type/
 * libelle/montant seulement. "categorie" et les colonnes d'affectations
 * (DimePrevue, DimeRealisee, ...) sont optionnelles - c'est ce qui rend ce
 * detecteur retrocompatible avec l'ancien CSV V1 (date,type,libelle,montant
 * uniquement) sans dupliquer la logique dans un second detecteur : une
 * colonne absente donne simplement un index -1, deja gere partout ci-dessous
 * (categorie/affectations restent alors a leur valeur par defaut, jamais
 * inventees).
 */
const REQUIRED_HEADERS = ["date", "type", "libelle", "montant"];

function columnIndex(headers: string[], name: string): number {
  return headers.findIndex((h) => normalizeHeader(h) === name);
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface DayGroup {
  achats: OperationItem[];
  ventes: OperationItem[];
  depenses: OperationItem[];
  affectationsRealisees: AffectationsRealisees;
}

function emptyGroup(): DayGroup {
  return { achats: [], ventes: [], depenses: [], affectationsRealisees: { dime: 0, epargne: 0, generosite: 0 } };
}

export const v2DetailleFormat: CsvFormatDetector = {
  id: "v2-detaille",

  matches(headers) {
    const normalized = headers.map((h) => normalizeHeader(h));
    return REQUIRED_HEADERS.every((required) => normalized.includes(required));
  },

  toDayEntries(headers, rows) {
    const idx = {
      date: columnIndex(headers, "date"),
      type: columnIndex(headers, "type"),
      libelle: columnIndex(headers, "libelle"),
      categorie: columnIndex(headers, "categorie"),
      montant: columnIndex(headers, "montant"),
      dimeRealisee: columnIndex(headers, "dimerealisee"),
      epargneRealisee: columnIndex(headers, "epargnerealisee"),
      generositeRealisee: columnIndex(headers, "generositerealisee"),
    };

    const issues: CsvValidationIssue[] = [];
    const groups = new Map<string, DayGroup>();

    rows.forEach((cells, rowIndex) => {
      const ligne = rowIndex + 2; // +1 pour l'en-tete, +1 pour un index 1-based.
      // Accepte le format ISO (V2) et JJ/MM/AAAA (ancien CSV V1) : jamais de
      // rejet global du fichier uniquement pour une difference de format de date.
      const date = parseFlexibleDate(cells[idx.date] ?? "");
      const type = (cells[idx.type] ?? "").trim().toLowerCase();

      if (!date) {
        issues.push({ ligne, message: `Date invalide ou absente ("${cells[idx.date] ?? ""}").` });
        return;
      }

      const group = groups.get(date) ?? emptyGroup();
      groups.set(date, group);

      // Colonnes d'affectations realisees : identiques sur toutes les lignes
      // d'une meme date (denormalise a l'export) ; on lit la premiere valeur
      // non vide rencontree pour chaque affectation.
      readAffectation(cells, idx.dimeRealisee, (v) => (group.affectationsRealisees.dime = v));
      readAffectation(cells, idx.epargneRealisee, (v) => (group.affectationsRealisees.epargne = v));
      readAffectation(cells, idx.generositeRealisee, (v) => (group.affectationsRealisees.generosite = v));

      // Ligne "pseudo-jour" (Type vide) : ne sert qu'a porter les
      // affectations d'une journee sans aucune ligne d'operation.
      if (type === "") return;

      if (!OPERATION_TYPES.includes(type as OperationType)) {
        issues.push({ ligne, message: `Type d'operation inconnu ("${cells[idx.type] ?? ""}"). Attendu: achat, vente ou depense.` });
        return;
      }

      const libelle = (cells[idx.libelle] ?? "").trim();
      if (libelle === "") {
        issues.push({ ligne, message: "Libelle manquant." });
        return;
      }

      const montant = parseMontant(cells[idx.montant] ?? "");
      if (!isValidMontant(montant)) {
        issues.push({ ligne, message: `Montant invalide ("${cells[idx.montant] ?? ""}").` });
        return;
      }

      const categorieRaw = (cells[idx.categorie] ?? "").trim();
      const item: OperationItem = {
        id: generateId(),
        libelle,
        montant,
        categorie: type === "depense" && categorieRaw !== "" ? categorieRaw : undefined,
      };

      if (type === "achat") group.achats.push(item);
      else if (type === "vente") group.ventes.push(item);
      else group.depenses.push(item);
    });

    const entries: DayEntryInput[] = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, group]) => ({
        date,
        achats: group.achats,
        ventes: group.ventes,
        depenses: group.depenses,
        affectationsRealisees: group.affectationsRealisees,
        origine: "import-csv",
      }));

    return { entries, issues };
  },
};

function readAffectation(cells: string[], columnIdx: number, assign: (value: number) => void): void {
  if (columnIdx < 0) return;
  const raw = (cells[columnIdx] ?? "").trim();
  if (raw === "") return;
  const parsed = parseMontant(raw);
  if (isValidMontant(parsed)) assign(parsed);
}
