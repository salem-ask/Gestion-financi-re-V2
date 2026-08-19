import type { DayTotals } from "@/types";

export type DiagnosticNiveau = "positif" | "attention" | "alerte";

export interface WeeklyDiagnostic {
  /** Objectif de vente hebdomadaire saisi par l'utilisateur (0 si jamais defini). */
  objectifVente: number;
  /** Ventes reelles de la semaine (totals.vente). */
  ventesRealisees: number;
  /** Progression realise/objectif en pourcentage (0 si aucun objectif defini). */
  progression: number;
  /** Ce qu'il reste a vendre pour atteindre l'objectif (jamais negatif). */
  resteAAtteindre: number;
  /** Projection lineaire des ventes en fin de semaine (null si aucune journee enregistree). */
  projectionVenteFinSemaine: number | null;
  niveau: DiagnosticNiveau;
  messages: string[];
}

/**
 * Diagnostic & prevision hebdomadaire, centre sur l'OBJECTIF DE VENTE
 * HEBDOMADAIRE saisi par l'utilisateur (voir storageService.getWeeklySalesGoal) :
 * c'est la reference principale demandee, pas un objectif d'affectations.
 * La projection de fin de semaine est une simple extrapolation lineaire
 * (moyenne des ventes/jour x 7) a partir des journees deja saisies : une
 * estimation clairement documentee, pas une donnee garantie.
 */
export function computeWeeklyDiagnostic(totals: DayTotals, joursEnregistres: number, objectifVente: number): WeeklyDiagnostic {
  const ventesRealisees = totals.vente;
  const progression = objectifVente > 0 ? (ventesRealisees / objectifVente) * 100 : 0;
  const resteAAtteindre = Math.max(0, objectifVente - ventesRealisees);
  const projectionVenteFinSemaine = joursEnregistres > 0 ? (ventesRealisees / joursEnregistres) * 7 : null;

  const messages: string[] = [];
  let niveau: DiagnosticNiveau = "positif";

  if (joursEnregistres === 0) {
    messages.push("Aucune journee enregistree cette semaine : aucun diagnostic possible pour le moment.");
    niveau = "attention";
  } else if (objectifVente <= 0) {
    messages.push("Aucun objectif de vente hebdomadaire defini. Renseignez-le pour activer le diagnostic.");
    niveau = "attention";
  } else {
    if (progression >= 100) {
      messages.push("Objectif de vente hebdomadaire atteint.");
      niveau = "positif";
    } else if (projectionVenteFinSemaine !== null && projectionVenteFinSemaine >= objectifVente) {
      messages.push("En bonne voie : la projection de fin de semaine atteint l'objectif de vente.");
      niveau = "positif";
    } else if (progression < 50 && joursEnregistres >= 6) {
      messages.push("Retard important sur l'objectif de vente en fin de semaine.");
      niveau = "alerte";
    } else {
      messages.push(
        `Reste ${resteAAtteindre.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} a vendre pour atteindre l'objectif.`
      );
      niveau = "attention";
    }

    if (totals.reste < 0) {
      messages.push("Le reste financier de la semaine est negatif : depenses et affectations prevues depassent le gain.");
      niveau = "alerte";
    }
  }

  return {
    objectifVente,
    ventesRealisees,
    progression,
    resteAAtteindre,
    projectionVenteFinSemaine,
    niveau,
    messages,
  };
}
