# Page de vente — Les Symboles Bibliques Expliqués

Landing page statique (HTML/CSS/JS vanilla, sans dépendance) dont le seul but
est de rediriger le visiteur vers la fiche produit Chariow. Aucune logique de
panier, de commande ou de paiement n'est codée ici.

## Aperçu local

Ouvrez `index.html` directement dans un navigateur, ou servez le dossier avec
n'importe quel serveur statique (`npx serve .`, `python3 -m http.server`, etc.).

## Avant déploiement — à compléter

1. **Lien Chariow** — dans `script.js`, ligne 4 :
   ```js
   const CHARIOW_URL = "[À COMPLÉTER : lien produit Chariow]";
   ```
   C'est le seul endroit à modifier : tous les boutons CTA (`data-cta`)
   reçoivent automatiquement cette URL au chargement de la page.

2. **Image de couverture** — ajoutez un fichier `cover.jpg` à la racine de ce
   dossier (à côté de `index.html`). Recommandé : format portrait, largeur
   ≥ 720px, poids optimisé (< 200 Ko) pour un chargement rapide sur mobile.

3. **Contenu à finaliser dans `index.html`** :
   - `[TÉMOIGNAGE À AJOUTER]` (3 occurrences, section « Crédibilité »)
   - `[BIO AUTEUR À COMPLÉTER]`
   - Prix et format du livre dans la FAQ
   - Modalités de livraison après achat dans la FAQ
   - Mentions légales / contact dans le footer

## Déploiement

Dossier 100% statique : déployable tel quel sur Netlify, Vercel, GitHub Pages,
Cloudflare Pages, ou en pièce jointe cPanel. Aucune étape de build requise.
