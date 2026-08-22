import type { DayTotals } from "@/types";
import type { DiagnosticNiveau } from "./weeklyDiagnostic";

export interface MonthlyDiagnostic {
  /** Objectif de vente mensuel saisi par l'utilisateur (0 si jamais defini). */
  objectifVente: number;
  /** Ventes reelles du mois (totals.vente). */
  ventesRealisees: number;
  /** Progression realise/objectif en pourcentage (0 si aucun objectif defini). */
  progression: number;
  /** Ce qu'il reste a vendre pour atteindre l'objectif (jamais negatif). */
  resteAAtteindre: number;
  /** Projection lineaire des ventes en fin de mois (null si aucune journee enregistree). */
  projectionVenteFinMois: number | null;
  niveau: DiagnosticNiveau;
  messages: string[];
}

/**
 * Diagnostic & prevision mensuel : meme logique que le diagnostic
 * hebdomadaire (computeWeeklyDiagnostic), centree sur l'OBJECTIF DE VENTE
 * MENSUEL saisi par l'utilisateur (storageService.getMonthlySalesGoal),
 * jamais un objectif d'affectations. Seule adaptation reelle : la
 * projection de fin de periode s'appuie sur le nombre REEL de jours du
 * mois selectionne (totalJoursMois, 28 a 31) plutot que sur 7 jours fixes.
 * Reimplementee ici (plutot que factorisee dans le fichier hebdomadaire
 * deja valide) pour ne jamais risquer de le modifier.
 */
export function computeMonthlyDiagnostic(
  totals: DayTotals,
  joursEnregistres: number,
  objectifVente: number,
  totalJoursMois: number
): MonthlyDiagnostic {
  const ventesRealisees = totals.vente;
  const progression = objectifVente > 0 ? (ventesRealisees / objectifVente) * 100 : 0;
  const resteAAtteindre = Math.max(0, objectifVente - ventesRealisees);
  const projectionVenteFinMois = joursEnregistres > 0 ? (ventesRealisees / joursEnregistres) * totalJoursMois : null;

  const messages: string[] = [];
  let niveau: DiagnosticNiveau = "positif";

  if (joursEnregistres === 0) {
    messages.push("Aucune journee enregistree ce mois-ci : aucun diagnostic possible pour le moment.");
    niveau = "attention";
  } else if (objectifVente <= 0) {
    messages.push("Aucun objectif de vente mensuel defini. Renseignez-le pour activer le diagnostic.");
    niveau = "attention";
  } else {
    if (progression >= 100) {
      messages.push("Objectif de vente mensuel atteint.");
      niveau = "positif";
    } else if (projectionVenteFinMois !== null && projectionVenteFinMois >= objectifVente) {
      messages.push("En bonne voie : la projection de fin de mois atteint l'objectif de vente.");
      niveau = "positif";
    } else if (progression < 50 && joursEnregistres >= totalJoursMois - 3) {
      messages.push("Retard important sur l'objectif de vente en fin de mois.");
      niveau = "alerte";
    } else {
      messages.push(
        `Reste ${resteAAtteindre.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} a vendre pour atteindre l'objectif.`
      );
      niveau = "attention";
    }

    if (totals.reste < 0) {
      messages.push("Le reste financier du mois est negatif : depenses et affectations prevues depassent le gain.");
      niveau = "alerte";
    }
  }

  return {
    objectifVente,
    ventesRealisees,
    progression,
    resteAAtteindre,
    projectionVenteFinMois,
    niveau,
    messages,
  };
}
