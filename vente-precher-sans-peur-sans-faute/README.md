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

## Couvertures

`cover-sans-peur.jpg` et `cover-sans-faute.jpg` sont en place à la racine
de ce dossier (mockups 3D carrés 900×900, ~114 Ko chacun, extraits des
maquettes fournies et compressés pour le web). Pour les remplacer, gardez
les mêmes noms de fichiers ; si un fichier venait à manquer, un encadré
doré « Couverture à venir » s'affiche à la place (hero + bloc dédié à
chaque livre) et n'empêche pas le déploiement.

## Contact

- **Site éditeur :** [libraryonline.online](https://libraryonline.online) (footer)
- **E-mail :** `libraryonline65@gmail.com` (footer, lien `mailto:`)
- **WhatsApp :** icône cliquable dans le footer vers `https://wa.me/243823226790`
  — le numéro n'est jamais affiché en texte, volontairement.

## Avant déploiement — reste à compléter

**Lien « autres titres de la collection »** — pointe vers
`../vente-symboles-bibliques/` (autre titre disponible dans ce même
dépôt) ; à ajuster si d'autres titres sortent ou si l'URL de destination
change au déploiement.

Aucun prix n'est affiché sur la page (volontaire), aucune section de
témoignages/preuve sociale n'est présente (les livres n'ont pas encore été
vendus), et il n'y a pas de section « à propos de l'auteur ».

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
