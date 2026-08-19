/**
 * Modele de donnees financier. Une "OperationItem" represente une ligne
 * detaillee (achat, vente ou depense) rattachee a une journee.
 */
export interface OperationItem {
  id: string;
  libelle: string;
  montant: number;
}

/**
 * Detail complet d'une journee. Les totaux (achats, ventes, depenses...)
 * sont stockes explicitement plutot que recalcules a la volee : cela
 * permettra plus tard de corriger une ligne sans recalculer tout
 * l'historique, et de conserver un total meme si les details manquent
 * (ex : import CSV V1 sans detail).
 */
export interface DayEntry {
  id: string;
  /** Date au format ISO (YYYY-MM-DD), cle logique unique par jour. */
  date: string;

  achats: number;
  ventes: number;
  depenses: number;

  /** Gain = ventes - achats - depenses (calcule ulterieurement, pas ici). */
  gain: number;

  dime: number;
  epargne: number;
  generosite: number;
  reste: number;

  details: {
    achat: OperationItem[];
    vente: OperationItem[];
    depense: OperationItem[];
  };

  notes?: string;

  /** Marque les entrees issues d'un import CSV V1 sans detail disponible. */
  origine?: "saisie" | "import-csv";

  createdAt: string;
  updatedAt: string;
}

export type DayEntryInput = Omit<DayEntry, "id" | "createdAt" | "updatedAt">;

export const OPERATION_TYPES = ["achat", "vente", "depense"] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];
