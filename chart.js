// Rack power density chart. Draws an SVG at the container's real width (so type
// stays at true size on a phone) and redraws on resize.
// Points are the published racks; the line is an exponential fit to all of them
// (AMD included), solid up to today and dashed beyond, fading out past 1 MW.
// Labels name the system only: the y axis carries kW, the tooltip the details.
(function () {
  var host = document.getElementById('densityPlot');
  var tip = document.getElementById('densityTip');
  if (!host) return;

  var ACCENT = '#FF3DA6', TODAY_C = '#C46A9C', AMD = '#F57A20', SURFACE = '#161320';
  var GRID = 'rgba(255,255,255,0.07)';
  var TODAY = 2026.82;

  // x = calendar year (decimal), y = kW per rack. est = estimate (hollow marker).
  var PTS = [
    { id: 'air', x: 2020.5, y: 15, lines: ['Air-cooled', 'rack'], name: 'Air-cooled rack',
      val: '10–20 kW', when: 'Before 2022', note: 'Typical air-cooled enterprise and HPC rack' },
    { id: 'h100', x: 2023.0, y: 41, lines: ['H100 · H200'], nlines: ['H100', 'H200'], name: 'H100 · H200',
      val: '~40 kW', when: '2022–24', note: 'Four DGX-class servers at 10.2 kW each, air-cooled' },
    { id: 'gb200', x: 2025.0, y: 120, lines: ['GB200'], name: 'GB200 NVL72',
      val: '~120 kW', when: '2025', note: 'Direct-to-chip liquid' },
    { id: 'gb300', x: 2025.75, y: 140, lines: ['GB300'], name: 'GB300 NVL72',
      val: 'up to 140 kW', when: '2H 2025', note: 'Direct-to-chip liquid' },
    { id: 'vr', x: 2026.75, y: 210, lo: 190, hi: 230, lines: ['VR200'], name: 'VR200 · Vera Rubin NVL72',
      val: '~190–230 kW', when: 'Shipping from 2H 2026', note: 'Max-Q ~190 kW, Max-P ~230 kW' },
    { id: 'amd', x: 2026.9, y: 246, vendor: 'amd', lines: ['AMD Helios'], name: 'AMD Helios (MI450)',
      val: '~246 kW', when: '2H 2026', note: 'Schneider Electric reference design' },
    { id: 'kyber', x: 2028.4, y: 600, lines: ['VR300', 'Kyber'], name: 'VR300 · Rubin Ultra, Kyber rack',
      val: '~600 kW', when: 'Plotted mid-2028', note: 'NVIDIA says 2H 2027; a slip of the Kyber rack to 2028 has been reported. Power as announced in 2025' },
    { id: 'feyn', x: 2029.25, y: 1000, est: true, lines: ['Feynman'], name: 'Feynman',
      val: '~1 MW, estimate', when: 'Plotted 2029', note: 'NVIDIA roadmap says 2028; it follows the Kyber rack. No published rack power; ~2 kW per GPU × 576 GPUs' }
  ];

  // Exponential fit y = A·e^(b·(x−2020)), least squares on ln(y).
  var FIT = (function () {
    var n = PTS.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    PTS.forEach(function (p) { var x = p.x - 2020, y = Math.log(p.y); sx += x; sy += y; sxx += x * x; sxy += x * y; });
    var b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n;
    return { f: function (x) { return Math.exp(a + b * (x - 2020)); },
             inv: function (y) { return 2020 + (Math.log(y) - a) / b; },
             doublingMonths: 12 * Math.log(2) / b };
  })();
  var cap = document.getElementById('densityDoubling');
  if (cap) cap.textContent = String(Math.round(FIT.doublingMonths));

  // Label placement per point: [anchor, dx, dy of the first line].
  var LAB = {
    wide: {
      air: ['middle', 0, -36], h100: ['middle', 0, -16], gb200: ['end', -12, -10], gb300: ['middle', 0, 26],
      vr: ['middle', 0, 36], amd: ['start', 14, 5], kyber: ['end', -14, -4], feyn: ['end', -16, 5]
    },
    narrow: {
      air: ['middle', 6, -34], h100: ['middle', 0, -32], gb200: ['middle', 0, -14], gb300: ['middle', 0, 24],
      vr: ['start', 10, 36], amd: null, kyber: ['end', -12, -4], feyn: ['end', -12, 5]
    }
  };

  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function draw() {
    var W = host.clientWidth;
    if (!W) return;
    var narrow = W < 620;
    var H = +host.dataset.h || (narrow ? 380 : 440);
    var m = { l: narrow ? 40 : 54, r: narrow ? 12 : 24, t: 30, b: 34 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var X0 = 2020, X1 = 2030, Y1 = 1200;
    var sx = function (v) { return m.l + (v - X0) / (X1 - X0) * pw; };
    var sy = function (v) { return m.t + ph - v / Y1 * ph; };

    host.innerHTML = '';
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, host);
    var defs = el('defs', {}, svg);
    var clip = el('clipPath', { id: 'plotClip' }, defs);
    el('rect', { x: m.l, y: m.t - 4, width: pw, height: ph + 4 }, clip);
    var wash = el('linearGradient', { id: 'areaWash', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': ACCENT, 'stop-opacity': '0.12' }, wash);
    el('stop', { offset: '1', 'stop-color': ACCENT, 'stop-opacity': '0' }, wash);

    // Grid and y axis
    [0, 250, 500, 750, 1000].forEach(function (v) {
      el('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), stroke: v === 0 ? 'rgba(255,255,255,0.16)' : GRID, 'stroke-width': 1 }, svg);
      var t = el('text', { x: m.l - 10, y: sy(v) + 4, 'text-anchor': 'end', class: 'ax' }, svg);
      t.textContent = v.toLocaleString('en-AU');
    });
    var yl = el('text', { x: m.l - 10, y: m.t - 14, 'text-anchor': 'end', class: 'ax' }, svg);
    yl.textContent = 'kW';

    // x axis
    for (var yr = X0; yr <= X1; yr += (narrow ? 2 : 1)) {
      var tx = el('text', { x: sx(yr), y: H - 10, 'text-anchor': 'middle', class: 'ax' }, svg);
      tx.textContent = narrow ? "'" + String(yr).slice(2) : yr;
    }

    // Trend curve, sampled. Solid to today, dashed to 1 MW, then a dashed tail
    // that fades as it leaves the top of the plot.
    var xMW = FIT.inv(1000), xTop = Math.min(X1, FIT.inv(Y1 * 1.04));
    function curve(a, b) {
      var d = '', steps = Math.max(8, Math.round((b - a) * 40));
      for (var i = 0; i <= steps; i++) {
        var x = a + (b - a) * i / steps;
        d += (i ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + sy(FIT.f(x)).toFixed(1);
      }
      return d;
    }
    var g = el('g', { 'clip-path': 'url(#plotClip)' }, svg);
    el('path', { d: curve(X0, TODAY) + ' L' + sx(TODAY) + ' ' + sy(0) + ' L' + sx(X0) + ' ' + sy(0) + ' Z', fill: 'url(#areaWash)' }, g);
    // Projected zone: hatched area under the dashed part of the curve.
    var hatch = el('pattern', { id: 'projHatch', patternUnits: 'userSpaceOnUse', width: 7, height: 7, patternTransform: 'rotate(45)' }, defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: ACCENT, 'stroke-width': 1, 'stroke-opacity': 0.24 }, hatch);
    el('path', { d: curve(TODAY, xTop) + ' L' + sx(xTop) + ' ' + sy(0) + ' L' + sx(TODAY) + ' ' + sy(0) + ' Z', fill: 'url(#projHatch)' }, g);
    var line = { fill: 'none', stroke: ACCENT, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    el('path', Object.assign({ d: curve(X0, TODAY) }, line), g);
    el('path', Object.assign({ d: curve(TODAY, xMW), 'stroke-dasharray': '5 5' }, line), g);
    var fade = el('linearGradient', { id: 'tailFade', gradientUnits: 'userSpaceOnUse', x1: sx(xMW), y1: sy(1000), x2: sx(xTop), y2: sy(FIT.f(xTop)) }, defs);
    el('stop', { offset: '0', 'stop-color': ACCENT, 'stop-opacity': '1' }, fade);
    el('stop', { offset: '1', 'stop-color': ACCENT, 'stop-opacity': '0' }, fade);
    el('path', Object.assign({}, line, { d: curve(xMW, xTop), stroke: 'url(#tailFade)', 'stroke-dasharray': '5 5' }), g);
    var bl = el('text', { x: sx(xMW) - (narrow ? 8 : 12), y: sy(1150), 'text-anchor': 'end', class: 'lb2' }, svg);
    bl.textContent = 'Beyond 1 MW';

    // Today marker: dashed, muted magenta, splits published history from projection.
    el('line', { x1: sx(TODAY), x2: sx(TODAY), y1: m.t - 6, y2: m.t + ph, stroke: TODAY_C, 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    var td = el('text', { x: sx(TODAY) + (narrow ? -6 : 6), y: m.t - 8, 'text-anchor': narrow ? 'end' : 'start', class: 'ax', fill: TODAY_C, style: 'fill:' + TODAY_C }, svg);
    td.textContent = 'Today';

    // VR200 Max-Q to Max-P range
    var vr = PTS.filter(function (p) { return p.id === 'vr'; })[0];
    el('line', { x1: sx(vr.x), x2: sx(vr.x), y1: sy(vr.lo), y2: sy(vr.hi), stroke: ACCENT, 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0.4 }, svg);

    // Markers
    PTS.forEach(function (p) {
      var cx = sx(p.x), cy = sy(p.y);
      if (p.vendor === 'amd') {
        var d = 6;
        el('path', { d: 'M' + cx + ' ' + (cy - d) + ' L' + (cx + d) + ' ' + cy + ' L' + cx + ' ' + (cy + d) + ' L' + (cx - d) + ' ' + cy + ' Z',
          fill: AMD, stroke: SURFACE, 'stroke-width': 2 }, svg);
      } else if (p.est) {
        el('circle', { cx: cx, cy: cy, r: 5, fill: SURFACE, stroke: ACCENT, 'stroke-width': 2 }, svg);
      } else {
        el('circle', { cx: cx, cy: cy, r: 5, fill: ACCENT, stroke: SURFACE, 'stroke-width': 2 }, svg);
      }
    });

    // Direct labels: system name only
    var lab = narrow ? LAB.narrow : LAB.wide;
    PTS.forEach(function (p) {
      var L = lab[p.id];
      if (!L) return;
      ((narrow && p.nlines) || p.lines).forEach(function (s, i) {
        var t = el('text', { x: sx(p.x) + L[1], y: sy(p.y) + L[2] + i * 15, 'text-anchor': L[0], class: 'lb' }, svg);
        t.textContent = s;
      });
    });

    // Hit targets for hover and keyboard focus
    PTS.forEach(function (p) {
      var hit = el('circle', { cx: sx(p.x), cy: sy(p.y), r: 16, fill: 'transparent', tabindex: 0, class: 'hit' }, svg);
      var show = function () {
        tip.innerHTML = '<b>' + p.name + '</b><span>' + p.val + ' · ' + p.when + '</span><em>' + p.note + '</em>';
        tip.hidden = false;
        var tw = tip.offsetWidth, left = sx(p.x) - tw / 2;
        left = Math.max(4, Math.min(W - tw - 4, left));
        var top = sy(p.y) - tip.offsetHeight - 14;
        if (top < 0) top = sy(p.y) + 16;
        tip.style.left = left + 'px'; tip.style.top = top + 'px';
      };
      var hide = function () { tip.hidden = true; };
      hit.addEventListener('mouseenter', show); hit.addEventListener('focus', show);
      hit.addEventListener('mouseleave', hide); hit.addEventListener('blur', hide);
    });
  }

  draw();
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(draw, 120); });
})();
