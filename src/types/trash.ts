/**
 * Vue unifiee d'un element place dans la corbeille (journee ou note),
 * utilisee uniquement pour l'affichage de la page Corbeille. La donnee
 * source reste stockee dans son store d'origine (days / notes), avec un
 * champ deletedAt : la corbeille n'est pas un stockage separe, mais un
 * filtre sur les elements marques supprimes.
 */
export type TrashItemKind = "jour" | "note";

export interface TrashItem {
  kind: TrashItemKind;
  id: string;
  /** Date metier de l'element (date du jour, ou date de la note). */
  date: string;
  /** Libelle court pour l'affichage dans la liste de la corbeille. */
  label: string;
  deletedAt: string;
}
