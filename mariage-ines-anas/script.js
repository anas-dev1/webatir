/* ============ Mariage Ines & Anas — interactions ============ */

// Adresse de l'application web Google Apps Script qui reçoit les réponses et remplit le
// tableau de suivi (voir google-sheet/README.md). Tant qu'elle n'est pas renseignée, le
// formulaire affiche un message d'erreur clair au lieu d'envoyer dans le vide.
const RSVP_URL = 'A_REMPLACER_PAR_L_URL_DU_SCRIPT_GOOGLE';
const WEDDING_DATE = new Date('2026-12-19T11:00:00+01:00');

// La carte du déjeuner (Jardin Marbeuf), affichée dans le formulaire : chaque convive coche son menu.
// Les suppléments du restaurant ne sont pas montrés aux invités (ils sont comptés dans le tableau de suivi).
const MENU = {
  bienvenue: 'Cocktail de bienvenue',
  entree: [
    { nom: 'Salade de saison', detail: 'Garniture au choix : poulet ou saumon fumé', garnitures: ['Poulet', 'Saumon fumé'] },
    { nom: 'Millefeuille de saumon', detail: "Saumon frais relevé d'herbes et de citron" },
    { nom: 'Noix de Saint-Jacques', detail: 'Sur un riz cuisiné façon risotto avec sa tuile croustillante' },
  ],
  plat: [
    { nom: "Confit d'agneau", detail: 'Servi avec accompagnement au choix' },
    { nom: 'Pavé de saumon', detail: 'Saumon rôti, légumes de saison, sauce citronnée aux herbes fraîches' },
    { nom: 'Médaillon de volaille farci', detail: 'Doré au four et accompagné de son jus de cuisson' },
  ],
  dessert: [
    { nom: 'Entremet fruits rouges', detail: '' },
    { nom: 'Entremet chocolat', detail: '' },
  ],
};
const COURSES = [
  { key: 'entree', label: 'Entrée' },
  { key: 'plat', label: 'Plat' },
  { key: 'dessert', label: 'Dessert' },
];

const body = document.body;
const invitation = document.getElementById('invitation');

// --- Ouverture des portes (vidéo) ---
const envelope = document.getElementById('envelope');
const envelopeVideo = document.getElementById('envelopeVideo');
let opened = false;
let revealed = false;
const revealInvitation = () => {
  if (revealed) return;
  revealed = true;
  envelope.classList.add('is-open');
  body.classList.remove('is-locked');
  invitation.classList.add('is-visible');
  setTimeout(() => envelope.remove(), 1800);
};
const LIGHT_DURATION = reduceMotionPref() ? 0 : 3300; // la lumière court sur les portes avant l'ouverture
function reduceMotionPref() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
// La vidéo est téléchargée en entier, une seule fois, dès l'arrivée sur la page (la balise vidéo
// est en preload="none" pour ne pas la télécharger une deuxième fois en parallèle) : sur téléphone,
// cela évite qu'elle s'interrompe ou saccade pendant l'ouverture.
const videoReady = fetch(envelopeVideo.currentSrc || envelopeVideo.src)
  .then((res) => (res.ok ? res.blob() : Promise.reject()))
  .then((blob) => new Promise((resolve) => {
    // Si la vidéo a déjà démarré depuis le serveur (connexion très lente), on ne la remplace pas en cours de route
    if (!envelopeVideo.paused || envelopeVideo.currentTime > 0) { resolve(); return; }
    envelopeVideo.addEventListener('canplaythrough', resolve, { once: true });
    envelopeVideo.preload = 'auto';
    envelopeVideo.src = URL.createObjectURL(blob);
    envelopeVideo.load();
  }))
  .catch(() => {}); // en cas d'échec, la vidéo se lit normalement depuis le serveur
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const openEnvelope = () => {
  if (opened) return;
  opened = true;
  envelope.classList.add('is-playing', 'is-lighting');
  // Lumière sur les portes, puis ouverture dès que la vidéo est prête (8 s maximum d'attente)
  Promise.all([wait(LIGHT_DURATION), Promise.race([videoReady, wait(8000)])]).then(() => {
    envelopeVideo.play().catch(revealInvitation); // si la vidéo ne peut pas démarrer, on ouvre directement
  });
};
// Les portes s'ouvrent et la lumière de la cour remplit l'embrasure (vidéo) ;
// le faire-part apparaît en fondu quand la lumière a tout envahi
envelopeVideo.addEventListener('playing', () => envelope.classList.add('is-opening'));
envelopeVideo.addEventListener('timeupdate', () => {
  if (envelopeVideo.duration && envelopeVideo.currentTime >= envelopeVideo.duration - 1.6) revealInvitation();
});
envelopeVideo.addEventListener('ended', revealInvitation);
envelopeVideo.addEventListener('error', () => { if (opened) revealInvitation(); });
envelope.addEventListener('click', openEnvelope);
envelope.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); }
});

// --- Apparition au défilement ---
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    }
  }),
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// --- Rose qui descend le long du programme ---
const timeline = document.getElementById('timeline');
const track = timeline.querySelector('.timeline-track');
const steps = [...timeline.querySelectorAll('li')];
let ticking = false;
const updateTimeline = () => {
  ticking = false;
  const rect = track.getBoundingClientRect();
  const anchor = window.innerHeight * 0.55; // la rose suit le milieu de l'écran
  const progress = Math.min(1, Math.max(0, (anchor - rect.top) / rect.height));
  timeline.style.setProperty('--progress', progress.toFixed(4));
  timeline.style.setProperty('--track-h', `${rect.height}px`);
  const roseY = rect.top + progress * rect.height;
  steps.forEach((li) => li.classList.toggle('is-reached', li.getBoundingClientRect().top + 14 <= roseY));
};
const requestTimeline = () => { if (!ticking) { ticking = true; requestAnimationFrame(updateTimeline); } };
window.addEventListener('scroll', requestTimeline, { passive: true });
window.addEventListener('resize', requestTimeline);
updateTimeline();

// --- Compte à rebours ---
const units = {};
document.querySelectorAll('#countdown [data-unit]').forEach((el) => { units[el.dataset.unit] = el; });
const pad = (n) => String(n).padStart(2, '0');
const tick = () => {
  const diff = Math.max(0, WEDDING_DATE - Date.now());
  const s = Math.floor(diff / 1000);
  units.days.textContent = Math.floor(s / 86400);
  units.hours.textContent = pad(Math.floor(s / 3600) % 24);
  units.minutes.textContent = pad(Math.floor(s / 60) % 60);
  units.seconds.textContent = pad(s % 60);
};
tick();
setInterval(tick, 1000);

// --- Paillettes dorées dans le ciel ---
const canvas = document.getElementById('sparkles');
const ctx = canvas.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let sparks = [];
const resize = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.round(canvas.clientWidth / 9);
  sparks = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.clientWidth,
    y: Math.random() * canvas.clientHeight,
    r: Math.random() * 1.6 + 0.4,
    vy: -(Math.random() * 0.25 + 0.05),
    vx: (Math.random() - 0.5) * 0.15,
    phase: Math.random() * Math.PI * 2,
    hue: Math.random() < 0.7 ? '243, 220, 166' : '242, 190, 196',
  }));
};
const draw = (t) => {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  for (const p of sparks) {
    p.x += p.vx; p.y += p.vy;
    if (p.y < -5) { p.y = canvas.clientHeight + 5; p.x = Math.random() * canvas.clientWidth; }
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 900 + p.phase));
    ctx.beginPath();
    ctx.fillStyle = `rgba(${p.hue}, ${a})`;
    ctx.shadowColor = `rgba(${p.hue}, ${a})`;
    ctx.shadowBlur = 8;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!reduceMotion && heroVisible) requestAnimationFrame(draw);
};
// N'anime les paillettes que lorsque le haut de page est visible
let heroVisible = true;
new IntersectionObserver(([entry]) => {
  const wasVisible = heroVisible;
  heroVisible = entry.isIntersecting;
  if (heroVisible && !wasVisible) requestAnimationFrame(draw);
}).observe(canvas);
resize();
window.addEventListener('resize', resize);
requestAnimationFrame(draw);

// --- Réponse : présence, puis le menu de chaque convive à cocher ---
const form = document.getElementById('rsvpForm');
const status = document.getElementById('rsvpStatus');
const guestsBlock = document.getElementById('guestsBlock');
const personnesSelect = document.getElementById('personnes');
const convivesWrap = document.getElementById('convives');
const nomInput = form.querySelector('input[name="nom"]');

// Champ piège invisible : les robots le remplissent, les invités ne le voient jamais
const trap = document.createElement('input');
trap.type = 'text'; trap.name = 'website'; trap.tabIndex = -1; trap.autocomplete = 'off';
trap.setAttribute('aria-hidden', 'true');
trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
form.appendChild(trap);

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const isComing = () => {
  const checked = form.querySelector('input[name="presence"]:checked');
  return !!checked && checked.value.startsWith('Oui');
};

// Un plat = une case à cocher (bouton radio habillé), comme sur la carte du restaurant
const menuPick = (name, item, required) => `
  <label class="menu-pick">
    <input type="radio" name="${name}" value="${escapeHtml(item.nom)}" ${required ? 'required' : ''}>
    <span class="menu-pick-mark" aria-hidden="true">✦</span>
    <span class="menu-pick-body">
      <span class="menu-item-name">${escapeHtml(item.nom)}</span>
      ${item.detail ? `<span class="menu-item-detail">${escapeHtml(item.detail)}</span>` : ''}
    </span>
  </label>`;

const courseGroup = (i, course) => `
  <fieldset class="menu-group">
    <legend><h3>${course.label}</h3></legend>
    ${MENU[course.key].map((item) => menuPick(`c${i}_${course.key}`, item, true)).join('')}
    ${course.key === 'entree' ? `
    <div class="menu-garniture" hidden>
      <p class="menu-garniture-label">Garniture de la salade</p>
      <div class="menu-pills">
        ${MENU.entree[0].garnitures.map((g) => `<label class="menu-pill"><input type="radio" name="c${i}_garniture" value="${escapeHtml(g)}"><span>${escapeHtml(g)}</span></label>`).join('')}
      </div>
    </div>` : ''}
  </fieldset>`;

// Un bloc par convive : prénom, puis le menu à cocher et les allergies.
// Les choix déjà faits sont conservés quand le nombre de personnes change.
const renderConvives = () => {
  const count = Number(personnesSelect.value) || 1;
  const saved = [...convivesWrap.querySelectorAll('.convive')].map((block) => {
    const values = {};
    block.querySelectorAll('input').forEach((el) => {
      if (el.type === 'checkbox') values[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) values[el.name] = el.value; }
      else values[el.name] = el.value;
    });
    return values;
  });
  convivesWrap.innerHTML = '';
  for (let i = 1; i <= count; i += 1) {
    const block = document.createElement('div');
    block.className = 'convive';
    block.dataset.index = String(i);
    block.innerHTML = `
      <div class="convive-head">
        <span class="convive-title">Convive ${i}</span>
      </div>
      <label>Prénom et nom
        <input type="text" name="c${i}_prenom" required autocomplete="off">
      </label>
      <div class="convive-menu">
        <p class="menu-welcome">${escapeHtml(MENU.bienvenue)}</p>
        ${COURSES.map((course) => courseGroup(i, course)).join('')}
        <label>Allergies ou régime particulier <span class="optional">(facultatif)</span>
          <input type="text" name="c${i}_allergies" autocomplete="off">
        </label>
      </div>`;
    convivesWrap.appendChild(block);

    // Valeurs précédentes
    const old = saved[i - 1];
    if (old) {
      block.querySelectorAll('input').forEach((el) => {
        if (!(el.name in old)) return;
        if (el.type === 'checkbox') el.checked = old[el.name];
        else if (el.type === 'radio') el.checked = el.value === old[el.name];
        else el.value = old[el.name];
      });
    }
    // Le premier convive, c'est la personne qui répond
    const prenom = block.querySelector(`input[name="c${i}_prenom"]`);
    if (i === 1 && !prenom.value) prenom.value = nomInput.value.trim();

    const entrees = [...block.querySelectorAll(`input[name="c${i}_entree"]`)];
    const garniture = block.querySelector('.menu-garniture');
    const garnitureRadios = [...garniture.querySelectorAll('input')];
    const syncGarniture = () => {
      const chosen = entrees.find((r) => r.checked);
      const needs = !!chosen && chosen.value === MENU.entree[0].nom;
      garniture.hidden = !needs;
      garnitureRadios.forEach((r) => { r.required = needs; });
    };
    entrees.forEach((r) => r.addEventListener('change', syncGarniture));
    syncGarniture();
  }
};
nomInput.addEventListener('change', () => {
  const first = convivesWrap.querySelector('input[name="c1_prenom"]');
  if (first && !first.value) first.value = nomInput.value.trim();
});
personnesSelect.addEventListener('change', renderConvives);
form.querySelectorAll('input[name="presence"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    guestsBlock.hidden = !isComing();
    if (isComing() && !convivesWrap.children.length) renderConvives();
  });
});

// Lecture des convives saisis
const readConvives = () => [...convivesWrap.querySelectorAll('.convive')].map((block, idx) => {
  const i = block.dataset.index;
  const text = (name) => (block.querySelector(`input[name="c${i}_${name}"]`) || {}).value || '';
  const picked = (name) => (block.querySelector(`input[name="c${i}_${name}"]:checked`) || {}).value || '';
  const entree = picked('entree');
  return {
    prenom: text('prenom').trim() || `Convive ${idx + 1}`,
    entree,
    garniture: entree === MENU.entree[0].nom ? picked('garniture') : '',
    plat: picked('plat'),
    dessert: picked('dessert'),
    allergies: text('allergies').trim(),
  };
});

const show = (html, ok) => {
  status.innerHTML = html;
  status.className = `form-status ${ok ? 'ok' : 'err'}`;
  status.hidden = false;
};

// Contrôle avant envoi : met en évidence le premier champ ou le premier plat manquant
const validate = () => {
  form.querySelectorAll('.is-missing').forEach((el) => el.classList.remove('is-missing'));
  const missing = [...form.querySelectorAll('[required]')].find((el) => {
    if (el.closest('[hidden]')) return false;
    if (el.type === 'radio') return !form.querySelector(`input[name="${el.name}"]:checked`);
    return !String(el.value || '').trim();
  });
  if (!missing) return true;
  const target = missing.type === 'radio' ? (missing.closest('.menu-garniture') || missing.closest('fieldset')) : missing;
  target.classList.add('is-missing');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (missing.type !== 'radio') missing.focus({ preventScroll: true });
  const isPresence = missing.name === 'presence';
  const isDish = missing.type === 'radio' && !isPresence;
  show(isPresence ? 'Dites-nous si vous serez présent(e).'
    : isDish ? 'Il reste un plat à choisir, il est encadré en rose.'
      : 'Il manque une information, le champ est encadré en rose.', false);
  return false;
};

const recapHtml = (convives) => convives.map((c) => {
  const menu = [c.entree + (c.garniture ? ` (${c.garniture.toLowerCase()})` : ''), c.plat, c.dessert].join(' · ');
  return `<span><b>${escapeHtml(c.prenom)}</b> ${escapeHtml(menu)}</span>`;
}).join('');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.hidden = true;

  const coming = isComing();
  const convives = coming ? readConvives() : [];
  const data = new URLSearchParams();
  data.set('site', 'ines-anas');
  data.set('nom', nomInput.value.trim());
  data.set('presence', coming ? 'Oui' : 'Non');
  data.set('personnes', coming ? String(convives.length) : '0');
  data.set('telephone', form.querySelector('input[name="telephone"]').value.trim());
  data.set('message', form.querySelector('textarea[name="message"]').value.trim());
  data.set('convives', JSON.stringify(convives));
  data.set('website', trap.value);

  try {
    if (!/^https:\/\//.test(RSVP_URL)) throw new Error('RSVP_URL non renseignée');
    const res = await fetch(RSVP_URL, { method: 'POST', body: data });
    const result = await res.json();
    if (!result.ok) throw new Error(result.erreur || 'refus');
    show(coming
      ? `Merci ! Nous avons hâte de célébrer ce jour avec vous ✦<span class="form-recap">${recapHtml(convives)}</span>`
      : 'Merci de nous avoir prévenus, vous serez dans nos pensées ✦', true);
    form.querySelectorAll('input, select, textarea, button').forEach((el) => { el.disabled = true; });
  } catch (err) {
    console.error(err);
    show("L'envoi n'a pas fonctionné. Vérifiez votre connexion, puis réessayez.", false);
    button.disabled = false;
  }
});
