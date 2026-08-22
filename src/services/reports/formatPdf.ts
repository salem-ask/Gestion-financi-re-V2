import { formatMontant } from "@/utils/format";

// U+202F (espace fine insecable) et U+00A0 (espace insecable) : les deux
// separateurs de milliers que peut produire Intl.NumberFormat("fr-FR").
const NON_STANDARD_SPACES = /[  ]/g;

/**
 * Formate un montant pour un PDF genere par jsPDF.
 *
 * formatMontant() (Intl.NumberFormat "fr-FR") separe les milliers avec un
 * espace fine insecable (U+202F). Les polices standard integrees a jsPDF
 * (Helvetica/WinAnsiEncoding) ne connaissent pas ce caractere : jsPDF ne
 * trouve pas sa largeur de glyphe et le rendu se corrompt (chiffres
 * espaces un par un, caracteres de remplacement). On retombe donc sur une
 * espace normale (U+0020), pleinement supportee par ces polices, pour
 * tout texte destine a un PDF.
 */
export function formatMontantPDF(value: number): string {
  return formatMontant(value).replace(NON_STANDARD_SPACES, " ");
}

/** Meme regle pour un pourcentage (utilise la virgule francaise, aucun caractere large). */
export function formatPercentPDF(value: number): string {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
