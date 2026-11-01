// Fonctions partagées par les scripts de maquettes (aucune dépendance).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const lireJson = (chemin) => JSON.parse(readFileSync(chemin, 'utf8'));

export function ecrire(chemin, contenu) {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, contenu, 'utf8');
}

export const existe = (chemin) => existsSync(chemin);
export const taille = (chemin) => statSync(chemin).size;

/** `ville-nom` : minuscules, sans accents, tirets simples. */
export function slugifier(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const slugValide = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);

/** Téléphone affiché "06 26 07 69 40" -> "+33626076940" pour les liens tel:/wa.me. */
export function telInternational(tel, indicatif = '+33') {
  const chiffres = String(tel).replace(/[^\d+]/g, '');
  if (chiffres.startsWith('+')) return chiffres;
  if (chiffres.startsWith('00')) return '+' + chiffres.slice(2);
  if (chiffres.startsWith('0')) return indicatif + chiffres.slice(1);
  return indicatif + chiffres;
}

/** 40.9 -> "40,90 €" ; "40,90" -> "40,90 €" ; "sur devis" -> "sur devis". */
export function prix(p) {
  if (p === null || p === undefined || p === '') return '';
  if (typeof p === 'number') return p.toFixed(2).replace('.', ',') + ' €';
  const s = String(p).trim();
  if (/€/.test(s) || !/^\d/.test(s)) return s;
  return s.replace('.', ',') + ' €';
}

// --- couleurs -------------------------------------------------------------
const hexVersRgb = (h) => {
  let x = h.replace('#', '');
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  const n = parseInt(x, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbVersHex = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Mélange a -> b, t entre 0 et 1. */
export function melanger(a, b, t) {
  const A = hexVersRgb(a), B = hexVersRgb(b);
  return rgbVersHex(A.map((v, i) => v + (B[i] - v) * t));
}
export function luminance(h) {
  const [r, g, b] = hexVersRgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const estClair = (h) => luminance(h) > 0.4;
