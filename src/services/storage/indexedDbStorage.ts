import type { DayEntry, DayEntryInput, Note, NoteInput, CustomDepenseCategory, OperationItem } from "@/types";
import { DEPENSE_CATEGORIES, CATEGORIE_GENEROSITE } from "@/types";
import type { StorageService } from "./storageService";
import { calculateFinancials, defaultFinancialSettings } from "@/services/finance";
import { normalizeLabel } from "@/utils/normalizeLabel";

const DB_NAME = "gestion-financiere";
const DB_VERSION = 4;
const STORE_DAYS = "days";
const STORE_NOTES = "notes";
const STORE_CATEGORIES = "depenseCategories";

/**
 * Forme d'une journee telle que persistee jusqu'a la version 3 (avant les
 * "affectations financieres") : la generosite y etait une simple ligne de
 * depense categorisee "generosite", et les totaux avaient une forme plate
 * (dime/epargne/generosityPlanned/...) au lieu de totals.affectations.
 */
interface LegacyDayEntryV3 {
  id: string;
  date: string;
  achats: OperationItem[];
  ventes: OperationItem[];
  depenses: OperationItem[];
  origine?: "saisie" | "import-csv";
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  affectationsRealisees?: unknown;
}

/**
 * Migre une journee v3 vers la structure "affectations financieres".
 *
 * Strategie : toute ligne de depense categorisee "generosite" est retiree
 * des depenses (pour ne jamais la compter deux fois) et sa somme devient
 * affectationsRealisees.generosite. La dime et l'epargne realisees
 * n'etaient suivies nulle part avant cette version : on ne peut pas les
 * inventer, elles restent a 0 (choix documente ici et dans le rapport de
 * cette modification). Les totaux sont entierement recalcules par le
 * moteur financier pour rester coherents avec la nouvelle structure.
 */
function migrateDayToAffectations(legacy: LegacyDayEntryV3): DayEntry {
  const generositeDepenses = legacy.depenses.filter((item) => item.categorie === CATEGORIE_GENEROSITE);
  const depenses = legacy.depenses.filter((item) => item.categorie !== CATEGORIE_GENEROSITE);
  const generositeRealisee = generositeDepenses.reduce((sum, item) => sum + item.montant, 0);

  const affectationsRealisees = { dime: 0, epargne: 0, generosite: generositeRealisee };
  const totals = calculateFinancials(legacy.achats, legacy.ventes, depenses, affectationsRealisees, defaultFinancialSettings);

  return {
    id: legacy.id,
    date: legacy.date,
    achats: legacy.achats,
    ventes: legacy.ventes,
    depenses,
    affectationsRealisees,
    totals,
    origine: legacy.origine,
    deletedAt: legacy.deletedAt,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  };
}

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

      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        // keyPath = "value" (deja normalise) : l'unicite est garantie par
        // IndexedDB lui-meme, pas besoin d'index ou de verification separee.
        db.createObjectStore(STORE_CATEGORIES, { keyPath: "value" });
      }

      // Migration "affectations financieres" : ne s'applique qu'aux bases
      // deja peuplees avant cette version (le store "days" existait deja).
      // La transaction d'upgrade est atomique : si une erreur survient ici,
      // IndexedDB annule tout l'upgrade et les donnees v3 restent intactes
      // (c'est le mecanisme de retour arriere pour cette migration).
      if (event.oldVersion > 0 && event.oldVersion < 4 && tx) {
        const store = tx.objectStore(STORE_DAYS);
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          const legacy = cursor.value as LegacyDayEntryV3;
          if (!legacy.affectationsRealisees) {
            cursor.update(migrateDayToAffectations(legacy));
          }
          cursor.continue();
        };
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Ferme proprement cette connexion si une mise a niveau de schema
      // (autre onglet, future version) est demandee ailleurs : sans cela,
      // toute tentative de migration resterait bloquee indefiniment tant
      // que cette page reste ouverte.
      db.onversionchange = () => db.close();
      resolve(db);
    };
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

/** Erreur levee quand une categorie de depense existe deja (nom fixe ou personnalise). */
export class DuplicateCategoryError extends Error {
  constructor(public readonly label: string) {
    super(`La categorie "${label}" existe deja.`);
    this.name = "DuplicateCategoryError";
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

    const totals = calculateFinancials(
      entry.achats,
      entry.ventes,
      entry.depenses,
      entry.affectationsRealisees,
      defaultFinancialSettings
    );

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

  // ---------------------------------------------------------------------
  // Categories de depense personnalisees
  // ---------------------------------------------------------------------

  async getCustomCategories(): Promise<CustomDepenseCategory[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_CATEGORIES, "readonly");
    const result = await promisifyRequest(tx.objectStore(STORE_CATEGORIES).getAll());
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }

  async addCustomCategory(label: string): Promise<CustomDepenseCategory> {
    const trimmed = label.trim();
    if (trimmed === "") {
      throw new Error("Le nom de la categorie ne peut pas etre vide.");
    }

    const value = normalizeLabel(trimmed);

    const fixedConflict = DEPENSE_CATEGORIES.some((cat) => normalizeLabel(cat.label) === value || cat.value === value);
    if (fixedConflict) {
      throw new DuplicateCategoryError(trimmed);
    }

    const db = await this.getDb();
    const existing = await this.getById<CustomDepenseCategory>(db, STORE_CATEGORIES, value);
    if (existing) {
      throw new DuplicateCategoryError(trimmed);
    }

    const now = new Date().toISOString();
    const record: CustomDepenseCategory = { value, label: trimmed, createdAt: now, updatedAt: now };
    const tx = db.transaction(STORE_CATEGORIES, "readwrite");
    tx.objectStore(STORE_CATEGORIES).add(record);
    await promisifyTx(tx);
    return record;
  }

  private async getById<T>(db: IDBDatabase, store: string, id: string): Promise<T | undefined> {
    const tx = db.transaction(store, "readonly");
    return promisifyRequest(tx.objectStore(store).get(id));
  }
}

export const indexedDbStorage: StorageService = new IndexedDbStorageService();
