# Page de vente — Maîtrisez l'Exégèse Biblique

Landing page statique (HTML/CSS/JS vanilla, sans dépendance ni build) dont le
seul but est de présenter le pack et de rediriger le visiteur vers la fiche
produit Chariow. Aucune logique de panier, de commande ou de paiement n'est
codée ici.

## Aperçu local

Ouvrez `index.html` directement dans un navigateur, ou servez le dossier avec
n'importe quel serveur statique (`npx serve .`, `python3 -m http.server`,
etc.).

## Lien Chariow

Déjà configuré dans `script.js`, ligne 4 :
```js
const CHARIOW_URL = "https://livresenligne.mychariow.shop/prd_0u00x6/checkout";
```
C'est le seul endroit à modifier si le lien change : tous les CTA
(`data-cta`) reçoivent automatiquement cette URL au chargement de la page —
hero, CTA intermédiaires (solution, bénéfices, aspiration, offre), CTA
final et bouton sticky mobile.

## Image officielle du pack

`images/pack-exegese.jpg` est l'image du pack fournie par l'utilisateur
(extraite telle quelle du visuel source, sans retouche de contenu). Elle est
utilisée à l'identique dans le hero et dans la section « Offre ». Ne
remplacez ce fichier que par une nouvelle version officielle fournie par
l'utilisateur — jamais par une image générée ou trouvée en ligne.

## Preuves sociales — captures WhatsApp

Aucune capture n'est encore fournie pour ce produit : 4 emplacements sont
prévus (`images/proof/whatsapp-01.jpg` à `-04.jpg`). Tant qu'un fichier
manque, un encadré doré « Capture WhatsApp à venir » s'affiche à sa place et
n'empêche pas le déploiement. Pour ajouter une capture :

- déposez l'image au nom attendu dans `images/proof/` ;
- **avant d'y déposer une vraie capture**, masquez tout numéro de téléphone,
  nom complet ou photo de profil identifiable visible dedans ;
- pour ajouter une 5ᵉ capture (ou plus), dupliquez un bloc
  `<figure class="proof-card">` dans `index.html` (commentaire « CAPTURE »
  juste au-dessus) — la mise en page (grille 2 colonnes sur ordinateur, une
  colonne sur mobile) et la lightbox s'adaptent automatiquement, sans autre
  changement de code.

N'utilisez jamais de témoignage ou de capture inventée : uniquement des
échanges réellement reçus au sujet de ce produit.

## Meta Ads / tracking

`script.js` prévoit un Meta Pixel prêt à configurer :
```js
const META_PIXEL_ID = "";
```
Tant que cette constante est vide, aucun script Meta n'est chargé et le site
fonctionne normalement. Une fois un ID renseigné, la page envoie
automatiquement `PageView` et `ViewContent` au chargement, puis
`InitiateCheckout` à chaque clic sur un CTA — sans jamais bloquer la
redirection vers Chariow, tracking configuré ou non.

## Déploiement sur Vercel

Ce dossier contient son propre `vercel.json` (en-têtes de sécurité ; aucune
commande de build nécessaire, site 100 % statique).

1. Sur [vercel.com](https://vercel.com), **Add New → Project**, importez le
   dépôt GitHub.
2. Dans **Configure Project**, ouvrez **Root Directory** et sélectionnez
   `vente-exegese-biblique` (ce dépôt contient aussi une autre application
   à la racine).
3. **Framework Preset : Other**. Laissez **Build Command** et
   **Output Directory** vides.
4. Déployez.

## Déploiement sur Netlify

Ce dossier contient aussi son propre `netlify.toml`. Créez un **nouveau
site Netlify** pointant sur ce dépôt et réglez le **Base directory** sur
`vente-exegese-biblique` (Site settings → Build & deploy → Build settings).

## Déploiement sur Cloudflare Pages

Créez un projet Pages pointant sur ce dépôt, avec **Root directory**
`vente-exegese-biblique`, sans commande de build. Le fichier `_headers` à la
racine de ce dossier est lu automatiquement par Cloudflare Pages.

Déployable tel quel également sur GitHub Pages — aucune étape de build
requise dans tous les cas.

## Une fois l'URL de production connue

Mettez à jour `og:image` / `twitter:image` dans `index.html` avec une URL
absolue (ex. `https://votre-site.pages.dev/images/pack-exegese.jpg`) : la
page fonctionne avec le chemin relatif actuel, mais certains robots de
réseaux sociaux préfèrent une URL absolue pour l'aperçu de partage.
