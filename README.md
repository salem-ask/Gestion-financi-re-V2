# Gestion Financiere

Application personnelle de gestion financiere (suivi quotidien, hebdomadaire,
mensuel et annuel). Application web statique, mobile-first, sans backend
proprietaire.

> **Etape actuelle : fondation technique.** La saisie et les calculs
> financiers ne sont pas encore implementes. Cette version pose
> l'architecture, la navigation, le stockage local et l'interface generale.

## Stack technique

- **React + TypeScript + Vite**

Pourquoi ce choix :

- **Statique par nature** : `vite build` produit un dossier `dist/` de
  fichiers HTML/CSS/JS purs, deployable tel quel sur GitHub Pages, Netlify
  ou Cloudflare Workers (assets statiques), sans serveur applicatif ni
  fonction cloud.
- **React** structure naturellement l'app en composants reutilisables
  (cartes, boutons, navigation), ce qui correspond a l'architecture
  demandee (UI / pages / logique / donnees separees) et facilite l'ajout
  futur de fonctionnalites (recherche, import CSV, statistiques, PDF).
- **Vite** offre un demarrage et un build rapides, un typage TypeScript
  integre, et un ecosysteme stable ; aucune dependance a un environnement
  serveur specifique.
- **react-router-dom en mode `HashRouter`** : la navigation fonctionne des
  le premier deploiement sur les trois hebergeurs cibles, sans devoir
  configurer de regle de reecriture d'URL cote serveur.

Aucune dependance superflue n'a ete ajoutee (pas de librairie CSS, pas de
gestionnaire d'etat externe) : l'etat local de React et une couche de
stockage dediee suffisent a ce stade.

## Architecture

```
src/
  components/
    layout/     AppShell, TopBar, BottomNav (navigation principale)
    ui/         Card, Button, SummaryCard, SearchBar, PagePlaceholder
  pages/        Accueil, Quotidien, Hebdomadaire, Mensuel, Annuel, Notes, Recherche
  types/        Modele de donnees (DayEntry, Note, resultats de recherche)
  services/
    storage/    Couche d'abstraction du stockage (storageService)
    search/     Recherche globale (searchService)
    migration/  Import CSV V1 -> V2 (csvMigrationService)
    notesService.ts
  hooks/        Hooks React (ex: useSummary)
  utils/        Fonctions utilitaires (dates, formatage)
  styles/       Variables CSS et reset global mobile-safe
public/
  icons/, manifest.webmanifest, sw.js   Fondations PWA
```

### Separation des responsabilites

Les pages et composants ne parlent **jamais** directement au stockage : ils
passent par `storageService` (`src/services/storage`). Aujourd'hui
implemente avec IndexedDB, cette interface pourra plus tard etre remplacee
ou completee par une synchronisation cloud sans modifier l'UI.

### Modele de donnees

Chaque journee (`DayEntry`) contient deja les champs prevus pour la suite :
achats, ventes, depenses, gain, dime, epargne, generosite, reste, ainsi que
le detail des operations (`achat[]`, `vente[]`, `depense[]`), chacune avec
un libelle et un montant. Les calculs (gain, reste...) ne sont pas encore
branches : les valeurs restent a zero pour l'instant.

Les notes (`Note`) sont un modele totalement independant (id, date, texte,
statut) : elles ne modifient jamais les champs financiers.

### Recherche

`searchService` interroge les jours et les notes via `storageService` et
retourne des resultats normalises (`SearchResult`). L'interface (`/recherche`,
accessible via l'icone 🔍 de la barre du haut) est deja fonctionnelle pour
une recherche texte simple ; les filtres par type, periode et montant sont
prevus dans les types (`SearchFilters`) et seront branches ulterieurement.

### Migration CSV (V1 -> V2)

`services/migration` contient l'architecture prete a recevoir les anciens
formats CSV : un registre de detecteurs (`formats/registry.ts`) et un
service (`csvMigrationService`) qui detecte le format, prepare un apercu et
ne modifie jamais le stockage sans confirmation explicite. Aucun format n'est
encore enregistre : l'ajout d'un ancien format se fera sans toucher au reste
de l'application.

### PWA

`public/manifest.webmanifest` et `public/sw.js` preparent une installation
sur mobile (icone, ecran de demarrage, cache basique de l'app shell). Le
service worker n'est enregistre qu'en production (`npm run build` /
`npm run preview`), jamais en developpement.

L'icone (`public/icons/icon.svg`) est actuellement au format SVG (vectoriel,
leger, sans generation d'image binaire). C'est suffisant pour l'installation
sur Android/Chrome. Pour un rendu optimal de l'icone d'ecran d'accueil sur
iOS (qui attend un PNG pour `apple-touch-icon`), prevoir l'ajout d'icones
PNG (192x192, 512x512, 180x180) dans une prochaine etape.

## Commandes

Le fichier `package-lock.json` n'est pas verse dans ce depot pour cette
etape ; il sera regenere automatiquement lors du premier `npm install`.

```bash
# Installation des dependances
npm install

# Serveur de developpement (rechargement a chaud)
npm run dev

# Verification des types
npm run typecheck

# Build de production (dossier dist/)
npm run build

# Previsualiser le build de production localement
npm run preview
```

## Deploiement

Le build ne contient que des fichiers statiques (`dist/`) : aucune variable
d'environnement ni chemin absolu local n'est requis.

### GitHub Pages

1. `npm run build`
2. Publier le contenu de `dist/` sur la branche `gh-pages` (ou via une action
   GitHub type `actions/deploy-pages`).
3. Grace au `HashRouter`, aucune regle de reecriture n'est necessaire.

### Netlify

- Commande de build : `npm run build`
- Dossier de publication : `dist`
- Un fichier `netlify.toml` est deja present a la racine avec ces valeurs.

### Cloudflare Workers (recommande)

Le deploiement cible desormais Cloudflare Workers (assets statiques, sans
Worker applicatif) via `@cloudflare/vite-plugin` + `wrangler.jsonc` — la
configuration prise en charge automatiquement par Cloudflare necessite
Vite >= 6.1, d'ou la mise a jour de Vite (voir `package.json`).

- Commande de build : `npm run build` (genere `dist/`, ainsi qu'un
  `dist/wrangler.json` derive de `wrangler.jsonc` par le plugin)
- Deploiement : `npm run deploy` (build puis `wrangler deploy`), ou
  connecter le depot GitHub directement dans le tableau de bord Cloudflare
  avec la meme commande de build et `dist` comme dossier de sortie.
- Variables d'environnement a renseigner cote Cloudflare (build) :
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (memes noms qu'en local,
  voir `.env.example` ; lues au build par Vite, jamais par le Worker).
- Authentification requise avant un vrai `wrangler deploy` : `wrangler login`,
  ou les variables `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`.

## Verifie a cette etape

- Build de production (`npm run build`) execute avec succes.
- Navigation entre les 6 sections principales + la recherche.
- Ecrans testes mentalement/techniquement pour 320px, 375px, 390px et 430px
  de large (pas de debordement horizontal, cibles tactiles >= 44px, aucun
  contenu masque par la barre de navigation basse ou le clavier virtuel).

## Prochaines etapes (non traitees ici)

Calculs quotidien/hebdomadaire/mensuel/annuel, export PDF/CSV, statistiques
avancees, synchronisation cloud, authentification.
