/**
 * Mariage Ines & Anas — réception des réponses du faire-part dans Google Sheets.
 *
 * À coller dans l'éditeur Apps Script lié au tableau (Extensions → Apps Script),
 * puis à publier en « Application web » (voir README.md à côté de ce fichier).
 *
 * Trois onglets sont créés et tenus à jour automatiquement :
 *  - Réponses       : une ligne par foyer qui répond (présence, nombre, téléphone, message, résumé des menus)
 *  - Convives       : une ligne par personne, avec son entrée, son plat, son dessert, ses allergies et son supplément
 *  - Récapitulatif  : les totaux pour le restaurant (présents, absents, nombre de chaque plat, suppléments, allergies)
 *
 * Si la même personne répond deux fois, son ancienne réponse est remplacée.
 */

// E-mail qui reçoit une notification à chaque réponse. Laisser vide ('') pour ne rien envoyer.
var NOTIFY_EMAIL = Session.getEffectiveUser().getEmail(); // le compte Google propriétaire du tableau
// Identifiant attendu dans les envois (doit correspondre à data.set('site', …) dans script.js)
var SITE = 'ines-anas';
// La soirée henné (page mariage-ines-anas/henne/) envoie ses réponses avec cet identifiant
var SITE_HENNE = 'henne';

var SHEET_REPONSES = 'Réponses';
var SHEET_CONVIVES = 'Convives';
var SHEET_RECAP = 'Récapitulatif';
var SHEET_HENNE = 'Henné';

// La carte, pour recalculer les suppléments côté tableau (on ne fait pas confiance au navigateur)
var SUPPLEMENTS = {
  'Millefeuille de saumon': 5,
  'Noix de Saint-Jacques': 5,
  "Confit d'agneau": 5,
};
var ENTREES = ['Salade de saison', 'Millefeuille de saumon', 'Noix de Saint-Jacques'];
var PLATS = ["Confit d'agneau", 'Pavé de saumon', 'Médaillon de volaille farci'];
var DESSERTS = ['Entremet fruits rouges', 'Entremet chocolat'];

/** À lancer une fois à la main depuis l'éditeur : crée les onglets et les formules du récapitulatif. */
function configurer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);
  try { SpreadsheetApp.getUi().alert('Les onglets « Réponses », « Convives » et « Récapitulatif » sont prêts.'); } catch (err) { Logger.log('Onglets prêts.'); }
}

/** Reconstruit l'onglet Récapitulatif (par ex. après un changement de carte) : Exécuter depuis l'éditeur. */
function reconstruireRecap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var recap = ss.getSheetByName(SHEET_RECAP);
  if (recap) ss.deleteSheet(recap);
  ensureSheets_(ss);
}

/** Pour retirer une réponse à la main (un essai, un doublon) : mettre le nom ci-dessous, puis Exécuter. */
var NOM_A_SUPPRIMER = '';
function supprimerReponse() {
  if (!NOM_A_SUPPRIMER) throw new Error('Renseignez NOM_A_SUPPRIMER en haut de cette fonction.');
  supprimerAnciennesReponses_(SpreadsheetApp.getActiveSpreadsheet(), NOM_A_SUPPRIMER);
}

/** Même chose pour une réponse à la soirée henné. */
function supprimerReponseHenne() {
  if (!NOM_A_SUPPRIMER) throw new Error('Renseignez NOM_A_SUPPRIMER en haut de cette fonction.');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HENNE);
  if (sheet) supprimerLignesParNom_(sheet, NOM_A_SUPPRIMER);
}

/** Permet de vérifier dans le navigateur que le script est bien publié. */
function doGet() {
  return json_({ ok: true, site: SITE });
}

/** Reçoit une réponse envoyée par le formulaire du faire-part. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var p = (e && e.parameter) || {};
    if (p.website) return json_({ ok: true }); // robot : on fait semblant d'accepter
    if (p.site === SITE_HENNE) return enregistrerHenne_(p);
    if (p.site !== SITE) return json_({ ok: false, erreur: 'site inconnu' });
    var nom = String(p.nom || '').trim();
    if (!nom || !p.presence) return json_({ ok: false, erreur: 'nom ou présence manquant' });

    var vient = /^oui/i.test(String(p.presence));
    var convives = [];
    if (vient) {
      try { convives = JSON.parse(p.convives || '[]'); } catch (err) { convives = null; }
      if (!Array.isArray(convives) || !convives.length) return json_({ ok: false, erreur: 'menus des convives illisibles' });
      convives = convives.map(function (c, i) { return normaliserConvive_(c, i); });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets_(ss);
    supprimerAnciennesReponses_(ss, nom);

    var now = new Date();
    var totalSupp = convives.reduce(function (s, c) { return s + c.supplement; }, 0);
    var resume = convives.map(function (c) { return c.prenom + ' : ' + decrireMenu_(c); }).join('\n');

    ss.getSheetByName(SHEET_REPONSES).appendRow([
      now, nom, vient ? 'Oui' : 'Non', vient ? convives.length : 0,
      String(p.telephone || '').trim(), String(p.message || '').trim(), resume, totalSupp,
    ]);
    var cv = ss.getSheetByName(SHEET_CONVIVES);
    convives.forEach(function (c) {
      cv.appendRow([now, nom, c.prenom, c.entree, c.garniture, c.plat, c.dessert, c.supplement, c.allergies]);
    });

    notifier_(nom, vient, convives, p);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erreur: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Réponse à la soirée henné : une ligne par personne qui répond, dans l'onglet Henné. */
function enregistrerHenne_(p) {
  var nom = String(p.nom || '').trim();
  if (!nom || !p.presence) return json_({ ok: false, erreur: 'nom ou présence manquant' });
  var vient = /^oui/i.test(String(p.presence));
  var nb = vient ? Math.max(1, Math.min(20, parseInt(p.personnes, 10) || 1)) : 0;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);
  var sheet = ss.getSheetByName(SHEET_HENNE);
  supprimerLignesParNom_(sheet, nom);
  sheet.appendRow([new Date(), nom, vient ? 'Oui' : 'Non', nb, String(p.telephone || '').trim(), String(p.message || '').trim()]);
  if (NOTIFY_EMAIL) {
    MailApp.sendEmail(NOTIFY_EMAIL, 'Soirée henné — réponse de ' + nom + ' (' + (vient ? 'Oui' : 'Non') + ')', [
      'Nom : ' + nom,
      'Présence : ' + (vient ? 'Oui' : 'Non'),
      'Nombre de personnes : ' + nb,
      'Téléphone : ' + (p.telephone || '—'),
      'Message : ' + (p.message || '—'),
      '', 'Tableau : ' + ss.getUrl(),
    ].join('\n'));
  }
  return json_({ ok: true });
}

// ---------- Outils ----------

function normaliserConvive_(c, i) {
  c = c || {};
  var entree = ENTREES.indexOf(c.entree) >= 0 ? c.entree : '';
  var plat = PLATS.indexOf(c.plat) >= 0 ? c.plat : '';
  var dessert = DESSERTS.indexOf(c.dessert) >= 0 ? c.dessert : '';
  var garniture = entree === 'Salade de saison' ? String(c.garniture || '').trim() : '';
  return {
    prenom: String(c.prenom || '').trim() || ('Convive ' + (i + 1)),
    entree: entree,
    garniture: garniture,
    plat: plat,
    dessert: dessert,
    allergies: String(c.allergies || '').trim(),
    supplement: (SUPPLEMENTS[entree] || 0) + (SUPPLEMENTS[plat] || 0),
  };
}

function decrireMenu_(c) {
  var entree = c.entree + (c.garniture ? ' (' + c.garniture.toLowerCase() + ')' : '');
  var txt = [entree, c.plat, c.dessert].join(' / ');
  if (c.supplement) txt += ' (+' + c.supplement + ' €)';
  if (c.allergies) txt += ' — ' + c.allergies;
  return txt;
}

/** Une personne qui répond une deuxième fois remplace sa réponse précédente (même nom, sans tenir compte de la casse). */
function supprimerAnciennesReponses_(ss, nom) {
  [SHEET_REPONSES, SHEET_CONVIVES].forEach(function (name) {
    supprimerLignesParNom_(ss.getSheetByName(name), nom);
  });
}

/** Supprime toutes les lignes d'un onglet dont la colonne B (nom) correspond, sans tenir compte de la casse. */
function supprimerLignesParNom_(sheet, nom) {
  var cible = String(nom).trim().toLowerCase();
  var last = sheet.getLastRow();
  if (last < 2) return;
  var noms = sheet.getRange(2, 2, last - 1, 1).getValues();
  for (var r = noms.length - 1; r >= 0; r -= 1) {
    if (String(noms[r][0]).trim().toLowerCase() === cible) sheet.deleteRow(r + 2);
  }
}

function notifier_(nom, vient, convives, p) {
  if (!NOTIFY_EMAIL) return;
  var lignes = [
    'Nom : ' + nom,
    'Présence : ' + (vient ? 'Oui' : 'Non'),
    'Nombre de personnes : ' + (vient ? convives.length : 0),
    'Téléphone : ' + (p.telephone || '—'),
    'Message : ' + (p.message || '—'),
    '',
  ].concat(convives.map(function (c) { return '• ' + c.prenom + ' : ' + decrireMenu_(c); }));
  lignes.push('', 'Tableau : ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  MailApp.sendEmail(NOTIFY_EMAIL, 'Mariage — réponse de ' + nom + ' (' + (vient ? 'Oui' : 'Non') + ')', lignes.join('\n'));
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Crée les onglets s'ils n'existent pas, avec les en-têtes et les formules du récapitulatif. */
function ensureSheets_(ss) {
  var rep = ss.getSheetByName(SHEET_REPONSES);
  if (!rep) {
    rep = ss.insertSheet(SHEET_REPONSES);
    entete_(rep, ['Date', 'Nom', 'Présence', 'Nb personnes', 'Téléphone', 'Message', 'Menus', 'Suppléments (€)']);
    rep.setColumnWidths(1, 1, 150); rep.setColumnWidth(2, 200); rep.setColumnWidth(6, 260); rep.setColumnWidth(7, 420);
    rep.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
    rep.getRange('G:G').setWrap(true);
  }
  var cv = ss.getSheetByName(SHEET_CONVIVES);
  if (!cv) {
    cv = ss.insertSheet(SHEET_CONVIVES);
    entete_(cv, ['Date', 'Répondant', 'Convive', 'Entrée', 'Garniture salade', 'Plat', 'Dessert', 'Supplément (€)', 'Allergies / régime']);
    cv.setColumnWidth(1, 150); cv.setColumnWidth(2, 200); cv.setColumnWidth(3, 200); cv.setColumnWidth(4, 220); cv.setColumnWidth(6, 220); cv.setColumnWidth(7, 200); cv.setColumnWidth(9, 260);
    cv.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
  }
  var henne = ss.getSheetByName(SHEET_HENNE);
  if (!henne) {
    henne = ss.insertSheet(SHEET_HENNE);
    entete_(henne, ['Date', 'Nom', 'Présence', 'Nb personnes', 'Téléphone', 'Message']);
    henne.setColumnWidth(1, 150); henne.setColumnWidth(2, 220); henne.setColumnWidth(6, 360);
    henne.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
  }
  var recap = ss.getSheetByName(SHEET_RECAP);
  if (!recap) {
    recap = ss.insertSheet(SHEET_RECAP, 0);
    construireRecap_(recap);
  }
  // Supprime la « Feuille 1 » vide créée par défaut
  var defaut = ss.getSheetByName('Feuille 1') || ss.getSheetByName('Sheet1');
  if (defaut && ss.getSheets().length > 4 && defaut.getLastRow() === 0) ss.deleteSheet(defaut);
}

/** Renvoie le séparateur d'arguments accepté par ce tableau : ',' (anglais) ou ';' (français, etc.). */
function separateurFormule_(sheet) {
  var cell = sheet.getRange('Z1');
  cell.setFormula('=IF(1,1,1)');
  SpreadsheetApp.flush();
  var ok = cell.getValue() === 1;
  cell.clearContent();
  return ok ? ',' : ';';
}

function entete_(sheet, titres) {
  sheet.getRange(1, 1, 1, titres.length).setValues([titres])
    .setFontWeight('bold').setBackground('#14122e').setFontColor('#e0c283');
  sheet.setFrozenRows(1);
}

function construireRecap_(sheet) {
  var R = "'" + SHEET_REPONSES + "'!";
  var C = "'" + SHEET_CONVIVES + "'!";
  var H = "'" + SHEET_HENNE + "'!";
  var lignes = [];
  var titre = function (t) { lignes.push([t, '', 'titre']); };
  var val = function (label, formule) { lignes.push([label, formule, '']); };
  var vide = function () { lignes.push(['', '', '']); };

  titre('Mariage Ines & Anas — récapitulatif pour le restaurant');
  val('Dernière réponse reçue', '=IF(COUNTA(' + R + 'A2:A)=0,"—",TEXT(MAX(' + R + 'A2:A),"dd/mm/yyyy hh:mm"))');
  vide();
  titre('Présence');
  val('Foyers ayant répondu', '=COUNTA(' + R + 'B2:B)');
  val('Réponses « Oui »', '=COUNTIF(' + R + 'C2:C,"Oui")');
  val('Réponses « Non »', '=COUNTIF(' + R + 'C2:C,"Non")');
  val('Nombre total de convives', '=SUM(' + R + 'D2:D)');
  vide();
  titre('Entrées');
  val('Salade de saison — poulet', '=COUNTIFS(' + C + 'D2:D,"Salade de saison",' + C + 'E2:E,"Poulet")');
  val('Salade de saison — saumon fumé', '=COUNTIFS(' + C + 'D2:D,"Salade de saison",' + C + 'E2:E,"Saumon fumé")');
  val('Millefeuille de saumon (supp. +5 €)', '=COUNTIF(' + C + 'D2:D,"Millefeuille de saumon")');
  val('Noix de Saint-Jacques (supp. +5 €)', '=COUNTIF(' + C + 'D2:D,"Noix de Saint-Jacques")');
  vide();
  titre('Plats');
  val("Confit d'agneau (supp. +5 €)", '=COUNTIF(' + C + 'F2:F,"Confit d\'agneau")');
  val('Pavé de saumon', '=COUNTIF(' + C + 'F2:F,"Pavé de saumon")');
  val('Médaillon de volaille farci', '=COUNTIF(' + C + 'F2:F,"Médaillon de volaille farci")');
  vide();
  titre('Desserts');
  val('Entremet fruits rouges', '=COUNTIF(' + C + 'G2:G,"Entremet fruits rouges")');
  val('Entremet chocolat', '=COUNTIF(' + C + 'G2:G,"Entremet chocolat")');
  vide();
  titre('Suppléments');
  val('Convives avec supplément', '=COUNTIF(' + C + 'H2:H,">0")');
  val('Total des suppléments (€)', '=SUM(' + C + 'H2:H)');
  vide();
  titre('Allergies et régimes particuliers');
  val('', '=IFERROR(TEXTJOIN(CHAR(10),TRUE,FILTER(' + C + 'C2:C&" ("&' + C + 'B2:B&") : "&' + C + 'I2:I,' + C + 'I2:I<>"")),"Aucune pour le moment")');
  vide();
  titre('Soirée henné (vendredi 18 décembre)');
  val('Réponses « Oui »', '=COUNTIF(' + H + 'C2:C,"Oui")');
  val('Réponses « Non »', '=COUNTIF(' + H + 'C2:C,"Non")');
  val('Nombre de femmes attendues', '=SUM(' + H + 'D2:D)');

  // Les formules ci-dessus sont écrites avec des virgules ; un tableau en français attend des
  // points-virgules. On teste le tableau pour savoir lequel il accepte.
  var sep = separateurFormule_(sheet);
  var values = lignes.map(function (l) { return [l[0]]; });
  sheet.getRange(1, 1, values.length, 1).setValues(values);
  sheet.getRange(1, 2, lignes.length, 1).setFormulas(lignes.map(function (l) { return [(l[1] || '').replace(/,/g, sep)]; }));
  lignes.forEach(function (l, i) {
    var row = i + 1;
    if (l[2] === 'titre') {
      sheet.getRange(row, 1, 1, 2).setFontWeight('bold').setBackground('#14122e').setFontColor('#e0c283');
    }
  });
  sheet.getRange(1, 1).setFontSize(13);
  sheet.setColumnWidth(1, 330);
  sheet.setColumnWidth(2, 420);
  sheet.getRange('B:B').setWrap(true).setHorizontalAlignment('left');
  sheet.getRange(2, 2, values.length - 1, 1).setFontWeight('bold');
}
