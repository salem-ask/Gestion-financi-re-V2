import type { Note, NoteInput } from "@/types";
import { storageService } from "@/services/storage";

/**
 * Les notes sont de simples informations : ce service ne touche jamais
 * aux champs financiers d'un DayEntry (gain, reste, epargne...).
 *
 * `deleteNote` deplace la note vers la corbeille (suppression douce) :
 * la suppression definitive passe par trashService.purgeItem.
 */
export async function listNotes(): Promise<Note[]> {
  return storageService.getAllNotes();
}

export async function listNotesByDate(date: string): Promise<Note[]> {
  const notes = await storageService.getAllNotes();
  return notes.filter((note) => note.date === date);
}

export async function saveNote(note: NoteInput & { id?: string }): Promise<Note> {
  return storageService.saveNote(note);
}

export async function deleteNote(id: string): Promise<void> {
  return storageService.softDeleteNote(id);
}

export const notesService = { listNotes, listNotesByDate, saveNote, deleteNote };
