/**
 * Lecture/ecriture CSV avec echappement correct (RFC4180) : champs entre
 * guillemets, virgules et guillemets internes, retours a la ligne dans un
 * champ. Utilise a la fois par l'import (parseCsvText) et l'export
 * (buildCsvText) pour ne jamais desynchroniser les deux formats.
 */

/** Decoupe un texte CSV en en-tetes + lignes, en respectant les champs entre guillemets. */
export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const rows = parseCsvRows(text);
  const [headerRow, ...rest] = rows;
  const headers = (headerRow ?? []).map((h) => h.trim());
  return { headers, rows: rest };
}

function parseCsvRows(text: string): string[][] {
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
    if (char === ",") {
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
