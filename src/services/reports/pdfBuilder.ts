import type { jsPDF } from "jspdf";
import { formatMontantPDF } from "./formatPdf";

const MARGIN = 16;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const LINE_HEIGHT = 6;
const RULE_GRAY = 200;

export interface PdfBuilder {
  /** Bloc de titre encadre de deux fines regles (pas de grosse barre noire). */
  titleBlock(title: string, subtitleLines: string[]): void;
  /** Titre de section : reserve aussi la place d'une ligne de contenu (jamais de titre seul en bas de page). */
  heading(text: string): void;
  /** Sous-titre (ex: nom d'une affectation, "Top 5 ventes"). */
  subheading(text: string): void;
  /** Texte libre, coupe automatiquement a la largeur de la page. */
  line(text: string): void;
  /** Ligne "label ... valeur" alignee a droite. */
  row(label: string, value: string, indent?: number): void;
  /** Liste de libelles/montants, ou "Aucune donnee." si vide. */
  listOrEmpty(items: { libelle: string; montant: number }[]): void;
  space(mm: number): void;
}

/**
 * Mise en page partagee par tous les exports PDF de l'application
 * (hebdomadaire, quotidien) : evite de dupliquer la pagination et les
 * styles de titre/ligne dans chaque generateur. Pagination geree
 * manuellement : chaque helper appelle ensureSpace() avant d'ecrire, qui
 * ajoute une nouvelle page des que le contenu suivant ne tiendrait plus.
 */
export function createPdfBuilder(doc: jsPDF): PdfBuilder {
  let y = MARGIN;

  function ensureSpace(next: number): void {
    if (y + next > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function rule(): void {
    doc.setDrawColor(RULE_GRAY);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  }

  function titleBlock(title: string, subtitleLines: string[]): void {
    rule();
    y += 7;
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.text(title, MARGIN, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    for (const subtitle of subtitleLines) {
      doc.text(subtitle, MARGIN, y);
      y += 5;
    }
    rule();
  }

  function heading(text: string): void {
    y += 4;
    ensureSpace(LINE_HEIGHT + LINE_HEIGHT + 2);
    doc.setFontSize(12.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += LINE_HEIGHT;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(20);
  }

  function subheading(text: string): void {
    ensureSpace(LINE_HEIGHT * 2);
    y += 1;
    doc.setFont("helvetica", "bold");
    doc.text(text, MARGIN, y);
    y += LINE_HEIGHT;
    doc.setFont("helvetica", "normal");
  }

  function line(text: string): void {
    const wrapped = doc.splitTextToSize(text, PAGE_WIDTH - MARGIN * 2) as string[];
    for (const part of wrapped) {
      ensureSpace(LINE_HEIGHT);
      doc.text(part, MARGIN, y);
      y += LINE_HEIGHT;
    }
  }

  function row(label: string, value: string, indent = 0): void {
    ensureSpace(LINE_HEIGHT);
    doc.text(label, MARGIN + indent, y);
    doc.text(value, PAGE_WIDTH - MARGIN, y, { align: "right" });
    y += LINE_HEIGHT;
  }

  function listOrEmpty(items: { libelle: string; montant: number }[]): void {
    if (items.length === 0) {
      line("Aucune donnee.");
      return;
    }
    for (const item of items) {
      row(item.libelle, formatMontantPDF(item.montant), 2);
    }
  }

  function space(mm: number): void {
    y += mm;
  }

  return { titleBlock, heading, subheading, line, row, listOrEmpty, space };
}
