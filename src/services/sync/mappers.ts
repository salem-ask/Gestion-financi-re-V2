import type { DayEntry, Note, NoteStatus, CustomDepenseCategory } from "@/types";
import type { StoredSetting, StoredClosure, RemoteDayEntry } from "@/services/storage/storageService";

/**
 * Conversion pure des enregistrements locaux (IndexedDB) vers la forme des
 * lignes attendues par les tables Supabase definies dans supabase/schema.sql
 * (PHASE 1). Aucune de ces fonctions ne lit ni n'ecrit quoi que ce soit :
 * uniquement du reformatage, facilement testable sans reseau ni base de
 * donnees.
 *
 * Volontairement absent de ces lignes : `totals` (gain/reste/affectations
 * calcules). Conformement a l'audit de synchronisation, seules les donnees
 * brutes (achats/ventes/depenses/affectationsRealisees) sont synchronisees ;
 * les totaux restent toujours recalcules localement par calculateFinancials
 * apres reception d'une ligne distante (phase de fusion, non commencee).
 */

export interface DayRow {
  id: string;
  user_id: string;
  date: string;
  achats: DayEntry["achats"];
  ventes: DayEntry["ventes"];
  depenses: DayEntry["depenses"];
  affectations_realisees: DayEntry["affectationsRealisees"];
  origine: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDayToRow(day: DayEntry, userId: string): DayRow {
  return {
    id: day.id,
    user_id: userId,
    date: day.date,
    achats: day.achats,
    ventes: day.ventes,
    depenses: day.depenses,
    affectations_realisees: day.affectationsRealisees,
    origine: day.origine ?? null,
    deleted_at: day.deletedAt ?? null,
    created_at: day.createdAt,
    updated_at: day.updatedAt,
  };
}

export interface NoteRow {
  id: string;
  user_id: string;
  date: string;
  texte: string;
  statut: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapNoteToRow(note: Note, userId: string): NoteRow {
  return {
    id: note.id,
    user_id: userId,
    date: note.date,
    texte: note.texte,
    statut: note.statut,
    deleted_at: note.deletedAt ?? null,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

export interface CustomCategoryRow {
  user_id: string;
  value: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export function mapCustomCategoryToRow(category: CustomDepenseCategory, userId: string): CustomCategoryRow {
  return {
    user_id: userId,
    value: category.value,
    label: category.label,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  };
}

export interface SettingRow {
  user_id: string;
  key: string;
  value: number;
  updated_at: string;
}

export function mapSettingToRow(setting: StoredSetting, userId: string): SettingRow {
  return {
    user_id: userId,
    key: setting.key,
    value: setting.value,
    updated_at: setting.updatedAt,
  };
}

export interface ClosureRow {
  user_id: string;
  key: string;
  verrouille: boolean;
  updated_at: string;
}

export function mapClosureToRow(closure: StoredClosure, userId: string): ClosureRow {
  return {
    user_id: userId,
    key: closure.key,
    verrouille: closure.verrouille,
    updated_at: closure.updatedAt,
  };
}

/**
 * Conversions inverses (PHASE 5) : d'une ligne Supabase recue au PULL vers
 * la forme locale. Aucun calcul, aucun horodatage genere ici -- createdAt/
 * updatedAt sont recopies tels quels depuis la ligne distante (voir
 * l'exigence de preservation stricte des horodatages, validee avant cette
 * implementation). `totals` n'est jamais reconstitue ici : il est
 * recalcule localement par calculateFinancials au moment de l'ecriture
 * (voir IndexedDbStorageService.reconcileDays), jamais synchronise.
 */

export function mapRowToDay(row: DayRow): RemoteDayEntry {
  return {
    id: row.id,
    date: row.date,
    achats: row.achats,
    ventes: row.ventes,
    depenses: row.depenses,
    affectationsRealisees: row.affectations_realisees,
    origine: (row.origine ?? undefined) as RemoteDayEntry["origine"],
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    date: row.date,
    texte: row.texte,
    statut: row.statut as NoteStatus,
    deletedAt: row.deleted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToCustomCategory(row: CustomCategoryRow): CustomDepenseCategory {
  return {
    value: row.value,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToSetting(row: SettingRow): StoredSetting {
  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  };
}

export function mapRowToClosure(row: ClosureRow): StoredClosure {
  return {
    key: row.key,
    verrouille: row.verrouille,
    updatedAt: row.updated_at,
  };
}
