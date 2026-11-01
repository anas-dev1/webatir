// Aleyna Invitations — envoi des réponses des invités (RSVP) pour les vrais faire-part.
// S'active uniquement sur un formulaire qui porte data-rsvp-site="identifiant-du-mariage"
// (les démos n'en ont pas et gardent leur réponse simulée).
// Les réponses partent vers le script Google d'Aleyna, qui prévient les mariés par e-mail
// et remplit leur tableau de suivi (formules Signature et Prestige).
const NOOR_RSVP_URL = 'A_REMPLACER_PAR_L_URL_DU_SCRIPT_GOOGLE';

(() => {
  const form = document.querySelector('form[data-rsvp-site]');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');

  // Champ piège invisible : les robots le remplissent, les invités ne le voient jamais
  const trap = document.createElement('input');
  trap.type = 'text'; trap.name = 'website'; trap.tabIndex = -1; trap.autocomplete = 'off';
  trap.setAttribute('aria-hidden', 'true');
  trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
  form.appendChild(trap);

  const show = (text, ok) => {
    status.textContent = text;
    status.className = `form-status ${ok ? 'ok' : 'err'}`;
    status.hidden = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    status.hidden = true;
    const data = new FormData(form);
    if (String(data.get('presence')).startsWith('Non')) data.set('personnes', '0');
    data.set('site', form.dataset.rsvpSite);
    try {
      const res = await fetch(NOOR_RSVP_URL, { method: 'POST', body: new URLSearchParams(data) });
      const result = await res.json();
      if (!result.ok) throw new Error(result.erreur || 'refus');
      const vient = !String(data.get('presence')).startsWith('Non');
      show(vient
        ? 'Merci ! Votre réponse a bien été envoyée aux mariés. À très bientôt ✦'
        : 'Merci de nous avoir prévenus. Votre réponse a bien été envoyée aux mariés ✦', true);
      form.querySelectorAll('input, select, textarea').forEach((el) => { el.disabled = true; });
    } catch {
      show("Votre réponse n'a pas pu être envoyée. Vérifiez votre connexion internet, puis réessayez.", false);
      button.disabled = false;
    }
  });
})();
