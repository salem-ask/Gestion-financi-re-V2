/**
 * Modele de donnees financier. Une "OperationItem" represente une ligne
 * detaillee (achat, vente ou depense) rattachee a une journee.
 *
 * `categorie` n'a de sens que pour les depenses (ex: "transport",
 * "internet"...). Elle reste optionnelle pour les achats/ventes.
 */
export interface OperationItem {
  id: string;
  libelle: string;
  montant: number;
  categorie?: string;
}

/**
 * Ancienne valeur de categorie "generosite" (PHASE 2) : la generosite
 * n'est plus une categorie de depense (voir AffectationsRealisees), mais
 * cette constante reste necessaire pour identifier et migrer les
 * anciennes lignes de depense lors de la mise a niveau du stockage.
 */
export const CATEGORIE_GENEROSITE = "generosite";

export const DEPENSE_CATEGORIES = [
  { value: "transport", label: "Transport" },
  { value: "internet", label: "Internet/Telephone" },
  { value: "loyer", label: "Loyer" },
  { value: "salaire", label: "Salaire" },
  { value: "autre", label: "Autre" },
] as const;

/**
 * Les trois "affectations financieres" (dime, epargne, generosite)
 * partagent exactement la meme logique de suivi : une part prevue du
 * gain, un montant reellement realise (saisi par l'utilisateur), et ce
 * qu'il en reste. Elles ne sont PAS des depenses : leur montant realise
 * n'est jamais ajoute au total des depenses ni retranche du reste total
 * (voir DayTotals.reste, qui n'utilise que les valeurs PREVUES).
 */
export interface AffectationTotals {
  prevue: number;
  realisee: number;
  /** Jamais negatif : max(0, prevue - realisee). */
  restante: number;
  /** Montant au-dela de la prevision : max(0, realisee - prevue). */
  depassement: number;
}

export interface AffectationsTotals {
  dime: AffectationTotals;
  epargne: AffectationTotals;
  generosite: AffectationTotals;
}

/** Saisie brute de l'utilisateur pour les montants reellement realises. */
export interface AffectationsRealisees {
  dime: number;
  epargne: number;
  generosite: number;
}

export const AFFECTATION_KEYS = ["dime", "epargne", "generosite"] as const;
export type AffectationKind = (typeof AFFECTATION_KEYS)[number];

/**
 * Totaux calcules d'une journee. Toujours derives par le moteur financier
 * (calculateFinancials) a partir des lignes d'achats/ventes/depenses et de
 * la configuration (financialSettings) : jamais saisis manuellement, jamais
 * stockes ailleurs que dans DayEntry.totals.
 *
 * RESTE = GAIN - DIME PREVUE - EPARGNE PREVUE - GENEROSITE PREVUE - DEPENSES
 * Utilise imperativement les montants PREVUS des affectations, jamais les
 * montants realises (voir AffectationsTotals).
 */
export interface DayTotals {
  achat: number;
  vente: number;
  depense: number;
  gain: number;
  affectations: AffectationsTotals;
  reste: number;
}

/**
 * Detail complet d'une journee.
 *
 * Les notes importantes liees a une date restent gerees par le store de
 * notes independant (services/notesService), filtrees par date : cela
 * evite de dupliquer leur cycle de vie (creation/modification/suppression/
 * corbeille) a deux endroits, conformement a la separation deja etablie
 * en PHASE 1 (une note est une information, jamais une donnee financiere).
 */
export interface DayEntry {
  id: string;
  /** Date au format ISO (YYYY-MM-DD), cle logique par jour (parmi les jours actifs). */
  date: string;

  achats: OperationItem[];
  ventes: OperationItem[];
  depenses: OperationItem[];

  /** Saisie utilisateur des montants realises pour dime/epargne/generosite. */
  affectationsRealisees: AffectationsRealisees;

  totals: DayTotals;

  /** Marque les entrees issues d'un import CSV V1 sans detail disponible. */
  origine?: "saisie" | "import-csv";

  /** Presente uniquement si la journee est dans la corbeille. */
  deletedAt?: string;

  /**
   * Horodatage local (jamais synchronise) : dernier `updatedAt` de cet
   * enregistrement dont on est certain qu'il a ete ecrit avec succes cote
   * Supabase (soit par un push reussi, soit parce qu'il vient d'etre lu
   * tel quel depuis un pull). Sert uniquement de garde-fou avant un
   * hard-delete local (voir purgeDay/emptyTrash, storageService.ts) : tant
   * que `syncedAt` n'est pas >= `deletedAt`, la suppression n'a peut-etre
   * pas encore atteint le cloud, donc la ligne reste en corbeille au lieu
   * d'etre purgee (ce qui evite qu'un pull ulterieur ne la ressuscite en
   * la trouvant encore active cote Supabase).
   */
  syncedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export type DayEntryInput = Omit<DayEntry, "id" | "createdAt" | "updatedAt" | "deletedAt" | "totals" | "syncedAt">;

export const OPERATION_TYPES = ["achat", "vente", "depense"] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];
