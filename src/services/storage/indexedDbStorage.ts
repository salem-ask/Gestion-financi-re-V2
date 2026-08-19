import type { DayEntry, DayEntryInput, Note, NoteInput } from "@/types";
import type { StorageService } from "./storageService";

const DB_NAME = "gestion-financiere";
const DB_VERSION = 1;
const STORE_DAYS = "days";
const STORE_NOTES = "notes";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_DAYS)) {
        const days = db.createObjectStore(STORE_DAYS, { keyPath: "id" });
        days.createIndex("by-date", "date", { unique: true });
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

  async getDay(date: string): Promise<DayEntry | undefined> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_DAYS, "readonly");
    const index = tx.objectStore(STORE_DAYS).index("by-date");
    return promisifyRequest(index.get(date));
  }

  async getAllDays(): Promise<DayEntry[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_DAYS, "readonly");
    const result = await promisifyRequest(tx.objectStore(STORE_DAYS).getAll());
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveDay(entry: DayEntryInput & { id?: string }): Promise<DayEntry> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const existing = entry.id ? await this.getById<DayEntry>(db, STORE_DAYS, entry.id) : undefined;

    const record: DayEntry = {
      ...entry,
      id: entry.id ?? generateId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const tx = db.transaction(STORE_DAYS, "readwrite");
    tx.objectStore(STORE_DAYS).put(record);
    await promisifyTx(tx);
    return record;
  }

  async deleteDay(id: string): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_DAYS, "readwrite");
    tx.objectStore(STORE_DAYS).delete(id);
    await promisifyTx(tx);
  }

  async getAllNotes(): Promise<Note[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_NOTES, "readonly");
    const result = await promisifyRequest(tx.objectStore(STORE_NOTES).getAll());
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }

  async saveNote(note: NoteInput & { id?: string }): Promise<Note> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const existing = note.id ? await this.getById<Note>(db, STORE_NOTES, note.id) : undefined;

    const record: Note = {
      ...note,
      id: note.id ?? generateId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const tx = db.transaction(STORE_NOTES, "readwrite");
    tx.objectStore(STORE_NOTES).put(record);
    await promisifyTx(tx);
    return record;
  }

  async deleteNote(id: string): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_NOTES, "readwrite");
    tx.objectStore(STORE_NOTES).delete(id);
    await promisifyTx(tx);
  }

  private async getById<T>(db: IDBDatabase, store: string, id: string): Promise<T | undefined> {
    const tx = db.transaction(store, "readonly");
    return promisifyRequest(tx.objectStore(store).get(id));
  }
}

function promisifyTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const indexedDbStorage: StorageService = new IndexedDbStorageService();
