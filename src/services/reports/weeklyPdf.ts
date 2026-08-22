import type { jsPDF } from "jspdf";
import { createPdfBuilder } from "./pdfBuilder";
import { formatMontantPDF, formatPercentPDF } from "./formatPdf";
import type { WeeklyReportData } from "./weeklyReport";
import type { AffectationKind } from "@/types";

const AFFECTATION_LABELS: { key: AffectationKind; label: string }[] = [
  { key: "dime", label: "Dime" },
  { key: "epargne", label: "Epargne" },
  { key: "generosite", label: "Generosite" },
];

/**
 * Genere le PDF du rapport hebdomadaire a partir des memes donnees
 * (WeeklyReportData) que l'apercu en page (WeeklyReportPreview) : les deux
 * affichent donc toujours exactement les memes chiffres.
 *
 * jsPDF est charge dynamiquement (import() dans downloadWeeklyPdf) : cette
 * librairie embarque des dependances lourdes (html2canvas, dompurify) que
 * l'application n'utilise pas ; les charger uniquement au moment ou
 * l'utilisateur exporte reellement un PDF garde le bundle principal leger
 * pour tout le reste de l'app (priorite mobile).
 *
 * Tous les montants passent par formatMontantPDF() (jamais formatMontant
 * directement) : Intl.NumberFormat("fr-FR") separe les milliers avec un
 * caractere que les polices standard de jsPDF ne savent pas dessiner, ce
 * qui corrompait l'affichage ("2 2 1 / 5 0 0" au lieu de "221 500").
 * La mise en page (titres, pagination) est partagee avec le PDF quotidien
 * via pdfBuilder.ts.
 */
export function generateWeeklyPdf(report: WeeklyReportData, JsPdfCtor: typeof jsPDF): jsPDF {
  const doc = new JsPdfCtor({ unit: "mm", format: "a4" });
  const pdf = createPdfBuilder(doc);

  pdf.titleBlock("RAPPORT HEBDOMADAIRE", [`Periode : ${report.periodeLabel}`]);

  // ---- SYNTHESE -----------------------------------------------------
  pdf.heading("Synthese");
  pdf.row("Achats", formatMontantPDF(report.totals.achat));
  pdf.row("Ventes", formatMontantPDF(report.totals.vente));
  pdf.row("Depenses", formatMontantPDF(report.totals.depense));
  pdf.row("Gain", formatMontantPDF(report.totals.gain));
  pdf.row("Dime prevue", formatMontantPDF(report.totals.affectations.dime.prevue));
  pdf.row("Epargne prevue", formatMontantPDF(report.totals.affectations.epargne.prevue));
  pdf.row("Generosite prevue", formatMontantPDF(report.totals.affectations.generosite.prevue));
  pdf.row("Reste", formatMontantPDF(report.totals.reste));

  // ---- AFFECTATIONS FINANCIERES --------------------------------------
  pdf.heading("Affectations financieres");
  for (const { key, label } of AFFECTATION_LABELS) {
    const a = report.totals.affectations[key];
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
  pdf.subheading("Ventes par libelle");
  pdf.listOrEmpty(report.detailVentes);
  pdf.subheading("Achats par libelle");
  pdf.listOrEmpty(report.detailAchats);
  pdf.subheading("Depenses par libelle");
  pdf.listOrEmpty(report.detailDepenses);

  // ---- STATISTIQUES HEBDOMADAIRES ------------------------------------
  pdf.heading("Statistiques hebdomadaires");
  pdf.row("Total ventes", formatMontantPDF(report.statistics.totalVentes));
  pdf.row("Total achats", formatMontantPDF(report.statistics.totalAchats));
  pdf.row("Total depenses", formatMontantPDF(report.statistics.totalDepenses));
  pdf.row("Gain", formatMontantPDF(report.statistics.gain));
  pdf.row("Reste", formatMontantPDF(report.statistics.reste));
  pdf.row("Jours enregistres", String(report.statistics.joursEnregistres));
  pdf.row("Moyenne ventes / jour", formatMontantPDF(report.statistics.moyenneVentesParJour));
  pdf.row("Moyenne achats / jour", formatMontantPDF(report.statistics.moyenneAchatsParJour));
  pdf.row("Moyenne depenses / jour", formatMontantPDF(report.statistics.moyenneDepensesParJour));
  pdf.row(
    "Meilleur jour de vente",
    report.statistics.meilleurJourVente
      ? `${report.statistics.meilleurJourVente.date} (${formatMontantPDF(report.statistics.meilleurJourVente.montant)})`
      : "-"
  );
  pdf.row(
    "Jour avec le plus de depenses",
    report.statistics.jourPlusDepenses
      ? `${report.statistics.jourPlusDepenses.date} (${formatMontantPDF(report.statistics.jourPlusDepenses.montant)})`
      : "-"
  );

  // ---- TOP 5 ------------------------------------------------------------
  pdf.heading("Top 5");
  pdf.subheading("Top 5 ventes");
  pdf.listOrEmpty(report.topVentes);
  pdf.subheading("Top 5 achats");
  pdf.listOrEmpty(report.topAchats);
  pdf.subheading("Top 5 depenses");
  pdf.listOrEmpty(report.topDepenses);

  // ---- DIAGNOSTIC & PREVISION -----------------------------------------
  pdf.heading("Diagnostic & Prevision");
  pdf.row("Objectif ventes", formatMontantPDF(report.diagnostic.objectifVente));
  pdf.row("Ventes realisees", formatMontantPDF(report.diagnostic.ventesRealisees));
  pdf.row("Progression", formatPercentPDF(report.diagnostic.progression));
  pdf.row("Reste a atteindre", formatMontantPDF(report.diagnostic.resteAAtteindre));
  pdf.row(
    "Projection fin de semaine",
    report.diagnostic.projectionVenteFinSemaine !== null ? formatMontantPDF(report.diagnostic.projectionVenteFinSemaine) : "-"
  );
  pdf.space(2);
  for (const message of report.diagnostic.messages) {
    pdf.line(`- ${message}`);
  }

  return doc;
}

export async function downloadWeeklyPdf(report: WeeklyReportData): Promise<void> {
  const { jsPDF: JsPdfCtor } = await import("jspdf");
  const doc = generateWeeklyPdf(report, JsPdfCtor);
  doc.save(`rapport-hebdomadaire-${report.startIso}-${report.endIso}.pdf`);
}
