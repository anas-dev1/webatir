/* ============ Mariage Ines & Anas — choix du menu ============ */

// Même adresse que dans ../script.js : l'application web Google Apps Script qui range les
// réponses dans le tableau de suivi (voir ../google-sheet/README.md). Les réponses envoyées
// depuis cette page arrivent dans les mêmes onglets que celles du faire-part.
const RSVP_URL = 'A_REMPLACER_PAR_L_URL_DU_SCRIPT_GOOGLE';

// La carte du dîner (Jardin Marbeuf) : l'entrée et le dessert sont les mêmes pour tous,
// seul le plat est au choix. Les suppléments ne sont pas montrés aux invités : ils sont
// recalculés dans le tableau de suivi.
const MENU = {
  bienvenue: 'Cocktail de bienvenue',
  entree: { nom: 'Millefeuille de saumon', detail: "Saumon frais relevé d'herbes et de citron" },
  plat: [
    { nom: "Confit d'agneau", detail: 'Servi avec accompagnement au choix' },
    { nom: 'Pavé de saumon', detail: 'Saumon rôti, légumes de saison, sauce citronnée aux herbes fraîches' },
  ],
  dessert: { nom: 'Entremet chocolat', detail: '' },
};

// --- Papillons : un même dessin, cloné dans chaque vol ---
const BUTTERFLY = `
  <defs>
    <linearGradient id="wingA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fce9f0"/><stop offset="0.55" stop-color="#f0b9cc"/><stop offset="1" stop-color="#d7a0c9"/>
    </linearGradient>
    <linearGradient id="wingB" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fce9f0"/><stop offset="0.55" stop-color="#f0b9cc"/><stop offset="1" stop-color="#d7a0c9"/>
    </linearGradient>
  </defs>
  <g class="wing wing-l">
    <path d="M50 40 C 30 6, 2 10, 6 30 C 8 42, 24 44, 36 42 C 22 46, 10 56, 16 68 C 22 78, 40 70, 50 48 Z" fill="url(#wingA)" stroke="#c98aa8" stroke-width="1.2" stroke-opacity="0.6"/>
    <path d="M30 28 c -4 3 -6 9 -4 14" fill="none" stroke="#fff" stroke-width="1.5" stroke-opacity="0.7"/>
  </g>
  <g class="wing wing-r">
    <path d="M50 40 C 70 6, 98 10, 94 30 C 92 42, 76 44, 64 42 C 78 46, 90 56, 84 68 C 78 78, 60 70, 50 48 Z" fill="url(#wingB)" stroke="#c98aa8" stroke-width="1.2" stroke-opacity="0.6"/>
    <path d="M70 28 c 4 3 6 9 4 14" fill="none" stroke="#fff" stroke-width="1.5" stroke-opacity="0.7"/>
  </g>
  <path d="M50 30 L 50 60" stroke="#8c6f82" stroke-width="3" stroke-linecap="round"/>
  <path d="M50 31 c -4 -8 -10 -12 -14 -12 M50 31 c 4 -8 10 -12 14 -12" fill="none" stroke="#8c6f82" stroke-width="1.2" stroke-linecap="round"/>`;
document.querySelectorAll('.butterfly').forEach((svg) => { svg.innerHTML = BUTTERFLY; });

// --- Apparition au défilement ---
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    }
  }),
  { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// --- Formulaire : présence, puis le menu de chaque convive ---
const form = document.getElementById('menuForm');
const status = document.getElementById('formStatus');
const guestsBlock = document.getElementById('guestsBlock');
const personnesSelect = document.getElementById('personnes');
const convivesWrap = document.getElementById('convives');
const nomInput = form.querySelector('input[name="nom"]');
const thanks = document.getElementById('thanks');
const thanksText = document.getElementById('thanksText');
const recap = document.getElementById('recap');

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

// Un plat = une case à cocher (bouton radio habillé), comme sur la carte
const menuPick = (name, item, required) => `
  <label class="menu-pick">
    <input type="radio" name="${name}" value="${escapeHtml(item.nom)}" ${required ? 'required' : ''}>
    <span class="menu-pick-mark" aria-hidden="true">✦</span>
    <span class="menu-pick-body">
      <span class="menu-item-name">${escapeHtml(item.nom)}</span>
      ${item.detail ? `<span class="menu-item-detail">${escapeHtml(item.detail)}</span>` : ''}
    </span>
  </label>`;

// Entrée et dessert : simplement rappelés, sans rien à cocher
const fixedCourse = (label, item) => `
  <div class="menu-fixed">
    <h3>${label}</h3>
    <p class="menu-item-name">${escapeHtml(item.nom)}</p>
    ${item.detail ? `<p class="menu-item-detail">${escapeHtml(item.detail)}</p>` : ''}
  </div>`;

// Le plat : un bouton par choix
const platGroup = (i) => `
  <fieldset class="menu-group">
    <legend><h3>Plat <span class="menu-choice">au choix</span></h3></legend>
    ${MENU.plat.map((item) => menuPick(`c${i}_plat`, item, true)).join('')}
  </fieldset>`;

// Un bloc par convive : prénom, plat à cocher, allergies.
// Les choix déjà faits sont conservés quand le nombre de personnes change.
const renderConvives = () => {
  const count = Number(personnesSelect.value) || 1;
  const saved = [...convivesWrap.querySelectorAll('.convive')].map((block) => {
    const values = {};
    block.querySelectorAll('input').forEach((el) => {
      if (el.type === 'radio') { if (el.checked) values[el.name] = el.value; }
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
      <p class="convive-title">${count > 1 ? `Convive ${i}` : 'Votre menu'}</p>
      <label>Prénom et nom
        <input type="text" name="c${i}_prenom" required autocomplete="off">
      </label>
      <div class="convive-menu">
        <p class="menu-welcome">${escapeHtml(MENU.bienvenue)}</p>
        ${fixedCourse('Entrée', MENU.entree)}
        ${platGroup(i)}
        ${fixedCourse('Dessert', MENU.dessert)}
        <label>Allergies ou régime particulier <span class="optional">(facultatif)</span>
          <input type="text" name="c${i}_allergies" autocomplete="off">
        </label>
      </div>`;
    convivesWrap.appendChild(block);

    const old = saved[i - 1];
    if (old) {
      block.querySelectorAll('input').forEach((el) => {
        if (!(el.name in old)) return;
        if (el.type === 'radio') el.checked = el.value === old[el.name];
        else el.value = old[el.name];
      });
    }
    // Le premier convive, c'est la personne qui répond
    const prenom = block.querySelector(`input[name="c${i}_prenom"]`);
    if (i === 1 && !prenom.value) prenom.value = nomInput.value.trim();
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
  // Entrée et dessert sont les mêmes pour tous : on les envoie quand même, pour que le
  // tableau de suivi reste complet (une ligne par convive avec son menu entier).
  return {
    prenom: text('prenom').trim() || `Convive ${idx + 1}`,
    entree: MENU.entree.nom,
    garniture: '',
    plat: picked('plat'),
    dessert: MENU.dessert.nom,
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
  const target = missing.type === 'radio' ? missing.closest('fieldset') : missing;
  target.classList.add('is-missing');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (missing.type !== 'radio') missing.focus({ preventScroll: true });
  const isPresence = missing.name === 'presence';
  const isDish = missing.type === 'radio' && !isPresence;
  show(isPresence ? 'Dites-nous si vous serez présent(e) au dîner.'
    : isDish ? 'Il reste un plat à choisir, il est encadré en rose.'
      : 'Il manque une information, le champ est encadré en rose.', false);
  return false;
};

const recapHtml = (convives) => convives.map((c) => {
  const menu = [c.entree, c.plat, c.dessert].join(' · ');
  return `<span><b>${escapeHtml(c.prenom)}</b>${escapeHtml(menu)}${c.allergies ? `<br><i>${escapeHtml(c.allergies)}</i>` : ''}</span>`;
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
    const prenom = nomInput.value.trim().split(/\s+/)[0];
    thanksText.textContent = coming
      ? `${prenom}, votre menu est noté. Nous avons hâte de partager ce dîner avec vous ✦`
      : `${prenom}, merci de nous avoir prévenus. Vous serez dans nos pensées ✦`;
    recap.innerHTML = coming ? recapHtml(convives) : '';
    recap.hidden = !coming;
    form.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    console.error(err);
    show("L'envoi n'a pas fonctionné. Vérifiez votre connexion, puis réessayez.", false);
    button.disabled = false;
  }
});
