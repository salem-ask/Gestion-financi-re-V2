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
C'est le seul endroit à modifier si le lien change : tous les liens CTA
(`data-cta`, 8 au total — hero, 4 CTA intermédiaires, CTA final, bouton
sticky mobile, lien dans la réponse « prix » de la FAQ) reçoivent
automatiquement cette URL au chargement de la page.

## Contact

- **E-mail :** `libraryonline65@gmail.com` (footer, lien `mailto:`)
- **WhatsApp :** icône cliquable dans le footer vers `https://wa.me/243823226790`
  — le numéro n'est jamais affiché en texte, volontairement.
- **Éditeur du site :** LibraryOnline — `https://libraryonline.online` (footer)

## Avant déploiement — reste à compléter

1. **Image de couverture** — `cover.jpg` est en place (1200×1920, ~106 Ko).
   Pour la remplacer, gardez le même nom de fichier à la racine de ce
   dossier ; si le fichier venait à manquer, un encadré doré
   « Couverture à venir » s'affiche à la place et n'empêche pas le
   déploiement.

2. **Section crédibilité (témoignages + bio auteur)** — volontairement
   retirée de `index.html` pour l'instant, à réintégrer plus tard. Les
   styles (`.testimonials`, `.testimonial`, `.author`) restent dans
   `style.css`, prêts à être réutilisés quand le bloc reviendra.

3. **Captures WhatsApp de la section « preuve sociale »** (`#preuve-sociale`)
   — 4 emplacements sont prévus (`proof/whatsapp-01.jpg` à `-04.jpg`), pas
   encore fournis. Tant qu'un fichier manque, un encadré « Capture WhatsApp
   à venir » s'affiche à sa place et n'empêche pas le déploiement. Pour
   ajouter une capture :
   - créez le dossier `proof/` à la racine de ce dossier et déposez-y
     l'image au nom attendu (`whatsapp-01.jpg`, etc.) ;
   - **avant d'y déposer une vraie capture**, masquez tout numéro de
     téléphone, nom complet ou photo de profil identifiable visible dedans.
   - pour ajouter une 5ᵉ capture (ou plus), dupliquez un bloc
     `<figure class="proof-card">` dans `index.html` (commentaire
     « CAPTURE » juste au-dessus) — la mise en page (grille sur ordinateur,
     carrousel horizontal sur mobile) s'adapte automatiquement, sans autre
     changement de code.

Aucun placeholder `[À COMPLÉTER]` ne reste dans `index.html` : prix/format
du livre, modalités de livraison et mentions légales/contact sont tous
renseignés avec les informations définitives fournies.

## Déploiement sur Vercel

Ce dossier contient son propre `vercel.json` (en-têtes de sécurité ; aucune
commande de build nécessaire, site 100 % statique).

1. Sur [vercel.com](https://vercel.com), **Add New → Project**, importez le
   dépôt GitHub.
2. Dans **Configure Project**, ouvrez **Root Directory** et sélectionnez
   `vente-symboles-bibliques` (indispensable si ce dossier fait partie d'un
   dépôt qui contient aussi une autre application).
3. **Framework Preset : Other** (ou laissez Vercel le détecter — un
   `index.html` à la racine du dossier suffit). Laissez **Build Command**
   et **Output Directory** vides.
4. Déployez. Vercel sert directement `index.html`, `style.css`, `script.js`
   et `cover.jpg`.

Une fois l'URL Vercel connue, pensez à mettre à jour `og:image` /
`twitter:image` dans `index.html` (actuellement `cover.jpg` en chemin
relatif — ça fonctionne pour l'affichage sur la page, mais certains
robots de réseaux sociaux préfèrent une URL absolue, ex.
`https://votre-site.vercel.app/cover.jpg`, pour l'aperçu de partage).

## Déploiement sur Netlify

Ce dossier contient aussi son propre `netlify.toml`. Le dépôt contient une
autre app (Vite) à la racine avec son propre `netlify.toml` : pour déployer
cette page comme site Netlify indépendant, créez un **nouveau site Netlify**
pointant sur ce dépôt et réglez le **Base directory** sur
`vente-symboles-bibliques` (Site settings → Build & deploy → Build
settings).

Déployable tel quel également sur GitHub Pages, Cloudflare Pages, ou en
pièce jointe cPanel — aucune étape de build requise dans tous les cas.
