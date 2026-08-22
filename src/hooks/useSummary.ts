import { useEffect, useState } from "react";
import { storageService } from "@/services/storage";
import { filterDaysInRange, aggregatePeriodTotals } from "@/services/finance";
import {
  todayIso,
  addDaysIso,
  startOfWeekIso,
  endOfWeekIso,
  startOfMonthIso,
  endOfMonthIso,
  addMonthsIso,
  startOfYearIso,
  endOfYearIso,
  addYearsIso,
} from "@/utils/date";
import type { DayEntry, DayTotals } from "@/types";

/**
 * Variation du benefice/reste par rapport a la periode precedente
 * correspondante. `pourcentage` vaut null quand la comparaison n'a pas de
 * sens mathematique (reste de la periode precedente egal a 0) : aucune
 * division par zero, aucune valeur inventee -- voir SummaryCard, qui
 * affiche alors "Nouvelle activite" a la place d'un pourcentage.
 */
export interface PeriodEvolution {
  pourcentage: number | null;
  /** Suffixe pret a l'emploi apres "par rapport ", ex: "a hier", "au mois precedent". */
  comparaisonLabel: string;
}

export interface PeriodSummary {
  ventes: number;
  achats: number;
  /** Gain de la periode = totals.gain (aggregatePeriodTotals), jamais recalcule differemment. */
  gain: number;
  depenses: number;
  /** Benefice/reste de la periode = totals.reste (aggregatePeriodTotals), jamais recalcule differemment. */
  beneficeReste: number;
  evolution: PeriodEvolution;
}

export interface HomeSummary {
  aujourdHui: PeriodSummary;
  cetteSemaine: PeriodSummary;
  ceMois: PeriodSummary;
  cetteAnnee: PeriodSummary;
}

const ZERO_EVOLUTION: PeriodEvolution = { pourcentage: null, comparaisonLabel: "" };
const ZERO: PeriodSummary = { ventes: 0, achats: 0, gain: 0, depenses: 0, beneficeReste: 0, evolution: ZERO_EVOLUTION };

const EMPTY_SUMMARY: HomeSummary = {
  aujourdHui: ZERO,
  cetteSemaine: ZERO,
  ceMois: ZERO,
  cetteAnnee: ZERO,
};

/**
 * Cumule les journees d'une plage [startIso, endIso] via les memes
 * primitives que Hebdomadaire/Mensuel/Annuel (filterDaysInRange +
 * aggregatePeriodTotals, voir services/finance) : uniquement une somme des
 * totaux quotidiens deja calcules par calculateFinancials au moment de la
 * saisie (saveDay) -- jamais un nouveau calcul ici.
 */
function totalsForRange(days: DayEntry[], startIso: string, endIso: string): DayTotals {
  return aggregatePeriodTotals(filterDaysInRange(days, startIso, endIso));
}

/**
 * Variation en % du benefice/reste (totals.reste) entre la periode
 * actuelle et la periode precedente correspondante. Si le reste de la
 * periode precedente est 0, la variation relative n'a pas de sens
 * (division par zero) : pourcentage reste null plutot que d'inventer une
 * valeur (voir "Nouvelle activite" cote affichage).
 */
function computeEvolution(currentReste: number, previousReste: number, comparaisonLabel: string): PeriodEvolution {
  if (previousReste === 0) {
    return { pourcentage: null, comparaisonLabel };
  }
  const pourcentage = ((currentReste - previousReste) / Math.abs(previousReste)) * 100;
  return { pourcentage, comparaisonLabel };
}

function summarizePeriod(
  days: DayEntry[],
  startIso: string,
  endIso: string,
  previousStartIso: string,
  previousEndIso: string,
  comparaisonLabel: string
): PeriodSummary {
  const totals = totalsForRange(days, startIso, endIso);
  const previousTotals = totalsForRange(days, previousStartIso, previousEndIso);
  return {
    ventes: totals.vente,
    achats: totals.achat,
    gain: totals.gain,
    depenses: totals.depense,
    beneficeReste: totals.reste,
    evolution: computeEvolution(totals.reste, previousTotals.reste, comparaisonLabel),
  };
}

/**
 * Fournit les chiffres de la page d'accueil, agreges depuis
 * storageService.getAllDays() (journees actives, corbeille deja exclue).
 * Les 4 plages (aujourd'hui/semaine/mois/annee) sont toutes ancrees sur la
 * date du jour, avec les memes bornes que Hebdomadaire/Mensuel/Annuel
 * (startOfWeekIso/endOfWeekIso, startOfMonthIso/endOfMonthIso,
 * startOfYearIso/endOfYearIso) pour garantir des chiffres coherents entre
 * l'Accueil et ces pages pour une meme periode.
 *
 * Chaque periode est en plus comparee a la periode precedente
 * correspondante (hier / semaine precedente / mois precedent / annee
 * precedente), avec les memes primitives et les memes utilitaires de date
 * deja utilises ailleurs dans l'application (addDaysIso/addMonthsIso/
 * addYearsIso, voir utils/date.ts) -- aucune nouvelle regle de calcul.
 */
export function useSummary(): { summary: HomeSummary; loading: boolean } {
  const [summary, setSummary] = useState<HomeSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const days = await storageService.getAllDays();
      if (cancelled) return;

      const today = todayIso();
      const yesterday = addDaysIso(today, -1);

      const weekStart = startOfWeekIso(today);
      const weekEnd = endOfWeekIso(today);
      const prevWeekStart = addDaysIso(weekStart, -7);
      const prevWeekEnd = addDaysIso(weekStart, -1);

      const monthStart = startOfMonthIso(today);
      const monthEnd = endOfMonthIso(today);
      const prevMonthAnchor = addMonthsIso(monthStart, -1);
      const prevMonthStart = startOfMonthIso(prevMonthAnchor);
      const prevMonthEnd = endOfMonthIso(prevMonthAnchor);

      const yearStart = startOfYearIso(today);
      const yearEnd = endOfYearIso(today);
      const prevYearAnchor = addYearsIso(yearStart, -1);
      const prevYearStart = startOfYearIso(prevYearAnchor);
      const prevYearEnd = endOfYearIso(prevYearAnchor);

      setSummary({
        aujourdHui: summarizePeriod(days, today, today, yesterday, yesterday, "à hier"),
        cetteSemaine: summarizePeriod(days, weekStart, weekEnd, prevWeekStart, prevWeekEnd, "à la semaine précédente"),
        ceMois: summarizePeriod(days, monthStart, monthEnd, prevMonthStart, prevMonthEnd, "au mois précédent"),
        cetteAnnee: summarizePeriod(days, yearStart, yearEnd, prevYearStart, prevYearEnd, "à l'année précédente"),
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { summary, loading };
}
