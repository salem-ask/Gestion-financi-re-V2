# Tunnel de vente — Collection Théologie Niveau 1

Landing page statique (HTML/CSS/JS vanilla, sans dépendance, sans build)
dont le seul objectif est de convaincre le visiteur puis de le rediriger
vers le checkout Chariow. Aucune logique de panier, de compte ou de
paiement n'est codée ici — c'est une page de conversion, pas une boutique.

## Aperçu local

Ouvrez `index.html` directement dans un navigateur, ou servez le dossier
avec n'importe quel serveur statique :

```bash
npx serve .
# ou
python3 -m http.server
```

## Lien Chariow (checkout)

Déjà configuré dans `script.js`, ligne 4 :

```js
const CHARIOW_URL = "https://livresenligne.mychariow.shop/prd_kl29up/checkout";
```

C'est le **seul endroit à modifier** si le lien change un jour : tous les
boutons CTA de la page (`data-cta`, il y en a une dizaine — hero,
présentation, cours, livres, bonus, « ce que vous recevez », offre, CTA
final, barre sticky mobile) reçoivent automatiquement cette URL au
chargement de la page.

## Avant déploiement — images à fournir

Aucune image n'est générée par ce projet : tant qu'un fichier attendu est
absent, un encadré doré discret s'affiche à sa place (« Affiche du pack à
venir », « Capture à venir ») et **n'empêche jamais le déploiement**.

1. **Affiche principale du pack (obligatoire)** — déposez votre visuel à la
   racine de ce dossier sous le nom `cover.jpg` (idéalement un carré,
   ex. 1200×1200, format JPG optimisé pour le web). Elle est utilisée :
   - en image principale du Hero (`.hero__cover`) ;
   - à nouveau dans la section « Présentation » (`.presentation__cover`),
     sans coût de chargement supplémentaire (même fichier, mis en cache) ;
   - comme image Open Graph / Twitter (`og:image`, `twitter:image`) pour
     l'aperçu du lien sur Facebook, Instagram et WhatsApp.

   Si votre fichier n'est pas un `.jpg`, renommez-le ou mettez à jour les
   3 références à `cover.jpg` dans `index.html` (2 balises `<img>` + 2
   balises meta `og:image`/`twitter:image`).

2. **Captures WhatsApp de la section « preuve sociale »** (`#preuve-sociale`)
   — 6 emplacements sont prévus : `proof/whatsapp-01.jpg` à
   `whatsapp-06.jpg`. Pour en ajouter :
   - déposez l'image au nom attendu dans le dossier `proof/` ;
   - **avant d'y déposer une vraie capture**, masquez tout numéro de
     téléphone, nom complet ou photo de profil identifiable ;
   - pour ajouter une 7ᵉ capture (ou plus), dupliquez un bloc
     `<figure class="proof-card">` dans `index.html` — la grille s'adapte
     automatiquement (2 colonnes sur mobile, 3 sur desktop) ;
   - pour en avoir moins de 6, supprimez simplement les blocs
     `<figure class="proof-card">` en trop.
   - au clic (ou au clavier via Entrée/Espace), chaque capture s'ouvre en
     grand dans une fenêtre modale (`Échap` ou clic en dehors pour fermer).

3. **Prix** — volontairement absent de cette page : le prix affiché est
   celui de la fiche Chariow, jamais inventé ici.

## Structure du code

```
index.html    Structure et contenu de toutes les sections (Hero,
              Problème, Présentation, 14 Cours, 14 Livres, Bonus, Ce que
              vous recevez, Pour qui, Bénéfices, Preuve sociale, Offre,
              FAQ, CTA final, footer, barre sticky mobile)
style.css     Palette et mise en page (bleu nuit / doré / crème),
              100% responsive, mobile-first
script.js     Injection de l'URL Chariow dans tous les CTA, fallback
              image manquante, animations d'apparition au scroll, barre
              CTA sticky mobile, lightbox des captures WhatsApp
```

Les 14 cours et les 14 livres sont chacun une carte HTML autonome et
numérotée dans `index.html` (sections « 4. LES 14 COURS » et
« 5. LES 14 LIVRES ») : pour modifier un intitulé, une description, ou
en ajouter/retirer un, il suffit d'éditer ou de dupliquer le bloc
correspondant — aucune autre partie du code n'a besoin d'être touchée.

## Déploiement sur Vercel

Ce dossier contient son propre `vercel.json` (en-têtes de sécurité ;
aucune commande de build nécessaire, site 100 % statique).

1. Sur [vercel.com](https://vercel.com), **Add New → Project**, importez
   le dépôt GitHub.
2. Dans **Configure Project → Root Directory**, sélectionnez
   `vente-collection-theologie` (indispensable, ce dépôt contient
   d'autres projets à la racine).
3. **Framework Preset : Other**. Laissez **Build Command** et
   **Output Directory** vides.
4. Déployez.

## Déploiement sur Netlify

Ce dossier contient aussi son propre `netlify.toml`. Créez un **nouveau
site Netlify** pointant sur ce dépôt et réglez le **Base directory** sur
`vente-collection-theologie` (Site settings → Build & deploy → Build
settings). Aucune commande de build requise.

## Déploiement sur Cloudflare Pages

1. Créez un nouveau projet Pages, connectez ce dépôt GitHub.
2. **Root directory** : `vente-collection-theologie`.
3. **Build command** : laissez vide (ou `echo "no build"`).
4. **Build output directory** : `.`
5. Déployez.

Déployable tel quel également sur GitHub Pages ou tout hébergement
statique — aucune étape de build requise dans tous les cas.

## Rappel

- Aucun système de paiement ni panier n'est implémenté ici.
- Tous les boutons d'achat pointent vers l'URL Chariow exacte fournie —
  aucune autre destination n'est créée.
- Aucun prix, aucun témoignage et aucune capture WhatsApp ne sont
  inventés dans ce code : tout provient des visuels que vous fournissez.
