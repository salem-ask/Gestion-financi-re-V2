import type { jsPDF } from "jspdf";
import { formatMontant } from "@/utils/format";
import type { WeeklyReportData } from "./weeklyReport";
import type { AffectationKind } from "@/types";

const MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const LINE_HEIGHT = 6;

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
 * Pagination geree manuellement (pas de librairie de mise en page) :
 * ensureSpace() ajoute une page des qu'un bloc ne tiendrait plus sur la
 * page courante, et splitTextToSize() empeche tout texte d'etre coupe en
 * largeur.
 */
export function generateWeeklyPdf(report: WeeklyReportData, JsPdfCtor: typeof jsPDF): jsPDF {
  const doc = new JsPdfCtor({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(next: number): void {
    if (y + next > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function heading(text: string): void {
    y += 2;
    ensureSpace(LINE_HEIGHT + 4);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(text, MARGIN, y);
    y += LINE_HEIGHT + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  }

  function line(text: string): void {
    const wrapped = doc.splitTextToSize(text, PAGE_WIDTH - MARGIN * 2) as string[];
    for (const part of wrapped) {
      ensureSpace(LINE_HEIGHT);
      doc.text(part, MARGIN, y);
      y += LINE_HEIGHT;
    }
  }

  function row(label: string, value: string): void {
    ensureSpace(LINE_HEIGHT);
    doc.text(label, MARGIN, y);
    doc.text(value, PAGE_WIDTH - MARGIN, y, { align: "right" });
    y += LINE_HEIGHT;
  }

  function listOrEmpty(items: { libelle: string; montant: number }[]): void {
    if (items.length === 0) {
      line("Aucune donnee.");
      return;
    }
    for (const item of items) {
      row(item.libelle, formatMontant(item.montant));
    }
  }

  // Titre
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport hebdomadaire", MARGIN, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  line(`Periode : ${report.periodeLabel}`);

  // SYNTHESE
  heading("Synthese");
  row("Achats", formatMontant(report.totals.achat));
  row("Ventes", formatMontant(report.totals.vente));
  row("Depenses", formatMontant(report.totals.depense));
  row("Gain", formatMontant(report.totals.gain));
  row("Dime prevue", formatMontant(report.totals.affectations.dime.prevue));
  row("Epargne prevue", formatMontant(report.totals.affectations.epargne.prevue));
  row("Generosite prevue", formatMontant(report.totals.affectations.generosite.prevue));
  row("Reste", formatMontant(report.totals.reste));

  // AFFECTATIONS FINANCIERES
  heading("Affectations financieres");
  for (const { key, label } of AFFECTATION_LABELS) {
    const a = report.totals.affectations[key];
    line(`${label} - Prevue: ${formatMontant(a.prevue)}  Realisee: ${formatMontant(a.realisee)}  Restante: ${formatMontant(a.restante)}`);
    if (a.depassement > 0) {
      line(`  Depassement: ${formatMontant(a.depassement)}`);
    }
  }

  // DETAILS
  heading("Details");
  line("Ventes par libelle");
  listOrEmpty(report.detailVentes);
  y += 2;
  line("Achats par libelle");
  listOrEmpty(report.detailAchats);
  y += 2;
  line("Depenses par libelle");
  listOrEmpty(report.detailDepenses);

  // STATISTIQUES HEBDOMADAIRES
  heading("Statistiques hebdomadaires");
  row("Total ventes", formatMontant(report.statistics.totalVentes));
  row("Total achats", formatMontant(report.statistics.totalAchats));
  row("Total depenses", formatMontant(report.statistics.totalDepenses));
  row("Gain", formatMontant(report.statistics.gain));
  row("Reste", formatMontant(report.statistics.reste));
  row("Jours enregistres", String(report.statistics.joursEnregistres));
  row("Moyenne ventes / jour", formatMontant(report.statistics.moyenneVentesParJour));
  row("Moyenne achats / jour", formatMontant(report.statistics.moyenneAchatsParJour));
  row("Moyenne depenses / jour", formatMontant(report.statistics.moyenneDepensesParJour));
  row(
    "Meilleur jour de vente",
    report.statistics.meilleurJourVente
      ? `${report.statistics.meilleurJourVente.date} (${formatMontant(report.statistics.meilleurJourVente.montant)})`
      : "-"
  );
  row(
    "Jour avec le plus de depenses",
    report.statistics.jourPlusDepenses
      ? `${report.statistics.jourPlusDepenses.date} (${formatMontant(report.statistics.jourPlusDepenses.montant)})`
      : "-"
  );

  // TOP 5
  heading("Top 5 ventes");
  listOrEmpty(report.topVentes);
  heading("Top 5 achats");
  listOrEmpty(report.topAchats);
  heading("Top 5 depenses");
  listOrEmpty(report.topDepenses);

  // DIAGNOSTIC & PREVISION
  heading("Diagnostic & Prevision");
  row("Objectif affectations", formatMontant(report.diagnostic.objectifAffectations));
  row("Realise", formatMontant(report.diagnostic.realiseAffectations));
  row("Progression", `${report.diagnostic.progression.toFixed(0)}%`);
  if (report.diagnostic.projectionGainFinSemaine !== null) {
    row("Projection gain fin de semaine", formatMontant(report.diagnostic.projectionGainFinSemaine));
  }
  if (report.diagnostic.projectionResteFinSemaine !== null) {
    row("Projection reste fin de semaine", formatMontant(report.diagnostic.projectionResteFinSemaine));
  }
  for (const message of report.diagnostic.messages) {
    line(`- ${message}`);
  }

  return doc;
}

export async function downloadWeeklyPdf(report: WeeklyReportData): Promise<void> {
  const { jsPDF: JsPdfCtor } = await import("jspdf");
  const doc = generateWeeklyPdf(report, JsPdfCtor);
  doc.save(`rapport-hebdomadaire-${report.startIso}-${report.endIso}.pdf`);
}
