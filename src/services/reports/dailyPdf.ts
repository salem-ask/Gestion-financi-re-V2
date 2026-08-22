import type { jsPDF } from "jspdf";
import { createPdfBuilder } from "./pdfBuilder";
import { formatMontantPDF } from "./formatPdf";
import { getCategoryLabel } from "@/types";
import type { DailyReportData } from "./dailyReport";
import type { AffectationKind, OperationItem } from "@/types";

const AFFECTATION_LABELS: { key: AffectationKind; label: string }[] = [
  { key: "dime", label: "Dime" },
  { key: "epargne", label: "Epargne" },
  { key: "generosite", label: "Generosite" },
];

/**
 * Genere le PDF d'une journee. Meme moteur de mise en page que le PDF
 * hebdomadaire (pdfBuilder.ts) : memes titres, meme pagination, meme
 * formatage des montants (formatMontantPDF).
 */
export function generateDailyPdf(report: DailyReportData, JsPdfCtor: typeof jsPDF): jsPDF {
  const doc = new JsPdfCtor({ unit: "mm", format: "a4" });
  const pdf = createPdfBuilder(doc);
  const { day } = report;

  pdf.titleBlock("RAPPORT QUOTIDIEN", [`Date : ${report.dateLabel}`]);

  // ---- SYNTHESE -----------------------------------------------------
  pdf.heading("Synthese");
  pdf.row("Achats", formatMontantPDF(day.totals.achat));
  pdf.row("Ventes", formatMontantPDF(day.totals.vente));
  pdf.row("Depenses", formatMontantPDF(day.totals.depense));
  pdf.row("Gain", formatMontantPDF(day.totals.gain));
  pdf.row("Reste", formatMontantPDF(day.totals.reste));

  // ---- AFFECTATIONS FINANCIERES --------------------------------------
  pdf.heading("Affectations financieres");
  for (const { key, label } of AFFECTATION_LABELS) {
    const a = day.totals.affectations[key];
    pdf.subheading(label);
    pdf.row("Prevue", formatMontantPDF(a.prevue), 2);
    pdf.row("Realisee", formatMontantPDF(a.realisee), 2);
    pdf.row("Restante", formatMontantPDF(a.restante), 2);
    if (a.depassement > 0) {
      pdf.row("Depassement", formatMontantPDF(a.depassement), 2);
    }
  }

  // ---- DETAILS --------------------------------------------------------
  pdf.heading("Details");
  pdf.subheading("Ventes");
  listItems(pdf, day.ventes);
  pdf.subheading("Achats");
  listItems(pdf, day.achats);
  pdf.subheading("Depenses");
  listItems(pdf, day.depenses, report.customCategories);

  // ---- NOTES IMPORTANTES ------------------------------------------------
  if (report.notes.length > 0) {
    pdf.heading("Notes importantes");
    for (const note of report.notes) {
      pdf.line(`- ${note.texte}`);
    }
  }

  return doc;
}

function listItems(
  pdf: ReturnType<typeof createPdfBuilder>,
  items: OperationItem[],
  customCategories?: DailyReportData["customCategories"]
): void {
  if (items.length === 0) {
    pdf.line("Aucune ligne.");
    return;
  }
  for (const item of items) {
    const suffix = item.categorie && customCategories ? ` (${getCategoryLabel(item.categorie, customCategories)})` : "";
    pdf.row(`${item.libelle}${suffix}`, formatMontantPDF(item.montant), 2);
  }
}

export async function downloadDailyPdf(report: DailyReportData): Promise<void> {
  const { jsPDF: JsPdfCtor } = await import("jspdf");
  const doc = generateDailyPdf(report, JsPdfCtor);
  doc.save(`journee-${report.day.date}.pdf`);
}
