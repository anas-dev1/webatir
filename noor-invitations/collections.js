/* ============ Noor Invitations — catalogue des modèles ============
   Source unique des modèles : la page d'accueil, la page /collections et les démos lisent cette liste.
   - Accueil : modèles available && featured
   - /collections : modèles available
   Pour ajouter un modèle : ajouter une entrée ici (et sa démo dans demo/<slug>/). */

const NOOR_WHATSAPP = '33633475373';

const NOOR_COLLECTIONS = [
  {
    id: 'nuit-orientale',
    slug: 'nuit-orientale',
    name: 'Nuit orientale',
    description: "Palais andalou, lanternes et ciel étoilé. Le cachet s'illumine, puis l'enveloppe s'ouvre.",
    tags: ['Oriental', 'Élégant'],
    palette: ['Indigo', 'Or', 'Rose poudré'],
    price: 99,
    thumbnail: 'img/modele-nuit-orientale.webp',
    previewUrl: 'demo/nuit-orientale/',
    available: true,
    featured: true,
  },
  {
    id: 'henne',
    slug: 'henne',
    name: 'Henné',
    description: 'Motifs au henné, terracotta et vert, pour la soirée du henné.',
    tags: ['Henné', 'Chaleureux'],
    palette: ['Terracotta', 'Olive'],
    price: 99,
    thumbnail: 'img/collection-henne.webp',
    previewUrl: 'demo/henne/',
    available: false,
    featured: false,
  },
  {
    id: 'wax-et-or',
    slug: 'wax-et-or',
    name: 'Wax & or',
    description: 'Motifs wax, couleurs vives et dorures, pour les mariages africains et mixtes.',
    tags: ['Africain', 'Coloré'],
    palette: ['Moutarde', 'Émeraude', 'Or'],
    price: 99,
    thumbnail: 'img/collection-wax.webp',
    previewUrl: 'demo/wax-et-or/',
    available: false,
    featured: false,
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
    available: false,
    featured: false,
  },
];

/* Lien de commande WhatsApp pour un modèle (système de contact actuel du site) */
function noorOrderUrl(model) {
  const text = `Bonjour ! Je veux le modèle ${model.name} (${model.price} €) pour mon mariage.`;
  return `https://wa.me/${NOOR_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/* Carte d'un modèle. base = chemin vers la racine du site depuis la page courante ('' ou '../'). */
function noorModelCard(model, base, tagsKey) {
  const tags = (tagsKey === 'palette' ? model.palette : model.tags).join(' · ');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `
    <article class="model">
      <a class="model-media" href="${base}${model.previewUrl}" aria-label="Ouvrir l'invitation ${esc(model.name)}">
        <img src="${base}${model.thumbnail}" alt="Aperçu du faire-part ${esc(model.name)}" width="600" height="750" loading="lazy" decoding="async">
        <span class="model-play" aria-hidden="true">Touchez pour ouvrir</span>
      </a>
      <div class="model-body">
        <h3>${esc(model.name)}</h3>
        <p class="model-tags">${esc(tags)}</p>
        <a class="btn btn-gold model-cta" href="${base}${model.previewUrl}">Ouvrir l'invitation →</a>
      </div>
    </article>`;
}

/* Remplit un conteneur [data-models] selon son filtre (featured | available) */
function noorRenderModels() {
  document.querySelectorAll('[data-models]').forEach((el) => {
    const filter = el.dataset.models;
    const base = el.dataset.base || '';
    const models = NOOR_COLLECTIONS.filter((m) => m.available && (filter !== 'featured' || m.featured));
    el.dataset.count = models.length;
    el.innerHTML = models.map((m) => noorModelCard(m, base, el.dataset.tags)).join('');
  });
}
