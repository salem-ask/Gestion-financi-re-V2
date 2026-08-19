import type { AffectationsTotals, AffectationTotals, DayEntry } from "@/types";
import { AFFECTATION_KEYS } from "@/types";

/**
 * Cumule les affectations financieres (dime/epargne/generosite) de
 * plusieurs journees. Prete a etre reutilisee par les futurs rapports
 * hebdomadaire/mensuel/annuel (PHASE 3+) : ne fait ici que preparer la
 * fonction, aucune page ne l'utilise encore.
 *
 * Cumule les valeurs PREVUE et REALISEE brutes, puis derive
 * restante/depassement des sommes (jamais en sommant des "restante"
 * deja clampees individuellement, ce qui fausserait le resultat).
 */
export function aggregateAffectations(days: DayEntry[]): AffectationsTotals {
  const totals: AffectationsTotals = {
    dime: emptyAffectation(),
    epargne: emptyAffectation(),
    generosite: emptyAffectation(),
  };

  for (const day of days) {
    for (const key of AFFECTATION_KEYS) {
      totals[key].prevue += day.totals.affectations[key].prevue;
      totals[key].realisee += day.totals.affectations[key].realisee;
    }
  }

  for (const key of AFFECTATION_KEYS) {
    const diff = totals[key].prevue - totals[key].realisee;
    totals[key].restante = Math.max(0, diff);
    totals[key].depassement = Math.max(0, -diff);
  }

  return totals;
}

function emptyAffectation(): AffectationTotals {
  return { prevue: 0, realisee: 0, restante: 0, depassement: 0 };
}
