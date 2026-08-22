import type {
  DayEntry,
  DayEntryInput,
  Note,
  NoteInput,
  CustomDepenseCategory,
  OperationItem,
  AppPreferences,
  Objectif,
  ObjectifInput,
} from "@/types";
import { DEPENSE_CATEGORIES, CATEGORIE_GENEROSITE } from "@/types";
import type {
  StorageService,
  StoredSetting,
  StoredClosure,
  RemoteDayEntry,
  ReconcileResult,
  ReconcileDaysResult,
} from "./storageService";
import { calculateFinancials, defaultFinancialSettings } from "@/services/finance";
import { normalizeLabel } from "@/utils/normalizeLabel";

const DB_NAME = "gestion-financiere";
const DB_VERSION = 7;
const STORE_DAYS = "days";
const STORE_NOTES = "notes";
const STORE_CATEGORIES = "depenseCategories";
const STORE_SETTINGS = "settings";
const SETTING_WEEKLY_SALES_GOAL = "objectifVenteHebdomadaire";
const SETTING_MONTHLY_SALES_GOAL = "objectifVenteMensuel";
const SETTING_YEARLY_SALES_GOAL = "objectifVenteAnnuel";
const STORE_WEEK_CLOSURES = "weekClosures";
/** Store Parametres (preferences locales uniquement, jamais synchronise). Une seule ligne, cle fixe. */
const STORE_PREFERENCES = "preferences";
const PREFERENCES_KEY = "app";
/** Store Objectifs financiers (preferences locales uniquement, jamais synchronise). */
const STORE_OBJECTIFS = "objectifs";

/** Valeurs par defaut des preferences, utilisees tant qu'aucune n'a ete enregistree. */
const DEFAULT_PREFERENCES: AppPreferences = {
  devise: "FC",
  formatRapportPrefere: "pdf",
  theme: "systeme",
};
/** Prefixe des cles de cloture mensuelle dans STORE_WEEK_CLOSURES : evite toute collision avec une cle de semaine (voir setMonthClosure). */
const MONTH_CLOSURE_PREFIX = "month:";
/** Prefixe des cles de cloture annuelle dans STORE_WEEK_CLOSURES : evite toute collision avec une cle de semaine ou de mois (voir setYearClosure). */
const YEAR_CLOSURE_PREFIX = "year:";

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

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        // Petit store cle/valeur pour les reglages globaux de l'application
        // (ex: objectif de vente hebdomadaire) : evite de creer un store
        // dedie par reglage individuel.
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(STORE_WEEK_CLOSURES)) {
        // Un enregistrement par semaine cloturee, indexe par son lundi ISO
        // (voir utils/date.startOfWeekIso). Une semaine absente de ce store
        // n'est simplement jamais cloturee (etat par defaut, jamais invente).
        db.createObjectStore(STORE_WEEK_CLOSURES, { keyPath: "weekStart" });
      }

      if (!db.objectStoreNames.contains(STORE_PREFERENCES)) {
        // Store Parametres : une seule ligne, cle fixe (PREFERENCES_KEY).
        // Jamais synchronise (pas de mapper/reconcile associe).
        db.createObjectStore(STORE_PREFERENCES, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_OBJECTIFS)) {
        // Store Objectifs : plusieurs objectifs simultanes possibles.
        // Jamais synchronise (pas de mapper/reconcile associe).
        db.createObjectStore(STORE_OBJECTIFS, { keyPath: "id" });
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
  const cryptoObj = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  if (cryptoObj?.getRandomValues) {
    // getRandomValues() n'a pas la restriction "contexte securise" de
    // randomUUID() : fonctionne aussi en http:// sur une IP locale.
    const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Dernier recours (crypto totalement absent, cas extreme) : toujours un
  // UUID v4 valide, avec une source d'alea plus faible.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
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

/**
 * Verifie le format UUID (v1-v5, incluant v4). Les nouveaux IDs generes par
 * generateId() sont toujours des UUID v4 ; cette regex reste volontairement
 * generique pour accepter aussi les UUID deja valides d'une autre version
 * si jamais il en existait (aucun cas connu ici, mais ne pas les casser).
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Migre les enregistrements dont l'id n'est pas un UUID valide (ancien
 * fallback de generateId() avant correction) vers un nouvel id UUID v4,
 * en conservant tous les autres champs a l'identique.
 *
 * Structure en deux transactions distinctes pour eviter tout risque lie a
 * l'inactivation d'une transaction readwrite pendant un await : la lecture
 * (getAll) se fait dans une transaction readonly a part, puis, seulement
 * s'il y a des ids invalides, tous les add()/delete() sont emis en synchrone
 * dans une seconde transaction readwrite, sans await entre eux -- l'attente
 * ne porte que sur la fin/commit de cette transaction.
 */
async function migrateInvalidIds<T extends { id: string }>(
  db: IDBDatabase,
  storeName: string
): Promise<number> {
  const readTx = db.transaction(storeName, "readonly");
  const all = await promisifyRequest<T[]>(readTx.objectStore(storeName).getAll());
  const invalid = all.filter((record) => !UUID_REGEX.test(record.id));

  if (invalid.length === 0) {
    return 0;
  }

  const writeTx = db.transaction(storeName, "readwrite");
  const store = writeTx.objectStore(storeName);
  for (const record of invalid) {
    store.add({ ...record, id: generateId() });
    store.delete(record.id);
  }
  await promisifyTx(writeTx);

  return invalid.length;
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
      this.dbPromise = openDatabase().then(async (db) => {
        const migratedDays = await migrateInvalidIds(db, STORE_DAYS);
        const migratedNotes = await migrateInvalidIds(db, STORE_NOTES);
        if (migratedDays > 0) {
          console.info(`Migration ID : ${migratedDays} journee(s) migree(s) vers un UUID valide.`);
        }
        if (migratedNotes > 0) {
          console.info(`Migration ID : ${migratedNotes} note(s) migree(s) vers un UUID valide.`);
        }
        return db;
      });
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

  async softDeleteAllDays(): Promise<number> {
    const db = await this.getDb();
    const readTx = db.transaction(STORE_DAYS, "readonly");
    const all = await promisifyRequest<DayEntry[]>(readTx.objectStore(STORE_DAYS).getAll());
    const active = all.filter((day) => day.deletedAt === undefined);

    if (active.length === 0) {
      return 0;
    }

    const nowIso = new Date().toISOString();
    const writeTx = db.transaction(STORE_DAYS, "readwrite");
    const store = writeTx.objectStore(STORE_DAYS);
    for (const day of active) {
      store.put({ ...day, deletedAt: nowIso, updatedAt: nowIso });
    }
    await promisifyTx(writeTx);

    return active.length;
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

  // ---------------------------------------------------------------------
  // Reglages globaux
  // ---------------------------------------------------------------------

  async getWeeklySalesGoal(): Promise<number> {
    const db = await this.getDb();
    const record = await this.getById<{ key: string; value: number }>(db, STORE_SETTINGS, SETTING_WEEKLY_SALES_GOAL);
    return record?.value ?? 0;
  }

  async saveWeeklySalesGoal(value: number): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key: SETTING_WEEKLY_SALES_GOAL, value, updatedAt: new Date().toISOString() });
    await promisifyTx(tx);
  }

  // ---------------------------------------------------------------------
  // Cloture hebdomadaire
  // ---------------------------------------------------------------------

  async getWeekClosure(weekStartIso: string): Promise<boolean> {
    const db = await this.getDb();
    const record = await this.getById<{ weekStart: string; verrouille: boolean }>(db, STORE_WEEK_CLOSURES, weekStartIso);
    return record?.verrouille ?? false;
  }

  async setWeekClosure(weekStartIso: string, closed: boolean): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_WEEK_CLOSURES, "readwrite");
    tx.objectStore(STORE_WEEK_CLOSURES).put({
      weekStart: weekStartIso,
      verrouille: closed,
      updatedAt: new Date().toISOString(),
    });
    await promisifyTx(tx);
  }

  // ---------------------------------------------------------------------
  // Objectif de vente mensuel
  // ---------------------------------------------------------------------

  async getMonthlySalesGoal(): Promise<number> {
    const db = await this.getDb();
    const record = await this.getById<{ key: string; value: number }>(db, STORE_SETTINGS, SETTING_MONTHLY_SALES_GOAL);
    return record?.value ?? 0;
  }

  async saveMonthlySalesGoal(value: number): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key: SETTING_MONTHLY_SALES_GOAL, value, updatedAt: new Date().toISOString() });
    await promisifyTx(tx);
  }

  // ---------------------------------------------------------------------
  // Cloture mensuelle (meme store que la cloture hebdomadaire, cle prefixee)
  // ---------------------------------------------------------------------

  async getMonthClosure(monthStartIso: string): Promise<boolean> {
    const db = await this.getDb();
    const record = await this.getById<{ weekStart: string; verrouille: boolean }>(
      db,
      STORE_WEEK_CLOSURES,
      `${MONTH_CLOSURE_PREFIX}${monthStartIso}`
    );
    return record?.verrouille ?? false;
  }

  async setMonthClosure(monthStartIso: string, closed: boolean): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_WEEK_CLOSURES, "readwrite");
    tx.objectStore(STORE_WEEK_CLOSURES).put({
      weekStart: `${MONTH_CLOSURE_PREFIX}${monthStartIso}`,
      verrouille: closed,
      updatedAt: new Date().toISOString(),
    });
    await promisifyTx(tx);
  }

  // ---------------------------------------------------------------------
  // Objectif de vente annuel
  // ---------------------------------------------------------------------

  async getYearlySalesGoal(): Promise<number> {
    const db = await this.getDb();
    const record = await this.getById<{ key: string; value: number }>(db, STORE_SETTINGS, SETTING_YEARLY_SALES_GOAL);
    return record?.value ?? 0;
  }

  async saveYearlySalesGoal(value: number): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key: SETTING_YEARLY_SALES_GOAL, value, updatedAt: new Date().toISOString() });
    await promisifyTx(tx);
  }

  // ---------------------------------------------------------------------
  // Cloture annuelle (meme store que les clotures hebdomadaire/mensuelle, cle prefixee)
  // ---------------------------------------------------------------------

  async getYearClosure(yearStartIso: string): Promise<boolean> {
    const db = await this.getDb();
    const record = await this.getById<{ weekStart: string; verrouille: boolean }>(
      db,
      STORE_WEEK_CLOSURES,
      `${YEAR_CLOSURE_PREFIX}${yearStartIso}`
    );
    return record?.verrouille ?? false;
  }

  async setYearClosure(yearStartIso: string, closed: boolean): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_WEEK_CLOSURES, "readwrite");
    tx.objectStore(STORE_WEEK_CLOSURES).put({
      weekStart: `${YEAR_CLOSURE_PREFIX}${yearStartIso}`,
      verrouille: closed,
      updatedAt: new Date().toISOString(),
    });
    await promisifyTx(tx);
  }

  private async getById<T>(db: IDBDatabase, store: string, id: string): Promise<T | undefined> {
    const tx = db.transaction(store, "readonly");
    return promisifyRequest(tx.objectStore(store).get(id));
  }

  // ---------------------------------------------------------------------
  // PHASE 3 (synchronisation cloud) : lecture additive uniquement, voir
  // StorageService pour le contrat complet. Aucune de ces methodes
  // n'ecrit, ne supprime, ni ne modifie le comportement des methodes
  // ci-dessus : purement une lecture filtree/reformatee de donnees deja
  // existantes.
  // ---------------------------------------------------------------------

  async getDaysUpdatedSince(sinceIso: string): Promise<DayEntry[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_DAYS, "readonly");
    const result = await promisifyRequest<DayEntry[]>(tx.objectStore(STORE_DAYS).getAll());
    return result.filter((day) => day.updatedAt > sinceIso).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  async getNotesUpdatedSince(sinceIso: string): Promise<Note[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_NOTES, "readonly");
    const result = await promisifyRequest<Note[]>(tx.objectStore(STORE_NOTES).getAll());
    return result.filter((note) => note.updatedAt > sinceIso).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  async getCustomCategoriesUpdatedSince(sinceIso: string): Promise<CustomDepenseCategory[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_CATEGORIES, "readonly");
    const result = await promisifyRequest<CustomDepenseCategory[]>(tx.objectStore(STORE_CATEGORIES).getAll());
    return result
      .filter((category) => category.updatedAt > sinceIso)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  async getAllSettings(): Promise<StoredSetting[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const result = await promisifyRequest<{ key: string; value: number; updatedAt: string }[]>(
      tx.objectStore(STORE_SETTINGS).getAll()
    );
    return result.map((record) => ({ key: record.key, value: record.value, updatedAt: record.updatedAt }));
  }

  async getAllClosures(): Promise<StoredClosure[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_WEEK_CLOSURES, "readonly");
    const result = await promisifyRequest<{ weekStart: string; verrouille: boolean; updatedAt: string }[]>(
      tx.objectStore(STORE_WEEK_CLOSURES).getAll()
    );
    return result.map((record) => ({ key: record.weekStart, verrouille: record.verrouille, updatedAt: record.updatedAt }));
  }

  // ---------------------------------------------------------------------
  // PHASE 5 (synchronisation cloud) : reconciliation PULL (cloud -> local).
  //
  // Regle commune aux 5 methodes : pour chaque enregistrement distant, le
  // plus recent (`updatedAt`) l'emporte ; a egalite stricte, le distant
  // l'emporte. Un enregistrement local strictement plus recent n'est
  // JAMAIS touche (garantie anti-perte de donnees validee avant cette
  // implementation) -- la decision est prise uniquement a partir de l'etat
  // local lu en debut de fonction et de la ligne distante recue, jamais
  // recalculee entre-temps. Le gagnant distant est ecrit tel quel : ses
  // `createdAt`/`updatedAt` ne sont jamais recalcules ici. Ecriture par
  // lot (add/put sans await entre eux) puis un seul promisifyTx, meme
  // precaution transactionnelle que migrateInvalidIds().
  // ---------------------------------------------------------------------

  async reconcileDays(remoteDays: RemoteDayEntry[]): Promise<ReconcileDaysResult> {
    const db = await this.getDb();
    const readTx = db.transaction(STORE_DAYS, "readonly");
    const localAll = await promisifyRequest<DayEntry[]>(readTx.objectStore(STORE_DAYS).getAll());
    const localById = new Map(localAll.map((day) => [day.id, day]));

    let appliedFromRemote = 0;
    let keptLocal = 0;

    // Etat resolu par id : demarre comme une copie du local, seuls les ids
    // ou le distant l'emporte sont reassignes vers un nouvel objet (ce qui
    // permet ensuite de detecter par reference ce qui a reellement change).
    const resolved = new Map(localById);
    for (const remote of remoteDays) {
      const local = localById.get(remote.id);
      if (!local || remote.updatedAt >= local.updatedAt) {
        const totals = calculateFinancials(
          remote.achats,
          remote.ventes,
          remote.depenses,
          remote.affectationsRealisees,
          defaultFinancialSettings
        );
        resolved.set(remote.id, { ...remote, totals });
        appliedFromRemote++;
      } else {
        keptLocal++;
      }
    }

    // Resolution du cas critique : deux journees actives pour la meme date
    // apres fusion. Jamais via saveDay()/assertNoActiveDuplicateDate() :
    // resolu directement ici, ne leve jamais DuplicateDateError.
    const byDate = new Map<string, DayEntry[]>();
    for (const day of resolved.values()) {
      if (day.deletedAt !== undefined) continue;
      const list = byDate.get(day.date) ?? [];
      list.push(day);
      byDate.set(day.date, list);
    }

    let dateConflictsResolved = 0;
    const nowIso = new Date().toISOString();
    for (const candidates of byDate.values()) {
      if (candidates.length <= 1) continue;
      // La plus recente reste active ; a egalite stricte, l'id le plus
      // petit reste actif (tiebreak deterministe, identique sur les deux
      // appareils qui evaluent independamment la meme comparaison).
      candidates.sort((a, b) => {
        if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      });
      for (const loser of candidates.slice(1)) {
        // Suppression douce directe : donnees intactes hors deletedAt/updatedAt,
        // recuperable depuis la corbeille (getTrashDays/restoreDay, inchanges).
        resolved.set(loser.id, { ...loser, deletedAt: nowIso, updatedAt: nowIso });
        dateConflictsResolved++;
      }
    }

    // N'ecrit que les enregistrements dont l'etat final differe reellement
    // de l'etat local de depart (comparaison par reference : un id non
    // touche par les deux etapes ci-dessus garde exactement l'objet lu au
    // debut de la fonction).
    const toWrite: DayEntry[] = [];
    for (const [id, day] of resolved) {
      if (localById.get(id) !== day) {
        toWrite.push(day);
      }
    }

    if (toWrite.length > 0) {
      const writeTx = db.transaction(STORE_DAYS, "readwrite");
      const store = writeTx.objectStore(STORE_DAYS);
      for (const day of toWrite) store.put(day);
      await promisifyTx(writeTx);
    }

    return { appliedFromRemote, keptLocal, dateConflictsResolved };
  }

  async reconcileNotes(remoteNotes: Note[]): Promise<ReconcileResult> {
    const db = await this.getDb();
    const readTx = db.transaction(STORE_NOTES, "readonly");
    const localAll = await promisifyRequest<Note[]>(readTx.objectStore(STORE_NOTES).getAll());
    const localById = new Map(localAll.map((note) => [note.id, note]));

    let appliedFromRemote = 0;
    let keptLocal = 0;
    const toWrite: Note[] = [];

    for (const remote of remoteNotes) {
      const local = localById.get(remote.id);
      if (!local || remote.updatedAt >= local.updatedAt) {
        toWrite.push(remote);
        appliedFromRemote++;
      } else {
        keptLocal++;
      }
    }

    if (toWrite.length > 0) {
      const writeTx = db.transaction(STORE_NOTES, "readwrite");
      const store = writeTx.objectStore(STORE_NOTES);
      for (const note of toWrite) store.put(note);
      await promisifyTx(writeTx);
    }

    return { appliedFromRemote, keptLocal };
  }

  async reconcileCustomCategories(remoteCategories: CustomDepenseCategory[]): Promise<ReconcileResult> {
    const db = await this.getDb();
    const readTx = db.transaction(STORE_CATEGORIES, "readonly");
    const localAll = await promisifyRequest<CustomDepenseCategory[]>(readTx.objectStore(STORE_CATEGORIES).getAll());
    const localByValue = new Map(localAll.map((category) => [category.value, category]));

    let appliedFromRemote = 0;
    let keptLocal = 0;
    const toWrite: CustomDepenseCategory[] = [];

    for (const remote of remoteCategories) {
      const local = localByValue.get(remote.value);
      if (!local || remote.updatedAt >= local.updatedAt) {
        toWrite.push(remote);
        appliedFromRemote++;
      } else {
        keptLocal++;
      }
    }

    if (toWrite.length > 0) {
      const writeTx = db.transaction(STORE_CATEGORIES, "readwrite");
      const store = writeTx.objectStore(STORE_CATEGORIES);
      for (const category of toWrite) store.put(category);
      await promisifyTx(writeTx);
    }

    return { appliedFromRemote, keptLocal };
  }

  async reconcileSettings(remoteSettings: StoredSetting[]): Promise<ReconcileResult> {
    const db = await this.getDb();
    const readTx = db.transaction(STORE_SETTINGS, "readonly");
    const localAll = await promisifyRequest<StoredSetting[]>(readTx.objectStore(STORE_SETTINGS).getAll());
    const localByKey = new Map(localAll.map((setting) => [setting.key, setting]));

    let appliedFromRemote = 0;
    let keptLocal = 0;
    const toWrite: StoredSetting[] = [];

    for (const remote of remoteSettings) {
      const local = localByKey.get(remote.key);
      if (!local || remote.updatedAt >= local.updatedAt) {
        toWrite.push(remote);
        appliedFromRemote++;
      } else {
        keptLocal++;
      }
    }

    if (toWrite.length > 0) {
      const writeTx = db.transaction(STORE_SETTINGS, "readwrite");
      const store = writeTx.objectStore(STORE_SETTINGS);
      for (const setting of toWrite) store.put(setting);
      await promisifyTx(writeTx);
    }

    return { appliedFromRemote, keptLocal };
  }

  async reconcileClosures(remoteClosures: StoredClosure[]): Promise<ReconcileResult> {
    const db = await this.getDb();
    const readTx = db.transaction(STORE_WEEK_CLOSURES, "readonly");
    const localAll = await promisifyRequest<{ weekStart: string; verrouille: boolean; updatedAt: string }[]>(
      readTx.objectStore(STORE_WEEK_CLOSURES).getAll()
    );
    const localByKey = new Map(localAll.map((closure) => [closure.weekStart, closure]));

    let appliedFromRemote = 0;
    let keptLocal = 0;
    const toWrite: { weekStart: string; verrouille: boolean; updatedAt: string }[] = [];

    for (const remote of remoteClosures) {
      const local = localByKey.get(remote.key);
      if (!local || remote.updatedAt >= local.updatedAt) {
        toWrite.push({ weekStart: remote.key, verrouille: remote.verrouille, updatedAt: remote.updatedAt });
        appliedFromRemote++;
      } else {
        keptLocal++;
      }
    }

    if (toWrite.length > 0) {
      const writeTx = db.transaction(STORE_WEEK_CLOSURES, "readwrite");
      const store = writeTx.objectStore(STORE_WEEK_CLOSURES);
      for (const closure of toWrite) store.put(closure);
      await promisifyTx(writeTx);
    }

    return { appliedFromRemote, keptLocal };
  }

  // ---------------------------------------------------------------------
  // Parametres (preferences locales uniquement, jamais synchronise -- voir
  // StorageService pour le contrat complet).
  // ---------------------------------------------------------------------

  async getPreferences(): Promise<AppPreferences> {
    const db = await this.getDb();
    const record = await this.getById<AppPreferences & { id: string }>(db, STORE_PREFERENCES, PREFERENCES_KEY);
    return record ? { ...DEFAULT_PREFERENCES, ...record } : DEFAULT_PREFERENCES;
  }

  async savePreferences(preferences: AppPreferences): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_PREFERENCES, "readwrite");
    tx.objectStore(STORE_PREFERENCES).put({ id: PREFERENCES_KEY, ...preferences });
    await promisifyTx(tx);
  }

  async getObjectifs(): Promise<Objectif[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_OBJECTIFS, "readonly");
    const result = await promisifyRequest<Objectif[]>(tx.objectStore(STORE_OBJECTIFS).getAll());
    return result
      .filter((objectif) => objectif.deletedAt === undefined)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async addObjectif(input: ObjectifInput): Promise<Objectif> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const record: Objectif = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    const tx = db.transaction(STORE_OBJECTIFS, "readwrite");
    tx.objectStore(STORE_OBJECTIFS).add(record);
    await promisifyTx(tx);
    return record;
  }

  async updateObjectif(id: string, input: ObjectifInput): Promise<Objectif> {
    const db = await this.getDb();
    const existing = await this.getById<Objectif>(db, STORE_OBJECTIFS, id);
    if (!existing) {
      throw new Error(`Objectif introuvable (id ${id}).`);
    }
    const record: Objectif = { ...input, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    const tx = db.transaction(STORE_OBJECTIFS, "readwrite");
    tx.objectStore(STORE_OBJECTIFS).put(record);
    await promisifyTx(tx);
    return record;
  }

  async deleteObjectif(id: string): Promise<void> {
    const db = await this.getDb();
    const record = await this.getById<Objectif>(db, STORE_OBJECTIFS, id);
    if (!record) return;
    const now = new Date().toISOString();
    const tx = db.transaction(STORE_OBJECTIFS, "readwrite");
    tx.objectStore(STORE_OBJECTIFS).put({ ...record, deletedAt: now, updatedAt: now });
    await promisifyTx(tx);
  }

  /**
   * Objectifs (actifs ET supprimes) dont `updatedAt` est strictement
   * posterieur a `sinceIso` -- meme role que getDaysUpdatedSince/
   * getNotesUpdatedSince (voir PHASE 3) : sert uniquement au PUSH vers le
   * cloud, une suppression douce doit s'y propager comme une modification
   * normale. Ne modifie jamais rien.
   */
  async getObjectifsUpdatedSince(sinceIso: string): Promise<Objectif[]> {
    const db = await this.getDb();
    const tx = db.transaction(STORE_OBJECTIFS, "readonly");
    const result = await promisifyRequest<Objectif[]>(tx.objectStore(STORE_OBJECTIFS).getAll());
    return result
      .filter((objectif) => objectif.updatedAt > sinceIso)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }

  /**
   * Fusionne les objectifs distants avec les objectifs locaux (actifs ET
   * supprimes) -- meme regle "le plus recent gagne" que reconcileNotes
   * (voir PHASE 5).
   */
  async reconcileObjectifs(remoteObjectifs: Objectif[]): Promise<ReconcileResult> {
    const db = await this.getDb();
    const readTx = db.transaction(STORE_OBJECTIFS, "readonly");
    const localAll = await promisifyRequest<Objectif[]>(readTx.objectStore(STORE_OBJECTIFS).getAll());
    const localById = new Map(localAll.map((objectif) => [objectif.id, objectif]));

    let appliedFromRemote = 0;
    let keptLocal = 0;
    const toWrite: Objectif[] = [];

    for (const remote of remoteObjectifs) {
      const local = localById.get(remote.id);
      if (!local || remote.updatedAt >= local.updatedAt) {
        toWrite.push(remote);
        appliedFromRemote++;
      } else {
        keptLocal++;
      }
    }

    if (toWrite.length > 0) {
      const writeTx = db.transaction(STORE_OBJECTIFS, "readwrite");
      const store = writeTx.objectStore(STORE_OBJECTIFS);
      for (const objectif of toWrite) store.put(objectif);
      await promisifyTx(writeTx);
    }

    return { appliedFromRemote, keptLocal };
  }
}

export const indexedDbStorage: StorageService = new IndexedDbStorageService();
