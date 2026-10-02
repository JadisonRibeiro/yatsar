(function () {
  'use strict';

  var root = document.documentElement;
  var mode = root.getAttribute('data-intro') || 'none';
  var intro = document.getElementById('intro');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     INTRO
     full  ≈ 5s  · short ≈ 1.5s (visita nas últimas 6h) · none
     ------------------------------------------------------------------ */
  var TIMING = {
    full: { reveal: 4650, end: 5200 },
    short: { reveal: 1450, end: 1950 }
  };
  var timers = [];
  var finished = false;

  function ready() { root.classList.add('is-ready'); }

  function teardown() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    root.classList.remove('is-intro');
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    detachSkipListeners();
  }

  function reveal() {
    ready();
    if (intro) intro.classList.add('is-leaving');
  }

  function skip() {
    if (finished) return;
    timers.forEach(clearTimeout);
    reveal();
    timers.push(setTimeout(teardown, 560));
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
    var t = TIMING[mode];
    intro.classList.add('is-playing');
    timers.push(setTimeout(reveal, t.reveal));
    timers.push(setTimeout(teardown, t.end));
  }

  try { localStorage.setItem('yatsar:intro', String(Date.now())); } catch (e) {}

  if (intro && (mode === 'full' || mode === 'short')) {
    root.classList.add('is-intro');

    var skipBtn = document.getElementById('introSkip');
    if (skipBtn) skipBtn.addEventListener('click', skip);
    intro.addEventListener('click', function (e) { if (e.target !== skipBtn) skip(); });
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onScrollIntent, { passive: true });
    window.addEventListener('touchmove', onScrollIntent, { passive: true });

    if (mode === 'full') {
      /* A fase da linha (0–1s) já está rodando enquanto a foto decodifica;
         esperamos no máximo 700ms para não segurar ninguém. */
      var img = document.getElementById('introImg');
      var started = false;
      var start = function () { if (!started && !finished) { started = true; play(); } };
      if (img && img.complete && img.naturalWidth) start();
      else {
        if (img && img.decode) img.decode().then(start, start);
        else if (img) { img.addEventListener('load', start); img.addEventListener('error', start); }
        setTimeout(start, 700);
      }
    } else {
      play();
    }
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
