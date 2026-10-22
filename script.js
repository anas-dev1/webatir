/* ============ WEBATIR — interactions ============ */

// --- Navigation : fond au scroll ---
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40 || nav.hasAttribute('data-solid'));
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// --- Menu mobile ---
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
const closeMenu = () => {
  nav.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
};
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('is-open')) {
    closeMenu();
    burger.focus();
  }
});

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

// --- Formulaire : envoi par email via FormSubmit ---
const form = document.getElementById('contactForm');
if (form) form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const success = document.getElementById('formSuccess');
  const error = document.getElementById('formError');
  button.disabled = true;
  error.hidden = true;
  success.hidden = true;
  try {
    const res = await fetch('https://formsubmit.co/ajax/contact@webatir.com', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
    });
    const data = await res.json();
    if (!res.ok || String(data.success) !== 'true') throw new Error(data.message);
    success.hidden = false;
    form.reset();
  } catch {
    error.hidden = false;
    button.disabled = false;
  }
});
