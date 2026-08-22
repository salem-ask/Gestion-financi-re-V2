import { useEffect, useState } from "react";
import { storageService } from "@/services/storage";
import { filterDaysInRange, aggregatePeriodTotals } from "@/services/finance";
import {
  todayIso,
  startOfWeekIso,
  endOfWeekIso,
  startOfMonthIso,
  endOfMonthIso,
  startOfYearIso,
  endOfYearIso,
} from "@/utils/date";
import type { DayEntry } from "@/types";

export interface PeriodSummary {
  gain: number;
  ventes: number;
  depenses: number;
}

export interface HomeSummary {
  aujourdHui: PeriodSummary;
  cetteSemaine: PeriodSummary;
  ceMois: PeriodSummary;
  cetteAnnee: PeriodSummary;
}

const ZERO: PeriodSummary = { gain: 0, ventes: 0, depenses: 0 };

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
function summarizeRange(days: DayEntry[], startIso: string, endIso: string): PeriodSummary {
  const totals = aggregatePeriodTotals(filterDaysInRange(days, startIso, endIso));
  return { gain: totals.gain, ventes: totals.vente, depenses: totals.depense };
}

/**
 * Fournit les chiffres de la page d'accueil, agreges depuis
 * storageService.getAllDays() (journees actives, corbeille deja exclue).
 * Les 4 plages (aujourd'hui/semaine/mois/annee) sont toutes ancrees sur la
 * date du jour, avec les memes bornes que Hebdomadaire/Mensuel/Annuel
 * (startOfWeekIso/endOfWeekIso, startOfMonthIso/endOfMonthIso,
 * startOfYearIso/endOfYearIso) pour garantir des chiffres coherents entre
 * l'Accueil et ces pages pour une meme periode.
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
      setSummary({
        aujourdHui: summarizeRange(days, today, today),
        cetteSemaine: summarizeRange(days, startOfWeekIso(today), endOfWeekIso(today)),
        ceMois: summarizeRange(days, startOfMonthIso(today), endOfMonthIso(today)),
        cetteAnnee: summarizeRange(days, startOfYearIso(today), endOfYearIso(today)),
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
