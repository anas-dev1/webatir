/* ============ Noor Invitations — page de commande ============
   1. Le modèle vient de l'adresse (?modele=slug), la formule éventuellement de ?formule=id.
   2. Le récapitulatif se calcule en direct.
   3. À la validation : le récapitulatif part par e-mail (FormSubmit), puis le client paie l'acompte
      sur le lien Stripe de sa formule. Sans lien Stripe configuré, on bascule sur WhatsApp. */

(function () {
  const params = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);
  const form = $('orderForm');
  const models = NOOR_COLLECTIONS.filter((m) => m.featured || m.available);

  // --- Modèle ---
  const select = $('modelSelect');
  select.innerHTML = models
    .map((m) => `<option value="${m.slug}">${m.name}${m.available ? '' : ' (bientôt)'}</option>`)
    .join('');
  const wanted = models.find((m) => m.slug === params.get('modele'));
  select.value = (wanted || models.find((m) => m.available) || models[0]).slug;

  const currentModel = () => models.find((m) => m.slug === select.value);
  function showModel() {
    const m = currentModel();
    $('orderModelImg').src = `../${m.thumbnail}`;
    $('orderModelImg').alt = `Aperçu du faire-part ${m.name}`;
    $('orderModelTags').textContent = m.tags.join(' · ');
    $('orderModelDemo').hidden = !m.available;
    $('orderModelDemo').href = `../${m.previewUrl}`;
    $('orderModelNote').hidden = m.available;
    $('orderModelNote').textContent = m.available ? '' : 'Ce modèle arrive bientôt : nous vous confirmons le délai de livraison avant de commencer.';
  }
  select.addEventListener('change', () => { showModel(); update(); });

  // --- Formules et options ---
  const formulaFromUrl = NOOR_FORMULAS.find((f) => f.id === params.get('formule'));
  $('formulaChoices').innerHTML = NOOR_FORMULAS.map((f) => `
    <label class="order-choice">
      <input type="radio" name="formule" value="${f.id}" ${f.id === (formulaFromUrl ? formulaFromUrl.id : 'signature') ? 'checked' : ''}>
      <span class="order-choice-body">
        <span class="order-choice-name">${f.name}${f.id === 'signature' ? ' <em>Le plus choisi</em>' : ''}</span>
        <span class="order-choice-text">${f.summary}</span>
      </span>
      <b class="order-choice-price">${noorEuros(f.price)}</b>
    </label>`).join('');
  $('optionChoices').innerHTML = NOOR_OPTIONS.map((o) => `
    <label class="order-option">
      <input type="checkbox" name="options" value="${o.id}">
      <span>${o.name}</span>
      <b>+ ${noorEuros(o.price)}</b>
    </label>`).join('');

  const currentFormula = () => NOOR_FORMULAS.find((f) => f.id === form.querySelector('input[name="formule"]:checked').value);
  const currentOptions = () => [...form.querySelectorAll('input[name="options"]:checked')]
    .map((c) => NOOR_OPTIONS.find((o) => o.id === c.value));

  function totals() {
    const f = currentFormula();
    const opts = currentOptions();
    const total = f.price + opts.reduce((s, o) => s + o.price, 0);
    const deposit = Math.round(f.price * NOOR_DEPOSIT_RATE * 100) / 100;
    return { f, opts, total, deposit, rest: total - deposit };
  }

  function update() {
    const { f, opts, total, deposit, rest } = totals();
    $('orderLines').innerHTML = [
      `<li><span>Modèle ${currentModel().name}</span><b>inclus</b></li>`,
      `<li><span>Formule ${f.name}</span><b>${noorEuros(f.price)}</b></li>`,
      ...opts.map((o) => `<li><span>${o.name}</span><b>+ ${noorEuros(o.price)}</b></li>`),
    ].join('');
    $('orderTotal').textContent = noorEuros(total);
    $('orderDeposit').textContent = noorEuros(deposit);
    $('orderRest').textContent = `Le solde de ${noorEuros(rest)} est à régler à la mise en ligne de votre faire-part.`;
    $('payButton').textContent = `Payer l'acompte de ${noorEuros(deposit)}`;
  }
  form.addEventListener('change', update);
  showModel();
  update();

  // --- Validation et paiement ---
  const orderId = () => {
    const d = new Date();
    const ymd = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `NOOR-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  };

  function recap(id) {
    const { f, opts, total, deposit, rest } = totals();
    return [
      `Commande ${id}`,
      `Modèle : ${currentModel().name}`,
      `Formule : ${f.name} (${noorEuros(f.price)})`,
      `Options : ${opts.length ? opts.map((o) => `${o.name} (+ ${noorEuros(o.price)})`).join(', ') : 'aucune'}`,
      `Total : ${noorEuros(total)} — acompte ${noorEuros(deposit)}, solde ${noorEuros(rest)}`,
      `Prénoms : ${$('couple').value.trim()}`,
      `Date du mariage : ${$('weddingDate').value}`,
      `E-mail : ${$('email').value.trim()}`,
      `WhatsApp : ${$('phone').value.trim()}`,
      `Message : ${$('message').value.trim() || '—'}`,
    ].join('\n');
  }

  const error = $('orderError');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    if (!form.checkValidity()) {
      const first = form.querySelector(':invalid');
      error.textContent = first && first.id === 'cgv'
        ? 'Merci d\'accepter les conditions générales de vente.'
        : 'Merci de compléter vos prénoms, la date du mariage, votre e-mail et votre WhatsApp.';
      error.hidden = false;
      if (first) first.focus();
      return;
    }
    const button = $('payButton');
    button.disabled = true;
    button.textContent = 'Un instant…';

    const id = orderId();
    const text = recap(id);
    const { f, deposit } = totals();
    try { sessionStorage.setItem('noorOrder', JSON.stringify({ id, model: currentModel().name, formula: f.name, deposit })); } catch (err) { /* stockage indisponible */ }

    // Récapitulatif par e-mail (on n'empêche pas le paiement si l'envoi échoue)
    try {
      const data = new FormData();
      data.append('_subject', `Nouvelle commande ${id} — ${currentModel().name}, ${f.name}`);
      data.append('_template', 'box');
      data.append('commande', text);
      data.append('email', $('email').value.trim());
      await fetch(`https://formsubmit.co/ajax/${NOOR_ORDER_EMAIL}`, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
    } catch (err) { /* on continue vers le paiement */ }

    const link = NOOR_PAYMENT_LINKS[f.id];
    if (link) {
      const url = new URL(link);
      url.searchParams.set('prefilled_email', $('email').value.trim());
      url.searchParams.set('client_reference_id', id);
      location.href = url.toString();
    } else {
      // Paiement en ligne pas encore configuré : on envoie la commande sur WhatsApp
      location.href = `https://wa.me/${NOOR_WHATSAPP}?text=${encodeURIComponent(`Bonjour ! Je souhaite commander :\n${text}`)}`;
      button.disabled = false;
      update();
    }
  });
})();
