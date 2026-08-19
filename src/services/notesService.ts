import type { Note, NoteInput } from "@/types";
import { storageService } from "@/services/storage";

/**
 * Les notes sont de simples informations : ce service ne touche jamais
 * aux champs financiers d'un DayEntry (gain, reste, epargne...).
 */
export async function listNotes(): Promise<Note[]> {
  return storageService.getAllNotes();
}

export async function saveNote(note: NoteInput & { id?: string }): Promise<Note> {
  return storageService.saveNote(note);
}

export async function deleteNote(id: string): Promise<void> {
  return storageService.deleteNote(id);
}

export const notesService = { listNotes, saveNote, deleteNote };
