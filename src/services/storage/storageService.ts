import type { DayEntry, DayEntryInput, Note, NoteInput } from "@/types";

/**
 * Contrat de stockage utilise par toute l'application.
 *
 * Aucune autre partie du code ne doit parler directement a IndexedDB,
 * localStorage ou tout autre backend : tout passe par cette interface.
 * C'est ce qui permettra plus tard de brancher une synchronisation
 * cloud (ou un autre backend) sans toucher aux pages/composants.
 */
export interface StorageService {
  init(): Promise<void>;

  getDay(date: string): Promise<DayEntry | undefined>;
  getAllDays(): Promise<DayEntry[]>;
  saveDay(entry: DayEntryInput & { id?: string }): Promise<DayEntry>;
  deleteDay(id: string): Promise<void>;

  getAllNotes(): Promise<Note[]>;
  saveNote(note: NoteInput & { id?: string }): Promise<Note>;
  deleteNote(id: string): Promise<void>;
}
