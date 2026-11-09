/* ============ Soirée henné d'Ines — invitation interactive ============ */

// Même script Google que le faire-part et la page menu (voir ../google-sheet/README.md).
// Les réponses de cette page arrivent dans l'onglet « Henné » du tableau.
const RSVP_URL = 'https://script.google.com/macros/s/AKfycbzY-KEeSm9-LMol-zZS0gDGEvzIr0nRK6twi3a8ULv7bu59GSv-ZKFDTqm5qazqiaAp9w/exec';

// Le lieu : à compléter (nom, adresse sur plusieurs lignes, lien Google Maps).
const LIEU = {
  nom: '',
  adresse: '',
  maps: '',
};

const EVENEMENT = {
  titre: "Soirée henné d'Ines",
  debut: '20261218T190000',
  fin: '20261219T000000',
  description: "Soirée henné d'Ines, entre femmes. Invitation : https://webatir.com/mariage-ines-anas/henne/",
};

// --- Le lieu, s'il est renseigné ---
(() => {
  if (!LIEU.nom && !LIEU.adresse) return;
  const nom = document.getElementById('lieuNom');
  const adresse = document.getElementById('lieuAdresse');
  const lien = document.getElementById('lieuItineraire');
  nom.textContent = LIEU.nom || LIEU.adresse.split('\n')[0];
  adresse.textContent = LIEU.nom ? LIEU.adresse : LIEU.adresse.split('\n').slice(1).join('\n');
  if (LIEU.maps) { lien.href = LIEU.maps; lien.hidden = false; }
})();

// --- Ouverture de l'invitation : la carte fermée s'efface, la carte ouverte apparaît ---
const couverture = document.getElementById('couverture');
const carte = document.getElementById('carte');
const bouton = document.getElementById('ouvrir');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('is-in'); revealObserver.unobserve(entry.target); }
  }),
  { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
);

// --- Vidéo de couverture : la photo s'anime dès que la vidéo est prête (sinon la photo reste) ---
const video = document.getElementById('fondVideo');
if (video && !reduced) {
  video.hidden = false;
  const lancer = () => video.play().then(() => video.classList.add('is-prete')).catch(() => {});
  if (video.readyState >= 3) lancer(); else video.addEventListener('canplay', lancer, { once: true });
  video.addEventListener('error', () => { video.hidden = true; }, { once: true });
}

let ouverte = false;
const ouvrir = () => {
  if (ouverte) return;
  ouverte = true;
  couverture.classList.add('is-ouverte');
  setTimeout(() => {
    couverture.hidden = true;
    if (video) video.pause();
    carte.hidden = false;
    document.querySelectorAll('.reveal').forEach((el, i) => {
      if (i < 2) setTimeout(() => el.classList.add('is-in'), 150 + i * 220);
      else revealObserver.observe(el);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, reduced ? 0 : 700);
};
bouton.addEventListener('click', ouvrir);
// Un lien partagé avec #carte ouvre directement l'invitation
if (location.hash === '#carte' || location.hash === '#rsvp') ouvrir();

// --- Ajouter à l'agenda (fichier .ics) ---
(() => {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//webatir//henne//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:henne-ines-20261218@webatir.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;TZID=Europe/Paris:${EVENEMENT.debut}`,
    `DTEND;TZID=Europe/Paris:${EVENEMENT.fin}`,
    `SUMMARY:${EVENEMENT.titre}`,
    `DESCRIPTION:${EVENEMENT.description}`,
    LIEU.nom || LIEU.adresse ? `LOCATION:${[LIEU.nom, LIEU.adresse.replace(/\n/g, ', ')].filter(Boolean).join(', ')}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  document.getElementById('agenda').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
})();

// --- Partager ---
document.getElementById('partager').addEventListener('click', async (e) => {
  const url = location.href.split('#')[0];
  const texte = "Soirée henné d'Ines — vendredi 18 décembre 2026 à 19h, entre femmes ✦";
  if (navigator.share) {
    try { await navigator.share({ title: "Soirée henné d'Ines", text: texte, url }); } catch (err) { /* annulé */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${texte}\n${url}`);
    e.currentTarget.textContent = 'Lien copié ✦';
    setTimeout(() => { e.currentTarget.textContent = "Partager l'invitation"; }, 2200);
  } catch (err) { window.prompt('Copiez le lien de l\'invitation :', url); }
});

// --- RSVP ---
const form = document.getElementById('rsvpForm');
const status = document.getElementById('formStatus');
const champPersonnes = document.getElementById('champPersonnes');
const merci = document.getElementById('merci');
const merciTexte = document.getElementById('merciTexte');

const trap = document.createElement('input');
trap.type = 'text'; trap.name = 'website'; trap.tabIndex = -1; trap.autocomplete = 'off';
trap.setAttribute('aria-hidden', 'true');
trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
form.appendChild(trap);

const vient = () => { const c = form.querySelector('input[name="presence"]:checked'); return !!c && c.value.startsWith('Oui'); };
form.querySelectorAll('input[name="presence"]').forEach((r) => r.addEventListener('change', () => { champPersonnes.hidden = !vient(); }));

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
  show(missing.name === 'presence' ? 'Dites-nous si vous serez là.' : 'Il manque votre nom.', false);
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
      : `${prenom}, merci de nous avoir prévenues. Vous nous manquerez ✦`;
    form.hidden = true;
    merci.hidden = false;
  } catch (err) {
    console.error(err);
    show("L'envoi n'a pas fonctionné. Vérifiez votre connexion, puis réessayez.", false);
    button.disabled = false;
  }
});
