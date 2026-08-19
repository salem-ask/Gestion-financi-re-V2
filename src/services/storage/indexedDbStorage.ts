import type { DayEntry, DayEntryInput, Note, NoteInput } from "@/types";
import type { StorageService } from "./storageService";
import { calculateFinancials, defaultFinancialSettings } from "@/services/finance";

const DB_NAME = "gestion-financiere";
const DB_VERSION = 2;
const STORE_DAYS = "days";
const STORE_NOTES = "notes";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;

      if (!db.objectStoreNames.contains(STORE_DAYS)) {
        const days = db.createObjectStore(STORE_DAYS, { keyPath: "id" });
        // Pas de contrainte unique ici : l'unicite "une journee active par
        // date" est appliquee au niveau applicatif (saveDay), car un
        // index IndexedDB unique ne sait pas ignorer les elements en
        // corbeille (deletedAt) partageant la meme date.
        days.createIndex("by-date", "date", { unique: false });
      } else if (event.oldVersion < 2 && tx) {
        const days = tx.objectStore(STORE_DAYS);
        if (days.indexNames.contains("by-date")) {
          days.deleteIndex("by-date");
        }
        days.createIndex("by-date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const notes = db.createObjectStore(STORE_NOTES, { keyPath: "id" });
        notes.createIndex("by-date", "date", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisifyTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Erreur levee quand une journee active existe deja pour la date visee. */
export class DuplicateDateError extends Error {
  constructor(public readonly date: string, public readonly existingId: string) {
    super(`Une journee active existe deja pour la date ${date}.`);
    this.name = "DuplicateDateError";
  }
}

class IndexedDbStorageService implements StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDatabase();
    }
    return this.dbPromise;
  }

  async init(): Promise<void> {
    await this.getDb();
  }

  // ---------------------------------------------------------------------
  // Journees
  // ---------------------------------------------------------------------

  async getDay(date: string): Promise<DayEntry | undefined> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_DAYS, "readonly");
    const index = tx.objectStore(STORE_DAYS).index("by-date");
    const matches: DayEntry[] = await promisifyRequest(index.getAll(date));
    return matches.find((day) => day.deletedAt === undefined);
  }

  async getAllDays(): Promise<DayEntry[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_DAYS, "readonly");
    const result = await promisifyRequest(tx.objectStore(STORE_DAYS).getAll());
    return result
      .filter((day) => day.deletedAt === undefined)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveDay(entry: DayEntryInput & { id?: string }): Promise<DayEntry> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const existing = entry.id ? await this.getById<DayEntry>(db, STORE_DAYS, entry.id) : undefined;

    await this.assertNoActiveDuplicateDate(db, entry.date, entry.id);

    const totals = calculateFinancials(entry.achats, entry.ventes, entry.depenses, defaultFinancialSettings);

    const record: DayEntry = {
      ...entry,
      totals,
      id: entry.id ?? generateId(),
      deletedAt: undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const tx = db.transaction(STORE_DAYS, "readwrite");
    tx.objectStore(STORE_DAYS).put(record);
    await promisifyTx(tx);
    return record;
  }

  async softDeleteDay(id: string): Promise<void> {
    const db = await this.getDb();
    const record = await this.getById<DayEntry>(db, STORE_DAYS, id);
    if (!record) return;
    const now = new Date().toISOString();
    const tx = db.transaction(STORE_DAYS, "readwrite");
    tx.objectStore(STORE_DAYS).put({ ...record, deletedAt: now, updatedAt: now });
    await promisifyTx(tx);
  }

  async restoreDay(id: string): Promise<void> {
    const db = await this.getDb();
    const record = await this.getById<DayEntry>(db, STORE_DAYS, id);
    if (!record) return;
    await this.assertNoActiveDuplicateDate(db, record.date, id);
    const now = new Date().toISOString();
    const restored: DayEntry = { ...record, updatedAt: now };
    delete restored.deletedAt;
    const tx = db.transaction(STORE_DAYS, "readwrite");
    tx.objectStore(STORE_DAYS).put(restored);
    await promisifyTx(tx);
  }

  async purgeDay(id: string): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_DAYS, "readwrite");
    tx.objectStore(STORE_DAYS).delete(id);
    await promisifyTx(tx);
  }

  async getTrashDays(): Promise<DayEntry[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_DAYS, "readonly");
    const result = await promisifyRequest(tx.objectStore(STORE_DAYS).getAll());
    return result
      .filter((day) => day.deletedAt !== undefined)
      .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
  }

  private async assertNoActiveDuplicateDate(db: IDBDatabase, date: string, ignoreId?: string): Promise<void> {
    const tx = db.transaction(STORE_DAYS, "readonly");
    const index = tx.objectStore(STORE_DAYS).index("by-date");
    const matches: DayEntry[] = await promisifyRequest(index.getAll(date));
    const conflict = matches.find((day) => day.deletedAt === undefined && day.id !== ignoreId);
    if (conflict) {
      throw new DuplicateDateError(date, conflict.id);
    }
  }

  // ---------------------------------------------------------------------
  // Notes
  // ---------------------------------------------------------------------

  async getAllNotes(): Promise<Note[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_NOTES, "readonly");
    const result = await promisifyRequest(tx.objectStore(STORE_NOTES).getAll());
    return result
      .filter((note) => note.deletedAt === undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async saveNote(note: NoteInput & { id?: string }): Promise<Note> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const existing = note.id ? await this.getById<Note>(db, STORE_NOTES, note.id) : undefined;

    const record: Note = {
      ...note,
      id: note.id ?? generateId(),
      deletedAt: undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const tx = db.transaction(STORE_NOTES, "readwrite");
    tx.objectStore(STORE_NOTES).put(record);
    await promisifyTx(tx);
    return record;
  }

  async softDeleteNote(id: string): Promise<void> {
    const db = await this.getDb();
    const record = await this.getById<Note>(db, STORE_NOTES, id);
    if (!record) return;
    const now = new Date().toISOString();
    const tx = db.transaction(STORE_NOTES, "readwrite");
    tx.objectStore(STORE_NOTES).put({ ...record, deletedAt: now, updatedAt: now });
    await promisifyTx(tx);
  }

  async restoreNote(id: string): Promise<void> {
    const db = await this.getDb();
    const record = await this.getById<Note>(db, STORE_NOTES, id);
    if (!record) return;
    const now = new Date().toISOString();
    const restored: Note = { ...record, updatedAt: now };
    delete restored.deletedAt;
    const tx = db.transaction(STORE_NOTES, "readwrite");
    tx.objectStore(STORE_NOTES).put(restored);
    await promisifyTx(tx);
  }

  async purgeNote(id: string): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_NOTES, "readwrite");
    tx.objectStore(STORE_NOTES).delete(id);
    await promisifyTx(tx);
  }

  async getTrashNotes(): Promise<Note[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_NOTES, "readonly");
    const result = await promisifyRequest(tx.objectStore(STORE_NOTES).getAll());
    return result
      .filter((note) => note.deletedAt !== undefined)
      .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
  }

  // ---------------------------------------------------------------------
  // Corbeille (globale)
  // ---------------------------------------------------------------------

  async emptyTrash(): Promise<void> {
    const [trashDays, trashNotes] = await Promise.all([this.getTrashDays(), this.getTrashNotes()]);
    const db = await this.getDb();

    if (trashDays.length > 0) {
      const tx = db.transaction(STORE_DAYS, "readwrite");
      const store = tx.objectStore(STORE_DAYS);
      for (const day of trashDays) store.delete(day.id);
      await promisifyTx(tx);
    }

    if (trashNotes.length > 0) {
      const tx = db.transaction(STORE_NOTES, "readwrite");
      const store = tx.objectStore(STORE_NOTES);
      for (const note of trashNotes) store.delete(note.id);
      await promisifyTx(tx);
    }
  }

  private async getById<T>(db: IDBDatabase, store: string, id: string): Promise<T | undefined> {
    const tx = db.transaction(store, "readonly");
    return promisifyRequest(tx.objectStore(store).get(id));
  }
}

export const indexedDbStorage: StorageService = new IndexedDbStorageService();
