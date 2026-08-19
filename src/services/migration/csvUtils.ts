/**
 * Lecture/ecriture CSV avec echappement correct (RFC4180) : champs entre
 * guillemets, virgules et guillemets internes, retours a la ligne dans un
 * champ. Utilise a la fois par l'import (parseCsvText) et l'export
 * (buildCsvText) pour ne jamais desynchroniser les deux formats.
 */

/**
 * Detecte le separateur (virgule ou point-virgule) a partir de la premiere
 * ligne du fichier : certains tableurs (Excel en configuration regionale
 * francaise notamment) exportent en point-virgule. Choisit ";" seulement
 * s'il est manifestement plus present que la virgule sur cette ligne.
 */
function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

/** Decoupe un texte CSV en en-tetes + lignes, en respectant les champs entre guillemets. Detecte automatiquement le separateur (, ou ;). */
export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const delimiter = detectDelimiter(text);
  const rows = parseCsvRows(text, delimiter);
  const [headerRow, ...rest] = rows;
  const headers = (headerRow ?? []).map((h) => h.trim());
  return { headers, rows: rest };
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  // Retire un eventuel BOM UTF-8 en tete de fichier (ajoute par buildCsvText / Excel).
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];

    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Derniere ligne (pas forcement terminee par un saut de ligne).
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/**
 * Normalise une date CSV vers le format interne ISO (YYYY-MM-DD). Accepte
 * le format ISO tel quel, et le format JJ/MM/AAAA (ou JJ-MM-AAAA) utilise
 * par l'ancien CSV V1. Renvoie null si la date n'est pas reconnaissable
 * (la ligne est alors signalee comme invalide, jamais devinee).
 */
export function parseFlexibleDate(raw: string): string | null {
  const trimmed = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const dayNum = Number(day);
    const monthNum = Number(month);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  return null;
}

/** Normalise un nom d'en-tete pour la comparaison (espaces/casse/accents) : reutilise normalizeLabel, deja utilise par la recherche et les categories. */
export { normalizeLabel as normalizeHeader } from "@/utils/normalizeLabel";

/** Echappe un champ pour l'ecriture CSV : entoure de guillemets s'il contient une virgule, un guillemet ou un saut de ligne. */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Construit un texte CSV complet (en-tetes + lignes), avec BOM UTF-8 pour la compatibilite Excel. */
export function buildCsvText(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((cells) => cells.map(escapeCsvField).join(","));
  return `﻿${lines.join("\r\n")}`;
}
