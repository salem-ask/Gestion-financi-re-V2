import type { DayEntry, DayEntryInput, Note, NoteInput, CustomDepenseCategory } from "@/types";

/**
 * Contrat de stockage utilise par toute l'application.
 *
 * Aucune autre partie du code ne doit parler directement a IndexedDB,
 * localStorage ou tout autre backend : tout passe par cette interface.
 * C'est ce qui permettra plus tard de brancher une synchronisation
 * cloud (ou un autre backend) sans toucher aux pages/composants.
 *
 * La corbeille n'est pas un store separe : un element supprime reste dans
 * son store d'origine avec un champ `deletedAt`. Les methodes de lecture
 * standard (get, getAll) n'exposent jamais que les elements actifs
 * (deletedAt absent) ; les elements de la corbeille passent par les
 * methodes dediees (getTrashDays, getTrashNotes).
 */
export interface StorageService {
  init(): Promise<void>;

  /** Journee active pour une date donnee (jamais un element de la corbeille). */
  getDay(date: string): Promise<DayEntry | undefined>;
  /** Toutes les journees actives, triees par date croissante. */
  getAllDays(): Promise<DayEntry[]>;
  /**
   * Cree ou met a jour une journee active. Rejette si une AUTRE journee
   * active existe deja pour la meme date (evite les doublons accidentels).
   */
  saveDay(entry: DayEntryInput & { id?: string }): Promise<DayEntry>;
  /** Deplace une journee active vers la corbeille (ne supprime rien definitivement). */
  softDeleteDay(id: string): Promise<void>;
  /** Restaure une journee depuis la corbeille : redevient active. */
  restoreDay(id: string): Promise<void>;
  /** Supprime definitivement une journee (corbeille ou non). Irreversible. */
  purgeDay(id: string): Promise<void>;
  /** Journees actuellement dans la corbeille. */
  getTrashDays(): Promise<DayEntry[]>;
  /**
   * Reinitialisation globale : supprime DEFINITIVEMENT toutes les journees
   * (actives ET deja en corbeille). Distinct d'une suppression normale
   * (softDeleteDay) : irreversible, jamais accessible en un clic (voir
   * ResetHistoryModal, double confirmation obligatoire cote UI). Ne touche
   * jamais aux notes, categories personnalisees ni reglages.
   */
  purgeAllDays(): Promise<void>;

  getAllNotes(): Promise<Note[]>;
  saveNote(note: NoteInput & { id?: string }): Promise<Note>;
  softDeleteNote(id: string): Promise<void>;
  restoreNote(id: string): Promise<void>;
  purgeNote(id: string): Promise<void>;
  getTrashNotes(): Promise<Note[]>;

  /** Supprime definitivement tout le contenu de la corbeille (jours + notes). */
  emptyTrash(): Promise<void>;

  /** Categories de depense ajoutees par l'utilisateur (en plus des categories fixes). */
  getCustomCategories(): Promise<CustomDepenseCategory[]>;
  /**
   * Ajoute une categorie personnalisee. Rejette (DuplicateCategoryError) si
   * son nom correspond deja a une categorie fixe ou personnalisee
   * existante, comparaison insensible a la casse/accents.
   */
  addCustomCategory(label: string): Promise<CustomDepenseCategory>;

  /**
   * Objectif de vente hebdomadaire saisi par l'utilisateur (reference du
   * diagnostic hebdomadaire). Un seul objectif global, conserve entre les
   * sessions/semaines : 0 si jamais defini (jamais invente).
   */
  getWeeklySalesGoal(): Promise<number>;
  saveWeeklySalesGoal(value: number): Promise<void>;

  /**
   * Cloture (verrouillage manuel) d'une semaine, indexee par le lundi ISO
   * de cette semaine (voir utils/date.startOfWeekIso). Une cloture ne
   * supprime et ne modifie jamais aucune donnee : elle bloque seulement
   * les modifications directes des journees de cette semaine cote
   * Quotidien (voir DailyPage). false si jamais cloturee.
   */
  getWeekClosure(weekStartIso: string): Promise<boolean>;
  setWeekClosure(weekStartIso: string, closed: boolean): Promise<void>;

  /**
   * Objectif de vente mensuel saisi par l'utilisateur (reference du
   * diagnostic mensuel, distinct de l'objectif hebdomadaire). Un seul
   * objectif global, conserve entre sessions/mois : 0 si jamais defini.
   */
  getMonthlySalesGoal(): Promise<number>;
  saveMonthlySalesGoal(value: number): Promise<void>;

  /**
   * Cloture (verrouillage manuel) d'un mois, indexee par son 1er jour ISO
   * (voir utils/date.startOfMonthIso). Meme mecanisme de stockage que la
   * cloture hebdomadaire (memes garanties : ne supprime/modifie jamais
   * aucune donnee), simplement une cle distincte pour ne jamais entrer en
   * collision avec une cloture de semaine. false si jamais cloture.
   */
  getMonthClosure(monthStartIso: string): Promise<boolean>;
  setMonthClosure(monthStartIso: string, closed: boolean): Promise<void>;

  /**
   * Objectif de vente annuel saisi par l'utilisateur (reference du
   * diagnostic annuel, distinct des objectifs hebdomadaire et mensuel).
   * Un seul objectif global, conserve entre sessions/annees : 0 si jamais
   * defini.
   */
  getYearlySalesGoal(): Promise<number>;
  saveYearlySalesGoal(value: number): Promise<void>;

  /**
   * Cloture (verrouillage manuel) d'une annee, indexee par son 1er jour
   * ISO (voir utils/date.startOfYearIso). Meme mecanisme de stockage que
   * les clotures hebdomadaire et mensuelle (memes garanties : ne
   * supprime/modifie jamais aucune donnee), simplement une cle distincte
   * pour ne jamais entrer en collision avec une cloture de semaine ou de
   * mois. false si jamais cloturee.
   */
  getYearClosure(yearStartIso: string): Promise<boolean>;
  setYearClosure(yearStartIso: string, closed: boolean): Promise<void>;

  // -------------------------------------------------------------------
  // PHASE 3 (synchronisation cloud) : methodes de lecture additives.
  //
  // Aucune de ces methodes n'ecrit quoi que ce soit ni ne change le
  // comportement des methodes existantes ci-dessus. Elles preparent
  // uniquement la future synchronisation (PUSH local -> cloud, phase
  // ulterieure) en permettant de determiner "qu'est-ce qui a change
  // depuis le dernier passage", a partir du champ `updatedAt` deja
  // present sur chaque enregistrement.
  //
  // Point important : contrairement a getAllDays()/getAllNotes(), les
  // methodes "UpdatedSince" ci-dessous incluent aussi les elements de
  // la corbeille (deletedAt present) : une suppression douce doit se
  // propager vers le cloud comme une modification normale (voir audit
  // de synchronisation, section 6). Aucune suppression n'est effectuee
  // ici, uniquement de la lecture.
  // -------------------------------------------------------------------

  /**
   * Journees (actives ET en corbeille) dont `updatedAt` est strictement
   * posterieur a `sinceIso`. Ne modifie jamais rien.
   */
  getDaysUpdatedSince(sinceIso: string): Promise<DayEntry[]>;

  /**
   * Notes (actives ET en corbeille) dont `updatedAt` est strictement
   * posterieur a `sinceIso`. Ne modifie jamais rien.
   */
  getNotesUpdatedSince(sinceIso: string): Promise<Note[]>;

  /**
   * Categories personnalisees dont `updatedAt` est strictement posterieur
   * a `sinceIso`. Ne modifie jamais rien.
   */
  getCustomCategoriesUpdatedSince(sinceIso: string): Promise<CustomDepenseCategory[]>;

  /**
   * Dump complet des reglages globaux (objectifs de vente hebdomadaire/
   * mensuel/annuel). Store volontairement petit (quelques lignes au
   * maximum) : un filtre par date n'apporte pas de gain reel, un dump
   * complet suffit pour la synchronisation. Ne modifie jamais rien.
   */
  getAllSettings(): Promise<StoredSetting[]>;

  /**
   * Dump complet des clotures (semaine/mois/annee, memes clefs prefixees
   * qu'en local, voir getWeekClosure/getMonthClosure/getYearClosure).
   * Meme raisonnement que getAllSettings : store petit, dump complet
   * suffisant. Ne modifie jamais rien.
   */
  getAllClosures(): Promise<StoredClosure[]>;

  // -------------------------------------------------------------------
  // PHASE 5 (synchronisation cloud) : reconciliation PULL (cloud -> local).
  //
  // Chacune des methodes ci-dessous recoit l'ensemble des enregistrements
  // distants d'une table (deja convertis vers la forme locale, voir
  // services/sync/mappers.ts) et applique la regle de fusion validee :
  // pour chaque enregistrement, le plus recent (`updatedAt`) l'emporte ;
  // a egalite stricte, le distant l'emporte. Seuls les enregistrements
  // dont le distant l'emporte sont ecrits, avec leurs `createdAt`/
  // `updatedAt` d'origine strictement conserves (aucun `now()`). Un
  // enregistrement local plus recent que son homologue distant n'est
  // jamais modifie -- il reste intact et sera repousse par le PUSH qui
  // suit dans le meme cycle (voir syncService.syncNow).
  // -------------------------------------------------------------------

  /**
   * Fusionne les journees distantes avec les journees locales (actives ET
   * en corbeille). Resout aussi le cas ou la fusion produirait deux
   * journees actives pour la meme date : la plus recente des deux reste
   * active, l'autre est automatiquement deplacee vers la corbeille
   * (deletedAt/updatedAt mis a jour, tous les autres champs intacts) --
   * jamais via saveDay(), ne leve jamais DuplicateDateError.
   */
  reconcileDays(remoteDays: RemoteDayEntry[]): Promise<ReconcileDaysResult>;

  /** Fusionne les notes distantes avec les notes locales (actives ET en corbeille). */
  reconcileNotes(remoteNotes: Note[]): Promise<ReconcileResult>;

  /** Fusionne les categories personnalisees distantes (cle de correspondance : `value`). */
  reconcileCustomCategories(remoteCategories: CustomDepenseCategory[]): Promise<ReconcileResult>;

  /** Fusionne les reglages distants (cle de correspondance : `key`). */
  reconcileSettings(remoteSettings: StoredSetting[]): Promise<ReconcileResult>;

  /** Fusionne les clotures distantes (cle de correspondance : `key`). */
  reconcileClosures(remoteClosures: StoredClosure[]): Promise<ReconcileResult>;
}

/** Journee telle que recue du cloud, avant recalcul local de `totals` (jamais synchronise, voir mappers.ts). */
export type RemoteDayEntry = Omit<DayEntry, "totals">;

/** Resultat neutre d'une reconciliation PULL pour une table sans regle particuliere. */
export interface ReconcileResult {
  /** Nombre d'enregistrements pour lesquels le distant l'a emporte et a ete ecrit en local. */
  appliedFromRemote: number;
  /** Nombre d'enregistrements pour lesquels le local etait deja a jour ou plus recent (rien ecrit). */
  keptLocal: number;
}

/** Resultat de reconcileDays() : ajoute le decompte des conflits de date resolus automatiquement. */
export interface ReconcileDaysResult extends ReconcileResult {
  /** Nombre de journees deplacees vers la corbeille pour resoudre une collision de date. */
  dateConflictsResolved: number;
}

/** Forme neutre d'un reglage global, utilisee par getAllSettings() (voir PHASE 3). */
export interface StoredSetting {
  key: string;
  value: number;
  updatedAt: string;
}

/** Forme neutre d'une cloture (semaine/mois/annee), utilisee par getAllClosures() (voir PHASE 3). */
export interface StoredClosure {
  /** Cle telle que stockee localement : lundi ISO pour une semaine, "month:YYYY-MM-01" ou "year:YYYY-01-01" sinon. */
  key: string;
  verrouille: boolean;
  updatedAt: string;
}
