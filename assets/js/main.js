(function () {
  'use strict';

  var root = document.documentElement;
  var mode = root.getAttribute('data-intro') || 'none';
  var intro = document.getElementById('intro');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     INTRO
     full ≈ 3s + voo da logo até o cabeçalho · none
     ------------------------------------------------------------------ */
  var REVEAL_AT = 2250;
  var FLIGHT = 900;   // voo da logo
  var EXIT = 1150;    // voo + persianas (a última coluna termina por volta de 1.08s)
  var FADE = 560;     // saída simples, só se o navegador não tiver Web Animations
  var timers = [];
  var finished = false;
  var leaving = false;

  function ready() { root.classList.add('is-ready'); }

  function teardown() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    root.classList.remove('is-intro');
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    detachSkipListeners();
  }

  /* A logo da intro voa e pousa exatamente sobre a logo do cabeçalho.
     viewBox da intro: "20 30 117 86"; as letras ocupam x 28.6–129.8, y 35–111.6. */
  function flyLogo() {
    var art = intro.querySelector('.intro__art');
    var svg = art && art.querySelector('.intro__logo');
    var target = document.querySelector('.topbar__logo svg');
    if (!svg || !target || !art.animate) return false;

    var r = svg.getBoundingClientRect();
    var t = target.getBoundingClientRect();
    if (!r.width || !t.width) return false;

    var ox = (8.6 / 117) * r.width;            // início das letras dentro da arte
    var oy = (5 / 86) * r.height;
    var s = t.width / (r.width * 101.2 / 117);  // escala para a largura da logo do cabeçalho

    art.style.left = r.left + 'px';
    art.style.top = r.top + 'px';
    art.style.transform = 'none';
    art.style.transformOrigin = '0 0';

    var dx = t.left - r.left - ox * s;
    var dy = t.top - r.top - oy * s;
    art.animate(
      [
        { transform: 'translate(0, 0) scale(1)' },
        { transform: 'translate(' + (dx * 0.5) + 'px, ' + (dy * 0.42) + 'px) scale(' + (1 + (s - 1) * 0.55) + ') rotate(-2deg)', offset: 0.55 },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + (s * 1.07) + ')', offset: 0.86 },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')' }
      ],
      { duration: FLIGHT, easing: 'cubic-bezier(.7, 0, .2, 1)', fill: 'forwards' }
    );
    return true;
  }

  function reveal() {
    if (leaving || !intro) return;
    leaving = true;
    ready();
    if (flyLogo()) {
      intro.classList.add('is-flying');
      timers.push(setTimeout(teardown, EXIT));
    } else {
      intro.classList.add('is-leaving');
      timers.push(setTimeout(teardown, FADE));
    }
  }

  function skip() {
    if (finished || leaving) return;
    timers.forEach(clearTimeout);
    reveal();
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      skip();
    }
  }
  function onScrollIntent() { skip(); }

  function detachSkipListeners() {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onScrollIntent);
    window.removeEventListener('touchmove', onScrollIntent);
  }

  function play() {
    intro.classList.add('is-playing');
    /* A caneta percorre o fio que conecta as letras (SMIL, sincronizado com o CSS) */
    var pen = document.getElementById('penMotion');
    if (pen && pen.beginElementAt) {
      try { pen.beginElementAt(0.15); } catch (e) {}
    }
    timers.push(setTimeout(reveal, REVEAL_AT));
  }

  if (intro && mode === 'full') {
    root.classList.add('is-intro');

    var skipBtn = document.getElementById('introSkip');
    if (skipBtn) skipBtn.addEventListener('click', skip);
    intro.addEventListener('click', function (e) { if (e.target !== skipBtn) skip(); });
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onScrollIntent, { passive: true });
    window.addEventListener('touchmove', onScrollIntent, { passive: true });

    play();
  } else {
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    ready();
  }

  /* ------------------------------------------------------------------
     Reveal no scroll
     ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------------
     WhatsApp flutuante: aparece quando o CTA do hero sai da tela
     e some quando a área de links está visível.
     ------------------------------------------------------------------ */
  var fab = document.getElementById('fab');
  var heroActions = document.getElementById('heroActions');
  var contact = document.getElementById('contato');
  if (fab && heroActions && contact && 'IntersectionObserver' in window) {
    var heroVisible = true, contactVisible = false;
    var sync = function () {
      var show = !heroVisible && !contactVisible;
      fab.classList.toggle('is-visible', show);
      fab.setAttribute('aria-hidden', show ? 'false' : 'true');
      fab.tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; sync(); }).observe(heroActions);
    new IntersectionObserver(function (e) { contactVisible = e[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(contact);
  }

  /* ------------------------------------------------------------------
     Profundidade sutil no retrato (apenas desktop com mouse)
     ------------------------------------------------------------------ */
  var portrait = document.getElementById('portrait');
  if (portrait && !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var img2 = portrait.querySelector('.portrait__img');
    var outline = portrait.querySelector('.portrait__outline');
    var badge = portrait.querySelector('.badge');
    var raf = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5);
      ty = (e.clientY / window.innerHeight - 0.5);
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        if (!root.classList.contains('is-ready')) return;
        img2.style.translate = (tx * 10).toFixed(2) + 'px ' + (ty * 6).toFixed(2) + 'px';
        outline.style.translate = (tx * -14).toFixed(2) + 'px ' + (ty * -10).toFixed(2) + 'px';
        badge.style.translate = (tx * 18).toFixed(2) + 'px ' + (ty * 14).toFixed(2) + 'px';
      });
    }, { passive: true });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
