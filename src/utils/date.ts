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

/** Premier jour ISO du mois contenant la date donnee. */
export function startOfMonthIso(iso: string): string {
  const [year, month] = iso.split("-");
  return `${year}-${month}-01`;
}

/** Dernier jour ISO du mois contenant la date donnee (gere les mois de 28 a 31 jours et les annees bissextiles). */
export function endOfMonthIso(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  // new Date(annee, mois, 0) : jour 0 du mois suivant = dernier jour du mois
  // vise, car `month` (1-indexe dans l'ISO) coincide avec l'index 0-indexe
  // du mois SUIVANT tel qu'attendu par le constructeur Date natif.
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(year)}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/** Decale une date ISO de N mois (N negatif accepte), toujours ramenee au 1er du mois resultant. */
export function addMonthsIso(iso: string, months: number): string {
  const [year, month] = iso.split("-").map(Number);
  const date = new Date(year, month - 1 + months, 1);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** Libelle affichable d'un mois ISO, ex: "Aout 2026" (premiere lettre en majuscule). */
export function formatMonthLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
