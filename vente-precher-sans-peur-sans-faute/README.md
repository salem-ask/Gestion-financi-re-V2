# Page de vente — Prêcher Sans Peur & Prêcher Sans Faute (duo)

Landing page statique (HTML/CSS/JS vanilla, sans dépendance, sans étape de
build) dont le seul but est de rediriger le visiteur vers la page de
paiement Chariow. Aucune logique de panier, de commande ou de paiement
n'est codée ici. Mobile-first : la majorité du trafic attendu vient de
téléphones en Afrique francophone, souvent en connexion lente.

## Aperçu local

Ouvrez `index.html` directement dans un navigateur, ou servez le dossier
avec n'importe quel serveur statique (`npx serve .`, `python3 -m http.server`, etc.).

## Lien de paiement

Le lien de paiement est en dur dans `index.html` (un seul lien, répété sur
chaque bouton CTA de la page — hero, 5 CTA intermédiaires, CTA final,
bouton sticky mobile, lien dans la réponse « prix » de la FAQ) :

```
https://livresenligne.mychariow.shop/prd_rclephcs/checkout
```

Pour le changer, remplacez cette URL partout où elle apparaît dans
`index.html` (recherche/remplace sur la chaîne ci-dessus).

## Avant déploiement — reste à compléter

1. **Couvertures des deux livres** — deux emplacements sont prévus,
   ratio portrait 1600×2560 :
   - `cover-sans-peur.jpg` (couverture navy #1F3A5F de *Prêcher Sans Peur*)
   - `cover-sans-faute.jpg` (couverture bordeaux #6E1420 de *Prêcher Sans
     Faute*)
   Déposez ces deux fichiers à la racine de ce dossier, mêmes noms. Tant
   qu'un fichier manque, un encadré doré « Couverture à venir » s'affiche
   à sa place (hero + bloc dédié à chaque livre) et n'empêche pas le
   déploiement.

2. **Photo de l'auteur** — `auteur.jpg`, format carré, à déposer à la
   racine du dossier. Si le fichier est absent, l'espace photo reste
   simplement vide (cadre doré) sans casser la mise en page.

3. **Texte biographique de l'auteur** (`#auteur` dans `index.html`) —
   contient des espaces réservés entre crochets à compléter : nom, nombre
   d'années, nom de l'église/du ministère, et une phrase personnelle.

4. **Mentions légales du footer** — éditeur du site, URL et e-mail de
   contact sont entre crochets dans `index.html` (`[Nom de l'éditeur]`,
   `[URL_EDITEUR]`, `[email@exemple.com]`) et restent à renseigner avant
   mise en ligne définitive.

5. **Lien « autres titres de la collection »** — pointe déjà vers
   `../vente-symboles-bibliques/` (autre titre disponible dans ce même
   dépôt) ; un second espace réservé `[Lien vers d'autres titres à venir]`
   est prêt à être complété au fur et à mesure des sorties.

Aucun prix n'est affiché sur la page (volontaire) et aucune section de
témoignages/preuve sociale n'est présente (les livres n'ont pas encore été
vendus).

## Déploiement sur Vercel

Ce dossier contient son propre `vercel.json` (en-têtes de sécurité ;
aucune commande de build nécessaire, site 100 % statique).

1. Sur [vercel.com](https://vercel.com), **Add New → Project**, importez
   le dépôt GitHub.
2. Dans **Configure Project**, ouvrez **Root Directory** et sélectionnez
   `vente-precher-sans-peur-sans-faute` (indispensable, ce dépôt contient
   aussi une autre application et un autre tunnel de vente).
3. **Framework Preset : Other**. Laissez **Build Command** et **Output
   Directory** vides.
4. Déployez.

## Déploiement sur Netlify

Ce dossier contient aussi son propre `netlify.toml`. Créez un **nouveau
site Netlify** pointant sur ce dépôt et réglez le **Base directory** sur
`vente-precher-sans-peur-sans-faute` (Site settings → Build & deploy →
Build settings).

Déployable tel quel également sur GitHub Pages, Cloudflare Pages, ou collé
directement dans Chariow — aucune étape de build requise dans tous les cas.
