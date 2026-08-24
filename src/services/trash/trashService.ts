import type { TrashItem } from "@/types";
import { storageService } from "@/services/storage";
import { isSupabaseConfigured } from "@/services/auth/supabaseClient";

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

/**
 * Suppression definitive d'un element. `requireSynced` (voir
 * storageService.purgeDay/purgeNote) est derive de isSupabaseConfigured :
 * sans cloud configure, aucune resurrection possible, la purge est donc
 * toujours immediate ; avec un cloud configure, elle n'a lieu que si la
 * suppression a deja ete confirmee synchronisee (sinon differee jusqu'a la
 * prochaine synchronisation reussie, voir syncService.syncNow).
 */
export async function purgeItem(item: Pick<TrashItem, "kind" | "id">): Promise<{ purged: boolean }> {
  const requireSynced = isSupabaseConfigured;
  if (item.kind === "jour") {
    return storageService.purgeDay(item.id, { requireSynced });
  }
  return storageService.purgeNote(item.id, { requireSynced });
}

/** Meme regle que purgeItem, appliquee a toute la corbeille en une fois. */
export async function emptyTrash(): Promise<{
  purgedDays: number;
  purgedNotes: number;
  pendingDays: number;
  pendingNotes: number;
}> {
  return storageService.emptyTrash({ requireSynced: isSupabaseConfigured });
}

export const trashService = { listTrash, restoreItem, purgeItem, emptyTrash };
