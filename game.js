/* LAWLESS v3 — واجهة مزخرفة + خلفية فنية + مشهد تحطيم عند فتح البوابة */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
var cv = $('#c'), cx = cv.getContext('2d', { alpha: false });
var COL = { purple: '#8a5cf0', cyan: '#6fe3f2', gold: '#f0c970' };
var DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
var DIRS = ['up', 'right', 'down', 'left'];
var ANG = { down: 0, left: Math.PI / 2, up: Math.PI, right: -Math.PI / 2 };
var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var SAVE_KEY = 'lawless_save_v1';
var save = { done: {}, muted: false, fx: true, vib: true };
try { var s0 = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); if (s0.done) save.done = s0.done; save.muted = !!s0.muted; if (s0.fx === false) save.fx = false; if (s0.vib === false) save.vib = false; } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
AudioFX.setMuted(save.muted);
function fxk() { return reduce ? 0.2 : save.fx ? 1 : 0.4; }
function vibrate(p) { try { if (save.vib && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

var G = { ri: 0, room: null, lv: null, blocks: [], hist: [], redo: [], plan: {}, preview: null,
  sel: -1, mode: 'planning', moves: 0, wasted: 0, anim: null, shake: 0, parts: [], rings: [], gateOpen: 0,
  paused: true, title: true, t: 0, dt: 0.016, solvedAt: 0, clearShown: false, intro: 0, flash: 0, fieldA: 0, fieldDir: 'down', streaks: [],
  gone: {}, cine: null, deb: [], puffs: [], rubble: [], shards: [], suck: [], blockGone: {}, gateGlow: 0, punch: 0 };
var W = 0, H = 0, DPR = 1, cs = 40, dz = 8, ox = 0, oy = 0, fp = 14, started = false;
var Lb = null, Lw = null, gemPts = [], vig = null;
var SP = {}, motes = [], mi;
for (mi = 0; mi < 40; mi++) motes.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, s: 0.008 + Math.random() * 0.03, ph: Math.random() * 6.28, c: Math.random() < 0.5 ? '255,226,150' : '170,200,255' });
for (mi = 0; mi < 30; mi++) G.streaks.push({ u: Math.random(), v: Math.random(), s: 0.5 + Math.random() * 0.9, l: 0.4 + Math.random() * 0.7, ph: Math.random() * 6.28 });
var bgImg = new Image(); bgImg.src = 'assets/bg.jpg';

/* ---------- أدوات ---------- */
function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function hh(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
function easeBack(t) { t = clamp(t, 0, 1); var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function stepDur(i) { return Math.max(0.05, 0.13 - i * 0.016); }
var toastT = 0;
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2300);
}
var hintT = 0;
function showHint(msg) {
  var h = $('#hint'); h.textContent = msg; h.classList.add('show');
  clearTimeout(hintT); hintT = setTimeout(function () { h.classList.remove('show'); }, 9000);
}
function panelOpen() { return !!document.querySelector('.panel.show'); }
function show(id) { $(id).classList.add('show'); }
function hide(id) { $(id).classList.remove('show'); }
function cxy(x, y) { return [ox + (x + 0.5) * cs, oy + (y + 0.5) * cs]; }
function gatePx() { var g = G.lv.gates[0], c = cxy(g.x, g.y); return [c[0], c[1] - dz * 0.4]; }

/* ---------- موصلات الطاقة ---------- */
function buildPaths(lv) {
  var g = lv.gates[0]; if (!g) return;
  lv.plates.forEach(function (p) {
    var pts = [[p.x, p.y]], ry = g.y + 1;
    if (p.y !== ry) pts.push([p.x, ry]);
    if (p.x !== g.x) pts.push([g.x, ry]);
    pts.push([g.x, g.y]);
    var out = [pts[0]];
    for (var i = 1; i < pts.length; i++) if (pts[i][0] !== out[out.length - 1][0] || pts[i][1] !== out[out.length - 1][1]) out.push(pts[i]);
    var len = 0; for (i = 1; i < out.length; i++) len += Math.abs(out[i][0] - out[i - 1][0]) + Math.abs(out[i][1] - out[i - 1][1]);
    p.path = out; p.len = Math.max(len, 0.001);
  });
}
function strokePath(g, pts, upto, lw, color) {
  var rem = upto === undefined ? 1e9 : upto, a = cxy(pts[0][0], pts[0][1]), i;
  g.save(); g.lineWidth = lw; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(a[0], a[1]);
  for (i = 1; i < pts.length && rem > 0; i++) {
    var b = cxy(pts[i][0], pts[i][1]), seg = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    if (seg <= rem) { g.lineTo(b[0], b[1]); rem -= seg; }
    else { var f = rem / seg; g.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); rem = 0; }
    a = b;
  }
  g.stroke(); g.restore();
}
function pathAt(pts, u) {
  var rem = u, i;
  for (i = 1; i < pts.length; i++) {
    var seg = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    if (rem <= seg || i === pts.length - 1) {
      var f = seg ? clamp(rem / seg, 0, 1) : 0;
      return cxy(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f);
    }
    rem -= seg;
  }
  return cxy(pts[0][0], pts[0][1]);
}

/* ---------- تحميل غرفة ---------- */
function resetCine() {
  G.cine = null; G.gone = {}; G.deb.length = 0; G.puffs.length = 0; G.rubble.length = 0; G.shards.length = 0; G.suck.length = 0; G.blockGone = {}; G.gateGlow = 0; G.punch = 0;
  document.body.classList.remove('cine');
}
function loadRoom(i) {
  G.ri = i; G.room = ROOMS[i]; G.lv = Sim.load(G.room); G.blocks = Sim.clone(G.lv.start);
  G.hist = []; G.redo = []; G.plan = {}; G.preview = null; G.sel = -1; G.mode = 'planning';
  G.moves = 0; G.wasted = 0; G.anim = null; G.gateOpen = 0; G.clearShown = false; G.parts.length = 0; G.rings.length = 0;
  G.shake = 0; G.intro = 0; G.flash = 0; G.fieldA = 0; resetCine();
  buildPaths(G.lv);
  G.lv.plates.forEach(function (p) { p.glow = 0; p.on = false; p.ripple = 0; });
  $('#roomName').textContent = String(i + 1).padStart(2, '0') + ' · ' + G.room.name;
  showHint(G.room.hint);
  layout(); refreshUI();
}

/* ---------- التخطيط ---------- */
function layout() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  var portrait = H > W;
  var tr = $('#top').getBoundingClientRect(), br = $('#bottom').getBoundingClientRect();
  var top = (tr.height ? tr.bottom : 64) + 6, bot = (br.height ? H - br.top : 150) + 6;
  if (G.lv) {
    var aw = W - 6, ah = H - top - bot;
    cs = Math.floor(Math.min(aw / (G.lv.w + 0.84), ah / (G.lv.h + 0.25 + 0.84), portrait ? 80 : 92)); cs = Math.max(cs, 18);
    dz = Math.round(cs * 0.2); fp = Math.round(cs * 0.42);
    ox = Math.round((W - cs * G.lv.w) / 2);
    oy = Math.round(top + (ah - cs * G.lv.h) / 2 + dz * 0.5);
  }
  vig = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.8);
  vig.addColorStop(0, 'rgba(6,2,22,0)'); vig.addColorStop(1, 'rgba(6,2,22,.32)');
  buildSprites(); buildStatic();
}

/* ---------- Sprites ---------- */
function halo(rgb, size) {
  var c = mk(size * DPR, size * DPR), g = c.getContext('2d'); g.scale(DPR, DPR);
  var gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(' + rgb + ',.55)'); gr.addColorStop(0.4, 'rgba(' + rgb + ',.18)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
function facetGem(g, mx, my, d, pal) {
  var w = d * 0.78;
  g.beginPath(); g.moveTo(mx, my - d); g.lineTo(mx + w, my); g.lineTo(mx, my + d); g.lineTo(mx - w, my); g.closePath();
  var gr = g.createLinearGradient(mx - w, my - d, mx + w, my + d); gr.addColorStop(0, pal[0]); gr.addColorStop(0.5, pal[1]); gr.addColorStop(1, pal[2]);
  g.fillStyle = gr; g.fill();
  g.beginPath(); g.moveTo(mx, my - d); g.lineTo(mx + w, my); g.lineTo(mx, my + d * 0.1); g.closePath(); g.fillStyle = 'rgba(255,255,255,.34)'; g.fill();
  g.beginPath(); g.moveTo(mx, my - d); g.lineTo(mx - w, my); g.lineTo(mx, my + d * 0.1); g.closePath(); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
  g.beginPath(); g.moveTo(mx - w, my); g.lineTo(mx, my + d); g.lineTo(mx, my + d * 0.1); g.closePath(); g.fillStyle = 'rgba(0,0,40,.25)'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, d * 0.06); g.beginPath(); g.moveTo(mx, my - d); g.lineTo(mx, my + d); g.moveTo(mx - w, my); g.lineTo(mx + w, my); g.globalAlpha = 0.45; g.stroke(); g.globalAlpha = 1;
}
function buildSprites() {
  var s = cs * 0.86, pad = cs * 0.45, size = s + pad * 2, x = pad, y = pad, r = s * 0.2, ext = cs * 0.09;
  var c = mk(size * DPR, size * DPR), g = c.getContext('2d'); g.scale(DPR, DPR);
  g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = cs * 0.24 * DPR; g.shadowOffsetY = cs * 0.1 * DPR; g.fillStyle = '#000'; rr(g, x, y + ext, s, s, r); g.fill(); g.restore();
  var ug = g.createLinearGradient(x, y, x, y + s + ext); ug.addColorStop(0, '#3a5fa8'); ug.addColorStop(1, '#14275c');
  rr(g, x, y + ext, s, s, r); g.fillStyle = ug; g.fill();
  var bg = g.createLinearGradient(x, y, x + s, y + s); bg.addColorStop(0, '#e8fbff'); bg.addColorStop(0.45, '#7fd4ee'); bg.addColorStop(1, '#4b86c9');
  rr(g, x, y, s, s, r); g.fillStyle = bg; g.fill();
  var inset = s * 0.1;
  var ig = g.createRadialGradient(x + s / 2, y + s * 0.4, 0, x + s / 2, y + s / 2, s * 0.6); ig.addColorStop(0, '#1c3f9a'); ig.addColorStop(1, '#0a1240');
  rr(g, x + inset, y + inset, s - inset * 2, s - inset * 2, r * 0.6); g.fillStyle = ig; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.stroke();
  facetGem(g, x + s / 2, y + s / 2, s * 0.3, ['#e6fbff', '#42a8ff', '#3a2cc8']);
  g.fillStyle = '#d6f6ff';
  [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]].forEach(function (p) {
    var px = x + s * p[0], py = y + s * p[1], q = s * 0.045;
    g.beginPath(); g.moveTo(px, py - q * 1.6); g.lineTo(px + q * 0.5, py - q * 0.5); g.lineTo(px + q * 1.6, py); g.lineTo(px + q * 0.5, py + q * 0.5); g.lineTo(px, py + q * 1.6); g.lineTo(px - q * 0.5, py + q * 0.5); g.lineTo(px - q * 1.6, py); g.lineTo(px - q * 0.5, py - q * 0.5); g.closePath(); g.fill();
  });
  rr(g, x, y, s, s, r); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = Math.max(1.2, s * 0.03); g.stroke();
  SP.block = c; SP.size = size; SP.pad = pad;
  SP.haloP = halo('138,92,240', cs * 3); SP.haloC = halo('111,227,242', cs * 3); SP.haloG = halo('240,201,112', cs * 3); SP.haloD = halo('150,130,205', cs * 3); SP.haloW = halo('255,255,255', cs * 3);
}

/* ---------- طبقات ثابتة (مقصوصة على اللوح) ---------- */
function mkLayer(x, y, w, h) {
  var c = mk(w * DPR, h * DPR), g = c.getContext('2d');
  return { c: c, g: g, x: x, y: y, w: w, h: h };
}
function resetLayer(L) {
  L.g.setTransform(1, 0, 0, 1, 0, 0); L.g.clearRect(0, 0, L.c.width, L.c.height);
  L.g.setTransform(DPR, 0, 0, DPR, -L.x * DPR, -L.y * DPR);
}
function buildStatic() {
  if (!G.lv) return;
  var m = cs * 0.8, lv = G.lv;
  var x = ox - fp - m, y = oy - dz - fp - m, w = lv.w * cs + 2 * (fp + m), h = lv.h * cs + dz + 2 * (fp + m);
  Lb = mkLayer(x, y, w, h); Lw = mkLayer(x, y, w, h);
  rebuildLayers();
}
function rebuildLayers() {
  if (!Lb) return;
  resetLayer(Lb); drawBoard(Lb.g);
  resetLayer(Lw); drawWalls(Lw.g); drawFrameGems(Lw.g);
}
function solidAt(x, y) { var lv = G.lv; return x >= 0 && y >= 0 && x < lv.w && y < lv.h && lv.solid[y * lv.w + x] === 1; }
function alive(x, y) { return solidAt(x, y) && !G.gone[y * G.lv.w + x]; }

function drawFrame(g) {
  var lv = G.lv, x0 = ox - fp, y0 = oy - dz - fp, w = lv.w * cs + 2 * fp, h = lv.h * cs + dz + 2 * fp, ch = cs * 0.42;
  function path(ix) {
    var a = x0 + ix, b = y0 + ix, c = x0 + w - ix, d = y0 + h - ix, q = Math.max(0, ch - ix);
    g.beginPath(); g.moveTo(a + q, b); g.lineTo(c - q, b); g.lineTo(c, b + q); g.lineTo(c, d - q); g.lineTo(c - q, d); g.lineTo(a + q, d); g.lineTo(a, d - q); g.lineTo(a, b + q); g.closePath();
  }
  g.save(); g.shadowColor = 'rgba(138,92,240,.85)'; g.shadowBlur = cs * 0.7; path(0); g.fillStyle = '#1a0d44'; g.fill(); g.restore();
  var gr = g.createLinearGradient(x0, y0, x0 + w, y0 + h); gr.addColorStop(0, '#7c63c8'); gr.addColorStop(0.5, '#4a3590'); gr.addColorStop(1, '#2a1a62');
  path(0); g.fillStyle = gr; g.fill();
  var gold = g.createLinearGradient(x0, y0, x0, y0 + h); gold.addColorStop(0, '#fff0b8'); gold.addColorStop(0.35, '#e9b84e'); gold.addColorStop(0.7, '#a8741f'); gold.addColorStop(1, '#f0c970');
  path(1); g.strokeStyle = gold; g.lineWidth = Math.max(2.5, cs * 0.075); g.stroke();
  path(cs * 0.17); g.strokeStyle = 'rgba(240,201,112,.55)'; g.lineWidth = 1.2; g.stroke();
  path(fp - 2); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.stroke();
  var studs = [], n, i;
  n = lv.w * 2; for (i = 1; i < n; i++) { var sx = x0 + w * i / n; studs.push([sx, y0 + fp * 0.38], [sx, y0 + h - fp * 0.38]); }
  n = lv.h * 2; for (i = 1; i < n; i++) { var sy = y0 + h * i / n; studs.push([x0 + fp * 0.38, sy], [x0 + w - fp * 0.38, sy]); }
  g.fillStyle = 'rgba(255,230,160,.5)';
  studs.forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], Math.max(1, cs * 0.022), 0, 7); g.fill(); });
  gemPts = [];
  var gs = cs * 0.74;
  gemPts.push({ x: x0 + ch * 0.35, y: y0 + ch * 0.35, s: gs }, { x: x0 + w - ch * 0.35, y: y0 + ch * 0.35, s: gs }, { x: x0 + ch * 0.35, y: y0 + h - ch * 0.35, s: gs }, { x: x0 + w - ch * 0.35, y: y0 + h - ch * 0.35, s: gs });
  gemPts.push({ x: x0 + fp * 0.1, y: y0 + h / 2, s: gs * 0.5 }, { x: x0 + w - fp * 0.1, y: y0 + h / 2, s: gs * 0.5 }, { x: x0 + w / 2, y: y0 + h - fp * 0.1, s: gs * 0.5 });
}
function drawFrameGems(g) {
  gemPts.forEach(function (p) {
    var s = p.s;
    g.save(); g.translate(p.x, p.y); g.shadowColor = 'rgba(160,110,255,.9)'; g.shadowBlur = s * 0.6;
    var gold = g.createLinearGradient(0, -s * 1.4, 0, s * 1.4); gold.addColorStop(0, '#fff0b8'); gold.addColorStop(0.5, '#c88a2a'); gold.addColorStop(1, '#f0c970');
    g.fillStyle = gold;
    [[0, 1], [Math.PI / 2, 0.85], [Math.PI, 1], [-Math.PI / 2, 0.85]].forEach(function (a) {
      g.save(); g.rotate(a[0] + Math.PI / 4); g.beginPath(); g.moveTo(0, -s * 1.5 * a[1]); g.lineTo(s * 0.2, -s * 0.3); g.lineTo(0, 0); g.lineTo(-s * 0.2, -s * 0.3); g.closePath(); g.fill(); g.restore();
    });
    [[0, -1.55], [0, 1.55], [-1.55, 0], [1.55, 0]].forEach(function (p2) { g.beginPath(); g.moveTo(p2[0] * s, p2[1] * s); g.lineTo(p2[0] * s * 0.65 + p2[1] * s * 0.12, p2[1] * s * 0.65 + p2[0] * s * 0.12); g.lineTo(p2[0] * s * 0.65 - p2[1] * s * 0.12, p2[1] * s * 0.65 - p2[0] * s * 0.12); g.closePath(); g.fill(); });
    g.shadowBlur = 0; facetGem(g, 0, 0, s, ['#f1e8ff', '#8a5cf0', '#2c1a9a']);
    g.restore();
  });
}
function drawBoard(g) {
  var lv = G.lv, x, y, h, px, py, grd;
  drawFrame(g);
  // خلفية داكنة تحت اللوح كله
  g.fillStyle = '#0c0626'; g.fillRect(ox, oy - dz, lv.w * cs, lv.h * cs + dz);
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) {
    var wasWall = lv.solid[y * lv.w + x] === 1, gone = wasWall && G.gone[y * lv.w + x];
    if (wasWall && !gone) continue;
    h = hh(x, y); px = ox + x * cs; py = oy + y * cs;
    if (gone) {
      g.fillStyle = 'rgb(' + (30 + (h & 7)) + ',' + (18 + (h & 3)) + ',' + (46 + (h & 9)) + ')'; g.fillRect(px, py, cs, cs);
      g.fillStyle = 'rgba(240,201,112,.10)'; g.fillRect(px, py, cs, 1); g.fillRect(px, py, 1, cs);
      g.strokeStyle = 'rgba(111,227,242,.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + cs * 0.1, py + cs * 0.3); g.lineTo(px + cs * 0.45, py + cs * 0.5); g.lineTo(px + cs * 0.4, py + cs * 0.8); g.stroke();
      continue;
    }
    g.fillStyle = 'rgb(' + (13 + (h & 3)) + ',' + (11 + ((h >> 2) & 3)) + ',' + (36 + ((h >> 4) & 5)) + ')'; g.fillRect(px, py, cs, cs);
    g.fillStyle = 'rgba(120,100,235,.13)'; g.fillRect(px, py, cs, 1); g.fillRect(px, py, 1, cs);
    g.fillStyle = 'rgba(0,0,0,.34)'; g.fillRect(px, py + cs - 1, cs, 1); g.fillRect(px + cs - 1, py, 1, cs);
    if (h % 9 === 0) { g.fillStyle = 'rgba(138,92,240,.12)'; g.beginPath(); g.arc(px + cs / 2, py + cs / 2, cs * 0.05, 0, 7); g.fill(); }
  }
  g.save(); g.translate(ox + lv.w * cs / 2, oy + lv.h * cs / 2); g.strokeStyle = 'rgba(240,201,112,.05)'; g.lineWidth = 1.2;
  [0.9, 1.6, 2.4].forEach(function (m) { g.beginPath(); g.arc(0, 0, cs * m, 0, 7); g.stroke(); });
  g.restore();
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) {
    if (alive(x, y)) continue; px = ox + x * cs; py = oy + y * cs;
    if (alive(x - 1, y)) { grd = g.createLinearGradient(px, 0, px + cs * 0.42, 0); grd.addColorStop(0, 'rgba(0,0,0,.5)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(px, py, cs * 0.42, cs); }
    if (alive(x + 1, y)) { grd = g.createLinearGradient(px + cs, 0, px + cs * 0.58, 0); grd.addColorStop(0, 'rgba(0,0,0,.5)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(px + cs * 0.58, py, cs * 0.42, cs); }
    if (alive(x, y - 1)) { grd = g.createLinearGradient(0, py, 0, py + cs * 0.55); grd.addColorStop(0, 'rgba(0,0,0,.65)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(px, py, cs, cs * 0.55); }
    if (alive(x, y + 1)) { grd = g.createLinearGradient(0, py + cs, 0, py + cs * 0.65); grd.addColorStop(0, 'rgba(0,0,0,.4)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(px, py + cs * 0.65, cs, cs * 0.35); }
  }
  lv.plates.forEach(function (p) {
    strokePath(g, p.path, undefined, cs * 0.2, 'rgba(138,92,240,.08)');
    strokePath(g, p.path, undefined, cs * 0.05, 'rgba(170,130,255,.55)');
    p.path.forEach(function (q) { var c = cxy(q[0], q[1]); g.fillStyle = 'rgba(190,160,255,.7)'; g.beginPath(); g.arc(c[0], c[1], cs * 0.05, 0, 7); g.fill(); });
  });
}
function drawWalls(g) {
  var lv = G.lv, x, y;
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) if (alive(x, y)) drawWall(g, x, y, lv.kind[y * lv.w + x]);
}
function star4(g, r, k) {
  g.beginPath();
  for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? r * k : r; if (i) g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); else g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  g.closePath();
}
function drawWall(g, x, y, k) {
  var gold = k === 'H', px = ox + x * cs, ty = oy + y * cs - dz;
  var below = alive(x, y + 1), above = alive(x, y - 1), left = alive(x - 1, y), right = alive(x + 1, y), grd;
  if (!below) {
    grd = g.createLinearGradient(0, ty + cs, 0, ty + cs + dz);
    grd.addColorStop(0, gold ? '#8a5e14' : '#3a2c72'); grd.addColorStop(1, gold ? '#3a2408' : '#140a30');
    g.fillStyle = grd; g.fillRect(px, ty + cs, cs, dz);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, ty + cs, cs, 1.5);
  }
  grd = g.createLinearGradient(px, ty, px + cs, ty + cs);
  if (gold) { grd.addColorStop(0, '#ffd978'); grd.addColorStop(0.55, '#e9a038'); grd.addColorStop(1, '#a8651a'); } else { grd.addColorStop(0, '#6a5aa6'); grd.addColorStop(1, '#31245f'); }
  g.fillStyle = grd; g.fillRect(px, ty, cs, cs);
  var t = Math.max(2, cs * 0.07);
  g.fillStyle = 'rgba(255,255,255,' + (gold ? 0.3 : 0.16) + ')'; if (!above) g.fillRect(px, ty, cs, t); if (!left) g.fillRect(px, ty, t * 0.7, cs);
  g.fillStyle = 'rgba(0,0,0,.3)'; if (!below) g.fillRect(px, ty + cs - t, cs, t); if (!right) g.fillRect(px + cs - t * 0.7, ty, t * 0.7, cs);
  g.strokeStyle = gold ? 'rgba(90,40,0,.5)' : 'rgba(10,4,30,.4)'; g.lineWidth = 1; g.strokeRect(px + 0.5, ty + 0.5, cs - 1, cs - 1);
  var h = hh(x, y), c = cs / 2;
  g.save(); g.translate(px + c, ty + c);
  if (gold) {
    g.save(); g.shadowColor = 'rgba(255,170,40,.9)'; g.shadowBlur = cs * 0.2; g.fillStyle = '#fff3c4'; star4(g, cs * 0.3, 0.3); g.fill(); g.restore();
    g.strokeStyle = 'rgba(120,60,0,.55)'; g.lineWidth = 1; star4(g, cs * 0.3, 0.3); g.stroke();
    g.strokeStyle = 'rgba(255,240,190,.7)'; g.lineWidth = Math.max(1.2, cs * 0.035); g.beginPath(); g.arc(0, 0, cs * 0.36, 0, 7); g.stroke();
  } else if (k === '#' && h % 3 === 0) {
    g.strokeStyle = 'rgba(240,201,112,.38)'; g.lineWidth = 1.3; var r = cs * 0.15;
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath(); g.stroke();
  } else if (k === '#' && h % 7 === 1) {
    g.strokeStyle = 'rgba(10,4,30,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-cs * 0.3, -cs * 0.2); g.lineTo(-cs * 0.05, 0); g.lineTo(-cs * 0.12, cs * 0.28); g.stroke();
  }
  g.restore();
}

/* ---------- الخلفية الفنية ---------- */
function drawBg() {
  var t = G.t;
  if (bgImg.complete && bgImg.naturalWidth) {
    var iw = bgImg.naturalWidth, ih = bgImg.naturalHeight, s = Math.max(W / iw, H / ih) * 1.07;
    var dw = iw * s, dh = ih * s, dx = (W - dw) / 2 + Math.sin(t * 0.07) * W * 0.012, dy = (H - dh) / 2 + Math.cos(t * 0.05) * H * 0.008;
    cx.drawImage(bgImg, dx, dy, dw, dh);
  } else {
    var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1a7a'); g.addColorStop(1, '#0a0420'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  if (!G.title) { cx.fillStyle = 'rgba(8,3,32,.08)'; cx.fillRect(0, 0, W, H); }
  cx.save(); cx.globalCompositeOperation = 'lighter';
  // عمود الضوء المركزي
  var pu = 0.75 + 0.25 * Math.sin(t * 1.4), bw = W * (G.title ? 0.05 : 0.03);
  var bg = cx.createLinearGradient(W / 2 - bw, 0, W / 2 + bw, 0); bg.addColorStop(0, 'rgba(190,140,255,0)'); bg.addColorStop(0.5, 'rgba(210,170,255,' + (0.28 * pu) + ')'); bg.addColorStop(1, 'rgba(190,140,255,0)');
  cx.fillStyle = bg; cx.fillRect(W / 2 - bw, 0, bw * 2, H * 0.9);
  for (var i = 0; i < motes.length; i++) {
    var m = motes[i], a = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.ph));
    cx.fillStyle = 'rgba(' + m.c + ',' + a + ')'; cx.beginPath(); cx.arc(m.x * W, m.y * H, m.r * (G.title ? 1.3 : 1), 0, 7); cx.fill();
  }
  if (G.title) {
    cx.translate(W / 2, H * 0.9); cx.scale(1, 0.26); cx.lineWidth = 2.2;
    for (i = 0; i < 3; i++) {
      cx.save(); cx.rotate(t * (0.12 + i * 0.07) * (i % 2 ? -1 : 1)); cx.setLineDash([22 + i * 14, 16]);
      cx.strokeStyle = 'rgba(255,200,110,' + (0.35 - i * 0.07) + ')'; cx.beginPath(); cx.arc(0, 0, Math.min(W, H) * (0.18 + i * 0.1), 0, 7); cx.stroke(); cx.restore();
    }
  }
  cx.restore();
  cx.fillStyle = vig; cx.fillRect(0, 0, W, H);
}

/* ---------- العناصر الديناميكية ---------- */
function glow(sprite, x, y, size, a) {
  cx.globalAlpha = a; cx.drawImage(sprite, x - size / 2, y - size / 2, size, size); cx.globalAlpha = 1;
}
function gravMark(x, y, dir, a) {
  var s = cs * 0.84, t = G.t;
  cx.save(); cx.translate(x, y); cx.rotate(ANG[dir] || 0);
  cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.lineWidth = Math.max(1.6, cs * 0.05);
  for (var i = 0; i < 3; i++) {
    var ph = (t * 1.1 + i / 3) % 1, py = s * 0.3 + ph * s * 0.18, al = Math.sin(ph * Math.PI) * a;
    cx.strokeStyle = 'rgba(255,236,170,' + al + ')';
    cx.beginPath(); cx.moveTo(-s * 0.07, py - s * 0.04); cx.lineTo(0, py + s * 0.025); cx.lineTo(s * 0.07, py - s * 0.04); cx.stroke();
  }
  cx.restore();
}
function drawBlock(b, k, dpos) {
  if (G.blockGone[b.id]) return;
  var c = cxy(dpos.x, dpos.y), sc = k, lift = cs * 0.05, i = b.id;
  glow(SP.haloP, c[0], c[1], cs * 2.3, 0.5 * sc);
  cx.save(); cx.translate(c[0], c[1] - lift); if (sc !== 1) cx.scale(sc, sc);
  cx.drawImage(SP.block, -SP.size / 2, -SP.size / 2, SP.size, SP.size);
  var pu = 0.5 + 0.5 * Math.sin(G.t * 2.4 + i);
  cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.35 + 0.35 * pu;
  cx.drawImage(SP.haloC, -cs * 0.5, -cs * 0.5, cs, cs);
  cx.restore();
  cx.save(); gravMark(c[0], c[1] - lift, b.g, 0.95 * sc); cx.restore();
}
function drawPlate(p, covered) {
  var c = cxy(p.x, p.y), dt = G.dt;
  if (covered && !p.on) { G.rings.push({ x: c[0], y: c[1], t: 0, col: '255,230,160' }); }
  p.on = covered; p.glow += ((covered ? 1 : 0) - p.glow) * Math.min(1, dt * 9);
  var gl = p.glow, pulse = 0.5 + 0.5 * Math.sin(G.t * 3 + p.x);
  cx.save(); cx.translate(c[0], c[1]);
  cx.fillStyle = 'rgba(8,3,24,.8)'; cx.beginPath(); cx.arc(0, 0, cs * 0.4, 0, 7); cx.fill();
  cx.restore();
  cx.save(); cx.globalCompositeOperation = 'lighter'; glow(SP.haloG, c[0], c[1], cs * (1.4 + gl * 1.2), 0.2 + gl * 0.6); cx.restore();
  cx.save(); cx.translate(c[0], c[1]);
  var rg = cx.createLinearGradient(0, -cs * 0.4, 0, cs * 0.4); rg.addColorStop(0, '#fff0b8'); rg.addColorStop(0.5, '#d49a36'); rg.addColorStop(1, '#f0c970');
  cx.strokeStyle = rg; cx.globalAlpha = 0.6 + gl * 0.4; cx.lineWidth = Math.max(1.8, cs * 0.06);
  cx.beginPath(); cx.arc(0, 0, cs * 0.38, 0, 7); cx.stroke(); cx.globalAlpha = 1;
  cx.fillStyle = 'rgba(240,201,112,.5)';
  for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8; cx.beginPath(); cx.arc(Math.cos(a) * cs * 0.3, Math.sin(a) * cs * 0.3, Math.max(0.8, cs * 0.012), 0, 7); cx.fill(); }
  cx.save(); cx.rotate(G.t * (0.3 + gl * 1.2)); cx.shadowColor = 'rgba(255,200,80,' + (0.5 + gl * 0.5) + ')'; cx.shadowBlur = cs * (0.12 + gl * 0.2);
  cx.fillStyle = 'rgba(255,232,160,' + (0.55 + gl * 0.45) + ')'; star4(cx, cs * 0.22, 0.28); cx.fill(); cx.restore();
  if (gl > 0.5) { cx.strokeStyle = 'rgba(255,235,170,' + (0.45 * (1 - pulse)) + ')'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(0, 0, cs * (0.38 + pulse * 0.25), 0, 7); cx.stroke(); }
  cx.restore();
}
function drawConduit(p) {
  var u = ((G.t * (0.28 + p.glow * 0.8)) % 1) * p.len, c = pathAt(p.path, u), gl = p.glow;
  cx.save(); cx.globalCompositeOperation = 'lighter';
  if (gl > 0.02) {
    strokePath(cx, p.path, p.len * gl, cs * 0.2, 'rgba(255,200,100,.12)');
    strokePath(cx, p.path, p.len * gl, cs * 0.06, 'rgba(255,226,150,.95)');
  }
  glow(SP.haloG, c[0], c[1], cs * 0.9, 0.3 + gl * 0.6);
  cx.restore();
}
function drawGate(covered, total) {
  var lv = G.lv, o = G.gateOpen, t = G.t;
  lv.gates.forEach(function (gt) {
    var w = cs * 0.74, x0 = ox + gt.x * cs + (cs - w) / 2, ybot = oy + (gt.y + 1) * cs, ytop = oy + gt.y * cs - dz + cs * 0.1, h = ybot - ytop, mx = x0 + w / 2;
    cx.save();
    if (o > 0) {
      var sh = cx.createLinearGradient(0, ybot, 0, ybot + cs * 4);
      sh.addColorStop(0, 'rgba(190,250,255,' + 0.5 * o + ')'); sh.addColorStop(1, 'rgba(190,250,255,0)');
      cx.globalCompositeOperation = 'lighter'; cx.fillStyle = sh;
      cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0 + w, ybot); cx.lineTo(x0 + w + cs * 1.5, ybot + cs * 4); cx.lineTo(x0 - cs * 1.5, ybot + cs * 4); cx.closePath(); cx.fill();
      cx.globalCompositeOperation = 'source-over';
    }
    cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0, ytop + w / 2); cx.arc(mx, ytop + w / 2, w / 2, Math.PI, 0); cx.lineTo(x0 + w, ybot); cx.closePath();
    var fg = cx.createLinearGradient(0, ytop, 0, ybot);
    if (o > 0) { fg.addColorStop(0, 'rgba(235,254,255,' + (0.35 + 0.65 * o) + ')'); fg.addColorStop(1, 'rgba(111,227,242,' + (0.3 + 0.6 * o) + ')'); }
    else { fg.addColorStop(0, '#05030a'); fg.addColorStop(1, '#1a0f34'); }
    cx.fillStyle = fg; cx.fill();
    cx.save(); cx.clip();
    if (o > 0) {
      cx.globalCompositeOperation = 'lighter'; cx.translate(mx, ytop + h * 0.5);
      for (var i = 0; i < 3; i++) { cx.save(); cx.rotate(t * (0.8 + i * 0.5) * (i % 2 ? -1 : 1)); cx.setLineDash([cs * 0.2, cs * 0.14]); cx.strokeStyle = 'rgba(255,255,255,' + 0.55 * o + ')'; cx.lineWidth = 1.4; cx.beginPath(); cx.arc(0, 0, cs * (0.14 + i * 0.12), 0, 7); cx.stroke(); cx.restore(); }
    } else {
      var ig = cx.createLinearGradient(x0, 0, x0 + w, 0); ig.addColorStop(0, 'rgba(0,0,0,.6)'); ig.addColorStop(0.5, 'rgba(0,0,0,0)'); ig.addColorStop(1, 'rgba(0,0,0,.6)');
      cx.fillStyle = ig; cx.fillRect(x0, ytop, w, h);
      cx.strokeStyle = 'rgba(240,201,112,.25)'; cx.lineWidth = 1;
      for (var q = 1; q < 4; q++) { cx.beginPath(); cx.moveTo(mx + (q - 2) * w * 0.17, ytop + w * 0.45); cx.lineTo(mx + (q - 2) * w * 0.17, ybot); cx.stroke(); }
    }
    cx.restore();
    cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0, ytop + w / 2); cx.arc(mx, ytop + w / 2, w / 2, Math.PI, 0); cx.lineTo(x0 + w, ybot);
    cx.strokeStyle = o > 0 ? '#dffcff' : '#f0c970'; cx.lineWidth = Math.max(2, cs * 0.075); cx.lineJoin = 'round'; cx.stroke();
    cx.strokeStyle = o > 0 ? 'rgba(170,244,255,.6)' : 'rgba(255,240,184,.4)'; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(x0 + cs * 0.07, ybot); cx.lineTo(x0 + cs * 0.07, ytop + w / 2); cx.arc(mx, ytop + w / 2, w / 2 - cs * 0.07, Math.PI, 0); cx.lineTo(x0 + w - cs * 0.07, ybot); cx.stroke();
    var n = total, gap = Math.min(cs * 0.17, (w * 0.7) / Math.max(1, n)), sy = ytop + w * 0.48, r = Math.max(2.2, cs * 0.05);
    for (var j = 0; j < n; j++) {
      var dx = mx + (j - (n - 1) / 2) * gap, on = j < covered;
      cx.beginPath(); cx.moveTo(dx, sy - r * 1.5); cx.lineTo(dx + r, sy); cx.lineTo(dx, sy + r * 1.5); cx.lineTo(dx - r, sy); cx.closePath();
      cx.fillStyle = on ? '#ffe6a3' : 'rgba(240,201,112,.22)'; cx.fill();
      if (on) { cx.save(); cx.globalCompositeOperation = 'lighter'; glow(SP.haloG, dx, sy, cs * 0.6, 0.7); cx.restore(); }
    }
    cx.restore();
  });
}
function drawField() {
  if (G.fieldA < 0.02) return;
  var lv = G.lv, v = DIRV[G.fieldDir], bw = (lv.w - 2) * cs, bh = (lv.h - 2) * cs;
  cx.save(); cx.beginPath(); cx.rect(ox + cs, oy + cs, bw, bh); cx.clip();
  cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round'; cx.lineWidth = Math.max(1.2, cs * 0.03);
  G.streaks.forEach(function (s) {
    var x = ox + cs + s.u * bw, y = oy + cs + s.v * bh, l = s.l * cs, al = G.fieldA * (0.1 + 0.16 * Math.sin(s.ph + G.t * 2));
    cx.strokeStyle = 'rgba(140,225,255,' + Math.max(0, al) + ')';
    cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - v[0] * l, y - v[1] * l); cx.stroke();
  });
  cx.restore();
}
function drawGhosts() {
  if (!G.preview || G.mode !== 'planning') return;
  var pv = G.preview.blocks, t = G.t;
  G.blocks.forEach(function (b) {
    var q = pv[b.id]; if (q.x === b.x && q.y === b.y) return;
    var planned = !!G.plan[b.id], col = planned ? '111,227,242' : '240,201,112';
    var a = cxy(b.x, b.y), e = cxy(q.x, q.y), dx = e[0] - a[0], dy = e[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    cx.save(); cx.setLineDash([cs * 0.1, cs * 0.1]); cx.lineDashOffset = -t * cs * 0.7; cx.strokeStyle = 'rgba(' + col + ',.6)'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(e[0], e[1]); cx.stroke(); cx.setLineDash([]);
    var sp = cs * 0.75, off = (t * cs * 1.3) % sp, ang = Math.atan2(dy, dx);
    for (var d = off + cs * 0.5; d < L - cs * 0.3; d += sp) {
      var px = a[0] + ux * d, py = a[1] + uy * d; cx.save(); cx.translate(px, py); cx.rotate(ang);
      cx.strokeStyle = 'rgba(' + col + ',' + (0.85 * Math.sin(clamp(d / L, 0, 1) * Math.PI)) + ')'; cx.lineWidth = Math.max(1.5, cs * 0.05); cx.lineCap = 'round'; cx.lineJoin = 'round';
      cx.beginPath(); cx.moveTo(-cs * 0.08, -cs * 0.1); cx.lineTo(cs * 0.04, 0); cx.lineTo(-cs * 0.08, cs * 0.1); cx.stroke(); cx.restore();
    }
    cx.restore();
    var pu = 0.5 + 0.5 * Math.sin(t * 4);
    cx.save(); cx.globalAlpha = 0.3 + 0.1 * pu; cx.drawImage(SP.block, e[0] - SP.size / 2, e[1] - SP.size / 2, SP.size, SP.size); cx.restore();
    cx.save(); cx.setLineDash([cs * 0.1, cs * 0.08]); cx.strokeStyle = 'rgba(' + col + ',.95)'; cx.lineWidth = 2; rr(cx, e[0] - cs * 0.43, e[1] - cs * 0.43, cs * 0.86, cs * 0.86, cs * 0.16); cx.stroke(); cx.restore();
  });
}
function arrowPos(b, d) { var v = DIRV[d]; return cxy(b.x + v[0], b.y + v[1]); }
function arrowOK(b, d) { var v = DIRV[d], nx = b.x + v[0], ny = b.y + v[1]; return nx >= 0 && ny >= 0 && nx < G.lv.w && ny < G.lv.h; }
function arrowBlocked(b, d) { var v = DIRV[d]; return solidAt(b.x + v[0], b.y + v[1]); }
function arrowBtn(x, y, r, dir, state) {
  cx.save(); cx.translate(x, y);
  var on = state === 'on', dim = state === 'blocked';
  if (on) { cx.save(); cx.globalCompositeOperation = 'lighter'; glow(SP.haloC, 0, 0, r * 4, 0.8); cx.restore(); }
  cx.globalAlpha = dim ? 0.5 : 1;
  var g = cx.createLinearGradient(0, -r, 0, r); if (on) { g.addColorStop(0, '#3fb0c8'); g.addColorStop(1, '#4b36c0'); } else { g.addColorStop(0, '#3a2a78'); g.addColorStop(1, '#1a0f48'); }
  cx.beginPath(); cx.arc(0, 0, r, 0, 7); cx.fillStyle = g; cx.fill();
  cx.strokeStyle = on ? '#9ff4fc' : '#e9b84e'; cx.lineWidth = Math.max(1.6, r * 0.12); cx.stroke();
  cx.rotate(ANG[dir]); cx.strokeStyle = '#fff3c9'; cx.lineWidth = Math.max(2, r * 0.17); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.beginPath(); cx.moveTo(0, -r * 0.42); cx.lineTo(0, r * 0.38); cx.moveTo(-r * 0.3, r * 0.1); cx.lineTo(0, r * 0.4); cx.lineTo(r * 0.3, r * 0.1); cx.stroke();
  cx.restore();
}
function drawSelection() {
  if (G.sel < 0 || G.mode !== 'planning') return;
  var b = G.blocks[G.sel], c = cxy(b.x, b.y), t = G.t, pu = 0.5 + 0.5 * Math.sin(t * 5), r = cs * 0.5;
  cx.save(); cx.translate(c[0], c[1]);
  cx.save(); cx.rotate(t * 0.9); cx.setLineDash([cs * 0.12, cs * 0.1]); cx.strokeStyle = 'rgba(255,230,160,' + (0.6 + 0.3 * pu) + ')'; cx.lineWidth = 1.6;
  cx.beginPath(); cx.arc(0, 0, cs * 0.62, 0, 7); cx.stroke(); cx.restore();
  cx.strokeStyle = 'rgba(255,240,190,' + (0.8 + 0.2 * pu) + ')'; cx.lineWidth = 2.4; cx.lineCap = 'round';
  var q = cs * 0.14, sgn = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  sgn.forEach(function (s) { cx.beginPath(); cx.moveTo(s[0] * r, s[1] * (r - q)); cx.lineTo(s[0] * r, s[1] * r); cx.lineTo(s[0] * (r - q), s[1] * r); cx.stroke(); });
  cx.restore();
  DIRS.forEach(function (d) {
    if (!arrowOK(b, d)) return; var p = arrowPos(b, d);
    arrowBtn(p[0], p[1], cs * 0.34, d, G.plan[b.id] === d ? 'on' : arrowBlocked(b, d) ? 'blocked' : 'idle');
  });
}
function drawParticles() {
  cx.save(); cx.globalCompositeOperation = 'lighter';
  var i;
  for (i = 0; i < G.parts.length; i++) {
    var p = G.parts[i], a = Math.max(0, p.life / p.max);
    cx.globalAlpha = a * 0.9; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.s * (0.4 + a * 0.6), 0, 7); cx.fill();
  }
  cx.globalAlpha = 1;
  for (i = 0; i < G.rings.length; i++) {
    var r = G.rings[i], k = r.t / 0.55;
    cx.strokeStyle = 'rgba(' + r.col + ',' + (0.7 * (1 - k)) + ')'; cx.lineWidth = Math.max(1, cs * 0.06 * (1 - k));
    cx.beginPath(); cx.arc(r.x, r.y, cs * (0.25 + k * (r.big || 1.2)), 0, 7); cx.stroke();
  }
  cx.restore();
}
function burst(x, y, vx, vy, n, c, spread) {
  n = Math.ceil(n * fxk());
  for (var i = 0; i < n && G.parts.length < 360; i++) {
    var a = Math.random() * 6.28, sp = (0.3 + Math.random()) * spread;
    G.parts.push({ x: x, y: y, vx: vx * 0.5 + Math.cos(a) * sp, vy: vy * 0.5 + Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, max: 0.9, s: 1.5 + Math.random() * cs * 0.06, c: c });
  }
}
function displayPos(b) {
  var A = G.anim; if (!A) return { x: b.x, y: b.y };
  var c = A.cur.get(b.id), x = c.x, y = c.y, st = A.steps[A.i];
  if (st) for (var k = 0; k < st.length; k++) if (st[k].id === b.id) {
    var p = Math.min(1, A.t / stepDur(A.i)); x = st[k].fx + (st[k].tx - st[k].fx) * p; y = st[k].fy + (st[k].ty - st[k].fy) * p;
  }
  return { x: x, y: y };
}

/* ================= مشهد فتح البوابة والتحطيم ================= */
function startCine() {
  var lv = G.lv, gt = lv.gates[0], C;
  C = G.cine = { t: 0, tiles: [], blocks: [], crack: false, boom: false, shown: false, absorbed: 0, dirty: false, lastRb: 0, lastCr: 0, cracks: [], gx: gt.x, gy: gt.y };
  var x, y, tiles = [];
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) {
    var i = y * lv.w + x; if (!lv.solid[i] || (x === gt.x && y === gt.y)) continue;
    var d = Math.hypot(x - gt.x, y - gt.y);
    if (lv.kind[i] === 'H' || d <= 3.3) tiles.push({ x: x, y: y, d: d, kind: lv.kind[i], at: 1.2 + d * 0.085 + Math.random() * 0.05, done: false });
  }
  tiles.sort(function (a, b) { return a.d - b.d; });
  C.tiles = tiles.slice(0, 46);
  G.blocks.forEach(function (b, k) { C.blocks.push({ id: b.id, at: 1.4 + k * 0.14, done: false }); });
  for (var k2 = 0; k2 < 9; k2++) {   // شقوق الختم (ثابتة)
    var a0 = -Math.PI / 2 + (k2 / 9) * 6.28 + rnd(-0.2, 0.2), pts = [], r = 0, a = a0;
    for (var j = 0; j < 5; j++) { r += rnd(0.12, 0.3); a += rnd(-0.35, 0.35); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    C.cracks.push(pts);
  }
  document.body.classList.add('cine');
  AudioFX.cineCharge();
}
function chunk(x, y, vx, vy, s, col, life) {
  var n = 3 + ((Math.random() * 3) | 0), pts = [], i;
  for (i = 0; i < n; i++) { var a = i / n * 6.28 + rnd(-0.4, 0.4), r = s * rnd(0.6, 1.15); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  G.deb.push({ x: x, y: y, vx: vx, vy: vy, rot: rnd(0, 6.28), vr: rnd(-11, 11), pts: pts, col: col, life: life, max: life });
}
function breakTile(T, C) {
  var lv = G.lv, gp = cxy(C.gx, C.gy), c = cxy(T.x, T.y), px = c[0], py = c[1] - dz * 0.5;
  G.gone[T.y * lv.w + T.x] = 1; C.dirty = true; T.done = true;
  var dx = px - gp[0], dy = py - gp[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  var gold = T.kind === 'H', pal = gold ? ['#ffd978', '#e9a038', '#a8651a', '#fff0b8'] : ['#6a5aa6', '#4a3a86', '#31245f', '#8c7cd0'];
  var n = Math.ceil((gold ? 9 : 6) * fxk());
  for (var i = 0; i < n && G.deb.length < 260; i++)
    chunk(px + rnd(-0.3, 0.3) * cs, py + rnd(-0.3, 0.3) * cs, ux * cs * rnd(2, 6) + rnd(-1, 1) * cs, uy * cs * rnd(1, 4) - cs * rnd(1, 4.5), cs * rnd(0.12, 0.28), pal[(Math.random() * pal.length) | 0], rnd(1.1, 1.8));
  for (i = 0; i < Math.ceil(2 * fxk()) && G.puffs.length < 40; i++) G.puffs.push({ x: px + rnd(-0.3, 0.3) * cs, y: py + rnd(-0.3, 0.3) * cs, vx: ux * cs * 0.8 + rnd(-0.5, 0.5) * cs, vy: -cs * rnd(0.2, 1), life: 1.1, max: 1.1, r: cs * rnd(0.7, 1.2) });
  burst(px, py, ux * 60, uy * 60, gold ? 14 : 8, gold ? 'rgba(255,214,120,.95)' : 'rgba(170,140,255,.95)', cs * 3.2);
  for (i = 0; i < 2; i++) G.rubble.push({ x: px + rnd(-0.32, 0.32) * cs, y: c[1] + rnd(-0.1, 0.35) * cs, s: cs * rnd(0.07, 0.15), rot: rnd(0, 6.28), col: pal[(Math.random() * 3) | 0] });
  G.shake = Math.max(G.shake, gold ? 11 : 8);
  if (C.t - C.lastCr > 0.045) { C.lastCr = C.t; AudioFX.crumble(gold, T.d / 6); }
}
function shatterBlock(B, C) {
  var b = G.blocks[B.id], c = cxy(b.x, b.y), n = Math.ceil(18 * fxk());
  G.blockGone[B.id] = true; B.done = true;
  for (var i = 0; i < n; i++) {
    var a = rnd(0, 6.28), sp = cs * rnd(2.5, 7);
    G.shards.push({ x: c[0], y: c[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, hd: rnd(0.22, 0.4), s: cs * rnd(0.05, 0.12), rot: rnd(0, 6.28), vr: rnd(-12, 12), col: i % 3 === 0 ? '255,255,255' : i % 3 === 1 ? '111,227,242' : '170,130,255', tr: [] });
  }
  G.rings.push({ x: c[0], y: c[1], t: 0, col: '180,240,255', big: 2.4 });
  G.rings.push({ x: c[0], y: c[1], t: 0.12, col: '255,255,255', big: 1.6 });
  burst(c[0], c[1], 0, 0, 22, 'rgba(160,230,255,.95)', cs * 4);
  G.flash = Math.max(G.flash, 0.45); G.shake = Math.max(G.shake, 7);
  AudioFX.shatter();
}
function updateCine(dt) {
  var C = G.cine, lv = G.lv, i, t;
  C.t += dt; t = C.t;
  var gp = gatePx();
  if (t < 1.2 && !reduce) {   // شحن: جسيمات تنجذب للبوابة
    if (Math.random() < 0.9 * fxk() + 0.1 && G.suck.length < 80) G.suck.push({ a: rnd(0, 6.28), r: cs * rnd(3, 7), sp: cs * rnd(4, 8) });
    G.shake = Math.max(G.shake, Math.min(4.5, t * 3.5));
  }
  for (i = G.suck.length - 1; i >= 0; i--) { var s = G.suck[i]; s.r -= s.sp * dt; s.sp *= 1 + dt * 1.5; if (s.r < cs * 0.3) G.suck.splice(i, 1); }
  if (t > 0.85 && !C.crack) { C.crack = true; G.shake = Math.max(G.shake, 8); AudioFX.crack(); vibrate(25); }
  if (t >= 1.2 && !C.boom) {
    C.boom = true; G.flash = 1; G.shake = 22; G.punch = 1;
    G.rings.push({ x: gp[0], y: gp[1], t: 0, col: '255,255,255', big: 8 }, { x: gp[0], y: gp[1], t: 0.1, col: '170,240,255', big: 5 });
    for (i = 0; i < Math.ceil(10 * fxk()); i++) chunk(gp[0] + rnd(-0.3, 0.3) * cs, gp[1] + rnd(-0.3, 0.3) * cs, rnd(-5, 5) * cs, rnd(-1, 6) * cs, cs * rnd(0.08, 0.16), ['#ffd978', '#e9a038', '#fff0b8', '#2a1a62'][i % 4], rnd(1.2, 1.8));
    burst(gp[0], gp[1], 0, 0, 60, 'rgba(200,250,255,.95)', cs * 9);
    AudioFX.boom(); vibrate([60, 30, 90]);
  }
  G.gateOpen = C.boom ? clamp((t - 1.2) / 0.7, 0, 1) : 0;
  if (C.boom) G.gateGlow = Math.max(G.gateGlow - dt * 0.5, 0);
  G.punch = Math.max(0, G.punch - dt * 2.2);
  for (i = 0; i < C.tiles.length; i++) if (!C.tiles[i].done && t >= C.tiles[i].at) breakTile(C.tiles[i], C);
  for (i = 0; i < C.blocks.length; i++) if (!C.blocks[i].done && t >= C.blocks[i].at) shatterBlock(C.blocks[i], C);
  if (C.dirty && G.t - C.lastRb > 0.04) { C.dirty = false; C.lastRb = G.t; rebuildLayers(); }
  // قطع الحطام
  for (i = G.deb.length - 1; i >= 0; i--) {
    var d = G.deb[i]; d.life -= dt; if (d.life <= 0) { G.deb.splice(i, 1); continue; }
    d.vy += cs * 15 * dt; d.vx *= Math.pow(0.55, dt); d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
  }
  for (i = G.puffs.length - 1; i >= 0; i--) { var p = G.puffs[i]; p.life -= dt; if (p.life <= 0) { G.puffs.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.r += cs * 0.5 * dt; }
  // شظايا الكتل: انفجار ثم امتصاص داخل البوابة
  for (i = G.shards.length - 1; i >= 0; i--) {
    var sh = G.shards[i]; sh.age += dt; sh.rot += sh.vr * dt;
    sh.tr.push(sh.x, sh.y); if (sh.tr.length > 14) sh.tr.splice(0, 2);
    if (sh.age < sh.hd) { var dr = Math.pow(0.9, dt * 60); sh.vx *= dr; sh.vy *= dr; }
    else {
      var dx = gp[0] - sh.x, dy = gp[1] - sh.y, L = Math.hypot(dx, dy) || 1, sp = cs * (7 + 26 * (sh.age - sh.hd)), k = Math.min(1, dt * 9);
      sh.vx += (dx / L * sp - sh.vx) * k; sh.vy += (dy / L * sp - sh.vy) * k;
      if (L < cs * 0.4) {
        G.shards.splice(i, 1); C.absorbed++; G.gateGlow = Math.min(1.5, G.gateGlow + 0.12);
        G.rings.push({ x: gp[0], y: gp[1], t: 0.25, col: '255,240,190', big: 0.9 });
        if (G.parts.length < 360) G.parts.push({ x: gp[0], y: gp[1], vx: rnd(-1, 1) * 60, vy: rnd(-1, 1) * 60, life: 0.4, max: 0.5, s: 3, c: 'rgba(255,250,210,.95)' });
        if (C.absorbed % 4 === 1) AudioFX.absorb(C.absorbed / 4);
        continue;
      }
    }
    sh.x += sh.vx * dt; sh.y += sh.vy * dt;
  }
  if (!C.shown && t > 3.4) { C.shown = true; showClear(); }
}
function drawCine() {
  var C = G.cine; if (!C) return;
  var t = C.t, gp = gatePx(), i;
  // رُكام ثابت
  for (i = 0; i < G.rubble.length; i++) {
    var r = G.rubble[i]; cx.save(); cx.translate(r.x, r.y); cx.rotate(r.rot); cx.fillStyle = r.col; cx.globalAlpha = 0.9;
    cx.beginPath(); cx.moveTo(-r.s, -r.s * 0.5); cx.lineTo(r.s * 0.8, -r.s * 0.7); cx.lineTo(r.s, r.s * 0.5); cx.lineTo(-r.s * 0.4, r.s * 0.7); cx.closePath(); cx.fill(); cx.restore();
  }
}
function drawCineTop() {
  var C = G.cine; if (!C) return;
  var t = C.t, gp = gatePx(), i;
  cx.save(); cx.globalCompositeOperation = 'lighter';
  // شحن
  if (!C.boom) {
    var ch = clamp(t / 1.2, 0, 1);
    glow(SP.haloG, gp[0], gp[1], cs * (1.6 + ch * 3.2), 0.25 + ch * 0.7);
    glow(SP.haloW, gp[0], gp[1], cs * (0.8 + ch * 1.8), ch * 0.8);
    for (i = 0; i < 2; i++) {
      var ph = ((t * 1.6) + i * 0.5) % 1, rad = cs * (4 - 3.4 * ph);
      cx.strokeStyle = 'rgba(255,225,150,' + (0.5 * ph) + ')'; cx.lineWidth = 2; cx.beginPath(); cx.arc(gp[0], gp[1], rad, 0, 7); cx.stroke();
    }
    cx.fillStyle = 'rgba(255,235,170,.9)';
    G.suck.forEach(function (s) { cx.globalAlpha = clamp(1 - s.r / (cs * 7), 0.2, 1); cx.beginPath(); cx.arc(gp[0] + Math.cos(s.a) * s.r, gp[1] + Math.sin(s.a) * s.r, 1.6 + cs * 0.025, 0, 7); cx.fill(); });
    cx.globalAlpha = 1;
    if (C.crack) {   // شقوق الضوء على الختم
      var k = clamp((t - 0.85) / 0.35, 0, 1);
      cx.strokeStyle = 'rgba(210,250,255,.95)'; cx.lineWidth = Math.max(1.4, cs * 0.04); cx.lineCap = 'round'; cx.lineJoin = 'round';
      C.cracks.forEach(function (pts) {
        cx.beginPath(); cx.moveTo(gp[0], gp[1]);
        var upto = pts.length * k;
        for (var j = 0; j < pts.length; j++) { if (j >= upto) break; cx.lineTo(gp[0] + pts[j][0] * cs * 2.2, gp[1] + pts[j][1] * cs * 2.2); }
        cx.stroke();
      });
    }
  } else {
    var e = t - 1.2, fade = 1 - clamp((e - 1.4) / 1.4, 0, 1);
    // موجة الصدمة
    var R = e * cs * 10, R2 = Math.max(0, (e - 0.12) * cs * 8.5), a = clamp(1 - R / (cs * 15), 0, 1);
    if (a > 0) {
      cx.strokeStyle = 'rgba(220,250,255,' + a + ')'; cx.lineWidth = cs * 0.38 * a + 2; cx.beginPath(); cx.arc(gp[0], gp[1], R, 0, 7); cx.stroke();
      cx.strokeStyle = 'rgba(255,214,130,' + (a * 0.8) + ')'; cx.lineWidth = cs * 0.2 * a + 1; cx.beginPath(); cx.arc(gp[0], gp[1], R2, 0, 7); cx.stroke();
      var rg = cx.createRadialGradient(gp[0], gp[1], Math.max(0, R - cs * 2.2), gp[0], gp[1], R + 1); rg.addColorStop(0, 'rgba(180,230,255,0)'); rg.addColorStop(1, 'rgba(180,230,255,' + (0.22 * a) + ')');
      cx.fillStyle = rg; cx.beginPath(); cx.arc(gp[0], gp[1], R + 1, 0, 7); cx.fill();
    }
    // أشعة الضوء
    var ra = clamp(e / 0.5, 0, 1) * fade;
    if (ra > 0.01) {
      for (i = 0; i < 9; i++) {
        var ang = Math.PI / 2 + (i - 4) * 0.28 + Math.sin(t * 0.6 + i) * 0.06, len = cs * (7 + (i % 3) * 2.5), wd = 0.04 + (i % 2) * 0.03;
        var lg = cx.createLinearGradient(gp[0], gp[1], gp[0] + Math.cos(ang) * len, gp[1] + Math.sin(ang) * len); lg.addColorStop(0, 'rgba(200,250,255,' + (0.2 * ra) + ')'); lg.addColorStop(1, 'rgba(200,250,255,0)');
        cx.fillStyle = lg; cx.beginPath(); cx.moveTo(gp[0], gp[1]);
        cx.lineTo(gp[0] + Math.cos(ang - wd) * len, gp[1] + Math.sin(ang - wd) * len); cx.lineTo(gp[0] + Math.cos(ang + wd) * len, gp[1] + Math.sin(ang + wd) * len); cx.closePath(); cx.fill();
      }
      // عمود ضوء للأعلى
      var bw = cs * (0.5 + 0.1 * Math.sin(t * 6)), bg = cx.createLinearGradient(gp[0] - bw, 0, gp[0] + bw, 0);
      bg.addColorStop(0, 'rgba(190,250,255,0)'); bg.addColorStop(0.5, 'rgba(235,255,255,' + (0.75 * ra) + ')'); bg.addColorStop(1, 'rgba(190,250,255,0)');
      cx.fillStyle = bg; cx.fillRect(gp[0] - bw, 0, bw * 2, gp[1]);
    }
    glow(SP.haloW, gp[0], gp[1], cs * (3 + 2 * fade), 0.6 * fade);
  }
  if (G.gateGlow > 0.01) glow(SP.haloG, gp[0], gp[1], cs * 3.2, clamp(G.gateGlow, 0, 1));
  // شظايا الكتل
  G.shards.forEach(function (s) {
    var a = clamp(s.age / 0.2, 0.2, 1);
    if (s.tr.length > 3) {
      cx.strokeStyle = 'rgba(' + s.col + ',' + (0.5 * a) + ')'; cx.lineWidth = Math.max(1, s.s * 0.5); cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(s.tr[0], s.tr[1]);
      for (var j = 2; j < s.tr.length; j += 2) cx.lineTo(s.tr[j], s.tr[j + 1]); cx.lineTo(s.x, s.y); cx.stroke();
    }
    cx.save(); cx.translate(s.x, s.y); cx.rotate(s.rot); cx.fillStyle = 'rgba(' + s.col + ',.95)';
    cx.beginPath(); cx.moveTo(0, -s.s * 1.6); cx.lineTo(s.s, s.s * 0.8); cx.lineTo(-s.s, s.s * 0.8); cx.closePath(); cx.fill(); cx.restore();
  });
  cx.restore();
  // غبار
  for (i = 0; i < G.puffs.length; i++) {
    var p = G.puffs[i], pa = (p.life / p.max) * 0.5;
    cx.globalAlpha = pa; cx.drawImage(SP.haloD, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }
  cx.globalAlpha = 1;
  // حطام
  for (i = 0; i < G.deb.length; i++) {
    var d = G.deb[i]; cx.save(); cx.translate(d.x, d.y); cx.rotate(d.rot); cx.globalAlpha = Math.min(1, d.life / 0.45); cx.fillStyle = d.col;
    cx.beginPath(); cx.moveTo(d.pts[0][0], d.pts[0][1]); for (var j = 1; j < d.pts.length; j++) cx.lineTo(d.pts[j][0], d.pts[j][1]); cx.closePath(); cx.fill();
    cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 1; cx.stroke(); cx.restore();
  }
  cx.globalAlpha = 1;
}

function drawGemTwinkle() {
  if (!Lw) return;
  cx.save(); cx.globalCompositeOperation = 'lighter';
  gemPts.forEach(function (p, i) {
    var a = 0.5 + 0.5 * Math.sin(G.t * 2 + i * 1.7), s = p.s * (1.5 + a * 0.8);
    cx.globalAlpha = 0.25 + a * 0.35; cx.drawImage(SP.haloP, p.x - s, p.y - s, s * 2, s * 2);
    if (a > 0.85) { cx.globalAlpha = (a - 0.85) * 6; cx.strokeStyle = '#fff'; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(p.x - p.s * 0.8, p.y); cx.lineTo(p.x + p.s * 0.8, p.y); cx.moveTo(p.x, p.y - p.s * 0.8); cx.lineTo(p.x, p.y + p.s * 0.8); cx.stroke(); }
  });
  cx.restore();
}

function draw() {
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  var sx = 0, sy = 0;
  if (G.shake > 0.1 && !reduce) { sx = (Math.random() - 0.5) * G.shake; sy = (Math.random() - 0.5) * G.shake; }
  cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  cx.fillStyle = '#0a0420'; cx.fillRect(0, 0, W, H);
  cx.save(); cx.translate(sx, sy);
  drawBg();
  var lv = G.lv;
  if (lv && !G.title) {
    var k = easeOut(G.intro), bcx = ox + lv.w * cs / 2, bcy = oy + lv.h * cs / 2, z = 0.93 + 0.07 * k;
    if (G.cine) { var gp = gatePx(), cz = 1 + 0.05 * easeOut(G.cine.t / 1.4) + 0.04 * G.punch; cx.translate(gp[0], gp[1]); cx.scale(cz, cz); cx.translate(-gp[0], -gp[1]); }
    cx.save(); cx.translate(bcx, bcy); cx.scale(z, z); cx.translate(-bcx, -bcy); cx.globalAlpha = k;
    if (Lb) cx.drawImage(Lb.c, Lb.x, Lb.y, Lb.w, Lb.h);
    drawCine();
    var pos = G.blocks.map(displayPos), covered = 0;
    lv.plates.forEach(function (p) { drawConduit(p); });
    lv.plates.forEach(function (p) {
      var c = pos.some(function (q) { return Math.abs(q.x - p.x) < 0.2 && Math.abs(q.y - p.y) < 0.2; });
      if (c || (G.cine && G.cine.boom)) covered++; drawPlate(p, c || !!(G.cine && G.cine.boom));
    });
    if (Lw) cx.drawImage(Lw.c, Lw.x, Lw.y, Lw.w, Lw.h);
    drawGemTwinkle();
    drawGate(covered, lv.plates.length);
    drawField();
    drawGhosts();
    G.blocks.forEach(function (b, i) { drawBlock(b, easeBack((G.intro - 0.3 - i * 0.1) / 0.5), pos[i]); });
    drawSelection();
    drawParticles();
    drawCineTop();
    cx.restore();
  }
  cx.restore();
  if (G.flash > 0.01) { cx.fillStyle = 'rgba(210,250,255,' + (G.flash * 0.5) + ')'; cx.fillRect(0, 0, W, H); }
}

/* ---------- التحديث ---------- */
function updateAmbient(dt) {
  G.t += dt; G.dt = dt;
  motes.forEach(function (m) { m.y -= m.s * dt; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); } });
  G.flash = Math.max(0, G.flash - dt * 1.6);
}
function update(dt) {
  updateAmbient(dt);
  G.intro = Math.min(1.4, G.intro + dt / 0.9);
  var i;
  for (i = G.parts.length - 1; i >= 0; i--) {
    var p = G.parts[i]; p.life -= dt; if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
  }
  for (i = G.rings.length - 1; i >= 0; i--) { G.rings[i].t += dt; if (G.rings[i].t > 0.55) G.rings.splice(i, 1); }
  G.shake *= Math.pow(0.0008, dt);
  var target = 0;
  if (G.mode === 'planning' && G.sel >= 0) { var sb = G.blocks[G.sel]; G.fieldDir = G.plan[G.sel] || sb.g; target = G.plan[G.sel] ? 1 : 0.35; }
  else if (G.mode === 'running') target = 0.8;
  G.fieldA += (target - G.fieldA) * Math.min(1, dt * 6);
  if (G.fieldA > 0.02 && G.lv) {
    var v = DIRV[G.fieldDir], bw = G.lv.w - 2, bh = G.lv.h - 2;
    G.streaks.forEach(function (s) {
      s.u += v[0] * s.s * dt * 1.6 / bw; s.v += v[1] * s.s * dt * 1.6 / bh;
      if (s.u < 0) s.u += 1; if (s.u > 1) s.u -= 1; if (s.v < 0) s.v += 1; if (s.v > 1) s.v -= 1;
    });
  }
  if (G.cine) updateCine(dt);
  if (G.anim) updateAnim(dt);
}
function updateAnim(dt) {
  var A = G.anim; A.t += dt;
  var st = A.steps[A.i];
  if (st && !reduce) st.forEach(function (m) {
    var p = Math.min(1, A.t / stepDur(A.i)), x = m.fx + (m.tx - m.fx) * p, y = m.fy + (m.ty - m.fy) * p, c = cxy(x, y);
    if (Math.random() < 0.7) burst(c[0], c[1], 0, 0, 1, Math.random() < 0.5 ? 'rgba(111,227,242,.7)' : 'rgba(138,92,240,.8)', 14);
  });
  while (A.i < A.steps.length && A.t >= stepDur(A.i)) { A.t -= stepDur(A.i); finishStep(A); A.i++; }
  if (A.i >= A.steps.length) endAnim();
}
function finishStep(A) {
  var step = A.steps[A.i], next = A.steps[A.i + 1];
  step.forEach(function (m) {
    A.cur.set(m.id, { x: m.tx, y: m.ty });
    var run = (A.run.get(m.id) || 0) + 1; A.run.set(m.id, run); AudioFX.tick(run);
    var moving = next && next.some(function (n) { return n.id === m.id; });
    if (!moving) { A.run.set(m.id, 0); land(m, run, A.g.get(m.id)); }
  });
}
function land(m, run, gdir) {
  var v = DIRV[gdir], c = cxy(m.tx, m.ty), px = c[0] + v[0] * cs * 0.42, py = c[1] + v[1] * cs * 0.42;
  burst(px, py, -v[0] * 40, -v[1] * 40, 14, 'rgba(240,201,112,.8)', 70);
  burst(px, py, -v[0] * 30, -v[1] * 30, 8, 'rgba(155,123,234,.9)', 60);
  var nx = m.tx + v[0], ny = m.ty + v[1], kind = 'wall';
  if (solidAt(nx, ny)) kind = G.lv.kind[ny * G.lv.w + nx] === 'H' ? 'gold' : 'wall';
  else if (G.anim) G.anim.cur.forEach(function (c, id) { if (id !== m.id && c.x === nx && c.y === ny) kind = 'block'; });
  var pw = Math.min(1, run / 5 + 0.3);
  AudioFX.impact(kind, pw); vibrate(Math.round(12 + pw * 26));
  G.rings.push({ x: px, y: py, t: 0, col: '240,201,112' });
  G.shake = Math.max(G.shake, Math.min(9, run * 1.4 + 1.5));
  var on = G.lv.plates.some(function (p) { return p.x === m.tx && p.y === m.ty; });
  if (on) setTimeout(function () { AudioFX.plate(true); }, 90);
}
function endAnim() {
  G.blocks = G.anim.final; G.anim = null; G.mode = 'planning'; G.plan = {}; G.preview = null;
  if (Sim.solved(G.lv, G.blocks)) {
    G.mode = 'solved'; G.solvedAt = G.t; G.sel = -1;
    setTimeout(function () { if (G.mode === 'solved') startCine(); }, 350);
  }
  refreshUI();
}

/* ---------- إجراءات ---------- */
function select(id) { if (G.sel !== id) AudioFX.select(); G.sel = id; refreshUI(); }
function deselect() { if (G.sel >= 0) { G.sel = -1; refreshUI(); } }
function recompute() { G.preview = Object.keys(G.plan).length ? Sim.preview(G.lv, G.blocks, G.plan) : null; }
function setDir(id, d) {
  var b = G.blocks[id];
  if (G.plan[id] === d) delete G.plan[id];
  else if (b.g === d && !G.plan[id]) { AudioFX.click(); return; }
  else if (b.g === d) delete G.plan[id];
  else G.plan[id] = d;
  AudioFX.dir(d); recompute();
  if (G.plan[id] && G.preview) {
    var q = G.preview.blocks[id];
    if (q.x === b.x && q.y === b.y) toast('هذا الاتجاه مسدود: لن تتحرك الكتلة');
  }
  refreshUI();
}
function runSim() {
  if (G.mode !== 'planning' || G.paused) return;
  var ids = Object.keys(G.plan);
  if (!ids.length) { toast(G.sel < 0 ? 'اختر كتلة أولًا ثم اتجاه الجاذبية' : 'اختر اتجاه الجاذبية للكتلة المحددة'); AudioFX.error(); return; }
  G.hist.push({ blocks: Sim.clone(G.blocks), moves: G.moves, wasted: G.wasted }); G.redo.length = 0;
  var applied = Sim.applyPlan(G.blocks, G.plan), res = Sim.simulate(G.lv, applied), d0 = G.plan[ids[0]];
  G.moves++; G.plan = {}; G.preview = null; G.blocks = applied; G.fieldDir = d0;
  if (!res.steps.length) { G.wasted++; toast('لا توجد حركة: الكتلة محجوزة في هذا الاتجاه'); AudioFX.error(); refreshUI(); return; }
  G.anim = { steps: res.steps, i: 0, t: 0, final: res.blocks, run: new Map(),
    cur: new Map(applied.map(function (b) { return [b.id, { x: b.x, y: b.y }]; })),
    g: new Map(applied.map(function (b) { return [b.id, b.g]; })) };
  G.mode = 'running'; AudioFX.simulate(d0); refreshUI();
}
function undo() {
  if (G.mode !== 'planning' || !G.hist.length) return;
  G.redo.push({ blocks: Sim.clone(G.blocks), moves: G.moves, wasted: G.wasted });
  var h = G.hist.pop(); G.blocks = h.blocks; G.moves = h.moves; G.wasted = h.wasted; G.plan = {}; G.preview = null;
  AudioFX.undo(); refreshUI();
}
function redo() {
  if (G.mode !== 'planning' || !G.redo.length) return;
  G.hist.push({ blocks: Sim.clone(G.blocks), moves: G.moves, wasted: G.wasted });
  var h = G.redo.pop(); G.blocks = h.blocks; G.moves = h.moves; G.wasted = h.wasted; G.plan = {}; G.preview = null;
  AudioFX.click(); refreshUI();
}
function resetRoom() { AudioFX.click(); loadRoom(G.ri); }

/* ---------- واجهة ---------- */
function icon(id, cls) { return '<svg class="ic ' + (cls || 'sm') + '"><use href="#' + id + '"/></svg>'; }
function refreshUI() {
  var planned = Object.keys(G.plan).length;
  var st = G.mode === 'running' ? 'running' : planned ? 'targeting' : G.sel >= 0 ? 'selected' : 'dormant';
  if ($('#lawSheet').classList.contains('open')) st += ' open';
  $('#shifter').className = 'hex ' + st;
  $('#eMoves').textContent = G.moves; $('#ePar').textContent = '/ ' + (G.room ? G.room.par : '-');
  document.body.classList.toggle('sel', G.sel >= 0 && G.mode === 'planning');
  $('#btnUndo').disabled = G.mode !== 'planning' || !G.hist.length;
  $('#btnRedo').disabled = G.mode !== 'planning' || !G.redo.length;
  var sim = $('#btnSim'); sim.disabled = G.mode !== 'planning'; sim.classList.toggle('armed', G.mode === 'planning' && planned > 0);
  var canDir = G.sel >= 0 && G.mode === 'planning';
  $$('#dpad button').forEach(function (b) { b.disabled = !canDir; b.classList.toggle('on', canDir && G.plan[G.sel] === b.dataset.d); });
  var pips = ''; ROOMS.forEach(function (r, i) { pips += '<i class="' + (i === G.ri ? 'cur' : save.done[r.id] ? 'done' : '') + '"></i>'; });
  $('#pips').innerHTML = pips;
}
function starsSvg(n, delay) {
  var s = '';
  for (var i = 0; i < 3; i++) s += '<svg viewBox="0 0 24 24" class="' + (i < n ? 'on' : '') + '" style="animation-delay:' + (delay + i * 0.18) + 's"><use href="#i-star"/></svg>';
  return s;
}
function stars() { var p = G.room.par; return G.moves <= p ? 3 : G.moves <= p + 2 ? 2 : 1; }
function showClear() {
  G.clearShown = true; document.body.classList.remove('cine');
  var n = stars(), id = G.room.id;
  if ((save.done[id] || 0) < n) { save.done[id] = n; persist(); }
  $('#clearRoom').textContent = G.room.name; $('#clearTitle').textContent = 'GATE UNSEALED';
  $('#clearStars').innerHTML = starsSvg(n, 0.15);
  $('#clearInfo').textContent = 'الطاقة المستخدمة: ' + G.moves + ' · الحل المثالي: ' + G.room.par;
  $('#clearCodex').textContent = 'THE LAW CODEX · ' + G.room.codex;
  $('#btnNext').textContent = G.ri === ROOMS.length - 1 ? 'انتهت المرحلة الأولى · القائمة' : 'الغرفة التالية';
  refreshUI(); show('#clear'); AudioFX.success();
}
function buildMenu() {
  var box = $('#roomList'); box.innerHTML = '';
  ROOMS.forEach(function (r, i) {
    var ok = i === 0 || save.done[ROOMS[i - 1].id], st = save.done[r.id] || 0, b = document.createElement('button');
    b.className = 'roomBtn' + (ok ? '' : ' locked'); b.disabled = !ok;
    var right = ok ? '<span class="s">' + [0, 1, 2].map(function (j) { return '<svg viewBox="0 0 24 24" class="' + (j < st ? 'on' : '') + '"><use href="#i-star"/></svg>'; }).join('') + '</span>' : '<span class="s">' + icon('i-lock') + '</span>';
    b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"><b>' + r.name + '</b><small>' + r.sub + '</small></span>' + right;
    b.onclick = function () { AudioFX.click(); hide('#menu'); enterGame(); loadRoom(i); G.paused = false; };
    box.appendChild(b);
  });
}
function buildCodex() {
  var h = '<div class="lawCard"><span class="ico">' + icon('i-gravity', '') + '</span><div><h3>GRAVITY</h3><p>أول قانون: غيّر اتجاه سقوط أي كتلة. الكتلة تنزلق حتى تصطدم بشيء.</p><span class="tag">UNLOCKED</span></div></div>';
  h += '<div class="lawCard lock"><span class="ico">' + icon('i-attraction', '') + '</span><div><h3>ATTRACTION</h3><p>تجذب الأجسام نحو نقطة. يُفتح في THE PULLING VOID.</p><span class="tag">LOCKED</span></div></div>';
  h += '<div class="lawCard lock"><span class="ico">' + icon('i-reflection', '') + '</span><div><h3>REFLECTION</h3><p>تعكس المسارات والضوء. يُفتح في THE LIGHTLESS ARCHIVE.</p><span class="tag">LOCKED</span></div></div>';
  ROOMS.forEach(function (r, i) {
    var ok = !!save.done[r.id];
    h += '<div class="lawCard' + (ok ? '' : ' lock') + '"><span class="ico">' + icon(ok ? 'i-book' : 'i-lock', '') + '</span><div><h3>' + r.name + '</h3><p>' + (ok ? r.codex : 'أكمل هذه الغرفة لتكشف النقش.') + '</p></div></div>';
  });
  $('#codexList').innerHTML = h;
}
function buildAch() {
  var total = 0, three = 0, cleared = 0;
  ROOMS.forEach(function (r) { var s = save.done[r.id] || 0; total += s; if (s) cleared++; if (s === 3) three++; });
  var n = ROOMS.length, list = [
    ['i-gem', 'أول بوابة', 'افتح أول بوابة', cleared >= 1, Math.min(cleared, 1), 1],
    ['i-star', 'حل مثالي', 'احصل على 3 نجوم في غرفة', three >= 1, Math.min(three, 1), 1],
    ['i-list', 'نصف الطريق', 'أكمل 3 غرف', cleared >= 3, Math.min(cleared, 3), 3],
    ['i-lock', 'كاسر الختم', 'أكمل المرحلة الأولى كاملة', cleared >= n, cleared, n],
    ['i-star', 'نجمة ذهبية', 'اجمع 10 نجوم', total >= 10, Math.min(total, 10), 10],
    ['i-trophy', 'كمال', 'ثلاث نجوم في كل الغرف', three >= n, three, n]
  ];
  var got = list.filter(function (a) { return a[3]; }).length;
  $('#achSum').textContent = got + ' / ' + list.length + ' · ' + total + ' ★';
  $('#achList').innerHTML = list.map(function (a) { return '<div class="ach' + (a[3] ? ' got' : '') + '"><span class="ic2">' + icon(a[0], '') + '</span><div style="flex:1"><b>' + a[1] + '</b><small>' + a[2] + '</small>' + (a[3] ? '' : '<div class="bar"><i style="width:' + Math.round(a[4] / a[5] * 100) + '%"></i></div>') + '</div></div>'; }).join('');
}
function openMenu() { closeSheet(); buildMenu(); hide('#pause'); hide('#clear'); show('#menu'); G.paused = true; }
function updateMuteBtns() {
  var m = AudioFX.isMuted();
  $$('.js-mute').forEach(function (b) { b.querySelector('.t').textContent = m ? 'الصوت: متوقف' : 'الصوت: يعمل'; b.querySelector('use').setAttribute('href', m ? '#i-mute' : '#i-sound'); });
  $('#tgSound').classList.toggle('on', !m); $('#tgFx').classList.toggle('on', save.fx); $('#tgVib').classList.toggle('on', save.vib);
}
function enterGame() { G.title = false; document.body.classList.remove('title'); hide('#intro'); }
function goTitle() {
  closeSheet(); hide('#pause'); hide('#menu'); hide('#clear'); G.paused = true; G.title = true; document.body.classList.add('title'); show('#intro');
  $('#btnStart').setAttribute('aria-label', 'Continue');
}
/* قائمة القوانين */
function placeSheet() {
  var r = $('#shifter').getBoundingClientRect(), s = $('#lawSheet'), sw = s.offsetWidth || 320;
  s.style.left = Math.max(8, Math.min(window.innerWidth - sw - 8, r.left + r.width / 2 - sw / 2)) + 'px'; s.style.bottom = Math.round(window.innerHeight - r.top + 12) + 'px';
}
function openSheet() { placeSheet(); $('#lawSheet').classList.add('open'); $('#scrim').classList.add('show'); AudioFX.activate(); refreshUI(); }
function closeSheet() { $('#lawSheet').classList.remove('open'); $('#scrim').classList.remove('show'); refreshUI(); }
function sheetOpen() { return $('#lawSheet').classList.contains('open'); }

/* ---------- المدخلات ---------- */
var drag = null;
function ptr(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function blockAt(px, py) {
  var best = -1, bd = 1e9;
  G.blocks.forEach(function (b) {
    var c = cxy(b.x, b.y), d = Math.hypot(px - c[0], py - c[1]);
    if (d < bd && d < cs * 0.8) { bd = d; best = b.id; }
  });
  return best;
}
function arrowAt(px, py) {
  var b = G.blocks[G.sel], hit = null;
  DIRS.forEach(function (d) {
    if (!arrowOK(b, d)) return; var p = arrowPos(b, d);
    if (Math.hypot(px - p[0], py - p[1]) < Math.max(cs * 0.46, 20)) hit = d;
  });
  return hit;
}
cv.addEventListener('pointerdown', function (e) {
  if (G.mode === 'solved' && G.cine && !G.cine.shown && G.cine.t > 1.8) { G.cine.shown = true; showClear(); return; }
  if (G.paused || panelOpen() || G.mode !== 'planning') return;
  AudioFX.init(); e.preventDefault();
  var p = ptr(e);
  if (G.sel >= 0) { var d = arrowAt(p.x, p.y); if (d) { setDir(G.sel, d); return; } }
  var id = blockAt(p.x, p.y);
  if (id >= 0) { select(id); drag = { id: id, x: p.x, y: p.y }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} return; }
  var cxl = Math.floor((p.x - ox) / cs), cyl = Math.floor((p.y - oy + dz) / cs);
  if (cxl >= 0 && cyl >= 0 && cxl < G.lv.w && cyl < G.lv.h && G.lv.kind[cyl * G.lv.w + cxl] === 'H') { toast('عنصر محصّن: لا يتأثر بالقانون'); AudioFX.locked(); }
  else deselect();
});
cv.addEventListener('pointerup', function (e) {
  if (!drag) return; var p = ptr(e), dx = p.x - drag.x, dy = p.y - drag.y;
  if (Math.hypot(dx, dy) > Math.max(20, cs * 0.5) && G.mode === 'planning')
    setDir(drag.id, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  drag = null;
});
cv.addEventListener('pointercancel', function () { drag = null; });

window.addEventListener('keydown', function (e) {
  var k = e.key, tag = e.target && e.target.tagName;
  if (k === 'Escape' && sheetOpen()) { closeSheet(); return; }
  if (panelOpen() && k !== 'Escape') return;
  var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  if (map[k] && G.mode === 'planning' && !G.paused) {
    e.preventDefault(); AudioFX.init();
    if (G.sel < 0) { if (G.blocks.length === 1) select(0); else return; }
    setDir(G.sel, map[k]); return;
  }
  if ((k === ' ' || k === 'Enter') && tag !== 'BUTTON') { e.preventDefault(); AudioFX.init(); runSim(); }
  else if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); undo(); }
  else if (k === 'y' || k === 'Y') { redo(); }
  else if (k === 'r' || k === 'R') { if (!G.paused) resetRoom(); }
  else if (k === 'Tab' && !G.paused && G.mode === 'planning') { e.preventDefault(); select(((G.sel < 0 ? -1 : G.sel) + 1) % G.blocks.length); }
  else if (k === '1') { toast('GRAVITY هو القانون الفعّال'); }
  else if (k === 'Escape') {
    if (panelOpen()) {
      if ($('#pause').classList.contains('show')) { hide('#pause'); G.paused = false; }
      else if ($('#menu').classList.contains('show') && started) { hide('#menu'); G.paused = false; }
      else $$('.panel.show').forEach(function (p) { if (p.id !== 'intro' && p.id !== 'clear') p.classList.remove('show'); });
    }
    else if (G.sel >= 0) deselect(); else if (!G.title) { G.paused = true; show('#pause'); }
  }
});

/* ---------- ربط الأزرار ---------- */
$('#btnSim').onclick = function () { AudioFX.init(); runSim(); };
$('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo; $('#btnReset').onclick = resetRoom;
$('#btnMenu').onclick = function () { AudioFX.click(); goTitle(); };
$('#btnHome2').onclick = function () { AudioFX.click(); goTitle(); };
$('#btnCloseMenu').onclick = function () { hide('#menu'); if (started) G.paused = false; };
$('#btnPause').onclick = function () { AudioFX.click(); closeSheet(); G.paused = true; show('#pause'); };
$('#btnResume').onclick = function () { hide('#pause'); G.paused = false; };
$('#btnRestart').onclick = function () { hide('#pause'); loadRoom(G.ri); G.paused = false; };
$('#btnToMenu').onclick = openMenu;
$('#btnClearMenu').onclick = openMenu;
$('#btnReplay').onclick = function () { hide('#clear'); loadRoom(G.ri); G.paused = false; };
$('#btnNext').onclick = function () {
  hide('#clear');
  if (G.ri < ROOMS.length - 1) { loadRoom(G.ri + 1); G.paused = false; } else openMenu();
};
function fs() { var el = document.documentElement; try { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); } catch (e) {} }
$('#btnFs').onclick = fs; $('#btnFs2').onclick = fs;
$$('.js-mute').forEach(function (b) { b.onclick = toggleMute; });
function toggleMute() { AudioFX.init(); AudioFX.setMuted(!AudioFX.isMuted()); save.muted = AudioFX.isMuted(); persist(); updateMuteBtns(); }
$('#tgSound').onclick = toggleMute;
$('#tgFx').onclick = function () { save.fx = !save.fx; persist(); updateMuteBtns(); AudioFX.click(); };
$('#tgVib').onclick = function () { save.vib = !save.vib; persist(); updateMuteBtns(); AudioFX.click(); vibrate(30); };
$('#btnWipe').onclick = function () {
  var b = $('#btnWipe');
  if (b.dataset.sure) { save.done = {}; persist(); delete b.dataset.sure; b.textContent = 'تم المسح'; setTimeout(function () { b.textContent = 'مسح التقدّم المحفوظ'; }, 1500); refreshUI(); }
  else { b.dataset.sure = '1'; b.textContent = 'اضغط مرة أخرى للتأكيد'; setTimeout(function () { delete b.dataset.sure; b.textContent = 'مسح التقدّم المحفوظ'; }, 3000); }
};
$$('[data-close]').forEach(function (b) { b.onclick = function () { AudioFX.click(); hide(b.dataset.close); }; });
$$('#dpad button').forEach(function (b) { b.onclick = function () { if (G.sel >= 0 && G.mode === 'planning') setDir(G.sel, b.dataset.d); }; });
$('#shifter').onclick = function () { AudioFX.init(); if (sheetOpen()) closeSheet(); else if (!G.paused) openSheet(); };
$('#scrim').onclick = closeSheet;
$$('#lawSheet .lawBtn').forEach(function (b) {
  b.onclick = function () {
    if (b.classList.contains('lock')) { AudioFX.locked(); toast('هذا القانون يُفتح في مرحلة لاحقة'); return; }
    AudioFX.select(); closeSheet();
    toast(G.sel < 0 ? 'GRAVITY نشط: اختر كتلة ثم اتجاه الجاذبية' : 'GRAVITY نشط: اختر اتجاهًا');
  };
});
$('#btnStart').onclick = function () {
  AudioFX.init(); AudioFX.activate(); if (!started) AudioFX.ambience(45);
  if (started) { enterGame(); G.paused = false; return; }
  started = true; enterGame();
  var first = 0; for (var i = 0; i < ROOMS.length; i++) { if (!save.done[ROOMS[i].id]) { first = i; break; } first = i; }
  loadRoom(first); G.paused = false;
};
$('#btnCodex').onclick = function () { AudioFX.init(); AudioFX.click(); buildCodex(); show('#codex'); };
$('#btnAch').onclick = function () { AudioFX.init(); AudioFX.click(); buildAch(); show('#ach'); };
$('#btnSettings').onclick = function () { AudioFX.init(); AudioFX.click(); updateMuteBtns(); show('#settings'); };
$('#btnExit').onclick = function () {
  AudioFX.click(); try { window.close(); } catch (e) {}
  var s = $('#btnExit span'); s.textContent = 'See you!'; setTimeout(function () { s.textContent = 'Exit'; }, 1800);
};
var deferred = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; $('#btnInstall').style.display = 'flex'; });
$('#btnInstall').onclick = function () { if (deferred) { deferred.prompt(); deferred = null; $('#btnInstall').style.display = 'none'; } };

document.addEventListener('visibilitychange', function () { if (document.hidden) AudioFX.suspend(); else AudioFX.resume(); });
window.addEventListener('resize', function () { layout(); if (sheetOpen()) placeSheet(); });
window.addEventListener('orientationchange', function () { setTimeout(function () { layout(); if (sheetOpen()) placeSheet(); }, 200); });

/* ---------- الحلقة الرئيسية ---------- */
var last = 0;
function frame(ts) {
  var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (G.paused) updateAmbient(dt); else update(dt);
  draw(); requestAnimationFrame(frame);
}
document.body.classList.add('title');
updateMuteBtns();
loadRoom(0);
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
}
window.__lawless = { info: function () { return { ox: ox, oy: oy, cs: cs, dz: dz, w: G.lv.w, h: G.lv.h }; }, G: G, loadRoom: loadRoom, runSim: runSim, setDir: setDir, select: select, update: update, draw: draw, openSheet: openSheet, closeSheet: closeSheet, showClear: showClear, startCine: startCine, enterGame: enterGame, layout: layout };
})();
