/**
 * Ligne d'operation en cours de saisie. Distincte de OperationItem : le
 * montant reste une chaine brute tant que l'utilisateur tape (permet une
 * saisie partielle du type "12," sans jeter une erreur a chaque frappe),
 * et n'est converti/valide qu'au moment de l'enregistrement.
 */
export interface DraftLine {
  id: string;
  libelle: string;
  montantRaw: string;
  categorie?: string;
}

export function createEmptyDraftLine(id: string, categorie?: string): DraftLine {
  return { id, libelle: "", montantRaw: "", categorie };
}
