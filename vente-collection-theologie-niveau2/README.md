# Collection Théologie — Niveau 2 — tunnel de vente

Landing page statique (HTML/CSS/JS, sans build) servant de tunnel de vente pour
le produit numérique « Collection Théologie — Niveau 2 ». Le paiement se fait
entièrement sur Chariow ; cette page ne contient ni prix, ni formulaire de
paiement, ni panier.

## Fichiers

- `index.html` — structure de la page (hero, problème, solution, cours,
  livres, bonus, pour qui, preuves sociales, offre, FAQ, CTA final).
- `style.css` — design premium bleu marine / ivoire / doré.
- `script.js` — configuration centrale et comportements (voir ci-dessous).
- `cover.jpg` — affiche officielle du coffret (fournie par l'utilisateur).
- `proof/whatsapp-0X.jpg` *(à ajouter)* — captures WhatsApp anonymisées (voir
  `proof/README.md`).

## Configuration centrale (`script.js`)

```js
const CHARIOW_URL = "https://livresenligne.mychariow.shop/prd_n3mlew/checkout";
const PRODUCT_TITLE = "Collection Théologie — Niveau 2";
const PRODUCT_DESCRIPTION = "...";
const PRODUCT_IMAGE = "cover.jpg";
```

Tous les boutons d'achat (`[data-cta]`) reçoivent automatiquement
`href="CHARIOW_URL"` — c'est le seul endroit à modifier pour changer la
destination des CTA. Aucune variable de prix n'existe : le prix n'apparaît
jamais sur cette page.

## Images

- L'affiche officielle du coffret (`cover.jpg`, 1254×1254) est déjà en place
  et utilisée dans le hero et dans la section Offre.
- Il reste à déposer les captures WhatsApp anonymisées dans `proof/` (voir
  `proof/README.md` pour les règles de floutage). Tant qu'elles ne sont pas
  fournies, la page affiche un repère « Capture à venir » — aucune preuve
  n'est simulée.

## Tracking

Un événement `purchase_click` est envoyé à `window.dataLayer` (et à `gtag`/
`fbq` s'ils sont présents) à chaque clic sur un bouton d'achat, sans jamais
bloquer la redirection vers Chariow. Aucun identifiant Meta Pixel / GA n'est
inventé : ajoutez vos propres snippets officiels dans le `<head>` de
`index.html` le moment venu.

## Déploiement

Site 100 % statique, sans étape de build — compatible avec :

- **Vercel** : `vercel.json` fourni (en-têtes de sécurité). Définissez ce
  dossier comme *Root Directory* du projet.
- **Netlify** : `netlify.toml` fourni (`publish = "."`). Définissez ce dossier
  comme *Base directory*.
- **Cloudflare Pages** : définissez ce dossier comme répertoire racine du
  projet, avec un répertoire de sortie `.` et aucune commande de build.
- **GitHub Pages** : servez ce dossier directement (ou via une action qui en
  publie le contenu).

Aucune variable d'environnement n'est requise.
