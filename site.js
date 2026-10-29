// Scaphon site behaviour: sticky-nav border, mobile menu, scroll spy, scroll reveal.
// No dependencies. Every effect degrades to static content if this file fails.
(function () {
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');

  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.querySelectorAll('#menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scroll spy: the nav link of the section in view turns magenta. Sections
  // without a nav link (market, status) clear the highlight.
  var links = {};
  nav.querySelectorAll('#menu a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var current = null, ticking = false;
  function spy() {
    ticking = false;
    var line = window.innerHeight * 0.35, id = null;
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) id = s.id; });
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 2) id = sections[sections.length - 1].id;
    var a = links[id] || null;
    if (a === current) return;
    if (current) { current.classList.remove('active'); current.removeAttribute('aria-current'); }
    if (a) { a.classList.add('active'); a.setAttribute('aria-current', 'true'); }
    current = a;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  window.addEventListener('resize', spy);
  spy();

  var targets = document.querySelectorAll('.reveal, .chart');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  targets.forEach(function (el) { io.observe(el); });
})();
