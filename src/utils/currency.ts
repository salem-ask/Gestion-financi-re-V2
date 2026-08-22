import { storageService } from "@/services/storage";
import type { Devise } from "@/types";

/**
 * Cache synchrone de la devise d'affichage, utilise par formatMontant()
 * (voir utils/format.ts). formatMontant() est appele en dehors de tout
 * contexte async (rendu React), d'ou ce cache en memoire plutot qu'un
 * appel storageService.getPreferences() a chaque formatage. Initialise a
 * "FC" (valeur par defaut) puis mis a jour des que les preferences sont
 * chargees ; toute page qui modifie la devise doit appeler
 * setDeviseAffichage() pour repercuter le changement immediatement.
 */
let deviseActuelle: Devise = "FC";

export function getDeviseAffichage(): Devise {
  return deviseActuelle;
}

export function setDeviseAffichage(devise: Devise): void {
  deviseActuelle = devise;
}

storageService
  .getPreferences()
  .then((preferences) => {
    deviseActuelle = preferences.devise;
  })
  .catch(() => {
    // Garde la valeur par defaut si la lecture initiale echoue.
  });
