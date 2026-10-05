/* ============ Noor Invitations — catalogue des modèles ============
   Source unique des modèles : la page d'accueil, la page /collections et les démos lisent cette liste.
   - Accueil : modèles featured (les modèles pas encore disponibles s'affichent avec « Bientôt »)
   - /collections : modèles available
   Pour ajouter un modèle : ajouter une entrée ici (et sa démo dans demo/<slug>/). */

const NOOR_WHATSAPP = '33633475373';

const NOOR_COLLECTIONS = [
  {
    id: 'feerie',
    slug: 'feerie',
    name: 'Féerie',
    description: "Pivoines, rose poudré et deux petites fées qui ouvrent l'enveloppe et apportent les alliances.",
    tags: ['Romantique', 'Féerique'],
    palette: ['Rose poudré', 'Pivoine', 'Or'],
    price: 99,
    thumbnail: 'img/modele-feerie.webp',
    previewUrl: 'demo/feerie/',
    available: true,
    featured: true,
  },
  {
    id: 'nuit-orientale',
    slug: 'nuit-orientale',
    name: 'Nuit orientale',
    description: "Palais andalou, lanternes et ciel étoilé. La lumière court sur les portes du palais, puis elles s'ouvrent.",
    tags: ['Oriental', 'Élégant'],
    palette: ['Indigo', 'Or', 'Rose poudré'],
    price: 99,
    thumbnail: 'img/modele-nuit-orientale.webp',
    previewUrl: 'demo/nuit-orientale/',
    available: true,
    featured: true,
  },
  {
    id: 'jardin-blanc',
    slug: 'jardin-blanc',
    name: 'Jardin blanc',
    description: 'Roses blanches, ivoire et vert sauge, pour un mariage sobre et lumineux.',
    tags: ['Sobre', 'Lumineux'],
    palette: ['Ivoire', 'Sauge'],
    price: 99,
    thumbnail: 'img/collection-jardin.webp',
    previewUrl: 'demo/jardin-blanc/',
    available: true,
    featured: true,
  },
  {
    id: 'wax-et-or',
    slug: 'wax-et-or',
    name: 'Wax & or',
    description: 'Motifs wax, couleurs vives et dorures, pour les mariages africains et mixtes.',
    tags: ['Africain', 'Coloré'],
    palette: ['Moutarde', 'Émeraude', 'Or'],
    price: 99,
    thumbnail: 'img/modele-wax-et-or.webp',
    previewUrl: 'demo/wax-et-or/',
    available: true,
    featured: true,
  },
  {
    id: 'henne',
    slug: 'henne',
    name: 'Henné',
    description: "Motifs au henné, terracotta et or, pour la soirée du henné. La lumière court sur les motifs, puis l'enveloppe s'ouvre.",
    tags: ['Henné', 'Chaleureux'],
    palette: ['Terracotta', 'Olive', 'Or'],
    price: 99,
    thumbnail: 'img/collection-henne.webp',
    previewUrl: 'demo/henne/',
    available: true,
    featured: false,
  },
];

/* Page de commande d'un modèle. base = chemin vers la racine du site depuis la page courante. */
function noorOrderPage(model, base) {
  return `${base}commander/?modele=${encodeURIComponent(model.slug)}`;
}

/* Carte d'un modèle. base = chemin vers la racine du site depuis la page courante ('' ou '../'). */
function noorModelCard(model, base, tagsKey) {
  const tags = (tagsKey === 'palette' ? model.palette : model.tags).join(' · ');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const name = esc(model.name);
  const img = `<img src="${base}${model.thumbnail}" alt="Aperçu du faire-part ${name}" width="600" height="750" loading="lazy" decoding="async">`;
  const media = model.available
    ? `<a class="model-media" href="${base}${model.previewUrl}" aria-label="Ouvrir l'invitation ${name}">${img}<span class="model-play" aria-hidden="true">Touchez pour ouvrir</span></a>`
    : `<div class="model-media">${img}<span class="model-soon">Bientôt</span></div>`;
  const open = model.available
    ? `<a class="btn btn-gold model-cta" href="${base}${model.previewUrl}">Ouvrir l'invitation →</a>`
    : `<span class="btn btn-gold model-cta is-disabled" aria-disabled="true" title="Démo bientôt disponible">Ouvrir l'invitation</span>`;
  return `
    <article class="model${model.available ? '' : ' is-soon'}">
      ${media}
      <div class="model-body">
        <h3>${name}</h3>
        <p class="model-tags">${esc(tags)}</p>
        <div class="model-actions">
          ${open}
          <a class="btn btn-outline model-order" href="${noorOrderPage(model, base)}">Commander</a>
        </div>
      </div>
    </article>`;
}

/* Remplit un conteneur [data-models] selon son filtre (featured | available) */
function noorRenderModels() {
  document.querySelectorAll('[data-models]').forEach((el) => {
    const filter = el.dataset.models;
    const base = el.dataset.base || '';
    // Accueil : 4 modèles mis en avant au maximum ; les autres sont sur la page /collections
    const models = NOOR_COLLECTIONS.filter((m) => (filter === 'featured' ? m.featured : m.available))
      .slice(0, filter === 'featured' ? 4 : undefined);
    el.dataset.count = models.length;
    // Sur téléphone, une dernière carte du carrousel mène à toutes les collections
    const allCard = filter === 'featured'
      ? `<a class="model model-all" href="${base}collections/"><span>Voir toutes les collections</span><i aria-hidden="true">→</i></a>`
      : '';
    el.innerHTML = models.map((m) => noorModelCard(m, base, el.dataset.tags)).join('') + allCard;
  });
}
