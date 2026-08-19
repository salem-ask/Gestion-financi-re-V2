import type { AffectationTotals, AffectationsRealisees, AffectationsTotals, DayTotals, OperationItem } from "@/types";
import type { FinancialSettings } from "./financialSettings";

/**
 * Moteur financier centralise. Pure fonction, sans effet de bord et sans
 * dependance au stockage : reutilisable telle quelle par le quotidien,
 * le futur hebdomadaire/mensuel/annuel, les statistiques et l'export PDF.
 *
 * RESTE = GAIN - DIME PREVUE - EPARGNE PREVUE - GENEROSITE PREVUE - DEPENSES
 *
 * Les affectations financieres (dime, epargne, generosite) sont
 * distinctes des depenses : leur montant REALISE (saisi par
 * l'utilisateur) ne modifie jamais le reste total et n'est jamais ajoute
 * aux depenses. Seuls les montants PREVUS (pourcentages du gain)
 * interviennent dans le calcul du reste.
 */
export function calculateFinancials(
  achats: OperationItem[],
  ventes: OperationItem[],
  depenses: OperationItem[],
  affectationsRealisees: AffectationsRealisees,
  settings: FinancialSettings
): DayTotals {
  const achat = sumMontants(achats);
  const vente = sumMontants(ventes);
  const depense = sumMontants(depenses);
  const gain = vente - achat;

  const affectations: AffectationsTotals = {
    dime: computeAffectation(gain * settings.dimeRate, affectationsRealisees.dime),
    epargne: computeAffectation(gain * settings.savingsRate, affectationsRealisees.epargne),
    generosite: computeAffectation(gain * settings.generosityRate, affectationsRealisees.generosite),
  };

  const reste =
    gain - affectations.dime.prevue - affectations.epargne.prevue - affectations.generosite.prevue - depense;

  return { achat, vente, depense, gain, affectations, reste };
}

/**
 * Une prevision negative n'a pas de sens (on ne "prevoit" pas un don/une
 * epargne negative quand le gain est negatif) : elle est ramenee a 0 pour
 * eviter un faux "depassement" quand rien n'a ete realise. Meme regle
 * appliquee uniformement aux trois affectations.
 */
function computeAffectation(rawPrevue: number, realisee: number): AffectationTotals {
  const prevue = Math.max(0, rawPrevue);
  const diff = prevue - realisee;
  return {
    prevue,
    realisee,
    restante: Math.max(0, diff),
    depassement: Math.max(0, -diff),
  };
}

function sumMontants(items: OperationItem[]): number {
  return items.reduce((total, item) => total + item.montant, 0);
}
