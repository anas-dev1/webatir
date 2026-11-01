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
