/* ============ Noor Invitations — interactions ============ */

// --- Modèles (catalogue centralisé dans collections.js) ---
if (typeof noorRenderModels === 'function') noorRenderModels();

// --- Navigation : fond au défilement ---
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// --- Paillettes dorées dans le ciel de l'ouverture ---
const canvas = document.getElementById('sparkles');
if (canvas) {
const ctx = canvas.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let sparks = [];
let visible = true;
const resize = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sparks = Array.from({ length: Math.round(canvas.clientWidth / 12) }, () => ({
    x: Math.random() * canvas.clientWidth,
    y: Math.random() * canvas.clientHeight,
    r: Math.random() * 1.5 + 0.4,
    vy: -(Math.random() * 0.22 + 0.05),
    phase: Math.random() * Math.PI * 2,
    hue: Math.random() < 0.75 ? '196, 154, 78' : '224, 190, 120',
  }));
};
const draw = (t) => {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  for (const p of sparks) {
    p.y += p.vy;
    if (p.y < -5) { p.y = canvas.clientHeight + 5; p.x = Math.random() * canvas.clientWidth; }
    const a = 0.25 + 0.55 * Math.abs(Math.sin(t / 900 + p.phase));
    ctx.beginPath();
    ctx.fillStyle = `rgba(${p.hue}, ${a})`;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!reduceMotion && visible) requestAnimationFrame(draw);
};
new IntersectionObserver(([entry]) => {
  const was = visible;
  visible = entry.isIntersecting;
  if (visible && !was) requestAnimationFrame(draw);
}).observe(canvas);
resize();
window.addEventListener('resize', resize);
requestAnimationFrame(draw);
}
