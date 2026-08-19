import type { DayTotals } from "@/types";

export type DiagnosticNiveau = "positif" | "attention" | "alerte";

export interface WeeklyDiagnostic {
  /** Somme des 3 montants PREVUS (dime+epargne+generosite) de la semaine : seul "objectif" deja present dans l'app. */
  objectifAffectations: number;
  /** Somme des 3 montants REALISES de la semaine. */
  realiseAffectations: number;
  /** Progression realise/objectif en pourcentage (0 si aucun objectif). */
  progression: number;
  /** Projection lineaire du gain en fin de semaine (null si aucune journee enregistree). */
  projectionGainFinSemaine: number | null;
  /** Projection lineaire du reste en fin de semaine (null si aucune journee enregistree). */
  projectionResteFinSemaine: number | null;
  niveau: DiagnosticNiveau;
  messages: string[];
}

/**
 * Diagnostic & prevision hebdomadaire.
 *
 * Aucun objectif chiffrable ("objectif hebdomadaire" saisi par
 * l'utilisateur) n'existe ailleurs dans l'application : l'unique cible
 * deja presente dans le moteur financier est la somme des montants PREVUS
 * des 3 affectations (dime+epargne+generosite), deja calculee par
 * calculateFinancials/aggregateAffectations. C'est cette somme qui sert
 * ici d'"objectif" — rien n'est invente, tout provient de donnees deja
 * calculees. La projection de fin de semaine est une simple extrapolation
 * lineaire (moyenne quotidienne x 7) a partir des journees deja saisies :
 * une estimation clairement documentee, pas une donnee garantie.
 */
export function computeWeeklyDiagnostic(totals: DayTotals, joursEnregistres: number): WeeklyDiagnostic {
  const { dime, epargne, generosite } = totals.affectations;
  const objectifAffectations = dime.prevue + epargne.prevue + generosite.prevue;
  const realiseAffectations = dime.realisee + epargne.realisee + generosite.realisee;
  const progression = objectifAffectations > 0 ? (realiseAffectations / objectifAffectations) * 100 : 0;

  const projectionGainFinSemaine = joursEnregistres > 0 ? (totals.gain / joursEnregistres) * 7 : null;
  const projectionResteFinSemaine = joursEnregistres > 0 ? (totals.reste / joursEnregistres) * 7 : null;

  const messages: string[] = [];
  let niveau: DiagnosticNiveau = "positif";

  if (joursEnregistres === 0) {
    messages.push("Aucune journee enregistree cette semaine : aucun diagnostic possible pour le moment.");
    niveau = "attention";
  } else {
    if (totals.reste < 0) {
      messages.push("Le reste de la semaine est negatif : depenses et affectations prevues depassent le gain.");
      niveau = "alerte";
    }
    if (objectifAffectations > 0 && progression < 50 && joursEnregistres >= 6) {
      messages.push("Moins de la moitie des affectations prevues (dime/epargne/generosite) a ete realisee cette semaine.");
      if (niveau !== "alerte") niveau = "attention";
    }
    if (messages.length === 0) {
      messages.push("La semaine suit son cours normalement par rapport aux previsions.");
    }
  }

  return {
    objectifAffectations,
    realiseAffectations,
    progression,
    projectionGainFinSemaine,
    projectionResteFinSemaine,
    niveau,
    messages,
  };
}
