import { useEffect, useState } from "react";

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
 * Fournit les chiffres de la page d'accueil.
 *
 * Pour cette premiere etape, les totaux restent a zero : le calcul
 * reel (agregation par jour/semaine/mois/annee depuis storageService)
 * sera branche dans une etape ulterieure sans changer la forme des
 * donnees consommee par HomePage.
 */
export function useSummary(): { summary: HomeSummary; loading: boolean } {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return { summary: EMPTY_SUMMARY, loading };
}
