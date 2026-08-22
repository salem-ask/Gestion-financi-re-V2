import { indexedDbStorage } from "./indexedDbStorage";
import type { StorageService } from "./storageService";

/**
 * Point d'entree unique du stockage pour toute l'application.
 * Aujourd'hui : IndexedDB. Demain : eventuellement un backend distant
 * derriere la meme interface, sans changement cote UI.
 */
export const storageService: StorageService = indexedDbStorage;

export type { StorageService } from "./storageService";
