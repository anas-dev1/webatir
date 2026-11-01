#!/usr/bin/env node
// Régénère maquettes/*/index.html (+ styles.css, script.js) à partir de chaque site.json.
//   node _templates/build.mjs            -> toutes les maquettes
//   node _templates/build.mjs <slug>     -> une seule
// Sans dépendance. Le HTML est rendu ici et commité : rien n'est chargé côté client.
import { readdirSync, existsSync, statSync, readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lireJson, ecrire } from './lib.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..');
const DOSSIER_MAQUETTES = join(RACINE, 'maquettes');
const URL_BASE = 'https://webatir.com/maquettes/';
const TAILLE_PHOTO_MAX = 200 * 1024;

const seulement = process.argv[2];
const slugs = readdirSync(DOSSIER_MAQUETTES)
  .filter((d) => existsSync(join(DOSSIER_MAQUETTES, d, 'site.json')))
  .filter((d) => !seulement || d === seulement);

if (!slugs.length) {
  console.error(seulement ? `Aucune maquette « ${seulement} » (pas de maquettes/${seulement}/site.json).` : 'Aucune maquette à générer.');
  process.exit(1);
}

let erreurs = 0;
for (const slug of slugs) {
  const dossier = join(DOSSIER_MAQUETTES, slug);
  const site = lireJson(join(dossier, 'site.json'));
  const niche = site.niche || 'restaurant';
  const dossierGabarit = join(ICI, niche);
  if (!existsSync(join(dossierGabarit, 'render.mjs'))) {
    console.error(`✗ ${slug} : gabarit « ${niche} » introuvable (${dossierGabarit}).`);
    erreurs++;
    continue;
  }
  const manquants = ['nom', 'telephone', 'adresse', 'maps'].filter((k) => !site[k]);
  if (manquants.length) {
    console.error(`✗ ${slug} : champs manquants dans site.json : ${manquants.join(', ')}.`);
    erreurs++;
    continue;
  }

  const { render } = await import(pathToFileURL(join(dossierGabarit, 'render.mjs')).href);
  const html = render(site, { slug, url: site.url || URL_BASE + slug + '/' });
  ecrire(join(dossier, 'index.html'), html);

  // Fichiers statiques du gabarit copiés tels quels à côté de l'index.
  const assets = join(dossierGabarit, 'assets');
  if (existsSync(assets)) {
    for (const f of readdirSync(assets)) copyFileSync(join(assets, f), join(dossier, f));
  }

  // Avertissements utiles : photos manquantes ou trop lourdes.
  const refs = [...html.matchAll(/(?:src|href)="(photos\/[^"]+)"/g)].map((m) => m[1]);
  for (const ref of new Set(refs)) {
    const chemin = join(dossier, decodeURIComponent(ref));
    if (!existsSync(chemin)) console.warn(`  ! ${slug} : photo introuvable ${ref}`);
    else if (statSync(chemin).size > TAILLE_PHOTO_MAX) console.warn(`  ! ${slug} : ${ref} fait ${Math.round(statSync(chemin).size / 1024)} Ko (> 200 Ko), à compresser`);
  }
  const noindex = /name="robots" content="noindex/.test(html);
  console.log(`✓ ${slug} → maquettes/${slug}/index.html${site.publie ? ' (PUBLIÉ : sans noindex, JSON-LD actif)' : noindex ? ' (maquette, noindex)' : ''}`);
}

if (erreurs) process.exit(1);
