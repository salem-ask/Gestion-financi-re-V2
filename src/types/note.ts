/**
 * Une note est une INFORMATION independante des calculs financiers.
 * Ex: "Client X doit encore 5000" est une note, pas une operation :
 * elle ne doit jamais modifier gain/reste/epargne.
 */
export type NoteStatus = "ouverte" | "en-cours" | "resolue";

export interface Note {
  id: string;
  date: string;
  texte: string;
  statut: NoteStatus;

  /** Presente uniquement si la note est dans la corbeille. */
  deletedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export type NoteInput = Omit<Note, "id" | "createdAt" | "updatedAt" | "deletedAt">;
