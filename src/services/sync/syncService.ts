import type { SupabaseClient } from "@supabase/supabase-js";
import { storageService } from "@/services/storage";
import type { ReconcileResult, ReconcileDaysResult } from "@/services/storage/storageService";
import { authService } from "@/services/auth/authService";
import { supabase, isSupabaseConfigured } from "@/services/auth/supabaseClient";
import {
  mapDayToRow,
  mapNoteToRow,
  mapCustomCategoryToRow,
  mapSettingToRow,
  mapClosureToRow,
  mapObjectifToRow,
  mapRowToDay,
  mapRowToNote,
  mapRowToCustomCategory,
  mapRowToSetting,
  mapRowToClosure,
  mapRowToObjectif,
} from "./mappers";

/** Session minimale requise par pushLocalChanges (voir PushOptions.getSession). */
interface MinimalSession {
  user: { id: string };
}

/** Le plus ancien horodatage ISO possible : utilise pour "tout pousser" (voir pushLocalChanges). */
const EPOCH = "1970-01-01T00:00:00.000Z";

/**
 * Regroupe des enregistrements par `updatedAt` exact, pour marquer chacun
 * comme synchronise avec SA propre valeur (voir markDaysSynced/
 * markNotesSynced) plutot qu'un horodatage "maintenant" trop optimiste qui
 * masquerait une modification locale survenue pendant le push lui-meme.
 */
function groupIdsByUpdatedAt(records: { id: string; updatedAt: string }[]): [string, string[]][] {
  const byUpdatedAt = new Map<string, string[]>();
  for (const record of records) {
    const ids = byUpdatedAt.get(record.updatedAt) ?? [];
    ids.push(record.id);
    byUpdatedAt.set(record.updatedAt, ids);
  }
  return [...byUpdatedAt.entries()];
}

/** Levee par pushLocalChanges() tant que Supabase n'est pas configure (voir services/auth/supabaseClient.ts). */
export class SyncNotConfiguredError extends Error {
  constructor() {
    super("La synchronisation cloud n'est pas encore configuree (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants).");
    this.name = "SyncNotConfiguredError";
  }
}

/** Levee par pushLocalChanges() si personne n'est connecte. */
export class SyncNotAuthenticatedError extends Error {
  constructor() {
    super("Aucun compte connecte : impossible de synchroniser.");
    this.name = "SyncNotAuthenticatedError";
  }
}

export interface PushResult {
  days: number;
  notes: number;
  categories: number;
  settings: number;
  closures: number;
  objectifs: number;
}

export interface SyncOptions {
  /** Client Supabase a utiliser. Par defaut le client reel (voir supabaseClient.ts). */
  client?: SupabaseClient | null;
  /** Par defaut isSupabaseConfigured (etat reel de l'environnement). */
  configured?: boolean;
  /** Par defaut authService.getCurrentSession (session reelle). */
  getSession?: () => Promise<MinimalSession | null>;
}

/** Alias conserve pour lisibilite : memes options, utilisees par pushLocalChanges et pullRemoteChanges. */
export type PushOptions = SyncOptions;

/**
 * PHASE 4 (synchronisation cloud) : pousse la totalite des donnees locales
 * vers Supabase, dans UN SEUL SENS (local -> cloud), en upsert (jamais de
 * suppression, jamais d'ecrasement aveugle : chaque ligne est identifiee
 * par sa cle primaire -- id pour journees/notes, (user_id, value|key) pour
 * categories/reglages/clotures).
 *
 * Volontairement "tout pousser a chaque fois" (curseur = EPOCH) plutot que
 * de memoriser un curseur "dernier push reussi" : plus simple, sans risque
 * d'oublier une donnee a cause d'un mauvais curseur, et sans nouveau
 * stockage a introduire pour cette phase. Le cout (renvoyer des lignes
 * inchangees) est negligeable a l'echelle d'une application personnelle.
 * Une optimisation par curseur pourra etre ajoutee plus tard sans changer
 * cette signature.
 *
 * N'effectue AUCUNE lecture depuis le cloud (pas de pull), conformement a
 * la feuille de route validee : cette phase est strictement PUSH.
 *
 * `options` (client/configured/getSession) sont tous injectables, avec les
 * valeurs reelles de l'application par defaut : l'appel normal depuis
 * l'interface (voir AccountPage) est simplement `pushLocalChanges()`, sans
 * argument. L'injection sert uniquement a tester la logique (mapping,
 * sequencement, gestion d'erreurs) sans reseau ni projet Supabase reel --
 * voir les tests de cette phase.
 */
export async function pushLocalChanges(options: PushOptions = {}): Promise<PushResult> {
  const { client = supabase, configured = isSupabaseConfigured, getSession = authService.getCurrentSession } = options;

  if (!configured || !client) {
    throw new SyncNotConfiguredError();
  }

  const session = await getSession();
  if (!session) {
    throw new SyncNotAuthenticatedError();
  }
  const userId = session.user.id;

  const [days, notes, categories, settings, closures, objectifs] = await Promise.all([
    storageService.getDaysUpdatedSince(EPOCH),
    storageService.getNotesUpdatedSince(EPOCH),
    storageService.getCustomCategoriesUpdatedSince(EPOCH),
    storageService.getAllSettings(),
    storageService.getAllClosures(),
    storageService.getObjectifsUpdatedSince(EPOCH),
  ]);

  if (days.length > 0) {
    const { error } = await client.from("days").upsert(days.map((day) => mapDayToRow(day, userId)));
    if (error) throw error;
    // Marque chaque journee poussee comme confirmee synchronisee (voir
    // DayEntry.syncedAt) : c'est ce qui autorisera plus tard un hard-delete
    // local sans risque de resurrection (voir storageService.emptyTrash).
    // Groupe par updatedAt pour rester correct meme si des journees
    // different entre elles (evite d'ecrire un syncedAt trop optimiste).
    await Promise.all(
      groupIdsByUpdatedAt(days).map(([updatedAt, ids]) => storageService.markDaysSynced(ids, updatedAt))
    );
  }

  if (notes.length > 0) {
    const { error } = await client.from("notes").upsert(notes.map((note) => mapNoteToRow(note, userId)));
    if (error) throw error;
    await Promise.all(
      groupIdsByUpdatedAt(notes).map(([updatedAt, ids]) => storageService.markNotesSynced(ids, updatedAt))
    );
  }

  if (categories.length > 0) {
    const { error } = await client
      .from("custom_categories")
      .upsert(categories.map((category) => mapCustomCategoryToRow(category, userId)), { onConflict: "user_id,value" });
    if (error) throw error;
  }

  if (settings.length > 0) {
    const { error } = await client
      .from("settings")
      .upsert(settings.map((setting) => mapSettingToRow(setting, userId)), { onConflict: "user_id,key" });
    if (error) throw error;
  }

  if (closures.length > 0) {
    const { error } = await client
      .from("period_closures")
      .upsert(closures.map((closure) => mapClosureToRow(closure, userId)), { onConflict: "user_id,key" });
    if (error) throw error;
  }

  if (objectifs.length > 0) {
    const { error } = await client.from("objectifs").upsert(objectifs.map((objectif) => mapObjectifToRow(objectif, userId)));
    if (error) throw error;
  }

  return {
    days: days.length,
    notes: notes.length,
    categories: categories.length,
    settings: settings.length,
    closures: closures.length,
    objectifs: objectifs.length,
  };
}

export interface PullResult {
  days: ReconcileDaysResult;
  notes: ReconcileResult;
  categories: ReconcileResult;
  settings: ReconcileResult;
  closures: ReconcileResult;
  objectifs: ReconcileResult;
}

/** Resultat du balayage automatique de corbeille effectue en fin de syncNow() (voir storageService.emptyTrash). */
export interface PurgeSweepResult {
  purgedDays: number;
  purgedNotes: number;
  pendingDays: number;
  pendingNotes: number;
}

export interface SyncNowResult {
  pull: PullResult;
  push: PushResult;
  /** Suppressions definitivement purgees localement car desormais confirmees synchronisees. */
  purge: PurgeSweepResult;
}

/**
 * PHASE 5 (synchronisation cloud) : recupere l'integralite des donnees
 * distantes des 5 tables et les fusionne dans le stockage local via les
 * methodes reconcileX() de storageService (regle "le plus recent gagne",
 * horodatages distants strictement conserves, voir storageService.ts).
 * Ne pousse rien vers le cloud : c'est syncNow() qui enchaine PULL puis
 * PUSH dans le bon ordre.
 *
 * Comme pushLocalChanges, `options` est entierement injectable pour les
 * tests (client/configured/getSession), avec les valeurs reelles par
 * defaut. L'appel normal depuis l'interface est `pullRemoteChanges()`,
 * sans argument.
 */
export async function pullRemoteChanges(options: SyncOptions = {}): Promise<PullResult> {
  const { client = supabase, configured = isSupabaseConfigured, getSession = authService.getCurrentSession } = options;

  if (!configured || !client) {
    throw new SyncNotConfiguredError();
  }

  const session = await getSession();
  if (!session) {
    throw new SyncNotAuthenticatedError();
  }
  const userId = session.user.id;

  const [daysRes, notesRes, categoriesRes, settingsRes, closuresRes, objectifsRes] = await Promise.all([
    client.from("days").select("*").eq("user_id", userId),
    client.from("notes").select("*").eq("user_id", userId),
    client.from("custom_categories").select("*").eq("user_id", userId),
    client.from("settings").select("*").eq("user_id", userId),
    client.from("period_closures").select("*").eq("user_id", userId),
    client.from("objectifs").select("*").eq("user_id", userId),
  ]);

  if (daysRes.error) throw daysRes.error;
  if (notesRes.error) throw notesRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (settingsRes.error) throw settingsRes.error;
  if (closuresRes.error) throw closuresRes.error;
  if (objectifsRes.error) throw objectifsRes.error;

  const [days, notes, categories, settings, closures, objectifs] = await Promise.all([
    storageService.reconcileDays((daysRes.data ?? []).map(mapRowToDay)),
    storageService.reconcileNotes((notesRes.data ?? []).map(mapRowToNote)),
    storageService.reconcileCustomCategories((categoriesRes.data ?? []).map(mapRowToCustomCategory)),
    storageService.reconcileSettings((settingsRes.data ?? []).map(mapRowToSetting)),
    storageService.reconcileClosures((closuresRes.data ?? []).map(mapRowToClosure)),
    storageService.reconcileObjectifs((objectifsRes.data ?? []).map(mapRowToObjectif)),
  ]);

  return { days, notes, categories, settings, closures, objectifs };
}

/**
 * PHASE 5 : un cycle complet de synchronisation, dans l'ordre valide --
 * PULL (fusion des donnees distantes en local) puis, seulement une fois
 * la fusion terminee, PUSH (republication de l'etat local, deja fusionne,
 * vers le cloud). C'est le point d'entree unique attendu depuis
 * l'interface (voir AccountPage.handleSync).
 */
export async function syncNow(options: SyncOptions = {}): Promise<SyncNowResult> {
  const pull = await pullRemoteChanges(options);
  const push = await pushLocalChanges(options);
  // Balayage automatique : purge maintenant, en local, toute suppression
  // (corbeille) dont on vient de confirmer qu'elle a atteint Supabase --
  // typiquement une journee/note "Vider la corbeille"-ee avant d'avoir pu
  // synchroniser, restee en attente jusqu'ici (voir isSafeToPurge). Ferme
  // ainsi la boucle sans action supplementaire de l'utilisateur.
  const purge = await storageService.emptyTrash({ requireSynced: true });
  return { pull, push, purge };
}

export const syncService = { pushLocalChanges, pullRemoteChanges, syncNow };
