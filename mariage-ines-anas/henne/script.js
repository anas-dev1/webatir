/* ============ Soirée henné d'Ines — invitation interactive (enveloppe) ============ */

// Même script Google que le faire-part et la page menu (voir ../google-sheet/README.md).
// Les réponses de cette page arrivent dans l'onglet « Henné » du tableau.
const RSVP_URL = 'https://script.google.com/macros/s/AKfycbzY-KEeSm9-LMol-zZS0gDGEvzIr0nRK6twi3a8ULv7bu59GSv-ZKFDTqm5qazqiaAp9w/exec';

// Le lieu : à compléter dès qu'il est connu (nom, adresse sur deux lignes, recherche Google Maps).
// Exemple : { nom: 'Salle des Fêtes', adresse: '12 rue des Oliviers\n34000 Montpellier', recherche: 'Salle des Fêtes, 12 rue des Oliviers, 34000 Montpellier' }
const LIEU = {
  nom: '',
  adresse: '',
  recherche: '',
};

const SOIREE_DATE = new Date('2026-12-18T19:00:00+01:00');

const body = document.body;
const invitation = document.getElementById('invitation');

// --- Le lieu, s'il est renseigné ---
(() => {
  if (!LIEU.nom && !LIEU.adresse) return;
  document.getElementById('lieuNom').textContent = LIEU.nom || LIEU.adresse.split('\n')[0];
  const adresse = document.getElementById('lieuAdresse');
  adresse.innerHTML = '';
  (LIEU.nom ? LIEU.adresse : LIEU.adresse.split('\n').slice(1).join('\n')).split('\n').forEach((ligne, i) => {
    if (i) adresse.appendChild(document.createElement('br'));
    adresse.appendChild(document.createTextNode(ligne));
  });
  const q = LIEU.recherche || [LIEU.nom, LIEU.adresse.replace(/\n/g, ', ')].filter(Boolean).join(', ');
  const carte = document.getElementById('lieuCarte');
  const iframe = document.createElement('iframe');
  iframe.title = `Carte : ${q}`;
  iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  carte.appendChild(iframe);
  carte.hidden = false;
  document.getElementById('lieuItineraire').href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  document.getElementById('lieuWaze').href = `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
  document.getElementById('lieuActions').hidden = false;
})();

// --- Ouverture de l'enveloppe (vidéo) ---
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
function reduceMotionPref() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
const LIGHT_DURATION = reduceMotionPref() ? 0 : 3500; // le cachet s'illumine avant l'ouverture
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
  // Lumière sur le cachet, puis ouverture dès que la vidéo est prête (8 s maximum d'attente)
  Promise.all([wait(LIGHT_DURATION), Promise.race([videoReady, wait(8000)])]).then(() => {
    envelopeVideo.play().catch(revealInvitation); // si la vidéo ne peut pas démarrer, on ouvre directement
  });
};
// Le fondu commence un peu avant la dernière image, pour enchaîner en douceur
envelopeVideo.addEventListener('timeupdate', () => {
  if (envelopeVideo.duration && envelopeVideo.currentTime >= envelopeVideo.duration - 1.2) revealInvitation();
});
envelopeVideo.addEventListener('playing', () => envelope.classList.add('is-opening'));
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

// --- Cachet qui descend le long du programme ---
const timeline = document.getElementById('timeline');
const track = timeline.querySelector('.timeline-track');
const steps = [...timeline.querySelectorAll('li')];
let ticking = false;
const updateTimeline = () => {
  ticking = false;
  const rect = track.getBoundingClientRect();
  const anchor = window.innerHeight * 0.55; // le cachet suit le milieu de l'écran
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
  const diff = Math.max(0, SOIREE_DATE - Date.now());
  const s = Math.floor(diff / 1000);
  units.days.textContent = Math.floor(s / 86400);
  units.hours.textContent = pad(Math.floor(s / 3600) % 24);
  units.minutes.textContent = pad(Math.floor(s / 60) % 60);
  units.seconds.textContent = pad(s % 60);
};
tick();
setInterval(tick, 1000);

// --- Partager l'invitation ---
document.getElementById('partager').addEventListener('click', async (e) => {
  const bouton = e.currentTarget;
  const url = location.href.split('#')[0];
  const texte = "Soirée henné d'Ines — vendredi 18 décembre 2026 à 19h, entre femmes ✦";
  if (navigator.share) {
    try { await navigator.share({ title: "Soirée henné d'Ines", text: texte, url }); } catch (err) { /* annulé */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${texte}\n${url}`);
    bouton.textContent = 'Lien copié ✦';
    setTimeout(() => { bouton.textContent = "Partager l'invitation"; }, 2200);
  } catch (err) { window.prompt("Copiez le lien de l'invitation :", url); }
});

// --- Paillettes dorées dans le ciel ---
const canvas = document.getElementById('sparkles');
const ctx = canvas.getContext('2d');
const reduceMotion = reduceMotionPref();
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

// --- Confirmation de présence : envoi vers le tableau Google (onglet « Henné ») ---
const form = document.getElementById('rsvpForm');
const status = document.getElementById('rsvpStatus');
const guestsField = form.querySelector('.guests-field');
const merci = document.getElementById('merci');
const merciTexte = document.getElementById('merciTexte');

// Piège à robots : un champ invisible qui doit rester vide
const trap = document.createElement('input');
trap.type = 'text'; trap.name = 'website'; trap.tabIndex = -1; trap.autocomplete = 'off';
trap.setAttribute('aria-hidden', 'true');
trap.className = 'hp';
form.appendChild(trap);

const vient = () => { const c = form.querySelector('input[name="presence"]:checked'); return !!c && c.value.startsWith('Oui'); };
form.querySelectorAll('input[name="presence"]').forEach((radio) => {
  radio.addEventListener('change', () => { guestsField.hidden = !vient(); });
});

const show = (texte, ok) => { status.textContent = texte; status.className = `form-status ${ok ? 'ok' : 'err'}`; status.hidden = false; };

const validate = () => {
  form.querySelectorAll('.is-missing').forEach((el) => el.classList.remove('is-missing'));
  const missing = [...form.querySelectorAll('[required]')].find((el) => {
    if (el.type === 'radio') return !form.querySelector(`input[name="${el.name}"]:checked`);
    return !String(el.value || '').trim();
  });
  if (!missing) return true;
  const target = missing.type === 'radio' ? missing.closest('fieldset') : missing;
  target.classList.add('is-missing');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (missing.type !== 'radio') missing.focus({ preventScroll: true });
  show(missing.name === 'presence' ? 'Dites-moi si vous serez là.' : 'Il manque votre nom.', false);
  return false;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.hidden = true;
  const nom = form.querySelector('input[name="nom"]').value.trim();
  const data = new URLSearchParams();
  data.set('site', 'henne');
  data.set('nom', nom);
  data.set('presence', vient() ? 'Oui' : 'Non');
  data.set('personnes', vient() ? form.querySelector('select[name="personnes"]').value : '0');
  data.set('telephone', form.querySelector('input[name="telephone"]').value.trim());
  data.set('message', form.querySelector('textarea[name="message"]').value.trim());
  data.set('website', trap.value);
  try {
    const res = await fetch(RSVP_URL, { method: 'POST', body: data });
    const result = await res.json();
    if (!result.ok) throw new Error(result.erreur || 'refus');
    const prenom = nom.split(/\s+/)[0];
    merciTexte.textContent = vient()
      ? `${prenom}, votre réponse est bien notée. À très vite pour cette belle soirée ✦`
      : `${prenom}, merci de m'avoir prévenue. Vous me manquerez ✦`;
    form.hidden = true;
    merci.hidden = false;
    merci.classList.add('is-in');
  } catch (err) {
    console.error(err);
    show("L'envoi n'a pas fonctionné. Vérifiez votre connexion, puis réessayez.", false);
    button.disabled = false;
  }
});
