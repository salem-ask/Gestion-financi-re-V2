# Landing page — Collection Théologie Niveau 3

Landing page statique (HTML/CSS/JS vanilla, sans dépendance ni build) dont le
seul but est de présenter la collection et de rediriger le visiteur vers la
fiche produit Chariow. Aucune logique de panier, de compte ou de paiement
n'est codée ici, et aucun prix n'est affiché sur la page.

## Aperçu local

Ouvrez `index.html` directement dans un navigateur, ou servez le dossier avec
n'importe quel serveur statique (`npx serve .`, `python3 -m http.server`, etc.).

## Lien Chariow

Déjà configuré dans `script.js`, ligne 4 :
```js
const CHARIOW_URL = "https://livresenligne.mychariow.shop/prd_eq8dt0/checkout";
```
C'est le seul endroit à modifier si le lien change : tous les boutons CTA
(`data-cta` — nav, hero, bonus, CTA intermédiaire, CTA final, barre sticky
mobile) reçoivent automatiquement cette URL au chargement de la page.

## Contact

- **E-mail :** `libraryonline65@gmail.com` (footer, lien `mailto:`)
- **WhatsApp :** bouton visible dans le footer vers
  `https://wa.me/243823226790` avec un message préformaté ; le numéro n'est
  affiché nulle part ailleurs sur la page.
- **Site :** `https://libraryonline.online` (footer)

## Avant déploiement — assets à fournir

Le contenu texte de la page (cours, livres, sections) est déjà complet.
Deux types d'images restent à déposer — tant qu'un fichier manque, un
encadré doré s'affiche à sa place et n'empêche pas le déploiement :

1. **Image de couverture** — déposez le fichier `cover.jpg` à la racine de
   ce dossier (portrait, ex. 1200×1730). Utilisée dans le Hero et comme
   image `og:image` / `twitter:image` pour le partage sur les réseaux
   sociaux.

2. **Captures WhatsApp de la section « Témoignages »** (`#temoignages`) —
   4 emplacements sont prévus dans le dossier `proof/` :
   `whatsapp-01.jpg` à `whatsapp-04.jpg`.
   - **Avant d'y déposer une vraie capture**, masquez tout numéro de
     téléphone, nom complet ou photo de profil identifiable visible dedans.
   - La mise en page (grille 2×2 sur ordinateur, carrousel tactile sur
     mobile, agrandissement au clic) s'adapte automatiquement, sans autre
     changement de code.

Une fois l'URL de déploiement connue, pensez à mettre à jour `og:image` /
`twitter:image` dans `index.html` avec une URL absolue
(ex. `https://votre-site.pages.dev/cover.jpg`) pour un meilleur aperçu de
partage sur les réseaux sociaux et messageries.

## Déploiement sur Cloudflare Pages

1. Créez un projet Pages à partir du dépôt GitHub.
2. **Root directory (répertoire racine)** : `collection-theologie-niveau-3`.
3. **Build command** : laissez vide. **Build output directory** : `/`
   (ou laissez vide, valeur par défaut).
4. Déployez. Le fichier `_headers` de ce dossier configure automatiquement
   les en-têtes de sécurité.

## Déploiement sur Vercel

Ce dossier contient son propre `vercel.json` (en-têtes de sécurité ; aucune
commande de build nécessaire, site 100 % statique).

1. Sur [vercel.com](https://vercel.com), **Add New → Project**, importez le
   dépôt GitHub.
2. Dans **Configure Project**, ouvrez **Root Directory** et sélectionnez
   `collection-theologie-niveau-3` (indispensable puisque ce dépôt contient
   aussi d'autres applications).
3. **Framework Preset : Other**. Laissez **Build Command** et
   **Output Directory** vides.
4. Déployez.

## Déploiement sur Netlify

Ce dossier contient aussi son propre `netlify.toml`. Le dépôt contient
d'autres apps à la racine : pour déployer cette page comme site Netlify
indépendant, créez un **nouveau site Netlify** pointant sur ce dépôt et
réglez le **Base directory** sur `collection-theologie-niveau-3`
(Site settings → Build & deploy → Build settings).

## Déploiement sur GitHub Pages

Déployable tel quel (aucune étape de build) : configurez GitHub Pages pour
servir le dossier `collection-theologie-niveau-3` (via une branche dédiée
ou une action de déploiement copiant ce dossier à la racine du site publié).
