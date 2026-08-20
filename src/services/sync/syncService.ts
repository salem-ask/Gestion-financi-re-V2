import type { SupabaseClient } from "@supabase/supabase-js";
import { storageService } from "@/services/storage";
import { authService } from "@/services/auth/authService";
import { supabase, isSupabaseConfigured } from "@/services/auth/supabaseClient";
import { mapDayToRow, mapNoteToRow, mapCustomCategoryToRow, mapSettingToRow, mapClosureToRow } from "./mappers";

/** Session minimale requise par pushLocalChanges (voir PushOptions.getSession). */
interface MinimalSession {
  user: { id: string };
}

/** Le plus ancien horodatage ISO possible : utilise pour "tout pousser" (voir pushLocalChanges). */
const EPOCH = "1970-01-01T00:00:00.000Z";

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
}

export interface PushOptions {
  /** Client Supabase a utiliser. Par defaut le client reel (voir supabaseClient.ts). */
  client?: SupabaseClient | null;
  /** Par defaut isSupabaseConfigured (etat reel de l'environnement). */
  configured?: boolean;
  /** Par defaut authService.getCurrentSession (session reelle). */
  getSession?: () => Promise<MinimalSession | null>;
}

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

  const [days, notes, categories, settings, closures] = await Promise.all([
    storageService.getDaysUpdatedSince(EPOCH),
    storageService.getNotesUpdatedSince(EPOCH),
    storageService.getCustomCategoriesUpdatedSince(EPOCH),
    storageService.getAllSettings(),
    storageService.getAllClosures(),
  ]);

  if (days.length > 0) {
    const { error } = await client.from("days").upsert(days.map((day) => mapDayToRow(day, userId)));
    if (error) throw error;
  }

  if (notes.length > 0) {
    const { error } = await client.from("notes").upsert(notes.map((note) => mapNoteToRow(note, userId)));
    if (error) throw error;
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

  return {
    days: days.length,
    notes: notes.length,
    categories: categories.length,
    settings: settings.length,
    closures: closures.length,
  };
}

export const syncService = { pushLocalChanges };
