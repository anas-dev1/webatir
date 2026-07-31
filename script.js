/* ============ WEBATIR — interactions ============ */

// --- Navigation : fond au scroll ---
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// --- Menu mobile ---
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  })
);

// --- Aperçus live : mise à l'échelle des iframes (1280px -> largeur réelle) ---
const scaleFrame = (frame) => {
  const iframe = frame.querySelector('iframe');
  if (!iframe || frame.clientWidth === 0) return;
  const scale = frame.clientWidth / 1280;
  iframe.style.transform = `scale(${scale})`;
  iframe.style.height = `${frame.clientHeight / scale}px`;
};
const frameObserver = new ResizeObserver((entries) =>
  entries.forEach((entry) => scaleFrame(entry.target))
);
document.querySelectorAll('.work-frame').forEach((frame) => {
  scaleFrame(frame);
  frameObserver.observe(frame);
});

// --- Apparition au scroll ---
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// --- Formulaire (démo : à brancher sur un service d'envoi) ---
const form = document.getElementById('contactForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('formSuccess').hidden = false;
  form.querySelector('button[type="submit"]').disabled = true;
});
