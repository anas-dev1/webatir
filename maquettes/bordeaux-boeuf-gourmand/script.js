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

  /* --- Ambiance animée (html[data-anime]) : apparitions, parallaxe, en-tête, bandeau, vidéo --- */
  var racine = document.documentElement;
  if (racine.hasAttribute('data-anime')) {
    var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var connexion = navigator.connection || {};

    /* Vidéo du hero : on la retire si l'utilisateur veut moins d'animations ou économise les données. */
    var video = document.querySelector('video.hero__photo');
    if (video && (reduit || connexion.saveData)) {
      var affiche = document.createElement('img');
      affiche.className = 'hero__photo'; affiche.src = video.poster; affiche.alt = video.getAttribute('aria-label') || '';
      video.parentNode.replaceChild(affiche, video);
    }

    /* Apparitions au défilement : chaque élément reçoit data-rvl et un rang parmi ses frères. */
    var cibles = '.section__titre, .section__intro, .mention, .apropos__int p, .evenement__int, .formule, .categorie__titre, .categorie__intro, .plat, .categorie__note, .carte__tout, .galerie__item, .infos__bloc, .infos__carte, .carte__fin';
    var elements = Array.prototype.slice.call(document.querySelectorAll(cibles));
    elements.forEach(function (el) {
      var rang = 0, frere = el;
      while ((frere = frere.previousElementSibling) && rang < 8) if (frere.hasAttribute('data-rvl')) rang++;
      el.setAttribute('data-rvl', ''); el.style.setProperty('--i', rang);
    });
    if (reduit || !('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var obsRvl = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-visible'); obsRvl.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      elements.forEach(function (el) { obsRvl.observe(el); });
      /* Ce qui est déjà à l'écran au chargement apparaît tout de suite. */
      elements.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-visible'); });
    }

    /* Parallaxe du hero (desktop uniquement) et en-tête qui se cache en descendant. */
    var media = document.querySelector('.hero__media');
    var hero = document.querySelector('.hero');
    var dernierY = window.scrollY, enAttente = false;
    function cadre() {
      enAttente = false;
      var y = window.scrollY;
      if (media && hero && !reduit && window.matchMedia('(min-width: 48rem)').matches && y < hero.offsetHeight) {
        media.style.transform = 'translate3d(0,' + Math.round(y * 0.25) + 'px,0)';
      }
      if (entete) {
        if (y > 320 && y > dernierY + 4) entete.classList.add('entete--cachee');
        else if (y < dernierY - 4 || y < 120) entete.classList.remove('entete--cachee');
      }
      dernierY = y;
    }
    window.addEventListener('scroll', function () {
      if (!enAttente) { enAttente = true; window.requestAnimationFrame(cadre); }
    }, { passive: true });

    /* Bandeau défilant : on double le contenu pour une boucle sans couture. */
    var piste = document.querySelector('.bandeau__piste');
    if (piste && !reduit) piste.innerHTML += piste.innerHTML;
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
