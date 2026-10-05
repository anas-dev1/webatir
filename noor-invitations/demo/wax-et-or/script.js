/* ============ Mariage Ines & Anas — interactions ============ */

// DÉMO : le formulaire de réponse n'envoie rien (aucune adresse e-mail ici).
const WEDDING_DATE = new Date('2026-10-23T14:45:00+02:00');

const body = document.body;
const invitation = document.getElementById('invitation');

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
  body.classList.add('demo-open');
  setTimeout(() => envelope.remove(), 1800);
};
const LIGHT_DURATION = reduceMotionPref() ? 0 : 2300; // le cachet s'illumine avant l'ouverture
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
  // Lumière sur le cachet, puis ouverture dès que la vidéo est prête (8 s maximum d'attente)
  Promise.all([wait(LIGHT_DURATION), Promise.race([videoReady, wait(8000)])]).then(() => {
    envelopeVideo.play().catch(revealInvitation); // si la vidéo ne peut pas démarrer, on ouvre directement
  });
};
// Le fondu commence un peu avant la dernière image, pour enchaîner en douceur
envelopeVideo.addEventListener('timeupdate', () => {
  if (envelopeVideo.duration && envelopeVideo.currentTime >= envelopeVideo.duration - 1.2) revealInvitation();
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

// --- Confirmation de présence ---
const form = document.getElementById('rsvpForm');
const status = document.getElementById('rsvpStatus');
const guestsField = form.querySelector('.guests-field');
form.querySelectorAll('input[name="presence"]').forEach((radio) => {
  radio.addEventListener('change', () => { guestsField.hidden = radio.value.startsWith('Non') && radio.checked; });
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.hidden = true;
  const data = new FormData(form);
  if (String(data.get('presence')).startsWith('Non')) data.set('personnes', '0');
  // Démo : on simule la réponse, sans rien envoyer.
  await new Promise((r) => setTimeout(r, 500));
  status.textContent = "C'est une démo : dans votre faire-part, cette réponse arriverait directement chez vous. Avec la formule Signature, elle se rangerait aussi dans votre tableau de suivi des invités ✦";
  status.className = 'form-status ok';
  form.querySelectorAll('input, select, textarea').forEach((el) => { el.disabled = true; });
  status.hidden = false;
});

// --- Démo : boutons « Je veux ce modèle » (catalogue collections.js) ---
const demoModel = typeof NOOR_COLLECTIONS !== 'undefined'
  && NOOR_COLLECTIONS.find((m) => m.slug === body.dataset.model);
if (demoModel) {
  document.querySelectorAll('[data-order-link]').forEach((a) => {
    a.href = noorOrderPage(demoModel, '../../');
  });
}
// La barre de commande se cache quand le bloc final « Vous aimez ce modèle ? » est à l'écran
const orderSection = document.getElementById('commander');
new IntersectionObserver(([entry]) => {
  body.classList.toggle('demo-order-visible', entry.isIntersecting);
}).observe(orderSection);
