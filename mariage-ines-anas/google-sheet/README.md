# Tableau de suivi des réponses (Google Sheets)

Les réponses du faire-part `mariage-ines-anas/` partent vers un petit script Google
(Apps Script) qui les range dans un Google Sheet et met à jour un récapitulatif
pour le restaurant. Tout est gratuit et tourne sur votre compte Google.

## Mise en place (5 minutes, une seule fois)

1. **Créer le tableau** : sur [sheets.new](https://sheets.new), créez un tableau vide et
   nommez-le par exemple « Mariage Ines & Anas — réponses ».
2. **Ouvrir l'éditeur de script** : menu *Extensions → Apps Script*.
3. **Coller le code** : supprimez le contenu de `Code.gs` dans l'éditeur, collez le contenu
   du fichier [`Code.gs`](Code.gs) de ce dossier, puis enregistrez (icône disquette).
   - Un e-mail est envoyé à chaque réponse au compte Google propriétaire du tableau. Pour
     l'envoyer ailleurs, mettez l'adresse dans `NOTIFY_EMAIL`, par exemple
     `var NOTIFY_EMAIL = 'vous@gmail.com';` (ou `''` pour ne rien envoyer).
4. **Créer les onglets** : dans la liste déroulante des fonctions (en haut), choisissez
   `configurer` puis cliquez sur *Exécuter*. Google demande une autorisation : acceptez
   (« Autoriser », puis si un écran « Google n'a pas validé cette application » apparaît :
   *Paramètres avancés → Accéder à … (non sécurisé)*). C'est votre propre script, il ne
   sort pas de votre compte. Les onglets *Récapitulatif*, *Réponses* et *Convives* apparaissent.
5. **Publier le script** : bouton bleu *Déployer → Nouveau déploiement*, puis :
   - type : **Application web** (icône engrenage à gauche pour le choisir) ;
   - *Exécuter en tant que* : **Moi** ;
   - *Qui a accès* : **Tout le monde** (indispensable, sinon les invités ne peuvent pas envoyer) ;
   - *Déployer*, puis copiez l'**URL de l'application web** (elle finit par `/exec`).
6. **Brancher le faire-part** : dans `mariage-ines-anas/script.js`, remplacez la valeur de
   `RSVP_URL` par cette URL, puis mettez le site en ligne.
7. **Tester** : ouvrez le faire-part, envoyez une réponse d'essai. Elle apparaît dans
   *Réponses* et *Convives*, et le *Récapitulatif* se met à jour. Supprimez ensuite les
   lignes d'essai dans *Réponses* et *Convives* (le récapitulatif suit tout seul).

## Ce que contient le tableau

| Onglet | Contenu |
|---|---|
| Récapitulatif | Totaux pour le restaurant : présents, absents, convives, nombre de chaque entrée / plat / dessert, suppléments, allergies |
| Réponses | Une ligne par foyer : date, nom, présence, nombre de personnes, téléphone, message, résumé des menus, total des suppléments |
| Convives | Une ligne par personne : entrée, garniture de la salade, plat, dessert, supplément, allergies |

Si quelqu'un répond une deuxième fois avec le même nom, son ancienne réponse est remplacée.

## Outils dans l'éditeur de script

- `reconstruireRecap` : refait l'onglet *Récapitulatif* (après un changement de carte, par exemple).
- `supprimerReponse` : retire une réponse à la main (un essai, un doublon). Mettez le nom dans
  `NOM_A_SUPPRIMER`, enregistrez, puis *Exécuter*.

Les trois pages (`mariage-ines-anas/`, `mariage-ines-anas/menu/` et `mariage-ines-anas/henne/`)
envoient leurs réponses au même script : une seule `RSVP_URL`, un seul tableau. Les réponses à la
soirée henné arrivent dans l'onglet *Henné* (nom, présence, nombre de personnes, téléphone,
message) et dans le récapitulatif ; `supprimerReponseHenne` en retire une à la main.

## Modifier le script plus tard

Après un changement dans `Code.gs`, il faut republier : *Déployer → Gérer les déploiements →
crayon (modifier) → Version : Nouvelle version → Déployer*. L'URL reste la même.

Si vous modifiez la carte (nouveau plat, nouveau prix), changez-la aux deux endroits :
`MENU` dans `script.js` et les listes `ENTREES`, `PLATS`, `DESSERTS`, `SUPPLEMENTS` dans
`Code.gs` (puis republiez, et ajoutez la ligne correspondante dans le récapitulatif).
