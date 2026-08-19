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
}
