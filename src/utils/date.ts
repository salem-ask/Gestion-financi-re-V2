/** Renvoie la date du jour au format ISO court (YYYY-MM-DD), en heure locale. */
export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function formatDateFr(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Decale une date ISO (YYYY-MM-DD) de N jours (N negatif accepte). */
export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** Lundi de la semaine (lundi-dimanche) contenant la date ISO donnee. */
export function startOfWeekIso(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const day = date.getDay(); // 0 = dimanche .. 6 = samedi
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDaysIso(iso, diffToMonday);
}

/** Dimanche de la semaine (lundi-dimanche) contenant la date ISO donnee. */
export function endOfWeekIso(iso: string): string {
  return addDaysIso(startOfWeekIso(iso), 6);
}

/** Libelle affichable d'une plage de dates ISO, ex: "17 aout 2026 - 23 aout 2026". */
export function formatDateRangeFr(startIso: string, endIso: string): string {
  return `${formatDateFr(startIso)} - ${formatDateFr(endIso)}`;
}
