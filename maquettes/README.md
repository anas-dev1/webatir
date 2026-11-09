# Maquettes de sites pour prospects

Chaque dossier `maquettes/<slug>/` est une maquette publiée sur
`https://webatir.com/maquettes/<slug>/` (GitHub Pages, branche `main`, sans build côté serveur).
Le lien se colle dans la fiche du prospect dans le CRM.

- `site.json` : toutes les données du prospect (nom, horaires, carte, couleurs, photos…).
- `photos/` : les images, compressées à **200 Ko max** chacune.
- `index.html`, `styles.css`, `script.js` : **générés** par le build, ne pas les éditer à la main.

Les gabarits vivent dans `_templates/<niche>/` (`render.mjs` + `assets/` + `exemple.site.json`).
Les dossiers qui commencent par `_` (`_templates/`, `_archive/`) ne sont pas publiés par GitHub Pages
tant qu'il n'y a **pas de fichier `.nojekyll`** à la racine du dépôt : ne pas en ajouter.

Toutes les maquettes portent `<meta name="robots" content="noindex,nofollow">` et `robots.txt`
interdit `/maquettes/` : elles n'apparaissent pas sur Google.

## Créer une maquette

Slug = `ville-nom`, en minuscules, sans accents ni espaces (ex. `begles-linedit`).

```bash
node _templates/new-site.mjs begles-linedit --niche restaurant
```

1. Remplir `maquettes/<slug>/site.json` (partir de l'exemple généré ; `_templates/restaurant/exemple.site.json` liste tous les champs).
   Horaires inconnus : mettre des horaires plausibles et `"a_confirmer": true`.
   Les horaires `de`/`a` sont au format `HH:MM` ; une fin à `00:00` ou inférieure au début = après minuit.
2. Déposer les photos dans `maquettes/<slug>/photos/` (JPEG ≤ 200 Ko, 1 400 px de large max ; le build avertit si une photo est trop lourde).
3. Générer :

```bash
node _templates/build.mjs begles-linedit
```

4. Vérifier `maquettes/<slug>/index.html` en local (mobile 375 px et desktop), puis commit + push sur `main`.
   Le site est en ligne 1 à 3 minutes plus tard.

## Carte longue : une page à part

Au-delà d'environ 25 plats, mettre `"carte_page": true` dans `site.json`. Le build produit alors
`maquettes/<slug>/carte/index.html` (carte complète avec onglets par catégorie, URL à coller dans le
champ « lien vers le menu » de la fiche Google Business, ou en QR code sur les tables) et l'accueil
n'affiche qu'un aperçu : les formules, les catégories marquées `"apercu": true` et les plats marqués
`"vedette": true` (regroupés sous `vedettes_titre`, « Les incontournables » par défaut), suivi d'un
bouton « Voir toute la carte ». Sans `carte_page`, tout reste sur l'accueil.

## Groupes & privatisation

Pour un restaurant qui vit des groupes (repas d'entreprise, anniversaires, grande terrasse), le bloc
`groupes` de `site.json` ajoute une section dédiée après « La maison » : `titre`, `paragraphes`,
`details` (liste courte : capacité, menus groupe, privatisation), `cta_texte` et `cta_lien`
(vide = appel téléphonique), `image` facultative. Exemple dans `_templates/restaurant/exemple.site.json`
(`groupes_exemple`) et dans `maquettes/bordeaux-boeuf-gourmand/`.

## Plats vedettes en photo

Sur l'accueil (quand `carte_page` est `true`), les plats marqués `"vedette": true` s'affichent en cartes
photo dès qu'au moins un d'eux a une clé `photo` (`"photo": "photos/entrecote.jpg"`). Sans photo, c'est
une simple liste. Quatre à six vedettes, une photo chacune : c'est la section la plus appétissante de la page.

## Distinctions & presse

`distinctions` (liste) affiche sous l'accueil les guides, prix et citations : chaîne simple ou
`{ "texte", "source", "lien" }`. Trois maximum, uniquement ce qui est vérifiable (Michelin, Gault&Millau,
Tripadvisor, article de presse). `distinctions_titre` est facultatif.

## Carte cadeau

`carte_cadeau: { "lien", "texte", "note" }` ajoute un lien « Carte cadeau » dans la navigation et un bloc
dans les infos pratiques. `lien` vide = appel téléphonique ; sinon le lien de vente en ligne existant.

## Menus de fêtes

`saison` ajoute un bloc daté entre l'événement et la carte : `surtitre`, `titre`, `periode`, `intro`,
`menus` (même format que `formules`), `note`, `cta_texte`, `cta_lien` (vide = réservation habituelle),
`image` facultative, `nav_texte` pour le libellé du menu (« Fêtes » par défaut). À retirer une fois la
période passée. Exemple complet sur la démo Casa Nómada et dans `exemple.site.json` (`saison_exemple`).

## Variante éditoriale

`style.variante: "editorial"` change la mise en page sans toucher au contenu : titres condensés géants en
majuscules (prévoir une police condensée dans `polices.titres`, par ex. `Bebas Neue` ou `Anton`), photo
pleine largeur sous le titre de « La maison » (`a_propos.image`), blocs sans cadre, angles vifs, petit décor
filaire dans la couleur d'accent. Pensé pour les adresses jeunes et les sorties du soir ; à combiner avec
`animations: true` et une ambiance sombre. Exemple : `maquettes/begles-linedit-nuit/`, variante « nuit » de
L'inédit à montrer en second dans la vidéo, après la version sobre.

## Variante magazine

`style.variante: "magazine"` : accueil en deux colonnes (texte à gauche, photo arrondie à droite), mentions en
italique, « La maison » avec photo à côté et un `surtitre`, vedettes en cartes centrées, blocs sans cadre.
Prévoir `accroche` (une phrase en titre, le nom passe en surtitre), `citation` (photo pleine largeur et une
phrase), `invitation` (bandeau « On vous garde une table ? »), `formules_accueil: false` pour garder les
formules sur la page carte seulement, et `ordre` pour n'afficher que les sections voulues. Exemple : `maquettes/begles-linedit-chic/`.

## Ordre des sections

`ordre` (liste) fixe l'ordre des sections de l'accueil et permet d'en retirer. Clés : `bandeau`, `mentions`,
`distinctions`, `apropos`, `evenement`, `saison`, `groupes`, `carte`, `citation`, `invitation`, `galerie`,
`infos`. Sans `ordre`, tout s'affiche dans cet ordre. Le hero est toujours en premier.

## Ambiance animée

Par défaut le gabarit est sobre et rapide. Pour un prospect à concept (bar, cantina, rooftop),
`"animations": true` dans `site.json` active : vidéo de fond dans le hero (`photos.video`, MP4 muet
≤ 2 Mo, la photo `hero` sert d'affiche et de repli), titre qui apparaît mot à mot, apparitions au
défilement, parallaxe léger, en-tête qui se cache en descendant, bandeau défilant (`bandeau: [...]`),
survols animés. Tout est en CSS et JavaScript maison, sans bibliothèque, et se désactive de lui-même
si le visiteur a demandé moins d'animations ou économise ses données. `"style": { "forme_photos": "arche" }`
arrondit la grande photo de la galerie et celle de l'événement.

Démo : `maquettes/demo-casa-nomada/` (établissement fictif, photos Unsplash hébergées chez eux),
en ligne sur https://webatir.com/maquettes/demo-casa-nomada/. À montrer aux prospects qui veulent
« un site qui bouge », à côté de la version sobre.

## Régénérer

Après toute modification d'un `site.json` ou du gabarit :

```bash
node _templates/build.mjs
```

(sans argument : toutes les maquettes). Commiter les `index.html` régénérés.

## Archiver une maquette perdue

Après **30 jours sans réponse** du prospect, sortir le dossier de la publication :

```bash
git mv maquettes/<slug> _archive/<slug>
node _templates/build.mjs
```

Le dossier reste dans le dépôt (réutilisable si le prospect revient) mais n'est plus servi.
Garder le dépôt sous 1 Go : supprimer les photos des archives de plus d'un an.

## Quand le prospect signe

Le dossier de la maquette devient le vrai site :

1. Dans `site.json`, passer `"publie": true` et renseigner `"url"` avec le domaine définitif
   (ex. `https://linedit-restaurant.fr/`). Le build retire alors le `noindex`, ajoute le `canonical`
   et active le bloc JSON-LD `Restaurant` (horaires, adresse, note Google) pour le référencement local.
2. Relire et compléter les données avec le client (horaires confirmés, carte à jour, vraies photos).
3. Déployer sur un **projet à part** avec son propre domaine : créer un dépôt `<slug>` contenant
   `index.html`, `styles.css`, `script.js`, `photos/` et `site.json`, activer GitHub Pages dessus,
   ajouter le `CNAME` et pointer le DNS du client. Le script de build peut y être copié tel quel
   (`_templates/` + `site.json`) pour les mises à jour futures.
4. Retirer le dossier de `maquettes/` (il n'a plus rien à faire sous webatir.com) et déclarer le
   nouveau site dans la Google Business Profile du client.
