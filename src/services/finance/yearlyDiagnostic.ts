import type { DayTotals } from "@/types";
import type { DiagnosticNiveau } from "./weeklyDiagnostic";

export interface YearlyDiagnostic {
  /** Objectif de vente annuel saisi par l'utilisateur (0 si jamais defini). */
  objectifVente: number;
  /** Ventes reelles de l'annee (totals.vente). */
  ventesRealisees: number;
  /** Progression realise/objectif en pourcentage (0 si aucun objectif defini). */
  progression: number;
  /** Ce qu'il reste a vendre pour atteindre l'objectif (jamais negatif). */
  resteAAtteindre: number;
  /** Projection lineaire des ventes en fin d'annee (null si aucune journee enregistree). */
  projectionVenteFinAnnee: number | null;
  niveau: DiagnosticNiveau;
  messages: string[];
}

/**
 * Diagnostic & prevision annuel : meme logique que les diagnostics
 * hebdomadaire (computeWeeklyDiagnostic) et mensuel (computeMonthlyDiagnostic),
 * centree sur l'OBJECTIF DE VENTE ANNUEL saisi par l'utilisateur
 * (storageService.getYearlySalesGoal), jamais un objectif d'affectations.
 * Seule adaptation reelle : la projection de fin de periode s'appuie sur
 * le nombre REEL de jours de l'annee selectionnee (totalJoursAnnee, 365
 * ou 366) plutot que sur 7 jours ou 28-31 jours fixes. Reimplementee ici
 * (plutot que factorisee dans les fichiers hebdomadaire/mensuel deja
 * valides) pour ne jamais risquer de les modifier.
 */
export function computeYearlyDiagnostic(
  totals: DayTotals,
  joursEnregistres: number,
  objectifVente: number,
  totalJoursAnnee: number
): YearlyDiagnostic {
  const ventesRealisees = totals.vente;
  const progression = objectifVente > 0 ? (ventesRealisees / objectifVente) * 100 : 0;
  const resteAAtteindre = Math.max(0, objectifVente - ventesRealisees);
  const projectionVenteFinAnnee = joursEnregistres > 0 ? (ventesRealisees / joursEnregistres) * totalJoursAnnee : null;

  const messages: string[] = [];
  let niveau: DiagnosticNiveau = "positif";

  if (joursEnregistres === 0) {
    messages.push("Aucune journee enregistree cette annee : aucun diagnostic possible pour le moment.");
    niveau = "attention";
  } else if (objectifVente <= 0) {
    messages.push("Aucun objectif de vente annuel defini. Renseignez-le pour activer le diagnostic.");
    niveau = "attention";
  } else {
    if (progression >= 100) {
      messages.push("Objectif de vente annuel atteint.");
      niveau = "positif";
    } else if (projectionVenteFinAnnee !== null && projectionVenteFinAnnee >= objectifVente) {
      messages.push("En bonne voie : la projection de fin d'annee atteint l'objectif de vente.");
      niveau = "positif";
    } else if (progression < 50 && joursEnregistres >= totalJoursAnnee - 3) {
      messages.push("Retard important sur l'objectif de vente en fin d'annee.");
      niveau = "alerte";
    } else {
      messages.push(
        `Reste ${resteAAtteindre.toLocaleString("fr-FR").replace(/[  ]/g, " ")} a vendre pour atteindre l'objectif.`
      );
      niveau = "attention";
    }

    if (totals.reste < 0) {
      messages.push("Le reste financier de l'annee est negatif : depenses et affectations prevues depassent le gain.");
      niveau = "alerte";
    }
  }

  return {
    objectifVente,
    ventesRealisees,
    progression,
    resteAAtteindre,
    projectionVenteFinAnnee,
    niveau,
    messages,
  };
}
