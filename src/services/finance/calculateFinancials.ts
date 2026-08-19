import type { DayTotals, OperationItem } from "@/types";
import { CATEGORIE_GENEROSITE } from "@/types";
import type { FinancialSettings } from "./financialSettings";

/**
 * Moteur financier centralise. Pure fonction, sans effet de bord et sans
 * dependance au stockage : reutilisable telle quelle par le quotidien,
 * le futur hebdomadaire/mensuel/annuel, les statistiques et l'export PDF.
 *
 * RESTE = GAIN - DIME - EPARGNE - GENEROSITE PREVUE - DEPENSES
 * (les depenses incluent une eventuelle ligne "generosite" deja donnee :
 * elle diminue le reste normalement, comme toute depense, mais n'est
 * jamais retranchee une seconde fois ailleurs.)
 */
export function calculateFinancials(
  achats: OperationItem[],
  ventes: OperationItem[],
  depenses: OperationItem[],
  settings: FinancialSettings
): DayTotals {
  const achat = sumMontants(achats);
  const vente = sumMontants(ventes);
  const depense = sumMontants(depenses);

  const gain = vente - achat;
  const dime = gain * settings.dimeRate;
  const epargne = gain * settings.savingsRate;
  const generosityPlanned = gain * settings.generosityRate;

  const generosityGiven = sumMontants(depenses.filter((item) => item.categorie === CATEGORIE_GENEROSITE));
  const generosityRemaining = generosityPlanned - generosityGiven;

  const reste = gain - dime - epargne - generosityPlanned - depense;

  return {
    achat,
    vente,
    depense,
    gain,
    dime,
    epargne,
    generosityPlanned,
    generosityGiven,
    generosityRemaining,
    reste,
  };
}

function sumMontants(items: OperationItem[]): number {
  return items.reduce((total, item) => total + item.montant, 0);
}

/**
 * Vue d'affichage de la generosite : ne jamais montrer un "restant"
 * negatif. Au-dela de la generosite prevue, on affiche un depassement.
 *
 * Quand le gain est negatif, generosityPlanned (5% du gain) l'est aussi ;
 * conceptuellement, on ne peut pas "prevoir" un don negatif. On affiche
 * donc 0 comme prevision dans ce cas (le chiffre signe reste disponible
 * dans totals.generosityPlanned pour un usage interne/futur), ce qui
 * evite d'afficher un faux "depassement" quand rien n'a ete donne.
 */
export interface GenerosityDisplay {
  planned: number;
  given: number;
  remaining: number;
  overage: number;
}

export function getGenerosityDisplay(totals: DayTotals): GenerosityDisplay {
  const displayPlanned = Math.max(0, totals.generosityPlanned);
  const remaining = displayPlanned - totals.generosityGiven;
  return {
    planned: displayPlanned,
    given: totals.generosityGiven,
    remaining: Math.max(0, remaining),
    overage: Math.max(0, -remaining),
  };
}
