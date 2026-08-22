import type { DayEntry, DayTotals } from "@/types";
import { aggregateAffectations } from "./aggregateAffectations";

/** Journees actives dont la date tombe dans [startIso, endIso] (bornes incluses). */
export function filterDaysInRange(days: DayEntry[], startIso: string, endIso: string): DayEntry[] {
  return days.filter((day) => day.date >= startIso && day.date <= endIso);
}

/**
 * Cumule les totaux d'une periode (semaine, plus tard mois/annee) a partir
 * des journees qui la composent. Reutilise la meme forme que DayTotals :
 * un total de periode n'est jamais qu'une somme de totaux quotidiens deja
 * calcules par le moteur financier (calculateFinancials), jamais recalcule
 * depuis les lignes brutes.
 *
 * RESTE = GAIN - DIME PREVUE - EPARGNE PREVUE - GENEROSITE PREVUE - DEPENSES
 * (memes regles qu'au niveau quotidien : uniquement les montants PREVUS,
 * jamais les montants realises, voir calculateFinancials.ts).
 */
export function aggregatePeriodTotals(days: DayEntry[]): DayTotals {
  let achat = 0;
  let vente = 0;
  let depense = 0;
  let gain = 0;

  for (const day of days) {
    achat += day.totals.achat;
    vente += day.totals.vente;
    depense += day.totals.depense;
    gain += day.totals.gain;
  }

  const affectations = aggregateAffectations(days);
  const reste =
    gain - affectations.dime.prevue - affectations.epargne.prevue - affectations.generosite.prevue - depense;

  return { achat, vente, depense, gain, affectations, reste };
}
