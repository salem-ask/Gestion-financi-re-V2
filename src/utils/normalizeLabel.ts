/**
 * Normalisation "douce" d'un libelle : espaces, casse et accents
 * uniquement. Permet de rapprocher "Livre", "LIVRE", "livre " sans
 * fusionner des articles reellement differents (pas de singulier/pluriel,
 * pas de correction orthographique). Reutilisable par la recherche et par
 * les futures statistiques (regroupement par libelle).
 */
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
