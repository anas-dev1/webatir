/* Gabarit restaurant Webatir – comportements : état d'ouverture, onglets de la
   carte, galerie plein écran, ombre de l'en-tête. Vanilla, aucune dépendance. */
(function () {
  'use strict';
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function heure(h) {
    if (!h) return '';
    var p = h.split(':');
    if (p[0] === '00' && p[1] === '00') return 'minuit';
    return parseInt(p[0], 10) + 'h' + (p[1] === '00' ? '' : p[1]);
  }
  function minutes(h) {
    var p = h.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  /* Plages d'un jour en minutes absolues depuis minuit (une fin <= début = le lendemain). */
  function plages(jours, nomJour) {
    return (jours[nomJour] || []).map(function (r) {
      var de = minutes(r.de), a = minutes(r.a);
      if (a <= de) a += 24 * 60;
      return { de: de, a: a, note: r.note || '', brut: r };
    });
  }
  function moment(m) {
    return m >= 17 * 60 ? 'ce soir' : m < 11 * 60 + 30 ? 'ce matin' : 'ce midi';
  }

  function etat(jours, maintenant) {
    var d = maintenant.getDay();
    var now = maintenant.getHours() * 60 + maintenant.getMinutes();
    var auj = JOURS[d], hier = JOURS[(d + 6) % 7];
    var i, r;
    /* Encore ouvert depuis hier (service qui finit après minuit) ? */
    var ph = plages(jours, hier);
    for (i = 0; i < ph.length; i++) {
      r = ph[i];
      if (r.a > 24 * 60 && now + 24 * 60 < r.a) return { ouvert: true, texte: 'Ouvert · jusqu’à ' + heure(r.brut.a) };
    }
    var pa = plages(jours, auj);
    for (i = 0; i < pa.length; i++) {
      r = pa[i];
      if (now >= r.de && now < r.a) {
        return { ouvert: true, texte: 'Ouvert ' + moment(now) + (r.note ? ' · ' + r.note : '') + ' · jusqu’à ' + heure(r.brut.a) };
      }
    }
    for (i = 0; i < pa.length; i++) {
      r = pa[i];
      if (now < r.de) return { ouvert: false, texte: 'Fermé pour l’instant · ouvre ' + moment(r.de) + ' à ' + heure(r.brut.de) + (r.note ? ' (' + r.note + ')' : '') };
    }
    for (var k = 1; k <= 7; k++) {
      var nom = JOURS[(d + k) % 7];
      var pn = plages(jours, nom);
      if (pn.length) {
        var quand = k === 1 ? 'demain' : nom;
        return { ouvert: false, texte: 'Fermé aujourd’hui · réouverture ' + quand + ' à ' + heure(pn[0].brut.de) };
      }
    }
    return { ouvert: false, texte: 'Fermé' };
  }

  /* --- État d'ouverture dans le hero + surlignage du jour dans le tableau --- */
  var noeud = document.getElementById('donnees-horaires');
  var statut = document.getElementById('statut');
  if (noeud && statut) {
    try {
      var data = JSON.parse(noeud.textContent);
      var nbPlages = Object.keys(data.jours || {}).reduce(function (n, j) { return n + (data.jours[j] || []).length; }, 0);
      if (nbPlages) {
        var e = etat(data.jours, new Date());
        statut.querySelector('.statut__texte').textContent = e.texte + (data.a_confirmer ? ' (à confirmer)' : '');
        statut.classList.add(e.ouvert ? 'statut--ouvert' : 'statut--ferme');
        statut.hidden = false;
      }
    } catch (err) { /* JSON invalide : on n'affiche rien */ }
    var ligne = document.querySelector('.horaires tr[data-jour="' + JOURS[new Date().getDay()] + '"]');
    if (ligne) ligne.classList.add('horaires__aujourdhui');
  }

  /* --- En-tête : ombre au défilement --- */
  var entete = document.querySelector('.entete');
  function ombre() { entete.classList.toggle('entete--ombre', window.scrollY > 8); }
  if (entete) { ombre(); window.addEventListener('scroll', ombre, { passive: true }); }

  /* --- Onglets de la carte : surlignage de la catégorie visible, onglet actif centré --- */
  var onglets = Array.prototype.slice.call(document.querySelectorAll('.onglet'));
  if (onglets.length && 'IntersectionObserver' in window) {
    var parId = {};
    onglets.forEach(function (o) { parId[o.getAttribute('href').slice(1)] = o; });
    var actif = null;
    function activer(id) {
      var o = parId[id];
      if (!o || o === actif) return;
      if (actif) actif.classList.remove('onglet--actif');
      o.classList.add('onglet--actif');
      actif = o;
      var piste = o.parentNode;
      var cible = o.offsetLeft - (piste.clientWidth - o.offsetWidth) / 2;
      piste.scrollLeft = cible; /* sans animation : un défilement programmé « smooth » interrompt celui de la page */
    }
    var visibles = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visibles[en.target.id] = en.isIntersecting ? en.boundingClientRect.top : null; });
      var meilleur = null, top = Infinity;
      Object.keys(visibles).forEach(function (id) {
        if (visibles[id] !== null && visibles[id] < top) { top = visibles[id]; meilleur = id; }
      });
      if (meilleur) activer(meilleur);
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.01] });
    Object.keys(parId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) obs.observe(s);
    });
    onglets.forEach(function (o) {
      o.addEventListener('click', function () { activer(o.getAttribute('href').slice(1)); });
    });
  }

  /* --- Galerie : lightbox avec <dialog> --- */
  var lb = document.getElementById('lightbox');
  var vignettes = Array.prototype.slice.call(document.querySelectorAll('.galerie__item'));
  if (lb && vignettes.length && typeof lb.showModal === 'function') {
    var img = lb.querySelector('img'), legende = lb.querySelector('.lightbox__legende'), courant = 0;
    function montrer(i) {
      courant = (i + vignettes.length) % vignettes.length;
      var src = vignettes[courant].querySelector('img');
      img.src = src.src; img.alt = src.alt; legende.textContent = src.alt;
    }
    vignettes.forEach(function (v, i) {
      v.addEventListener('click', function () { montrer(i); lb.showModal(); document.body.classList.add('sans-defilement'); });
    });
    lb.querySelector('.lightbox__fermer').addEventListener('click', function () { lb.close(); });
    lb.querySelector('.lightbox__prec').addEventListener('click', function () { montrer(courant - 1); });
    lb.querySelector('.lightbox__suiv').addEventListener('click', function () { montrer(courant + 1); });
    lb.addEventListener('click', function (ev) { if (ev.target === lb) lb.close(); });
    lb.addEventListener('close', function () { document.body.classList.remove('sans-defilement'); });
    lb.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') montrer(courant - 1);
      if (ev.key === 'ArrowRight') montrer(courant + 1);
    });
  }
})();
