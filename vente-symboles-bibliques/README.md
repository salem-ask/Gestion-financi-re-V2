# Page de vente — Les Symboles Bibliques Expliqués

Landing page statique (HTML/CSS/JS vanilla, sans dépendance) dont le seul but
est de rediriger le visiteur vers la fiche produit Chariow. Aucune logique de
panier, de commande ou de paiement n'est codée ici.

## Aperçu local

Ouvrez `index.html` directement dans un navigateur, ou servez le dossier avec
n'importe quel serveur statique (`npx serve .`, `python3 -m http.server`, etc.).

## Lien Chariow

Déjà configuré dans `script.js`, ligne 4 :
```js
const CHARIOW_URL = "https://livresenligne.mychariow.shop/prd_5ju70vle";
```
C'est le seul endroit à modifier si le lien change : tous les boutons CTA
(`data-cta`, 7 au total — hero, 4 CTA intermédiaires, CTA final, bouton
sticky mobile) reçoivent automatiquement cette URL au chargement de la page.

## Avant déploiement — reste à compléter

1. **Image de couverture** — ajoutez un fichier `cover.jpg` à la racine de ce
   dossier (à côté de `index.html`). Recommandé : format portrait, largeur
   ≥ 720px, poids optimisé (< 200 Ko) pour un chargement rapide sur mobile.
   Tant que le fichier est absent, un encadré doré « Couverture à venir »
   s'affiche à la place — cela n'empêche pas le déploiement.

2. **Section crédibilité (témoignages + bio auteur)** — volontairement
   retirée de `index.html` pour l'instant, à réintégrer plus tard. Les
   styles (`.testimonials`, `.testimonial`, `.author`) restent dans
   `style.css`, prêts à être réutilisés quand le bloc reviendra.

3. **Contenu à finaliser dans `index.html`** :
   - Prix et format du livre dans la FAQ
   - Modalités de livraison après achat dans la FAQ
   - Mentions légales / contact dans le footer

## Déploiement sur Netlify

Ce dossier contient son propre `netlify.toml` (site statique, aucune commande
de build). Le dépôt contient aussi une autre app (Vite) à la racine avec son
propre `netlify.toml` : pour déployer cette page comme site Netlify
indépendant, créez un **nouveau site Netlify** pointant sur ce dépôt et
réglez le **Base directory** sur `vente-symboles-bibliques` (Site settings →
Build & deploy → Build settings). Netlify utilisera alors automatiquement le
`netlify.toml` de ce dossier.

Déployable tel quel également sur Vercel, GitHub Pages, Cloudflare Pages, ou
en pièce jointe cPanel — aucune étape de build requise dans tous les cas.
