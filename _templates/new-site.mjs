#!/usr/bin/env node
// Crée le squelette d'une nouvelle maquette :
//   node _templates/new-site.mjs <ville-nom> --niche restaurant
// -> maquettes/<slug>/site.json (exemple à remplir) et maquettes/<slug>/photos/
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugValide, slugifier } from './lib.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..');

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('--'));
const iNiche = args.indexOf('--niche');
const niche = iNiche >= 0 ? args[iNiche + 1] : 'restaurant';

if (!slug) {
  console.error('Usage : node _templates/new-site.mjs <ville-nom> [--niche restaurant]\nExemple : node _templates/new-site.mjs begles-linedit --niche restaurant');
  process.exit(1);
}
if (!slugValide(slug)) {
  console.error(`Slug invalide « ${slug} » : minuscules, chiffres et tirets uniquement, sans accents. Suggestion : ${slugifier(slug)}`);
  process.exit(1);
}
const exemple = join(ICI, niche, 'exemple.site.json');
if (!existsSync(exemple)) {
  console.error(`Niche « ${niche} » inconnue : pas de _templates/${niche}/exemple.site.json.`);
  process.exit(1);
}
const dossier = join(RACINE, 'maquettes', slug);
if (existsSync(join(dossier, 'site.json'))) {
  console.error(`maquettes/${slug}/site.json existe déjà, rien n'a été écrasé.`);
  process.exit(1);
}

mkdirSync(join(dossier, 'photos'), { recursive: true });
const contenu = JSON.parse(readFileSync(exemple, 'utf8'));
contenu.slug = slug;
contenu.niche = niche;
writeFileSync(join(dossier, 'site.json'), JSON.stringify(contenu, null, 2) + '\n', 'utf8');
writeFileSync(join(dossier, 'photos', '.gitkeep'), '', 'utf8');

console.log(`✓ maquettes/${slug}/site.json créé (niche ${niche}).
Étapes suivantes :
  1. Remplir maquettes/${slug}/site.json (nom, horaires, carte, couleurs…).
  2. Déposer les photos compressées (≤ 200 Ko) dans maquettes/${slug}/photos/.
  3. node _templates/build.mjs ${slug}
  4. Ouvrir maquettes/${slug}/index.html, puis commit + push → https://webatir.com/maquettes/${slug}/`);
