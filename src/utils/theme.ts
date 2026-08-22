import { storageService } from "@/services/storage";
import type { Theme } from "@/types";

const ATTR = "data-theme";

/**
 * Applique la preference d'apparence au rendu, via l'attribut data-theme
 * sur <html> (voir styles/variables.css pour les valeurs claires/sombres
 * associees). "systeme" retire l'attribut : dans ce cas variables.css
 * suit automatiquement prefers-color-scheme, comme avant cette fonction.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "systeme") {
    root.removeAttribute(ATTR);
  } else {
    root.setAttribute(ATTR, theme);
  }
}

storageService
  .getPreferences()
  .then((preferences) => applyTheme(preferences.theme))
  .catch(() => {
    // Garde le theme systeme (aucun attribut) si la lecture initiale echoue.
  });
