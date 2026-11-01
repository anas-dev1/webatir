// Gabarit « restaurant » : transforme un site.json en HTML statique.
// Rendu au build, aucun fetch côté client. Les photos sont référencées telles
// quelles (chemins relatifs au dossier de la maquette, ex. photos/salle.jpg).
//
// Pages produites :
//   index.html         accueil (tout le site en une page)
//   carte/index.html   la carte complète, seulement si "carte_page": true ;
//                      l'accueil n'affiche alors qu'un aperçu (formules,
//                      catégories "apercu": true, plats "vedette": true).
import { esc, prix, telInternational, melanger, estClair } from '../lib.mjs';

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_EN = { lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' };
const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** "19:30" -> "19h30", "00:00" -> "minuit", "12:00" -> "12h". */
export function heure(h) {
  if (!h) return '';
  const [H, M] = h.split(':');
  if (H === '00' && M === '00') return 'minuit';
  return M === '00' ? `${parseInt(H, 10)}h` : `${parseInt(H, 10)}h${M}`;
}

const photo = (p, defaut = '') => (typeof p === 'string' ? { src: p, alt: defaut } : { alt: defaut, ...p });

function lienReservation(site) {
  const r = site.reservation || {};
  if (r.type === 'url' && r.valeur) return { href: r.valeur, externe: true };
  const tel = r.valeur || site.telephone;
  return { href: `tel:${telInternational(tel)}`, externe: false };
}

function lienWhatsapp(site) {
  if (!site.whatsapp) return null;
  const num = telInternational(site.whatsapp).replace('+', '');
  const txt = encodeURIComponent(`Bonjour ${site.nom_court || site.nom}, je souhaite réserver une table.`);
  return `https://wa.me/${num}?text=${txt}`;
}

function adresseTexte(a) {
  if (!a) return '';
  if (typeof a === 'string') return a;
  return [a.rue, [a.code_postal, a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

// ---------------------------------------------------------------------------
// Thème : variables CSS dérivées des trois couleurs du JSON.
export function theme(site) {
  const c = site.style?.couleurs || {};
  const principale = c.principale || '#1b1b1b';
  const fond = c.fond || '#ffffff';
  const accent = c.accent || '#b9974e';
  const clair = site.style?.ambiance ? site.style.ambiance !== 'sombre' : estClair(fond);
  const texteSurAccent = estClair(accent) ? '#111111' : '#ffffff';
  const polices = site.style?.polices || {};
  const titres = polices.titres || 'Playfair Display';
  const texte = polices.texte || 'Lato';
  const css = [
    ':root{',
    `  --principale:${principale};`,
    `  --fond:${fond};`,
    `  --accent:${accent};`,
    `  --accent-fonce:${melanger(accent, '#000000', clair ? 0.35 : 0)};`,
    `  --accent-clair:${melanger(accent, fond, 0.82)};`,
    `  --texte:${principale};`,
    `  --texte-doux:${melanger(principale, fond, 0.38)};`,
    `  --surface:${melanger(fond, principale, clair ? 0.035 : 0.06)};`,
    `  --surface-2:${melanger(fond, principale, clair ? 0.07 : 0.11)};`,
    `  --bordure:${melanger(fond, principale, 0.14)};`,
    `  --sur-accent:${texteSurAccent};`,
    `  --police-titres:'${titres}', Georgia, serif;`,
    `  --police-texte:'${texte}', system-ui, sans-serif;`,
    '}',
  ].join('\n');
  return { clair, titres, texte, css };
}

function lienPolices(t) {
  const fam = (n, poids) => `family=${encodeURIComponent(n).replace(/%20/g, '+')}:wght@${poids}`;
  return `https://fonts.googleapis.com/css2?${fam(t.titres, '400;700')}&${fam(t.texte, '400;700')}&display=swap`;
}

// ---------------------------------------------------------------------------
// JSON-LD Restaurant (activé seulement quand le site est publié pour de vrai).
export function jsonLd(site, ctx) {
  const a = typeof site.adresse === 'object' ? site.adresse : {};
  const spec = [];
  for (const j of JOURS) {
    for (const r of site.horaires?.jours?.[j] || []) {
      spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: JOURS_EN[j], opens: r.de, closes: r.a });
    }
  }
  const base = site.url || ctx.url || 'https://exemple.fr/';
  const racine = base.endsWith('/') ? base : base + '/';
  const d = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: site.nom,
    description: site.description || site.slogan,
    url: site.url || ctx.url,
    telephone: telInternational(site.telephone),
    image: site.photos?.hero ? new URL(photo(site.photos.hero).src, racine).href : undefined,
    hasMenu: site.carte_page ? new URL('carte/', racine).href : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.rue,
      postalCode: a.code_postal,
      addressLocality: a.ville,
      addressCountry: 'FR',
    },
    hasMap: site.maps,
    servesCuisine: site.cuisine,
    acceptsReservations: true,
    openingHoursSpecification: spec,
    sameAs: Object.values(site.reseaux || {}).filter((u) => /^https?:/.test(u)),
  };
  if (site.avis?.note && site.avis?.nombre) {
    d.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(site.avis.note).replace(',', '.'),
      reviewCount: site.avis.nombre,
    };
  }
  return JSON.stringify(d, (k, v) => (v === undefined || v === '' || (Array.isArray(v) && !v.length) ? undefined : v), 2);
}

// ---------------------------------------------------------------------------
function rendreHoraires(site) {
  const h = site.horaires || {};
  const lignes = JOURS.map((j) => {
    const plages = h.jours?.[j] || [];
    const txt = plages.length
      ? plages.map((r) => `${heure(r.de)} – ${heure(r.a)}${r.note ? ` <small>(${esc(r.note)})</small>` : ''}`).join('<br>')
      : '<span class="ferme">Fermé</span>';
    return `<tr data-jour="${j}"><th scope="row">${CAP(j)}</th><td>${txt}</td></tr>`;
  }).join('\n');
  return `<table class="horaires">${lignes}</table>
${h.a_confirmer ? '<p class="horaires__note horaires__note--attention">Horaires indicatifs, à confirmer par téléphone.</p>' : ''}
${h.note ? `<p class="horaires__note">${esc(h.note)}</p>` : ''}`;
}

function rendreFormule(f) {
  return `<article class="formule">
    <div class="formule__tete"><h4 class="formule__nom">${esc(f.nom)}</h4><span class="formule__prix">${esc(prix(f.prix))}</span></div>
    ${f.description ? `<p class="formule__desc">${esc(f.description)}</p>` : ''}
    ${f.details?.length ? `<ul class="formule__details">${f.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    ${f.note ? `<p class="formule__note">${esc(f.note)}</p>` : ''}
  </article>`;
}

function rendrePlat(p) {
  const aPrix = p.prix !== undefined && p.prix !== null && p.prix !== '';
  return `<li class="plat">
      <div class="plat__texte"><span class="plat__nom">${esc(p.nom)}${p.tag ? ` <span class="plat__tag">${esc(p.tag)}</span>` : ''}</span>${p.description ? `<span class="plat__desc">${esc(p.description)}</span>` : ''}</div>
      ${aPrix ? `<span class="plat__prix">${esc(prix(p.prix))}</span>` : ''}
    </li>`;
}

function rendreCategorie(c) {
  return `<div class="categorie" id="cat-${esc(c.id)}">
  <h3 class="categorie__titre">${esc(c.titre)}${c.prix_unique ? ` <span class="categorie__prix">${esc(prix(c.prix_unique))}</span>` : ''}</h3>
  ${c.intro ? `<p class="categorie__intro">${esc(c.intro)}</p>` : ''}
  <ul class="plats${c.compact ? ' plats--compact' : ''}">${(c.items || []).map(rendrePlat).join('\n')}</ul>
  ${c.note ? `<p class="categorie__note">${esc(c.note)}</p>` : ''}
</div>`;
}

function rendreFormules(site) {
  const formules = site.formules || [];
  if (!formules.length) return '';
  return `<div class="categorie categorie--formules" id="cat-formules">
  <h3 class="categorie__titre">${esc(site.formules_titre || 'Formules')}</h3>
  <div class="formules">${formules.map(rendreFormule).join('\n')}</div>
</div>`;
}

/** Carte complète : onglets + formules + toutes les catégories. */
function rendreMenuComplet(site) {
  const cats = site.menu || [];
  const onglets = [
    ...(site.formules?.length ? [{ id: 'formules', titre: site.formules_titre || 'Formules' }] : []),
    ...cats.map((c) => ({ id: c.id, titre: c.titre })),
  ];
  const nav = onglets.length > 1
    ? `<nav class="onglets" aria-label="Catégories de la carte"><div class="onglets__piste">${onglets
        .map((o) => `<a class="onglet" href="#cat-${esc(o.id)}">${esc(o.titre)}</a>`)
        .join('')}</div></nav>`
    : '';
  return `${nav}\n${rendreFormules(site)}\n${cats.map(rendreCategorie).join('\n')}`;
}

/** Aperçu sur l'accueil quand la carte a sa propre page. */
function rendreMenuApercu(site) {
  const cats = site.menu || [];
  const enEntier = cats.filter((c) => c.apercu);
  const vedettes = cats.flatMap((c) => (c.items || []).filter((p) => p.vedette).map((p) => ({ ...p, categorie: c.titre })));
  const blocVedettes = vedettes.length
    ? rendreCategorie({ id: 'vedettes', titre: site.vedettes_titre || 'Les incontournables', items: vedettes.map((p) => ({ ...p, tag: p.tag || p.categorie })) })
    : '';
  return `${rendreFormules(site)}\n${enEntier.map(rendreCategorie).join('\n')}\n${blocVedettes}
<p class="carte__tout"><a class="btn btn--plein btn--grand" href="carte/">Voir toute la carte</a>${site.menu_pdf ? ` <a class="btn btn--fantome btn--grand" href="${esc(site.menu_pdf)}" target="_blank" rel="noopener">Carte en PDF</a>` : ''}</p>`;
}

function rendreGalerie(site) {
  const items = [
    ...(site.photos?.salle || []).map((p) => photo(p, `Salle de ${site.nom}`)),
    ...(site.photos?.plats || []).map((p) => photo(p, `Plat de ${site.nom}`)),
  ];
  if (!items.length) return '';
  return `<section class="galerie" id="galerie" aria-labelledby="galerie-titre">
  <div class="conteneur">
    <h2 class="section__titre" id="galerie-titre">${esc(site.galerie_titre || 'En images')}</h2>
    <div class="galerie__grille">${items
      .map(
        (p, i) => `<button class="galerie__item" type="button" data-index="${i}" aria-label="Agrandir : ${esc(p.alt)}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" width="800" height="800"></button>`
      )
      .join('')}</div>
  </div>
</section>`;
}

const ICONES = {
  tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  calendrier: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3z"/></svg>',
};

// ---------------------------------------------------------------------------
// Données communes aux pages.
function contexte(site, ctx) {
  const t = theme(site);
  const resa = lienReservation(site);
  return {
    t,
    anime: site.animations === true,
    // attributs de <html> : ambiance, animations, forme des photos
    attrsHtml: `data-ambiance="${t.clair ? 'clair' : 'sombre'}"${site.animations === true ? ' data-anime="1"' : ''}${site.style?.forme_photos === 'arche' ? ' data-forme="arche"' : ''}`,
    video: site.photos?.video ? photo(site.photos.video) : null,
    publie: site.publie === true,
    nomCourt: site.nom_court || site.nom,
    tel: telInternational(site.telephone),
    resa,
    resaAttr: resa.externe ? ' target="_blank" rel="noopener"' : '',
    wa: lienWhatsapp(site),
    adresse: adresseTexte(site.adresse),
    ville: typeof site.adresse === 'object' ? site.adresse.ville : site.ville,
    hero: site.photos?.hero ? photo(site.photos.hero, `Salle de ${site.nom}`) : null,
    description: site.description || site.slogan || '',
    url: site.url || ctx.url || '',
  };
}

/** <head> commun. `p` = préfixe relatif vers la racine de la maquette ('' ou '../'). */
function rendreHead(site, c, { titre, description, p, chemin, ld }) {
  const canon = c.url ? new URL(chemin, c.url.endsWith('/') ? c.url : c.url + '/').href : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
${c.publie ? (canon ? `<link rel="canonical" href="${esc(canon)}">` : '') : '<meta name="robots" content="noindex,nofollow">'}
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
${c.hero ? `<meta property="og:image" content="${esc(p + c.hero.src)}">` : ''}
<meta name="theme-color" content="${esc(site.style?.couleurs?.fond || '#ffffff')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(lienPolices(c.t))}">
<style>${c.t.css}</style>
<link rel="stylesheet" href="${p}styles.css">
${ld || ''}`;
}

function rendreEntete(site, c, { p, page }) {
  const accueil = page === 'accueil';
  const lienCarte = site.carte_page ? (accueil ? 'carte/' : './') : '#carte';
  return `<header class="entete" id="haut">
  <div class="entete__int conteneur">
    <a class="entete__logo" href="${accueil ? '#haut' : p}" aria-label="${esc(site.nom)} – accueil">
      ${site.logo ? `<img src="${esc(p + site.logo)}" alt="${esc(site.nom)}" width="160" height="68">` : `<span class="entete__nom">${esc(c.nomCourt)}</span>`}
    </a>
    <nav class="entete__nav" aria-label="Sections">
      ${accueil ? '' : `<a href="${p}">Accueil</a>`}
      <a href="${lienCarte}"${accueil ? '' : ' aria-current="page"'}>La carte</a>
      ${(site.photos?.salle?.length || 0) + (site.photos?.plats?.length || 0) > 0 ? `<a href="${p}#galerie">Photos</a>` : ''}
      <a href="${p}#infos">Infos &amp; horaires</a>
    </nav>
    <div class="entete__actions">
      <a class="btn btn--fantome btn--icone" href="tel:${esc(c.tel)}">${ICONES.tel}<span>Appeler</span></a>
      <a class="btn btn--fantome btn--icone" href="${esc(site.maps)}" target="_blank" rel="noopener">${ICONES.pin}<span>Itinéraire</span></a>
      <a class="btn btn--plein" href="${esc(c.resa.href)}"${c.resaAttr}>Réserver</a>
    </div>
  </div>
</header>`;
}

function rendrePied(site, c) {
  return `<footer class="pied">
  <div class="conteneur pied__int">
    <p class="pied__nom">${esc(site.nom)}</p>
    <p>${esc(c.adresse)} · <a href="tel:${esc(c.tel)}">${esc(site.telephone)}</a></p>
    ${site.mentions?.length ? `<p class="pied__mentions">${site.mentions.map(esc).join(' · ')}</p>` : ''}
    <p class="pied__credit">© ${new Date().getFullYear()} ${esc(site.nom)} · Site réalisé par <a href="https://webatir.com" rel="noopener">Webatir</a></p>
    ${site.demo ? `<p class="pied__credit">Site de démonstration · établissement fictif${site.demo_credit ? `, ${esc(site.demo_credit)}` : ''}</p>` : ''}
  </div>
</footer>`;
}

function rendreBarreMobile(site, c) {
  return `<nav class="barre-mobile" aria-label="Actions rapides">
  <a href="tel:${esc(c.tel)}">${ICONES.tel}<span>Appeler</span></a>
  <a class="barre-mobile__principal" href="${esc(c.resa.href)}"${c.resaAttr}>${ICONES.calendrier}<span>Réserver</span></a>
  <a href="${esc(site.maps)}" target="_blank" rel="noopener">${ICONES.pin}<span>Itinéraire</span></a>
</nav>`;
}

// ---------------------------------------------------------------------------
function rendreAccueil(site, ctx, c) {
  const r = site.reseaux || {};
  const insta = r.instagram ? (r.instagram.startsWith('http') ? r.instagram : `https://www.instagram.com/${r.instagram.replace(/^@/, '')}/`) : null;
  const instaNom = r.instagram ? '@' + r.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '').replace(/^@/, '') : null;
  const ev = site.evenement;
  const mapsEmbed = site.maps_embed || (c.adresse ? `https://www.google.com/maps?q=${encodeURIComponent(`${site.nom}, ${c.adresse}`)}&output=embed` : null);
  const donneesHoraires = JSON.stringify({ jours: site.horaires?.jours || {}, a_confirmer: !!site.horaires?.a_confirmer });
  const ld = jsonLd(site, ctx);
  const blocLd = c.publie
    ? `<script type="application/ld+json">\n${ld}\n</script>`
    : `<!-- JSON-LD Restaurant : désactivé tant que c'est une maquette (passer "publie": true dans site.json pour l'activer) -->\n<script type="text/plain" data-jsonld-desactive>\n${ld}\n</script>`;
  const titre = site.titre_page || `${site.nom} – ${site.slogan ? site.slogan.replace(/\.$/, '') : 'Restaurant'}${c.ville ? ` à ${c.ville}` : ''}`;

  // Titre animé mot à mot quand les animations sont activées.
  const titreHero = c.anime
    ? site.nom.split(/\s+/).map((m, i) => `<span class="mot" style="--i:${i}">${esc(m)}</span>`).join(' ')
    : esc(site.nom);
  const media = c.video
    ? `<video class="hero__photo" autoplay muted loop playsinline preload="metadata"${c.hero ? ` poster="${esc(c.hero.src)}"` : ''} aria-label="${esc(c.video.alt || (c.hero && c.hero.alt) || site.nom)}"><source src="${esc(c.video.src)}" type="video/mp4"></video>`
    : c.hero ? `<img class="hero__photo" src="${esc(c.hero.src)}" alt="${esc(c.hero.alt)}" fetchpriority="high" width="1600" height="1000">` : '';

  return `<!doctype html>
<html lang="fr" ${c.attrsHtml}>
<head>
${rendreHead(site, c, { titre, description: c.description, p: '', chemin: '', ld: blocLd })}
</head>
<body>
<a class="evitement" href="#carte">Aller à la carte</a>

${rendreEntete(site, c, { p: '', page: 'accueil' })}

<main>
<section class="hero" id="accueil">
  <div class="hero__media">${media}</div>
  <div class="hero__voile"></div>
  <div class="hero__contenu conteneur">
    ${c.ville ? `<p class="hero__sur">Restaurant · ${esc(c.ville)}</p>` : ''}
    <h1 class="hero__titre">${titreHero}</h1>
    ${site.slogan ? `<p class="hero__slogan">${esc(site.slogan)}</p>` : ''}
    <p class="statut" id="statut" hidden><span class="statut__point"></span><span class="statut__texte"></span> <a class="statut__lien" href="#infos">Horaires</a></p>
    <div class="hero__cta">
      <a class="btn btn--plein btn--grand" href="${esc(c.resa.href)}"${c.resaAttr}>Réserver une table</a>
      <a class="btn btn--contour btn--grand" href="${site.carte_page ? 'carte/' : '#carte'}">Voir la carte</a>
    </div>
    ${site.avis?.note ? `<p class="hero__avis"><span class="etoiles" aria-hidden="true">★★★★★</span> <strong>${esc(site.avis.note)}</strong>/5 · ${esc(site.avis.nombre)} avis ${esc(site.avis.source || 'Google')}</p>` : ''}
  </div>
</section>

${site.bandeau?.length ? `<div class="bandeau" aria-hidden="true"><div class="bandeau__piste">${(Array.isArray(site.bandeau) ? site.bandeau : [site.bandeau]).map((m) => `<span>${esc(m)}</span>`).join('<span class="bandeau__sep">✦</span>')}<span class="bandeau__sep">✦</span></div></div>` : ''}

${site.mentions?.length ? `<ul class="mentions conteneur" aria-label="Bon à savoir">${site.mentions.map((m) => `<li class="mention">${esc(m)}</li>`).join('')}</ul>` : ''}

${site.a_propos ? `<section class="apropos" id="apropos">
  <div class="conteneur apropos__int">
    ${site.a_propos.titre ? `<h2 class="section__titre">${esc(site.a_propos.titre)}</h2>` : ''}
    ${(site.a_propos.paragraphes || [site.a_propos.texte]).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}
    ${site.a_propos.signature ? `<p class="apropos__signature">${esc(site.a_propos.signature)}</p>` : ''}
  </div>
</section>` : ''}

${ev ? `<section class="evenement" id="evenement" aria-labelledby="evenement-titre">
  <div class="conteneur evenement__int">
    ${ev.image ? `<img class="evenement__image" src="${esc(photo(ev.image).src)}" alt="${esc(photo(ev.image, ev.titre).alt)}" loading="lazy">` : ''}
    <div class="evenement__texte">
      <p class="evenement__sur">${esc(ev.surtitre || 'À l’affiche')}</p>
      <h2 class="evenement__titre" id="evenement-titre">${esc(ev.titre)}</h2>
      ${ev.date ? `<p class="evenement__date">${esc(ev.date)}</p>` : ''}
      ${ev.description ? `<p class="evenement__desc">${esc(ev.description)}</p>` : ''}
      ${ev.lien ? `<a class="btn btn--plein" href="${esc(ev.lien)}" target="_blank" rel="noopener">${esc(ev.lien_texte || 'Réserver ma place')}</a>` : ''}
    </div>
  </div>
</section>` : ''}

<section class="carte${site.carte_page ? ' carte--apercu' : ''}" id="carte" aria-labelledby="carte-titre">
  <div class="conteneur">
    <h2 class="section__titre" id="carte-titre">${esc(site.carte_titre || 'La carte')}</h2>
    ${site.carte_intro ? `<p class="section__intro">${esc(site.carte_intro)}</p>` : ''}
  </div>
  <div class="conteneur carte__int">
    ${site.carte_page ? rendreMenuApercu(site) : rendreMenuComplet(site)}
  </div>
</section>

${rendreGalerie(site)}

<section class="infos" id="infos" aria-labelledby="infos-titre">
  <div class="conteneur">
    <h2 class="section__titre" id="infos-titre">Infos pratiques</h2>
    <div class="infos__grille">
      <div class="infos__bloc">
        <h3>Horaires</h3>
        ${rendreHoraires(site)}
      </div>
      <div class="infos__bloc">
        <h3>Nous trouver</h3>
        <address class="infos__adresse">${esc(c.adresse)}</address>
        <p><a class="btn btn--fantome btn--icone" href="${esc(site.maps)}" target="_blank" rel="noopener">${ICONES.pin}<span>Itinéraire Google Maps</span></a></p>
        <h3>Réserver</h3>
        <p class="infos__tel"><a href="tel:${esc(c.tel)}">${esc(site.telephone)}</a></p>
        ${site.reservation?.note ? `<p class="infos__note">${esc(site.reservation.note)}</p>` : ''}
        ${c.resa.externe ? `<p><a class="btn btn--plein" href="${esc(c.resa.href)}" target="_blank" rel="noopener">Réserver en ligne</a></p>` : ''}
        ${c.wa ? `<p><a class="btn btn--fantome btn--icone" href="${esc(c.wa)}" target="_blank" rel="noopener">${ICONES.whatsapp}<span>Écrire sur WhatsApp</span></a></p>` : ''}
        ${insta || r.facebook || r.snapchat || r.tiktok ? `<h3>Suivez-nous</h3>
        <ul class="reseaux">
          ${insta ? `<li><a href="${esc(insta)}" target="_blank" rel="noopener">${ICONES.instagram}<span>${esc(instaNom)}</span></a></li>` : ''}
          ${r.facebook ? `<li><a href="${esc(r.facebook)}" target="_blank" rel="noopener">${ICONES.facebook}<span>Facebook</span></a></li>` : ''}
          ${r.tiktok ? `<li><a href="${esc(r.tiktok)}" target="_blank" rel="noopener"><span>TikTok</span></a></li>` : ''}
          ${r.snapchat ? `<li><a href="${esc(r.snapchat)}" target="_blank" rel="noopener"><span>Snapchat</span></a></li>` : ''}
        </ul>` : ''}
      </div>
      ${mapsEmbed ? `<div class="infos__carte"><iframe title="Plan d’accès – ${esc(site.nom)}" src="${esc(mapsEmbed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>` : ''}
    </div>
  </div>
</section>
</main>

${rendrePied(site, c)}

${rendreBarreMobile(site, c)}

<dialog class="lightbox" id="lightbox" aria-label="Photo agrandie">
  <button class="lightbox__fermer" type="button" aria-label="Fermer">×</button>
  <button class="lightbox__prec" type="button" aria-label="Photo précédente">‹</button>
  <img alt="">
  <button class="lightbox__suiv" type="button" aria-label="Photo suivante">›</button>
  <p class="lightbox__legende"></p>
</dialog>

<script type="application/json" id="donnees-horaires">${donneesHoraires}</script>
<script src="script.js" defer></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
function rendrePageCarte(site, ctx, c) {
  const p = '../';
  const titre = `${site.carte_titre || 'La carte'} – ${site.nom}${c.ville ? ` à ${c.ville}` : ''}`;
  const description = site.carte_intro || `La carte complète de ${site.nom} : ${(site.menu || []).map((m) => m.titre.toLowerCase()).join(', ')}.`;
  return `<!doctype html>
<html lang="fr" ${c.attrsHtml}>
<head>
${rendreHead(site, c, { titre, description, p, chemin: 'carte/' })}
</head>
<body class="page-carte">
<a class="evitement" href="#carte">Aller à la carte</a>

${rendreEntete(site, c, { p, page: 'carte' })}

<main>
<section class="carte" id="carte" aria-labelledby="carte-titre">
  <div class="conteneur">
    <p class="carte__retour"><a href="${p}">← ${esc(c.nomCourt)}</a></p>
    <h1 class="section__titre" id="carte-titre">${esc(site.carte_titre || 'La carte')}</h1>
    ${site.carte_intro ? `<p class="section__intro">${esc(site.carte_intro)}</p>` : ''}
    ${site.menu_pdf ? `<p><a class="btn btn--fantome" href="${esc(p + site.menu_pdf)}" target="_blank" rel="noopener">Carte en PDF</a></p>` : ''}
  </div>
  <div class="conteneur carte__int">
    ${rendreMenuComplet(site)}
  </div>
  <div class="conteneur carte__fin">
    <a class="btn btn--plein btn--grand" href="${esc(c.resa.href)}"${c.resaAttr}>Réserver une table</a>
    <a class="btn btn--fantome btn--grand" href="${p}#infos">Horaires et accès</a>
  </div>
</section>
</main>

${rendrePied(site, c)}

${rendreBarreMobile(site, c)}

<script src="${p}script.js" defer></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
/** Retourne { "index.html": html, ["carte/index.html"]: html }. */
export function render(site, ctx = {}) {
  const c = contexte(site, ctx);
  const pages = { 'index.html': rendreAccueil(site, ctx, c) };
  if (site.carte_page) pages['carte/index.html'] = rendrePageCarte(site, ctx, c);
  return pages;
}
