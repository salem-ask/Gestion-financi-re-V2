import type { jsPDF } from "jspdf";
import { createPdfBuilder } from "./pdfBuilder";
import { formatMontantPDF, formatPercentPDF } from "./formatPdf";
import type { YearlyReportData } from "./yearlyReport";
import { monthLabel } from "@/utils/monthNames";
import type { AffectationKind } from "@/types";

const AFFECTATION_LABELS: { key: AffectationKind; label: string }[] = [
  { key: "dime", label: "Dime" },
  { key: "epargne", label: "Epargne" },
  { key: "generosite", label: "Generosite" },
];

/**
 * Genere le PDF du rapport annuel a partir des memes donnees
 * (YearlyReportData) que l'apercu en page (YearlyReportPreview) : les
 * deux affichent donc toujours exactement les memes chiffres.
 *
 * Reutilise directement pdfBuilder.ts et formatPdf.ts (deja valides pour
 * les PDF hebdomadaire et mensuel) : meme mise en page (titres/sous-titres,
 * fines regles uniquement autour du titre, pagination automatique avec
 * protection anti-veuve), meme formatage des montants (formatMontantPDF,
 * qui evite le bug "2 2 1 / 5 0 0" de l'ancien PDF hebdomadaire). Aucune
 * duplication de cette logique deja corrigee/validee.
 */
export function generateYearlyPdf(report: YearlyReportData, JsPdfCtor: typeof jsPDF): jsPDF {
  const doc = new JsPdfCtor({ unit: "mm", format: "a4" });
  const pdf = createPdfBuilder(doc);

  pdf.titleBlock("RAPPORT FINANCIER ANNUEL", [`Annee : ${report.periodeLabel}`]);

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

  // ---- STATISTIQUES ANNUELLES -------------------------------------------
  pdf.heading("Statistiques annuelles");
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

  // ---- RESUME DES 12 MOIS ------------------------------------------------
  pdf.heading("Resume des 12 mois");
  for (const summary of report.monthsSummary) {
    pdf.subheading(monthLabel(summary.month));
    if (summary.joursEnregistres === 0) {
      pdf.line("Aucune donnee.");
    } else {
      pdf.row("Ventes", formatMontantPDF(summary.totals.vente), 2);
      pdf.row("Achats", formatMontantPDF(summary.totals.achat), 2);
      pdf.row("Depenses", formatMontantPDF(summary.totals.depense), 2);
      pdf.row("Gain", formatMontantPDF(summary.totals.gain), 2);
      pdf.row("Reste", formatMontantPDF(summary.totals.reste), 2);
    }
  }

  // ---- MEILLEURS MOIS -----------------------------------------------------
  pdf.heading("Meilleurs mois");
  pdf.row(
    "Meilleur mois en ventes",
    report.bestMonths.meilleurMoisVentes
      ? `${monthLabel(report.bestMonths.meilleurMoisVentes.month)} (${formatMontantPDF(report.bestMonths.meilleurMoisVentes.montant)})`
      : "-"
  );
  pdf.row(
    "Meilleur mois en gain",
    report.bestMonths.meilleurMoisGain
      ? `${monthLabel(report.bestMonths.meilleurMoisGain.month)} (${formatMontantPDF(report.bestMonths.meilleurMoisGain.montant)})`
      : "-"
  );
  pdf.row(
    "Mois avec le plus de depenses",
    report.bestMonths.moisPlusDepenses
      ? `${monthLabel(report.bestMonths.moisPlusDepenses.month)} (${formatMontantPDF(report.bestMonths.moisPlusDepenses.montant)})`
      : "-"
  );
  pdf.row("Moyenne mensuelle ventes", formatMontantPDF(report.bestMonths.moyenneMensuelleVentes));
  pdf.row("Moyenne mensuelle achats", formatMontantPDF(report.bestMonths.moyenneMensuelleAchats));
  pdf.row("Moyenne mensuelle depenses", formatMontantPDF(report.bestMonths.moyenneMensuelleDepenses));
  pdf.row("Moyenne mensuelle gain", formatMontantPDF(report.bestMonths.moyenneMensuelleGain));

  // ---- DIAGNOSTIC & PREVISION -----------------------------------------
  pdf.heading("Diagnostic & Prevision");
  pdf.row("Objectif ventes", formatMontantPDF(report.diagnostic.objectifVente));
  pdf.row("Ventes realisees", formatMontantPDF(report.diagnostic.ventesRealisees));
  pdf.row("Progression", formatPercentPDF(report.diagnostic.progression));
  pdf.row("Reste a atteindre", formatMontantPDF(report.diagnostic.resteAAtteindre));
  pdf.row(
    "Projection fin d'annee",
    report.diagnostic.projectionVenteFinAnnee !== null ? formatMontantPDF(report.diagnostic.projectionVenteFinAnnee) : "-"
  );
  pdf.space(2);
  for (const message of report.diagnostic.messages) {
    pdf.line(`- ${message}`);
  }

  // ---- DETAILS --------------------------------------------------------
  pdf.heading("Details");
  pdf.subheading("Ventes par libelle");
  pdf.listOrEmpty(report.detailVentes);
  pdf.subheading("Achats par libelle");
  pdf.listOrEmpty(report.detailAchats);
  pdf.subheading("Depenses par libelle");
  pdf.listOrEmpty(report.detailDepenses);

  return doc;
}

export async function downloadYearlyPdf(report: YearlyReportData): Promise<void> {
  const { jsPDF: JsPdfCtor } = await import("jspdf");
  const doc = generateYearlyPdf(report, JsPdfCtor);
  doc.save(`rapport-annuel-${report.periodeLabel}.pdf`);
}
