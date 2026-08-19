/**
 * Modele de donnees financier. Une "OperationItem" represente une ligne
 * detaillee (achat, vente ou depense) rattachee a une journee.
 *
 * `categorie` n'a de sens que pour les depenses (ex: "generosite",
 * "transport"...). Elle reste optionnelle pour les achats/ventes.
 */
export interface OperationItem {
  id: string;
  libelle: string;
  montant: number;
  categorie?: string;
}

/** Categorie de depense reconnue par le moteur financier (generosite). */
export const CATEGORIE_GENEROSITE = "generosite";

export const DEPENSE_CATEGORIES = [
  { value: CATEGORIE_GENEROSITE, label: "Generosite" },
  { value: "transport", label: "Transport" },
  { value: "internet", label: "Internet/Telephone" },
  { value: "loyer", label: "Loyer" },
  { value: "salaire", label: "Salaire" },
  { value: "autre", label: "Autre" },
] as const;

/**
 * Totaux calcules d'une journee. Toujours derives par le moteur financier
 * (calculateFinancials) a partir des lignes d'achats/ventes/depenses et de
 * la configuration (financialSettings) : jamais saisis manuellement, jamais
 * stockes ailleurs que dans DayEntry.totals.
 *
 * `generosityRemaining` conserve la valeur signee (prevue - donnee), y
 * compris negative : c'est la source de verite pour calculer a la fois le
 * montant "restant" (jamais negatif a l'affichage) et le "depassement".
 */
export interface DayTotals {
  achat: number;
  vente: number;
  depense: number;
  gain: number;
  dime: number;
  epargne: number;
  generosityPlanned: number;
  generosityGiven: number;
  /** Valeur signee (prevue - donnee). Ne jamais afficher telle quelle si negative. */
  generosityRemaining: number;
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

  totals: DayTotals;

  /** Marque les entrees issues d'un import CSV V1 sans detail disponible. */
  origine?: "saisie" | "import-csv";

  /** Presente uniquement si la journee est dans la corbeille. */
  deletedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export type DayEntryInput = Omit<DayEntry, "id" | "createdAt" | "updatedAt" | "deletedAt" | "totals">;

export const OPERATION_TYPES = ["achat", "vente", "depense"] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];
