import type { TrashItem } from "@/types";
import { storageService } from "@/services/storage";

/**
 * Vue unifiee de la corbeille (journees + notes supprimees). Le detail
 * complet reste dans le store d'origine ; ce service ne fait que
 * presenter et orchestrer restauration/suppression definitive.
 */
export async function listTrash(): Promise<TrashItem[]> {
  const [trashDays, trashNotes] = await Promise.all([
    storageService.getTrashDays(),
    storageService.getTrashNotes(),
  ]);

  const dayItems: TrashItem[] = trashDays.map((day) => ({
    kind: "jour",
    id: day.id,
    date: day.date,
    label: `Journee du ${day.date}`,
    deletedAt: day.deletedAt ?? day.updatedAt,
  }));

  const noteItems: TrashItem[] = trashNotes.map((note) => ({
    kind: "note",
    id: note.id,
    date: note.date,
    label: note.texte,
    deletedAt: note.deletedAt ?? note.updatedAt,
  }));

  return [...dayItems, ...noteItems].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function restoreItem(item: Pick<TrashItem, "kind" | "id">): Promise<void> {
  if (item.kind === "jour") {
    await storageService.restoreDay(item.id);
  } else {
    await storageService.restoreNote(item.id);
  }
}

export async function purgeItem(item: Pick<TrashItem, "kind" | "id">): Promise<void> {
  if (item.kind === "jour") {
    await storageService.purgeDay(item.id);
  } else {
    await storageService.purgeNote(item.id);
  }
}

export async function emptyTrash(): Promise<void> {
  await storageService.emptyTrash();
}

export const trashService = { listTrash, restoreItem, purgeItem, emptyTrash };
