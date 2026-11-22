/* LAWLESS v3 — واجهة مزخرفة + خلفية فنية + مشهد تحطيم عند فتح البوابة */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
var cv = $('#c'), cx = cv.getContext('2d', { alpha: false });
var COL = { purple: '#8a5cf0', cyan: '#6fe3f2', gold: '#f0c970' };
var DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], pull: [0, 0] };
var DIRS = ['up', 'right', 'down', 'left'];
/* هوية بصرية لكل عالم: ألوان الكتلة والجدران والبوابة والجسيمات */
var THEMES = {
  1: { blk: { under: ['#3a5fa8', '#14275c'], face: ['#e8fbff', '#7fd4ee', '#4b86c9'], inner: ['#1c3f9a', '#0a1240'], gem: ['#e6fbff', '#42a8ff', '#3a2cc8'], spark: '#d6f6ff' },
       stone: ['#6a5aa6', '#31245f'], under: ['#3a2c72', '#140a30'], edge: 'rgba(160,120,255,.95)', shard: ['#b79cff', '#6a4bd8', '#2a1a70'], shardGlow: 'rgba(150,110,255,.9)', rune: 'rgba(255,214,120,.6)',
       haloOpen: 'haloC', mist: ['255,170,70', '120,80,255'], open: ['235,254,255', '111,227,242'], spark: '255,235,170', amb: 'mote' },
  2: { blk: { under: ['#8a3a14', '#3a1206'], face: ['#fff3da', '#ffb25a', '#d1561f'], inner: ['#7a2410', '#240602'], gem: ['#fff3d0', '#ff9a3c', '#c9301c'], spark: '#ffe6bd' },
       stone: ['#5a4a46', '#2a201e'], under: ['#3a2a26', '#120a08'], edge: 'rgba(255,140,50,.95)', shard: ['#6a5650', '#2c2220', '#120c0a'], shardGlow: 'rgba(255,120,40,.95)', rune: 'rgba(255,150,70,.8)',
       haloOpen: 'haloG', mist: ['255,120,40', '190,60,30'], open: ['255,250,225', '255,190,90'], spark: '255,170,90', amb: 'ember' },
  3: { blk: { under: ['#3a3aa8', '#120c5c'], face: ['#f4fdff', '#8ff0ff', '#7a5cff'], inner: ['#2a1a7a', '#0a0830'], gem: ['#f4ecff', '#ff7ae8', '#6a3cff'], spark: '#e8f4ff' },
       stone: ['#4a4a9a', '#1c1650'], under: ['#2a2a78', '#0c0830'], edge: 'rgba(110,230,255,.95)', shard: ['#a8f4ff', '#6a8cff', '#3a1ca8'], shardGlow: 'rgba(110,230,255,.95)', rune: 'rgba(255,122,232,.65)',
       haloOpen: 'haloP', mist: ['110,230,255', '210,90,255'], open: ['250,240,255', '255,140,240'], spark: '200,170,255', amb: 'void' }
};
function TH() { return THEMES[(G.world && G.world.id) || 1]; }
var ANG = { down: 0, left: Math.PI / 2, up: Math.PI, right: -Math.PI / 2 };
var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var SAVE_KEY = 'lawless_save_v1';
var save = { done: {}, muted: false, fx: true, vib: true, hints: 5 };
try { var s0 = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); if (s0.done) save.done = s0.done; save.muted = !!s0.muted; if (s0.fx === false) save.fx = false; if (s0.vib === false) save.vib = false; } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
AudioFX.setMuted(save.muted);
var perfQ = 1, perfEma = 0.0167, perfT = 0;
function fxk() { return (reduce ? 0.2 : save.fx ? 1 : 0.4) * perfQ; }
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
var bgCache = { 'assets/bg.jpg': bgImg };
function bgFor(src) { if (!bgCache[src]) { var im = new Image(); im.src = src; bgCache[src] = im; } return bgCache[src]; }

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
  var bt = $('#bottom').getBoundingClientRect(), hh2 = $('#hint'), port = window.matchMedia('(orientation: portrait)').matches;
  t.style.top = 'auto'; t.style.bottom = Math.round(window.innerHeight - bt.top + 6 + (port && hh2.classList.contains('show') ? hh2.offsetHeight + 8 : 0)) + 'px';
  clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2300);
}
var hintT = 0;
function showHint(msg) {
  var h = $('#hint'); h.textContent = msg; h.classList.add('show');
  if (window.matchMedia('(orientation: portrait)').matches) {   // فوق أزرار التحكم، بعيدًا عن البوابة
    var bt = $('#bottom').getBoundingClientRect(); h.style.top = 'auto'; h.style.bottom = Math.round(window.innerHeight - bt.top + 6) + 'px';
  } else { h.style.top = ''; h.style.bottom = ''; }
  clearTimeout(hintT); hintT = setTimeout(function () { h.classList.remove('show'); }, 7000);
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
  G.hint = null; G.sideToast = 0; G.law = 'gravity'; G.ri = i; G.room = ROOMS[i]; G.lv = Sim.load(G.room); G.blocks = Sim.clone(G.lv.start);
  G.hist = []; G.redo = []; G.plan = {}; G.preview = null; G.sel = -1; G.mode = 'planning';
  G.moves = 0; G.wasted = 0; G.anim = null; G.gateOpen = 0; G.clearShown = false; G.parts.length = 0; G.rings.length = 0;
  G.shake = 0; G.intro = 0; G.flash = 0; G.fieldA = 0; resetCine();
  buildPaths(G.lv);
  G.lv.plates.forEach(function (p) { p.glow = 0; p.on = false; p.ripple = 0; });
  var wd = ROOMS.worlds[G.room.w || 0], first = ROOMS.findIndex(function (r) { return r.w === G.room.w; });
  var prevW = G.world; G.world = wd; $('#stageName').textContent = wd.name;
  $('#roomName').textContent = String(i - first + 1).padStart(2, '0') + ' · ' + G.room.name;
  if (started && prevW !== wd && AudioFX.ambience) AudioFX.ambience(wd.root);
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
  var B = TH().blk;
  var s = cs * 0.86, pad = cs * 0.45, size = s + pad * 2, x = pad, y = pad, r = s * 0.2, ext = cs * 0.09;
  var c = mk(size * DPR, size * DPR), g = c.getContext('2d'); g.scale(DPR, DPR);
  g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = cs * 0.24 * DPR; g.shadowOffsetY = cs * 0.1 * DPR; g.fillStyle = '#000'; rr(g, x, y + ext, s, s, r); g.fill(); g.restore();
  var ug = g.createLinearGradient(x, y, x, y + s + ext); ug.addColorStop(0, B.under[0]); ug.addColorStop(1, B.under[1]);
  rr(g, x, y + ext, s, s, r); g.fillStyle = ug; g.fill();
  var bg = g.createLinearGradient(x, y, x + s, y + s); bg.addColorStop(0, B.face[0]); bg.addColorStop(0.45, B.face[1]); bg.addColorStop(1, B.face[2]);
  rr(g, x, y, s, s, r); g.fillStyle = bg; g.fill();
  var inset = s * 0.1;
  var ig = g.createRadialGradient(x + s / 2, y + s * 0.4, 0, x + s / 2, y + s / 2, s * 0.6); ig.addColorStop(0, B.inner[0]); ig.addColorStop(1, B.inner[1]);
  rr(g, x + inset, y + inset, s - inset * 2, s - inset * 2, r * 0.6); g.fillStyle = ig; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.stroke();
  facetGem(g, x + s / 2, y + s / 2, s * 0.3, B.gem);
  g.fillStyle = B.spark;
  [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]].forEach(function (p) {
    var px = x + s * p[0], py = y + s * p[1], q = s * 0.045;
    g.beginPath(); g.moveTo(px, py - q * 1.6); g.lineTo(px + q * 0.5, py - q * 0.5); g.lineTo(px + q * 1.6, py); g.lineTo(px + q * 0.5, py + q * 0.5); g.lineTo(px, py + q * 1.6); g.lineTo(px - q * 0.5, py + q * 0.5); g.lineTo(px - q * 1.6, py); g.lineTo(px - q * 0.5, py - q * 0.5); g.closePath(); g.fill();
  });
  g.save(); rr(g, x, y, s, s, r); g.clip();
  var gl2 = g.createLinearGradient(x, y, x, y + s * 0.55); gl2.addColorStop(0, 'rgba(255,255,255,.55)'); gl2.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl2; g.beginPath(); g.ellipse(x + s * 0.5, y + s * 0.02, s * 0.62, s * 0.4, 0, 0, 7); g.fill(); g.restore();
  var bl = s * 0.3, bt = Math.max(2, s * 0.06), gg2 = g.createLinearGradient(x, y, x + s, y + s); gg2.addColorStop(0, '#fff0b8'); gg2.addColorStop(0.5, '#e9b84e'); gg2.addColorStop(1, '#9a6618');
  g.strokeStyle = gg2; g.lineWidth = bt; g.lineCap = 'round'; g.lineJoin = 'round';
  [[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]].forEach(function (q) {
    var cx0 = x + q[0] * s + q[2] * bt * 0.6, cy0 = y + q[1] * s + q[3] * bt * 0.6;
    g.beginPath(); g.moveTo(cx0 + q[2] * bl, cy0); g.lineTo(cx0, cy0); g.lineTo(cx0, cy0 + q[3] * bl); g.stroke();
  });
  rr(g, x, y, s, s, r); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = Math.max(1.2, s * 0.03); g.stroke();
  SP.block = c; SP.size = size; SP.pad = pad;
  SP.haloP = halo('138,92,240', cs * 3); SP.haloC = halo('111,227,242', cs * 3); SP.haloG = halo('240,201,112', cs * 3); SP.haloD = halo('150,130,205', cs * 3); SP.haloW = halo('255,255,255', cs * 3); SP.haloE = halo('255,140,40', cs * 2);
  (function () {   // ثقب أسود: ذراع قرص تراكم + نواة
    var S = Math.ceil(cs * 3.4 * DPR), R0 = S / 2, a = mk(S, S), ag = a.getContext('2d'); ag.translate(R0, R0);
    for (var arm = 0; arm < 4; arm++) {
      ag.save(); ag.rotate(arm * 1.5708);
      for (var q = 0; q < 46; q++) {
        var u = q / 46, rr0 = R0 * (0.2 + u * 0.78), an = u * 2.3, x = Math.cos(an) * rr0, y = Math.sin(an) * rr0, w = R0 * (0.075 * (1 - u * 0.7)), al = (1 - u) * 0.85;
        var cc = u < 0.3 ? '255,235,170' : u < 0.62 ? '190,130,255' : '90,210,255';
        var rg = ag.createRadialGradient(x, y, 0, x, y, w * 2.2); rg.addColorStop(0, 'rgba(' + cc + ',' + al + ')'); rg.addColorStop(1, 'rgba(' + cc + ',0)');
        ag.fillStyle = rg; ag.beginPath(); ag.arc(x, y, w * 2.2, 0, 7); ag.fill();
      }
      ag.restore();
    }
    SP.bhArms = a;
    var c2 = mk(S, S), g2 = c2.getContext('2d'); g2.translate(R0, R0); var Rc = cs * 0.3 * DPR;
    var hg = g2.createRadialGradient(0, 0, Rc * 0.9, 0, 0, Rc * 2.1); hg.addColorStop(0, 'rgba(255,200,120,.9)'); hg.addColorStop(0.25, 'rgba(190,120,255,.5)'); hg.addColorStop(1, 'rgba(120,80,255,0)'); g2.fillStyle = hg; g2.beginPath(); g2.arc(0, 0, Rc * 2.1, 0, 7); g2.fill();
    g2.fillStyle = '#000'; g2.beginPath(); g2.arc(0, 0, Rc, 0, 7); g2.fill();
    g2.strokeStyle = 'rgba(255,236,190,.95)'; g2.lineWidth = Math.max(1.5, Rc * 0.1); g2.shadowColor = 'rgba(255,190,90,1)'; g2.shadowBlur = Rc * 0.6; g2.beginPath(); g2.arc(0, 0, Rc * 1.04, 0, 7); g2.stroke();
    g2.shadowBlur = 0; g2.strokeStyle = 'rgba(255,255,255,.55)'; g2.lineWidth = Math.max(1, Rc * 0.06); g2.beginPath(); g2.ellipse(0, 0, Rc * 1.75, Rc * 0.42, -0.35, 0, 7); g2.stroke();
    SP.bhCore = c2; SP.bhS = S / DPR;
  })(); SP.haloH = halo('255,225,150', cs * 2);
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
  G.wallSp = []; for (var wy = 0; wy < lv.h; wy++) for (var wx = 0; wx < lv.w; wx++) if (lv.solid[wy * lv.w + wx] && hh(wx, wy) % 4 === 0) G.wallSp.push({ x: wx, y: wy, fx: 0.25 + (hh(wx, wy) % 5) * 0.12, fy: 0.25 + (hh(wy, wx) % 5) * 0.12, p: (hh(wx, wy) % 100) / 100 });
  rebuildLayers();
}
function rebuildLayers(rects) {
  if (!Lb) return;
  if (!rects || !rects.length) { resetLayer(Lb); drawBoard(Lb.g); resetLayer(Lw); drawWalls(Lw.g); drawFrameGems(Lw.g); return; }
  [[Lb, drawBoard], [Lw, function (g) { drawWalls(g); drawFrameGems(g); }]].forEach(function (a) {
    var L = a[0], g = L.g;
    g.setTransform(DPR, 0, 0, DPR, -L.x * DPR, -L.y * DPR); g.save(); g.beginPath();
    rects.forEach(function (r) { g.rect(r[0], r[1], r[2], r[3]); });
    g.clip();
    g.clearRect(L.x, L.y, L.w, L.h); a[1](g); g.restore();
  });
}
function solidAt(x, y) { var lv = G.lv; return x >= 0 && y >= 0 && x < lv.w && y < lv.h && lv.solid[y * lv.w + x] === 1; }
function alive(x, y) { return solidAt(x, y) && !G.gone[y * G.lv.w + x]; }

var FR = {
  1: { fill: ['#7c63c8', '#4a3590', '#2a1a62'], m: ['#fff0b8', '#e9b84e', '#a8741f', '#f0c970'], glow: '138,92,240', ln: 'rgba(240,201,112,.55)', st: 'rgba(255,230,160,.5)' },
  2: { fill: ['#6a4a3e', '#35211c', '#160b09'], m: ['#ffd9a8', '#d9833a', '#7a3a12', '#f0a860'], glow: '255,110,30', ln: 'rgba(255,150,70,.55)', st: 'rgba(255,170,90,.55)' },
  3: { fill: ['#5a7fb8', '#2a4488', '#101a4c'], m: ['#f4fdff', '#a8cdee', '#5a7aa8', '#dff0ff'], glow: '110,230,255', ln: 'rgba(170,235,255,.55)', st: 'rgba(200,245,255,.6)' }
};
function FRt() { return FR[(G.world && G.world.id) || 1]; }
function drawFrame(g) {
  var F = FRt();
  var lv = G.lv, x0 = ox - fp, y0 = oy - dz - fp, w = lv.w * cs + 2 * fp, h = lv.h * cs + dz + 2 * fp, ch = cs * 0.42;
  function path(ix) {
    var a = x0 + ix, b = y0 + ix, c = x0 + w - ix, d = y0 + h - ix, q = Math.max(0, ch - ix);
    g.beginPath(); g.moveTo(a + q, b); g.lineTo(c - q, b); g.lineTo(c, b + q); g.lineTo(c, d - q); g.lineTo(c - q, d); g.lineTo(a + q, d); g.lineTo(a, d - q); g.lineTo(a, b + q); g.closePath();
  }
  g.save(); g.shadowColor = 'rgba(' + F.glow + ',.85)'; g.shadowBlur = cs * 0.7; path(0); g.fillStyle = '#1a0d44'; g.fill(); g.restore();
  var gr = g.createLinearGradient(x0, y0, x0 + w, y0 + h); gr.addColorStop(0, F.fill[0]); gr.addColorStop(0.5, F.fill[1]); gr.addColorStop(1, F.fill[2]);
  path(0); g.fillStyle = gr; g.fill();
  var gold = g.createLinearGradient(x0, y0, x0, y0 + h); gold.addColorStop(0, F.m[0]); gold.addColorStop(0.35, F.m[1]); gold.addColorStop(0.7, F.m[2]); gold.addColorStop(1, F.m[3]);
  path(1); g.strokeStyle = gold; g.lineWidth = Math.max(2.5, cs * 0.075); g.stroke();
  path(cs * 0.17); g.strokeStyle = F.ln; g.lineWidth = 1.2; g.stroke();
  path(fp - 2); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.stroke();
  var studs = [], n, i;
  n = lv.w * 2; for (i = 1; i < n; i++) { var sx = x0 + w * i / n; studs.push([sx, y0 + fp * 0.38], [sx, y0 + h - fp * 0.38]); }
  n = lv.h * 2; for (i = 1; i < n; i++) { var sy = y0 + h * i / n; studs.push([x0 + fp * 0.38, sy], [x0 + w - fp * 0.38, sy]); }
  g.fillStyle = F.st;
  studs.forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], Math.max(1, cs * 0.022), 0, 7); g.fill(); });
  function orn(ox2, oy2, rot) {
    var d = cs * 0.15; g.save(); g.translate(ox2, oy2); g.rotate(rot);
    g.shadowColor = 'rgba(255,200,90,.9)'; g.shadowBlur = cs * 0.14;
    g.beginPath(); g.moveTo(0, -d * 1.5); g.lineTo(d, 0); g.lineTo(0, d * 1.5); g.lineTo(-d, 0); g.closePath();
    var og = g.createLinearGradient(0, -d, 0, d); og.addColorStop(0, F.m[0]); og.addColorStop(0.5, F.m[1]); og.addColorStop(1, F.m[2]); g.fillStyle = og; g.fill(); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(60,30,0,.6)'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(0, -d * 0.6); g.lineTo(d * 0.4, 0); g.lineTo(0, d * 0.6); g.lineTo(-d * 0.4, 0); g.closePath(); g.fillStyle = (G.world && G.world.id === 2) ? '#ff4a1a' : (G.world && G.world.id === 3) ? '#38e0ff' : '#7a4bff'; g.fill(); g.restore();
  }
  for (i = 3; i < lv.w; i += 3) { var ox2 = x0 + fp + i * cs; orn(ox2, y0 + fp * 0.5, 0); orn(ox2, y0 + h - fp * 0.5, 0); }
  for (i = 3; i < lv.h; i += 3) { var oy2 = y0 + fp + dz + i * cs; orn(x0 + fp * 0.5, oy2, 0); orn(x0 + w - fp * 0.5, oy2, 0); }
  gemPts = [];
  var gs = cs * 0.74;
  gemPts.push({ x: x0 + ch * 0.35, y: y0 + ch * 0.35, s: gs }, { x: x0 + w - ch * 0.35, y: y0 + ch * 0.35, s: gs }, { x: x0 + ch * 0.35, y: y0 + h - ch * 0.35, s: gs }, { x: x0 + w - ch * 0.35, y: y0 + h - ch * 0.35, s: gs });
  gemPts.push({ x: x0 + fp * 0.1, y: y0 + h / 2, s: gs * 0.5 }, { x: x0 + w - fp * 0.1, y: y0 + h / 2, s: gs * 0.5 }, { x: x0 + w / 2, y: y0 + h - fp * 0.1, s: gs * 0.5 });
}
function drawFrameGems(g) {
  var wid = (G.world && G.world.id) || 1, F = FRt();
  gemPts.forEach(function (p, pi) {
    var s = p.s, big = s > cs * 0.5;
    g.save(); g.translate(p.x, p.y); g.shadowColor = 'rgba(' + F.glow + ',.9)'; g.shadowBlur = s * 0.6;
    var mg = g.createLinearGradient(0, -s * 1.4, 0, s * 1.4); mg.addColorStop(0, F.m[0]); mg.addColorStop(0.5, F.m[2]); mg.addColorStop(1, F.m[3]);
    g.fillStyle = mg;
    if (wid === 2) {   // شظايا سبج مسنّنة + قلب حمم
      var sp = [[-2.3, 1.7], [-1.6, 1.1], [-0.9, 1.6], [-0.2, 1.05], [0.6, 1.75], [1.3, 1.1], [2.1, 1.65], [2.8, 1.15], [3.6, 1.7], [4.4, 1.1]];
      g.fillStyle = '#1b0e0b'; g.strokeStyle = F.m[1]; g.lineWidth = Math.max(1, s * 0.05);
      sp.forEach(function (a) { g.save(); g.rotate(a[0] + pi); g.beginPath(); g.moveTo(0, -s * a[1]); g.lineTo(s * 0.2, -s * 0.35); g.lineTo(-s * 0.2, -s * 0.35); g.closePath(); g.fill(); g.stroke(); g.restore(); });
      g.beginPath(); g.arc(0, 0, s * 0.85, 0, 7); g.fillStyle = mg; g.fill();
      g.shadowBlur = 0; facetGem(g, 0, 0, s * 0.95, ['#ffd9a0', '#ff4a1a', '#6a0a05']);
    } else if (wid === 3) {   // حلقات فضية + بلورة سيان ومدارية
      g.strokeStyle = mg; g.lineWidth = Math.max(1.5, s * 0.09);
      g.beginPath(); g.ellipse(0, 0, s * 1.5, s * 0.55, 0.6, 0, 7); g.stroke(); g.beginPath(); g.ellipse(0, 0, s * 1.4, s * 0.45, -0.6, 0, 7); g.stroke();
      g.shadowBlur = 0; facetGem(g, 0, 0, s * 1.05, ['#f4fdff', '#46d8f0', '#2a2ab0']);
      if (big) { facetGem(g, s * 1.25, -s * 0.7, s * 0.32, ['#ffd0f4', '#ff7ae8', '#8a1a9a']); facetGem(g, -s * 1.25, s * 0.7, s * 0.32, ['#ffd0f4', '#ff7ae8', '#8a1a9a']); }
    } else {   // عنقود أميثست بإطار ذهبي
      [[0, 1], [Math.PI / 2, 0.85], [Math.PI, 1], [-Math.PI / 2, 0.85]].forEach(function (a) {
        g.save(); g.rotate(a[0] + Math.PI / 4); g.beginPath(); g.moveTo(0, -s * 1.5 * a[1]); g.lineTo(s * 0.2, -s * 0.3); g.lineTo(0, 0); g.lineTo(-s * 0.2, -s * 0.3); g.closePath(); g.fill(); g.restore();
      });
      [[0, -1.55], [0, 1.55], [-1.55, 0], [1.55, 0]].forEach(function (p2) { g.beginPath(); g.moveTo(p2[0] * s, p2[1] * s); g.lineTo(p2[0] * s * 0.65 + p2[1] * s * 0.12, p2[1] * s * 0.65 + p2[0] * s * 0.12); g.lineTo(p2[0] * s * 0.65 - p2[1] * s * 0.12, p2[1] * s * 0.65 - p2[0] * s * 0.12); g.closePath(); g.fill(); });
      g.shadowBlur = 0; facetGem(g, 0, 0, s, ['#f1e8ff', '#8a5cf0', '#2c1a9a']);
      if (big) { facetGem(g, s * 0.8, s * 0.55, s * 0.3, ['#f1e8ff', '#a98cff', '#3a2aa0']); facetGem(g, -s * 0.8, s * 0.55, s * 0.3, ['#f1e8ff', '#a98cff', '#3a2aa0']); }
    }
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
    grd.addColorStop(0, gold ? '#8a5e14' : TH().under[0]); grd.addColorStop(1, gold ? '#3a2408' : TH().under[1]);
    g.fillStyle = grd; g.fillRect(px, ty + cs, cs, dz);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, ty + cs, cs, 1.5);
  }
  grd = g.createLinearGradient(px, ty, px + cs, ty + cs);
  if (gold) { grd.addColorStop(0, '#ffd978'); grd.addColorStop(0.55, '#e9a038'); grd.addColorStop(1, '#a8651a'); } else { grd.addColorStop(0, TH().stone[0]); grd.addColorStop(1, TH().stone[1]); }
  g.fillStyle = grd; g.fillRect(px, ty, cs, cs);
  var t = Math.max(2, cs * 0.07);
  g.fillStyle = 'rgba(255,255,255,' + (gold ? 0.3 : 0.16) + ')'; if (!above) g.fillRect(px, ty, cs, t); if (!left) g.fillRect(px, ty, t * 0.7, cs);
  g.fillStyle = 'rgba(0,0,0,.3)'; if (!below) g.fillRect(px, ty + cs - t, cs, t); if (!right) g.fillRect(px + cs - t * 0.7, ty, t * 0.7, cs);
  g.strokeStyle = gold ? 'rgba(90,40,0,.5)' : 'rgba(10,4,30,.4)'; g.lineWidth = 1; g.strokeRect(px + 0.5, ty + 0.5, cs - 1, cs - 1);
  var inset = cs * 0.13, rv = Math.max(1, cs * 0.028);
  g.fillStyle = gold ? 'rgba(120,60,0,.16)' : 'rgba(5,2,25,.22)'; g.fillRect(px + inset, ty + inset, cs - inset * 2, cs - inset * 2);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + inset, ty + cs - inset); g.lineTo(px + inset, ty + inset); g.lineTo(px + cs - inset, ty + inset); g.stroke();
  g.strokeStyle = gold ? 'rgba(255,245,200,.5)' : 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(px + cs - inset, ty + inset); g.lineTo(px + cs - inset, ty + cs - inset); g.lineTo(px + inset, ty + cs - inset); g.stroke();
  g.fillStyle = gold ? '#fff3c4' : 'rgba(240,201,112,.7)';
  [[inset, inset], [cs - inset, inset], [inset, cs - inset], [cs - inset, cs - inset]].forEach(function (q) { g.beginPath(); g.arc(px + q[0], ty + q[1], rv, 0, 7); g.fill(); });
  var h = hh(x, y), c = cs / 2, T = TH(), edge = !above || !below || !left || !right;
  if (!gold) {   // حافة نيون مضيئة على الأضلاع المواجهة لساحة اللعب
    g.save(); g.strokeStyle = T.edge; g.shadowColor = T.edge; g.shadowBlur = cs * 0.22; g.lineWidth = Math.max(1.4, cs * 0.045); g.lineCap = 'round';
    g.beginPath();
    if (!below) { g.moveTo(px + cs * 0.12, ty + cs - 1); g.lineTo(px + cs * 0.88, ty + cs - 1); }
    if (!above) { g.moveTo(px + cs * 0.12, ty + 1); g.lineTo(px + cs * 0.88, ty + 1); }
    if (!left) { g.moveTo(px + 1, ty + cs * 0.12); g.lineTo(px + 1, ty + cs * 0.88); }
    if (!right) { g.moveTo(px + cs - 1, ty + cs * 0.12); g.lineTo(px + cs - 1, ty + cs * 0.88); }
    g.stroke(); g.restore();
  }
  var inner = x > 0 && y > 0 && x < G.lv.w - 1 && y < G.lv.h - 1;
  if (inner && k === '#') {   // عوائق داخلية: عنقود بلورات / صخور ناتئة بلون العالم
    g.save(); g.translate(px + c, ty + c + cs * 0.1);
    var n = 3, i2;
    for (i2 = 0; i2 < n; i2++) {
      var sx = (i2 - 1) * cs * 0.24 + ((h >> (i2 * 3)) % 5 - 2) * cs * 0.012, hgt = cs * (0.56 - Math.abs(i2 - 1) * 0.14 + ((h >> (i2 + 5)) % 4) * 0.03), wd = cs * 0.15, tl = ((h >> (i2 * 2)) % 5 - 2) * cs * 0.025;
      g.save(); g.shadowColor = T.shardGlow; g.shadowBlur = cs * 0.2;
      g.beginPath(); g.moveTo(sx - wd, cs * 0.2); g.lineTo(sx - wd * 0.8, cs * 0.2 - hgt * 0.7); g.lineTo(sx + tl, cs * 0.2 - hgt); g.lineTo(sx + wd * 0.8, cs * 0.2 - hgt * 0.7); g.lineTo(sx + wd, cs * 0.2); g.closePath();
      var sg = g.createLinearGradient(sx - wd, 0, sx + wd, 0); sg.addColorStop(0, T.shard[0]); sg.addColorStop(0.5, T.shard[1]); sg.addColorStop(1, T.shard[2]); g.fillStyle = sg; g.fill(); g.restore();
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(sx - wd * 0.8, cs * 0.2 - hgt * 0.7); g.lineTo(sx + tl, cs * 0.2 - hgt); g.lineTo(sx + tl - wd * 0.12, cs * 0.2 - hgt * 0.6); g.lineTo(sx - wd * 0.45, cs * 0.2 - hgt * 0.3); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
    }
    g.restore();
  }
  g.save(); g.translate(px + c, ty + c);
  if (gold) {
    g.save(); g.shadowColor = 'rgba(255,170,40,.9)'; g.shadowBlur = cs * 0.2; g.fillStyle = '#fff3c4'; star4(g, cs * 0.3, 0.3); g.fill(); g.restore();
    g.strokeStyle = 'rgba(120,60,0,.55)'; g.lineWidth = 1; star4(g, cs * 0.3, 0.3); g.stroke();
    g.strokeStyle = 'rgba(255,240,190,.7)'; g.lineWidth = Math.max(1.2, cs * 0.035); g.beginPath(); g.arc(0, 0, cs * 0.36, 0, 7); g.stroke();
  } else if (k === '#' && !inner && h % 3 === 0) {
    g.save(); g.shadowColor = 'rgba(255,200,90,.8)'; g.shadowBlur = cs * 0.14; g.strokeStyle = 'rgba(255,214,120,.6)'; g.lineWidth = 1.4; var r = cs * 0.15;
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.28, 0, 7); g.fillStyle = 'rgba(255,230,160,.8)'; g.fill(); g.restore();
  } else if (k === '#' && h % 7 === 1) {
    g.strokeStyle = 'rgba(10,4,30,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-cs * 0.3, -cs * 0.2); g.lineTo(-cs * 0.05, 0); g.lineTo(-cs * 0.12, cs * 0.28); g.stroke();
  }
  g.restore();
}

/* ---------- الخلفية الفنية ---------- */
function drawBg() {
  var t = G.t;
  var bgi = (!G.title && G.world && G.world.bg) ? bgFor(G.world.bg) : bgImg;
  if (!(bgi.complete && bgi.naturalWidth)) bgi = bgImg;
  if (bgi.complete && bgi.naturalWidth) {
    var iw = bgi.naturalWidth, ih = bgi.naturalHeight, s = Math.max(W / iw, H / ih) * 1.07;
    var dw = iw * s, dh = ih * s, dx = (W - dw) / 2 + Math.sin(t * 0.07) * W * 0.012, dy = (H - dh) / 2 + Math.cos(t * 0.05) * H * 0.008;
    cx.drawImage(bgi, dx, dy, dw, dh);
  } else {
    var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1a7a'); g.addColorStop(1, '#0a0420'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  if (!G.title) { cx.fillStyle = (G.world && G.world.tint) || 'rgba(8,3,32,.08)'; cx.fillRect(0, 0, W, H); }
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
  if (dir === 'pull') {   // علامة الانجذاب: حلزون صغير يدور
    cx.save(); cx.translate(x, y); cx.rotate(-t * 2); cx.lineCap = 'round'; cx.lineWidth = Math.max(1.6, cs * 0.05); cx.strokeStyle = 'rgba(190,150,255,' + (0.8 * a) + ')';
    cx.beginPath(); for (var q = 0; q < 24; q++) { var rr4 = s * (0.05 + q * 0.012), aa = q * 0.38; cx.lineTo(Math.cos(aa) * rr4, Math.sin(aa) * rr4 + s * 0.34); } cx.stroke(); cx.restore(); return;
  }
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
  var ph = ((G.t * 0.35 + i * 0.37) % 1.6) - 0.3;   // لمعة تعبر الكتلة كل بضع ثوانٍ
  if (ph > -0.1 && ph < 1.1) {
    var bs = cs * 0.86; cx.save(); cx.translate(c[0], c[1] - lift); if (sc !== 1) cx.scale(sc, sc);
    cx.beginPath(); cx.moveTo(-bs / 2 + bs * 0.2, -bs / 2); cx.arcTo(bs / 2, -bs / 2, bs / 2, bs / 2, bs * 0.2); cx.arcTo(bs / 2, bs / 2, -bs / 2, bs / 2, bs * 0.2); cx.arcTo(-bs / 2, bs / 2, -bs / 2, -bs / 2, bs * 0.2); cx.arcTo(-bs / 2, -bs / 2, bs / 2, -bs / 2, bs * 0.2); cx.closePath(); cx.clip();
    var gx = (ph - 0.5) * bs * 1.8, lg = cx.createLinearGradient(gx - bs * 0.2, -bs * 0.2, gx + bs * 0.2, bs * 0.2);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    cx.globalCompositeOperation = 'lighter'; cx.fillStyle = lg; cx.fillRect(-bs, -bs, bs * 2, bs * 2); cx.restore();
  }
  cx.save(); gravMark(c[0], c[1] - lift, b.g, 0.95 * sc); cx.restore();
}
function drawPlate(p, covered) {
  var c = cxy(p.x, p.y), dt = G.dt;
  if (covered && !p.on) { G.rings.push({ x: c[0], y: c[1], t: 0, col: '255,230,160' }); }
  p.on = covered; p.glow += ((covered ? 1 : 0) - p.glow) * Math.min(1, dt * 9);
  var gl = p.glow, pulse = 0.5 + 0.5 * Math.sin(G.t * 3 + p.x);
  cx.save(); cx.translate(c[0], c[1]);
  var sg = cx.createRadialGradient(0, -cs * 0.08, cs * 0.05, 0, 0, cs * 0.42); sg.addColorStop(0, 'rgba(60,34,110,.95)'); sg.addColorStop(1, 'rgba(6,2,20,.95)');
  cx.fillStyle = sg; cx.beginPath(); cx.arc(0, 0, cs * 0.42, 0, 7); cx.fill();
  cx.strokeStyle = 'rgba(0,0,0,.55)'; cx.lineWidth = Math.max(2, cs * 0.05); cx.beginPath(); cx.arc(0, 0, cs * 0.44, 0, 7); cx.stroke();
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
  for (var q = 0; q < 8; q++) {   // رونات تمتلئ بالضوء عند الضغط
    var qa = q * Math.PI / 4 + Math.PI / 8, on = gl > (q + 1) / 9 || gl > 0.95, rq = cs * 0.34;
    cx.save(); cx.rotate(qa); cx.translate(0, -rq); cx.beginPath(); cx.moveTo(0, -cs * 0.05); cx.lineTo(cs * 0.035, cs * 0.04); cx.lineTo(-cs * 0.035, cs * 0.04); cx.closePath();
    cx.fillStyle = on ? 'rgba(255,238,170,' + (0.7 + 0.3 * pulse) + ')' : 'rgba(240,201,112,.22)'; cx.fill(); cx.restore();
  }
  if (gl > 0.3) { cx.save(); cx.globalCompositeOperation = 'lighter'; var col = cx.createLinearGradient(0, 0, 0, -cs * 1.1); col.addColorStop(0, 'rgba(255,225,150,' + (0.35 * gl) + ')'); col.addColorStop(1, 'rgba(255,225,150,0)'); cx.fillStyle = col; cx.fillRect(-cs * 0.2, -cs * 1.1, cs * 0.4, cs * 1.1); cx.restore(); }
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
    var w = cs * 0.74, x0 = ox + gt.x * cs + (cs - w) / 2, ybot = oy + (gt.y + 1) * cs, ytop = oy + gt.y * cs - dz + cs * 0.1, h = ybot - ytop, mx = x0 + w / 2, ay = ytop + w / 2, R = w / 2;
    var prog = total ? covered / total : 0, pw = cs * 0.15;
    if (gt.lc === undefined) gt.lc = covered;
    if (covered > gt.lc && !G.cine) { G.rings.push({ x: mx, y: ay, t: 0, col: '255,225,150', big: 1.3 }); burst(mx, ay, 0, 20, 14, 'rgba(255,225,150,.95)', cs * 2); AudioFX.tick && AudioFX.tick(covered + 2); vibrate(14); G.punch = Math.max(G.punch, 0.4); }
    gt.lc = covered;
    cx.save();
    // هالة الباب
    cx.save(); cx.globalCompositeOperation = 'lighter';
    var TT = TH(), HO = SP[TT.haloOpen];
    glow(o > 0 ? HO : SP.haloG, mx, ay + R * 0.3, cs * (2.4 + prog * 1.2 + o * 2.2 + 0.2 * Math.sin(t * 2.2)), 0.12 + prog * 0.3 + o * 0.5); cx.restore();
    if (o > 0) {
      var sh = cx.createLinearGradient(0, ybot, 0, ybot + cs * 4);
      sh.addColorStop(0, 'rgba(' + TT.open[0] + ',' + 0.5 * o + ')'); sh.addColorStop(1, 'rgba(' + TT.open[0] + ',0)');
      cx.globalCompositeOperation = 'lighter'; cx.fillStyle = sh;
      cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0 + w, ybot); cx.lineTo(x0 + w + cs * 1.5, ybot + cs * 4); cx.lineTo(x0 - cs * 1.5, ybot + cs * 4); cx.closePath(); cx.fill();
      cx.globalCompositeOperation = 'source-over';
    }
    // العمودان الجانبيان
    var gg = cx.createLinearGradient(0, ytop, 0, ybot); gg.addColorStop(0, '#fff0b8'); gg.addColorStop(0.4, '#e9b84e'); gg.addColorStop(1, '#8a5a14');
    [x0 - pw * 0.9, x0 + w - pw * 0.1].forEach(function (px) {
      cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(px + 2, ay, pw, ybot - ay);
      cx.fillStyle = gg; cx.fillRect(px, ay, pw, ybot - ay);
      cx.fillStyle = 'rgba(255,255,255,.35)'; cx.fillRect(px, ay, pw * 0.28, ybot - ay);
      cx.fillStyle = '#4a2e08'; cx.fillRect(px, ybot - cs * 0.1, pw, cs * 0.1);
    });
    // فتحة الباب
    cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0, ay); cx.arc(mx, ay, R, Math.PI, 0); cx.lineTo(x0 + w, ybot); cx.closePath();
    var fg = cx.createLinearGradient(0, ytop, 0, ybot);
    if (o > 0) { fg.addColorStop(0, 'rgba(' + TT.open[0] + ',' + (0.35 + 0.65 * o) + ')'); fg.addColorStop(1, 'rgba(' + TT.open[1] + ',' + (0.3 + 0.6 * o) + ')'); }
    else { fg.addColorStop(0, '#05030a'); fg.addColorStop(1, '#1a0f34'); }
    cx.fillStyle = fg; cx.fill();
    cx.save(); cx.clip();
    cx.globalCompositeOperation = 'lighter'; cx.translate(mx, ytop + h * 0.5);
    if (o > 0) {
      for (var i = 0; i < 3; i++) { cx.save(); cx.rotate(t * (0.8 + i * 0.5) * (i % 2 ? -1 : 1)); cx.setLineDash([cs * 0.2, cs * 0.14]); cx.strokeStyle = 'rgba(255,255,255,' + 0.55 * o + ')'; cx.lineWidth = 1.4; cx.beginPath(); cx.arc(0, 0, cs * (0.14 + i * 0.12), 0, 7); cx.stroke(); cx.restore(); }
    } else {
      for (var b = 0; b < 2; b++) {   // ضباب بنفسجي يدور داخل الختم
        var a = t * (0.5 + b * 0.3) * (b ? -1 : 1), bx = Math.cos(a) * w * 0.18, by = Math.sin(a * 1.3) * h * 0.18;
        var ng = cx.createRadialGradient(bx, by, 0, bx, by, w * 0.55); ng.addColorStop(0, 'rgba(' + TT.mist[b ? 1 : 0] + ',' + (0.16 + prog * 0.22) + ')'); ng.addColorStop(1, 'rgba(0,0,0,0)');
        cx.fillStyle = ng; cx.fillRect(-w, -h, w * 2, h * 2);
      }
      cx.rotate(t * 0.25); cx.strokeStyle = 'rgba(255,200,100,' + (0.25 + prog * 0.5) + ')'; cx.lineWidth = 1.2;
      cx.beginPath(); for (var k = 0; k < 6; k++) { var aa = k * Math.PI / 3; cx.lineTo(Math.cos(aa) * w * 0.28, Math.sin(aa) * w * 0.28); } cx.closePath(); cx.stroke();
      cx.rotate(-t * 0.5); cx.beginPath(); for (k = 0; k < 6; k++) { aa = k * Math.PI / 3 + 0.5; cx.lineTo(Math.cos(aa) * w * 0.2, Math.sin(aa) * w * 0.2); } cx.closePath(); cx.stroke();
    }
    cx.restore();
    // القوس الذهبي
    cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0, ay); cx.arc(mx, ay, R, Math.PI, 0); cx.lineTo(x0 + w, ybot);
    cx.strokeStyle = o > 0 ? '#dffcff' : '#f0c970'; cx.lineWidth = Math.max(2, cs * 0.08); cx.lineJoin = 'round'; cx.stroke();
    cx.strokeStyle = o > 0 ? 'rgba(170,244,255,.6)' : 'rgba(255,240,184,.45)'; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(x0 + cs * 0.07, ybot); cx.lineTo(x0 + cs * 0.07, ay); cx.arc(mx, ay, R - cs * 0.07, Math.PI, 0); cx.lineTo(x0 + w - cs * 0.07, ybot); cx.stroke();
    // مقاطع الرونات حول القوس: تضيء مع كل مفتاح
    var n = Math.max(1, total), rr3 = R + cs * 0.11, seg = Math.PI / n;
    for (var j = 0; j < n; j++) {
      var on = j < covered || o > 0, a0 = Math.PI + j * seg + seg * 0.12, a1 = Math.PI + (j + 1) * seg - seg * 0.12;
      cx.beginPath(); cx.arc(mx, ay, rr3, a0, a1); cx.lineCap = 'round'; cx.lineWidth = Math.max(2.4, cs * 0.075);
      cx.strokeStyle = on ? (o > 0 ? '#e8ffff' : '#ffe6a3') : 'rgba(240,201,112,.2)'; cx.stroke();
      if (on) { var am = (a0 + a1) / 2; cx.save(); cx.globalCompositeOperation = 'lighter'; glow(o > 0 ? HO : SP.haloG, mx + Math.cos(am) * rr3, ay + Math.sin(am) * rr3, cs * (0.9 + 0.2 * Math.sin(t * 5 + j)), 0.75); cx.restore(); }
    }
    // حجر القفل في القمة
    var ky = ay - rr3 - cs * 0.03, kr = cs * 0.13;
    cx.save(); cx.shadowColor = o > 0 ? 'rgba(150,240,255,.95)' : 'rgba(255,190,80,' + (0.4 + prog * 0.6) + ')'; cx.shadowBlur = cs * (0.15 + prog * 0.25 + o * 0.3);
    cx.beginPath(); cx.moveTo(mx, ky - kr * 1.5); cx.lineTo(mx + kr, ky); cx.lineTo(mx, ky + kr * 1.2); cx.lineTo(mx - kr, ky); cx.closePath();
    cx.fillStyle = o > 0 ? '#b8f6ff' : prog > 0.99 ? '#ffe9a8' : '#a07a2a'; cx.fill(); cx.restore();
    cx.strokeStyle = 'rgba(60,30,0,.6)'; cx.lineWidth = 1; cx.stroke();
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
function hsh(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function drawEmber(i, t, bw, bh) {   // جمرة حقيقية: دورة حياة فردية، انجراف رياح، وميض، وذيل
  var per = 3.5 + hsh(i) * 5, off = hsh(i + 50) * per, tt = t + off, cyc = Math.floor(tt / per), ph = (tt % per) / per, sd = hsh(i * 3 + cyc * 17), sz = hsh(i * 5 + cyc * 11);
  var rise = bh * (0.35 + sd * 0.7), wind = cs * (0.5 + hsh(i + 9) * 1.2);
  function pos(p) { return [ox + hsh(i * 7 + cyc * 13) * bw + Math.sin(tt * (1.2 + sz) + i) * cs * 0.22 * p + wind * p * p, oy + bh - Math.pow(p, 0.8) * rise]; }
  var P = pos(ph), P0 = pos(Math.max(0, ph - 0.03)), fade = Math.sin(Math.min(1, ph) * Math.PI), fl = 0.75 + 0.25 * Math.sin(t * (14 + sz * 10) + i * 3), r = cs * (0.035 + sz * 0.05) * (1 - ph * 0.5);
  cx.lineCap = 'round'; cx.strokeStyle = 'rgba(255,' + (90 + (1 - ph) * 110 | 0) + ',30,' + 0.5 * fade * fl + ')'; cx.lineWidth = r * 1.4; cx.beginPath(); cx.moveTo(P0[0], P0[1]); cx.lineTo(P[0], P[1]); cx.stroke();
  glow(SP.haloE, P[0], P[1], r * 9, 0.55 * fade * fl);
  glow(SP.haloH, P[0], P[1], r * 3.2, 0.95 * fade * fl * (1 - ph * 0.6));
}
function drawAmbient() {
  var T = TH(), lv = G.lv, t = G.t, N = Math.round(24 * fxk()), bw = lv.w * cs, bh = lv.h * cs, at = lv.attr, i;
  if (N < 2) return;
  cx.save(); cx.globalCompositeOperation = 'lighter';
  for (i = 0; i < N; i++) {
    if (T.amb === 'ember') { drawEmber(i, t, bw, bh); continue; }
    var sd = (i * 7919) % 1000 / 1000, sd2 = (i * 104729) % 1000 / 1000, x, y, a, r;
    if (T.amb === 'ember') { var ph = (t * (0.12 + sd * 0.1) + sd2) % 1; x = ox + sd * bw + Math.sin(t * 1.3 + i) * cs * 0.3; y = oy + bh - ph * bh; a = Math.sin(ph * Math.PI) * 0.85; r = cs * (0.03 + sd2 * 0.03); cx.fillStyle = 'rgba(255,' + (140 + sd * 90 | 0) + ',60,' + a + ')'; }
    else if (T.amb === 'void' && at) { var ph2 = (t * 0.08 + sd2) % 1, a0 = sd * 6.283, d0 = Math.max(bw, bh) * 0.55 * (1 - ph2), ac = cxy(at.x, at.y); x = ac[0] + Math.cos(a0 + ph2 * 4) * d0; y = ac[1] + Math.sin(a0 + ph2 * 4) * d0; a = Math.sin(ph2 * Math.PI) * 0.7; r = cs * 0.035; cx.fillStyle = (i % 2 ? 'rgba(110,230,255,' : 'rgba(220,130,255,') + a + ')'; }
    else { var ph3 = (t * (0.05 + sd * 0.05) + sd2) % 1; x = ox + sd * bw + Math.sin(t * 0.7 + i * 2) * cs * 0.4; y = oy + sd2 * bh - ph3 * cs * 1.5; a = Math.sin(ph3 * Math.PI) * 0.7; r = cs * (0.025 + sd * 0.03); cx.fillStyle = 'rgba(' + T.spark + ',' + a + ')'; }
    cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill();
  }
  cx.restore();
  // وميض نجوم على الجدران
  if (G.wallSp) {
    cx.save(); cx.globalCompositeOperation = 'lighter';
    G.wallSp.forEach(function (w, j) {
      var ph = (t * 0.5 + w.p) % 1, a = Math.pow(Math.sin(ph * Math.PI), 4); if (a < 0.05) return;
      var px = ox + w.x * cs + cs * w.fx, py = oy + w.y * cs - dz + cs * w.fy, r = cs * 0.22 * a;
      cx.fillStyle = 'rgba(' + T.spark + ',' + 0.9 * a + ')';
      cx.beginPath(); cx.moveTo(px, py - r); cx.lineTo(px + r * 0.2, py - r * 0.2); cx.lineTo(px + r, py); cx.lineTo(px + r * 0.2, py + r * 0.2); cx.lineTo(px, py + r); cx.lineTo(px - r * 0.2, py + r * 0.2); cx.lineTo(px - r, py); cx.lineTo(px - r * 0.2, py - r * 0.2); cx.closePath(); cx.fill();
    });
    cx.restore();
  }
}
function drawAttractor() {
  var at = G.lv.attr; if (!at) return;
  var c = cxy(at.x, at.y), t = G.t, pull = G.law === 'pull' ? 1 : 0.6, S = SP.bhS * 1.0;
  cx.save(); cx.globalCompositeOperation = 'lighter'; glow(SP.haloP, c[0], c[1], cs * (3.2 + 0.3 * Math.sin(t * 2)), 0.5 * pull + 0.15);
  cx.translate(c[0], c[1]);
  cx.rotate(t * (0.9 + pull * 0.7)); cx.globalAlpha = 0.55 + 0.4 * pull; cx.drawImage(SP.bhArms, -S / 2, -S / 2, S, S);
  cx.rotate(-t * (1.9 + pull * 1.4)); cx.globalAlpha = 0.4 * pull + 0.15; cx.scale(0.72, 0.72); cx.drawImage(SP.bhArms, -S / 2, -S / 2, S, S);
  cx.restore();
  cx.save(); cx.translate(c[0], c[1]); cx.drawImage(SP.bhCore, -S / 2, -S / 2, S, S);
  cx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < 8; i++) { var ph = (t * 0.6 + i / 8) % 1, rr6 = cs * 0.34 * (2.4 - ph * 2.1), a6 = i * 0.785 + t * 0.5; cx.fillStyle = 'rgba(210,180,255,' + (0.8 * ph * pull) + ')'; cx.beginPath(); cx.arc(Math.cos(a6) * rr6, Math.sin(a6) * rr6, Math.max(1, cs * 0.03), 0, 7); cx.fill(); }
  cx.restore();
  if (G.law === 'pull' && G.mode === 'planning') {
    var sel = G.sel >= 0 ? G.blocks[G.sel] : null;
    if (sel) {   // خط سحب بسهم متدفق نحو الثقب
      var bc = cxy(sel.x, sel.y), dx = c[0] - bc[0], dy = c[1] - bc[1], L = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
      cx.save(); cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round'; cx.lineJoin = 'round';
      var sp = cs * 0.55, off = (t * cs * 1.6) % sp;
      for (var d = off + cs * 0.45; d < L - cs * 0.45; d += sp) { var px = bc[0] + dx / L * d, py = bc[1] + dy / L * d; cx.save(); cx.translate(px, py); cx.rotate(ang); cx.strokeStyle = 'rgba(200,160,255,' + (0.9 * Math.sin(d / L * Math.PI)) + ')'; cx.lineWidth = Math.max(2, cs * 0.06); cx.beginPath(); cx.moveTo(-cs * 0.1, -cs * 0.13); cx.lineTo(cs * 0.06, 0); cx.lineTo(-cs * 0.1, cs * 0.13); cx.stroke(); cx.restore(); }
      cx.restore();
    } else {   // لا اختيار: نبض حول الكتل يدعو للّمس
      cx.save(); cx.globalCompositeOperation = 'lighter';
      G.blocks.forEach(function (b2) { var p2 = cxy(b2.x, b2.y), k2 = (t * 0.9) % 1; cx.strokeStyle = 'rgba(200,160,255,' + 0.6 * (1 - k2) + ')'; cx.lineWidth = 2; rr(cx, p2[0] - cs * (0.43 + k2 * 0.18), p2[1] - cs * (0.43 + k2 * 0.18), cs * (0.86 + k2 * 0.36), cs * (0.86 + k2 * 0.36), cs * 0.2); cx.stroke(); });
      cx.restore();
    }
  }
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
  $('#toast').classList.remove('show'); $('#hint').classList.remove('show');
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
  (C.rects = C.rects || []).push([ox + T.x * cs - cs * 0.5, oy + T.y * cs - dz - cs * 0.5, cs * 2, cs * 2 + dz]);
  var dx = px - gp[0], dy = py - gp[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  var gold = T.kind === 'H', pal = gold ? ['#ffd978', '#e9a038', '#a8651a', '#fff0b8'] : ['#6a5aa6', '#4a3a86', '#31245f', '#8c7cd0'];
  var w2 = G.world && G.world.id === 2;
  if (w2 && !gold) pal = ['#b9aa9c', '#7a6a60', '#473a34', '#ff9a3c'];
  var w3 = G.world && G.world.id === 3;
  if (w3) { ux = -ux * 0.7; uy = -uy * 0.7; if (!gold) pal = ['#6fa8ff', '#8a5cf0', '#3a2cc8', '#ff7ae8']; }
  var lift = w2 ? 2.2 : 0;
  var n = Math.ceil((gold ? 9 : 6) * fxk());
  for (var i = 0; i < n && G.deb.length < 260; i++)
    chunk(px + rnd(-0.3, 0.3) * cs, py + rnd(-0.3, 0.3) * cs, ux * cs * rnd(2, 6) + rnd(-1, 1) * cs, uy * cs * rnd(1, 4) - cs * (rnd(1, 4.5) + lift), cs * rnd(0.12, 0.28), pal[(Math.random() * pal.length) | 0], rnd(1.1, 1.8));
  for (i = 0; i < Math.ceil(2 * fxk()) && G.puffs.length < 40; i++) G.puffs.push({ x: px + rnd(-0.3, 0.3) * cs, y: py + rnd(-0.3, 0.3) * cs, vx: ux * cs * 0.8 + rnd(-0.5, 0.5) * cs, vy: -cs * rnd(0.2, 1), life: 1.1, max: 1.1, r: cs * rnd(0.7, 1.2) });
  burst(px, py, ux * 60, uy * 60 - (w2 ? 90 : 0), gold ? 14 : 8, gold ? 'rgba(255,214,120,.95)' : w2 ? 'rgba(255,150,60,.95)' : 'rgba(170,140,255,.95)', cs * 3.2);
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
  if (C.dirty && G.t - C.lastRb > 0.05) { C.dirty = false; C.lastRb = G.t; var rs = C.rects; C.rects = []; rebuildLayers(rs); }
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
  var t = C.t, gp = gatePx(), i, TT = TH(), RC = TT.open[0], RC2 = TT.open[1];
  if (G.world && G.world.id === 3) {   // التفرّد: ثقب أسود ينمو عند البوابة ثم ينهار في وميض
    var e = clamp(t / 1.3, 0, 1), fade = t < 2.4 ? 1 : clamp(1 - (t - 2.4) / 0.8, 0, 1), R = cs * (0.2 + 1.6 * e * e) * (1 + 0.05 * Math.sin(t * 9));
    if (fade > 0.01) {
      cx.save(); cx.translate(gp[0], gp[1]); cx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < 4; k++) {
        cx.save(); cx.rotate(t * (2 + e * 4) + k * 1.571); cx.beginPath();
        for (var q = 0; q < 26; q++) { var rr7 = R * (0.3 + q * 0.04), aa = q * 0.2; cx.lineTo(Math.cos(aa) * rr7, Math.sin(aa) * rr7); }
        cx.strokeStyle = (k % 2 ? 'rgba(110,230,255,' : 'rgba(210,120,255,') + (0.7 * fade * Math.min(1, e * 2)) + ')'; cx.lineWidth = Math.max(1.5, cs * 0.06); cx.lineCap = 'round'; cx.stroke(); cx.restore();
      }
      cx.globalCompositeOperation = 'source-over';
      var bg = cx.createRadialGradient(0, 0, 0, 0, 0, R * 0.9); bg.addColorStop(0, 'rgba(0,0,0,' + fade + ')'); bg.addColorStop(0.75, 'rgba(6,0,24,' + 0.9 * fade + ')'); bg.addColorStop(1, 'rgba(6,0,24,0)');
      cx.fillStyle = bg; cx.beginPath(); cx.arc(0, 0, R * 0.95, 0, 7); cx.fill();
      cx.strokeStyle = 'rgba(255,230,170,' + 0.8 * fade * e + ')'; cx.lineWidth = Math.max(1.5, cs * 0.05); cx.beginPath(); cx.arc(0, 0, R * 0.42, 0, 7); cx.stroke();
      cx.restore();
    }
  }
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
      cx.strokeStyle = 'rgba(' + RC + ',' + a + ')'; cx.lineWidth = cs * 0.38 * a + 2; cx.beginPath(); cx.arc(gp[0], gp[1], R, 0, 7); cx.stroke();
      cx.strokeStyle = 'rgba(255,214,130,' + (a * 0.8) + ')'; cx.lineWidth = cs * 0.2 * a + 1; cx.beginPath(); cx.arc(gp[0], gp[1], R2, 0, 7); cx.stroke();
      var rg = cx.createRadialGradient(gp[0], gp[1], Math.max(0, R - cs * 2.2), gp[0], gp[1], R + 1); rg.addColorStop(0, 'rgba(' + RC2 + ',0)'); rg.addColorStop(1, 'rgba(' + RC2 + ',' + (0.3 * a) + ')');
      cx.fillStyle = rg; cx.beginPath(); cx.arc(gp[0], gp[1], R + 1, 0, 7); cx.fill();
    }
    // أشعة الضوء
    var ra = clamp(e / 0.5, 0, 1) * fade;
    if (ra > 0.01) {
      for (i = 0; i < (perfQ < 0.6 ? 5 : 9); i++) {
        var ang = Math.PI / 2 + (i - 4) * 0.28 + Math.sin(t * 0.6 + i) * 0.06, len = cs * (7 + (i % 3) * 2.5), wd = 0.04 + (i % 2) * 0.03;
        var lg = cx.createLinearGradient(gp[0], gp[1], gp[0] + Math.cos(ang) * len, gp[1] + Math.sin(ang) * len); lg.addColorStop(0, 'rgba(' + RC + ',' + (0.26 * ra) + ')'); lg.addColorStop(1, 'rgba(' + RC + ',0)');
        cx.fillStyle = lg; cx.beginPath(); cx.moveTo(gp[0], gp[1]);
        cx.lineTo(gp[0] + Math.cos(ang - wd) * len, gp[1] + Math.sin(ang - wd) * len); cx.lineTo(gp[0] + Math.cos(ang + wd) * len, gp[1] + Math.sin(ang + wd) * len); cx.closePath(); cx.fill();
      }
      // عمود ضوء للأعلى
      var bw = cs * (0.5 + 0.1 * Math.sin(t * 6)), bg = cx.createLinearGradient(gp[0] - bw, 0, gp[0] + bw, 0);
      bg.addColorStop(0, 'rgba(' + RC2 + ',0)'); bg.addColorStop(0.5, 'rgba(' + RC + ',' + (0.75 * ra) + ')'); bg.addColorStop(1, 'rgba(' + RC2 + ',0)');
      cx.fillStyle = bg; cx.fillRect(gp[0] - bw, 0, bw * 2, gp[1]);
    }
    glow(SP.haloW, gp[0], gp[1], cs * (3 + 2 * fade), 0.6 * fade);
    if (e < 0.9) {   // وميض الانفجار + شعاع عدسة أفقي ورأسي
      var fl = 1 - e / 0.9, sl = cs * (4 + 10 * (1 - fl)), sg = cx.createLinearGradient(gp[0] - sl, 0, gp[0] + sl, 0);
      sg.addColorStop(0, 'rgba(' + RC + ',0)'); sg.addColorStop(0.5, 'rgba(255,255,255,' + 0.9 * fl + ')'); sg.addColorStop(1, 'rgba(' + RC + ',0)');
      cx.fillStyle = sg; cx.fillRect(gp[0] - sl, gp[1] - cs * 0.07 * fl - 1, sl * 2, cs * 0.14 * fl + 2);
      var sg2 = cx.createLinearGradient(0, gp[1] - sl * 0.7, 0, gp[1] + sl * 0.7); sg2.addColorStop(0, 'rgba(' + RC + ',0)'); sg2.addColorStop(0.5, 'rgba(255,255,255,' + 0.7 * fl + ')'); sg2.addColorStop(1, 'rgba(' + RC + ',0)');
      cx.fillStyle = sg2; cx.fillRect(gp[0] - cs * 0.05 * fl - 1, gp[1] - sl * 0.7, cs * 0.1 * fl + 2, sl * 1.4);
      if (e < 0.25) { cx.fillStyle = 'rgba(' + RC + ',' + 0.45 * (1 - e / 0.25) + ')'; cx.fillRect(-300, -300, W + 600, H + 600); }
    }
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
  // حطام: مجمّع حسب اللون في مسار واحد لكل لون (أسرع بكثير من رسم كل قطعة منفصلة)
  var grp = {}, big = [];
  for (i = 0; i < G.deb.length; i++) {
    var d = G.deb[i], co = Math.cos(d.rot), si = Math.sin(d.rot), sc2 = Math.min(1, d.life / 0.45), L = grp[d.col] || (grp[d.col] = []);
    L.push(d, co, si, sc2);
  }
  for (var colk in grp) {
    var L2 = grp[colk]; cx.fillStyle = colk; cx.beginPath();
    for (var q2 = 0; q2 < L2.length; q2 += 4) {
      var dd = L2[q2], c2 = L2[q2 + 1], s2 = L2[q2 + 2], k2 = L2[q2 + 3], pp = dd.pts;
      for (var j = 0; j < pp.length; j++) { var xx = pp[j][0] * k2, yy = pp[j][1] * k2, wx = dd.x + xx * c2 - yy * s2, wy = dd.y + xx * s2 + yy * c2; if (j) cx.lineTo(wx, wy); else cx.moveTo(wx, wy); }
      cx.closePath();
    }
    cx.fill();
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


/* شهاب يدور على الإطار الذهبي: أسرع وأسطع كلما ضغطت مفاتيح أكثر، ويشتعل أثناء فتح البوابة */
function drawComet(cov, tot) {
  var lv = G.lv, x0 = ox - fp + 2, y0 = oy - dz - fp + 2, w = lv.w * cs + 2 * fp - 4, h = lv.h * cs + dz + 2 * fp - 4, per = 2 * (w + h);
  var prog = tot ? cov / tot : 0, boom = G.cine ? Math.min(1, G.cine.t / 1.2) : 0;
  var sp = 0.07 + prog * 0.16 + boom * 0.5, a = 0.28 + prog * 0.35 + boom * 0.4;
  var r = cs * (0.5 + prog * 0.35 + boom * 0.5);
  cx.save(); cx.globalCompositeOperation = 'lighter';
  for (var k = 0; k < 2; k++) for (var j = 0; j < 4; j++) {
    var d = (((G.t * sp + k * 0.5 - j * 0.012) % 1) + 1) % 1 * per, px, py;
    if (d < w) { px = x0 + d; py = y0; } else if (d < w + h) { px = x0 + w; py = y0 + d - w; } else if (d < 2 * w + h) { px = x0 + w - (d - w - h); py = y0 + h; } else { px = x0; py = y0 + h - (d - 2 * w - h); }
    var rr2 = r * (1 - j * 0.18), g = cx.createRadialGradient(px, py, 0, px, py, rr2);
    g.addColorStop(0, 'rgba(255,240,190,' + (a * (1 - j * 0.22)) + ')'); g.addColorStop(0.4, 'rgba(255,190,90,' + (a * 0.35) + ')'); g.addColorStop(1, 'rgba(255,170,60,0)');
    cx.fillStyle = g; cx.fillRect(px - rr2, py - rr2, rr2 * 2, rr2 * 2);
  }
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
    drawGemTwinkle(); drawComet(covered, lv.plates.length);
    drawGate(covered, lv.plates.length);
    drawField();
    drawAmbient();
    drawAttractor();
    drawGhosts();
    drawHint();
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
  var v = gdir === 'pull' ? [Math.sign(m.tx - m.fx), Math.sign(m.ty - m.fy)] : DIRV[gdir], c = cxy(m.tx, m.ty), px = c[0] + v[0] * cs * 0.42, py = c[1] + v[1] * cs * 0.42;
  burst(px, py, -v[0] * 40, -v[1] * 40, 14, 'rgba(240,201,112,.8)', 70);
  burst(px, py, -v[0] * 30, -v[1] * 30, 8, 'rgba(155,123,234,.9)', 60);
  var nx = m.tx + v[0], ny = m.ty + v[1], kind = (gdir === 'pull' && G.lv.attr && m.tx === G.lv.attr.x && m.ty === G.lv.attr.y) ? 'block' : 'wall';
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
function select(id) { if (G.sel !== id) AudioFX.select(); G.sel = id; refreshUI(); if (G.law === 'pull' && G.mode === 'planning' && G.lv.attr) setDir(id, 'pull'); }
function deselect() { if (G.sel >= 0) { G.sel = -1; refreshUI(); } }
function recompute() {
  G.preview = Object.keys(G.plan).length ? Sim.preview(G.lv, G.blocks, G.plan) : null;
  if (G.preview) {
    var side = G.blocks.some(function (b) { var q = G.preview.blocks[b.id]; return !G.plan[b.id] && (q.x !== b.x || q.y !== b.y); });
    if (side && !G.sideToast) { G.sideToast = 1; toast('انتبه: كتلة أخرى ستتحرك أيضًا (الظل الذهبي) لأن عائقها سيختفي، وكل كتلة تكمل في اتجاه جاذبيتها'); }
    if (!side) G.sideToast = 0;
  } else G.sideToast = 0;
}
/* ---------- نظام التلميح: محدود، وكل ضغطة تكشف أكثر ---------- */
function clearHint() { G.hint = null; refreshHintBtn(); }
function refreshHintBtn() { var b = $('#btnHint'); if (b) { b.querySelector('.bdg').textContent = save.hints || 0; b.classList.toggle('empty', !(save.hints > 0)); } }
function useHint() {
  if (G.mode !== 'planning' || G.paused) return;
  AudioFX.init();
  if (!(save.hints > 0)) { AudioFX.locked(); toast('انتهت التلميحات. تحصل على تلميح جديد مع كل غرفة جديدة تنهيها'); return; }
  if (!G.hint || G.hint.stamp !== G.moves) {
    var l2 = Object.assign({}, G.lv, { start: Sim.clone(G.blocks) }), sol = Sim.solve(l2, 14);
    if (!sol || !sol.path.length) { toast('لا يوجد حل من هذا الوضع: جرّب التراجع Undo أو إعادة الغرفة'); return; }
    G.hint = { stamp: G.moves, id: sol.path[0][0], dir: sol.path[0][1], stage: 0, t0: G.t };
  }
  var H = G.hint;
  if (H.stage >= 2) { toast('الخطوة معروضة: اضغط SIMULATE'); return; }
  H.stage++; H.t0 = G.t; save.hints--; persist(); refreshHintBtn(); AudioFX.hint && AudioFX.hint(H.stage); vibrate(H.stage === 1 ? 14 : 26);
  if (H.stage === 1) toast('هذه الكتلة هي التي تحتاج الحركة الآن (اضغط التلميح مجددًا لكشف الاتجاه)');
  else {
    if (H.dir === 'pull') G.law = 'pull'; else G.law = 'gravity';
    G.plan = {}; G.sel = H.id; G.plan[H.id] = H.dir; recompute(); refreshUI();
    toast(H.dir === 'pull' ? 'استخدم ATTRACTION على هذه الكتلة ثم SIMULATE' : 'غيّر جاذبية هذه الكتلة ثم SIMULATE');
  }
}
function drawHint() {
  var H = G.hint; if (!H || G.mode !== 'planning' || H.stage < 1) return;
  var b = G.blocks[H.id]; if (!b) return; var c = cxy(b.x, b.y), t = G.t, e = Math.min(1, (t - H.t0) * 3);
  cx.save(); cx.globalCompositeOperation = 'lighter';
  glow(SP.haloG, c[0], c[1], cs * (1.8 + 0.3 * Math.sin(t * 4)), 0.55 * e);
  var col = cx.createLinearGradient(0, c[1] - cs * 2.2, 0, c[1]); col.addColorStop(0, 'rgba(255,225,150,0)'); col.addColorStop(1, 'rgba(255,225,150,' + 0.35 * e + ')');
  cx.fillStyle = col; cx.fillRect(c[0] - cs * 0.3, c[1] - cs * 2.2, cs * 0.6, cs * 2.2);
  for (var i = 0; i < 2; i++) { var ph = (t * 0.9 + i * 0.5) % 1; cx.strokeStyle = 'rgba(255,225,150,' + 0.8 * (1 - ph) * e + ')'; cx.lineWidth = 2; cx.beginPath(); cx.arc(c[0], c[1], cs * (0.5 + ph * 0.8), 0, 7); cx.stroke(); }
  cx.save(); cx.translate(c[0], c[1]); cx.rotate(t * 1.2); cx.setLineDash([cs * 0.16, cs * 0.12]); cx.strokeStyle = 'rgba(255,240,190,' + 0.9 * e + ')'; cx.lineWidth = 2.2; cx.beginPath(); cx.arc(0, 0, cs * 0.62, 0, 7); cx.stroke(); cx.restore();
  // مصباح يطفو فوق الكتلة
  var by = c[1] - cs * 0.95 + Math.sin(t * 3) * cs * 0.06, r = cs * 0.17;
  cx.globalCompositeOperation = 'source-over'; cx.shadowColor = 'rgba(255,220,120,1)'; cx.shadowBlur = cs * 0.3;
  cx.fillStyle = '#ffe9a0'; cx.beginPath(); cx.arc(c[0], by, r, 0, 7); cx.fill(); cx.shadowBlur = 0;
  cx.fillStyle = '#c28a1e'; cx.fillRect(c[0] - r * 0.55, by + r * 0.85, r * 1.1, r * 0.5);
  cx.restore();
}
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
  G.hint = null; refreshHintBtn();
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
  var canDir = G.sel >= 0 && G.mode === 'planning' && G.law !== 'pull'; updateLawSheet();
  $$('#dpad button').forEach(function (b) { b.disabled = !canDir; b.classList.toggle('on', canDir && G.plan[G.sel] === b.dataset.d); });
  var pips = ''; ROOMS.forEach(function (r, i) { if (r.w === G.room.w) pips += '<i class="' + (i === G.ri ? 'cur' : save.done[r.id] ? 'done' : '') + '"></i>'; });
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
  if (!save.done[id]) save.hints = Math.min(9, (save.hints || 0) + 1);   // تلميح جديد مع كل غرفة جديدة
  if ((save.done[id] || 0) < n) { save.done[id] = n; persist(); }
  $('#clearRoom').textContent = G.room.name; $('#clearTitle').textContent = 'GATE UNSEALED';
  $('#clearStars').innerHTML = starsSvg(n, 0.15);
  $('#clearInfo').textContent = 'الطاقة المستخدمة: ' + G.moves + ' · الحل المثالي: ' + G.room.par;
  $('#clearCodex').textContent = 'THE LAW CODEX · ' + G.room.codex;
  $('#btnNext').textContent = G.ri === ROOMS.length - 1 ? 'انتهى المحتوى الحالي · القائمة' : (ROOMS[G.ri + 1].w !== G.room.w ? 'العالم التالي: ' + ROOMS.worlds[ROOMS[G.ri + 1].w].name : 'الغرفة التالية');
  refreshUI(); show('#clear'); AudioFX.success();
}
function buildMenu() {
  var box = $('#roomList'); box.innerHTML = '';
  ROOMS.worlds.forEach(function (wd, wi) {
    var h = document.createElement('div'); h.className = 'worldHead';
    h.innerHTML = '<b>' + wd.name + '</b><small>العالم ' + (wi + 1) + ' · ' + wd.ar + '</small>'; box.appendChild(h);
    if (wd.soon) { var t = document.createElement('div'); t.className = 'worldSoon'; t.innerHTML = icon('i-lock') + '<span>قريبًا… قانون جديد ينتظر: ATTRACTION</span>'; box.appendChild(t); return; }
    var first = ROOMS.findIndex(function (r) { return r.w === wi; });
    ROOMS.forEach(function (r, i) {
      if (r.w !== wi) return;
      var ok = i === 0 || save.done[ROOMS[i - 1].id], st = save.done[r.id] || 0, b = document.createElement('button');
      b.className = 'roomBtn' + (ok ? '' : ' locked'); b.disabled = !ok;
      var right = ok ? '<span class="s">' + [0, 1, 2].map(function (j) { return '<svg viewBox="0 0 24 24" class="' + (j < st ? 'on' : '') + '"><use href="#i-star"/></svg>'; }).join('') + '</span>' : '<span class="s">' + icon('i-lock') + '</span>';
      b.innerHTML = '<span class="n">' + (i - first + 1) + '</span><span class="t"><b>' + r.name + '</b><small>' + r.sub + '</small></span>' + right;
      b.onclick = function () { AudioFX.click(); hide('#menu'); enterGame(); loadRoom(i); G.paused = false; };
      box.appendChild(b);
    });
  });
}
function buildCodex() {
  var h = '<div class="lawCard"><span class="ico">' + icon('i-gravity', '') + '</span><div><h3>GRAVITY</h3><p>أول قانون: غيّر اتجاه سقوط أي كتلة. الكتلة تنزلق حتى تصطدم بشيء.</p><span class="tag">UNLOCKED</span></div></div>';
  var atOk = !!save.done.w2r15;
  h += '<div class="lawCard' + (atOk ? '' : ' lock') + '"><span class="ico">' + icon('i-attraction', '') + '</span><div><h3>ATTRACTION</h3><p>' + (atOk ? 'تنجذب الكتلة نحو المغناطيس خطوة بخطوة، وتتوقف عند أول عائق أو عند المغناطيس نفسه.' : 'تجذب الأجسام نحو نقطة. يُفتح في THE PULLING VOID.') + '</p><span class="tag">' + (atOk ? 'UNLOCKED' : 'LOCKED') + '</span></div></div>';
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
/* ---------- خريطة العوالم + مسار المراحل ---------- */
var WC = { 1: { a: '255,214,120', b: '170,130,255', t: 'mote' }, 2: { a: '255,130,50', b: '255,205,100', t: 'ember' }, 3: { a: '110,230,255', b: '255,122,232', t: 'void' } };
var wm = { on: false, cv: null, g: null, W: 0, H: 0, dpr: 1, nodes: [], raf: 0, from: 'title' };
function worldOpen(i) { if (i === 0) return true; var pw = ROOMS.worlds[i - 1], last = null; ROOMS.forEach(function (r) { if (r.w === i - 1) last = r; }); return !!(last && save.done[last.id]) && !ROOMS.worlds[i].soon; }
function worldStats(i) { var n = 0, s = 0, d = 0; ROOMS.forEach(function (r) { if (r.w === i) { n++; s += save.done[r.id] || 0; if (save.done[r.id]) d++; } }); return { n: n, s: s, d: d }; }
function lerpC(a, b, k) { var A = a.split(','), B = b.split(','); return A.map(function (v, i) { return Math.round(+v + (+B[i] - +v) * k); }).join(','); }
function wmLayout() {
  var cv = wm.cv; wm.dpr = Math.min(1.25, window.devicePixelRatio || 1); wm.plates = null; wm.bgc = null; wm.W = window.innerWidth; wm.H = window.innerHeight;
  cv.width = wm.W * wm.dpr; cv.height = wm.H * wm.dpr; cv.style.width = wm.W + 'px'; cv.style.height = wm.H + 'px';
  var n = ROOMS.worlds.length + 1, top = 110, bot = wm.H - 50, step = Math.min(210, (bot - top) / (n - 0.4)), R = Math.min(wm.W * 0.16, step * 0.34, 64);
  wm.nodes = []; for (var i = 0; i < n; i++) wm.nodes.push({ i: i, x: wm.W * (i % 2 ? 0.7 : 0.3), y: top + R + i * step, R: R });
}
var EMI = {};
function emImg(id, lit) {
  var k = id + (lit ? 'l' : 'd'); if (EMI[k] !== undefined) return EMI[k];
  var src = lit ? EMI['s' + id] : EMI['s' + (id <= 3 ? id : 0)];
  if (!src) { var im = new Image(); im.src = 'assets/w' + (id <= 3 ? id : 0) + '.webp'; EMI['s' + (id <= 3 ? id : 0)] = im; src = im; }
  if (!src.complete || !src.naturalWidth) return null;
  var w = src.naturalWidth, h = src.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; var cg = c.getContext('2d');
  cg.drawImage(src, 0, 0);
  if (!lit) { cg.globalCompositeOperation = 'source-atop'; cg.fillStyle = 'rgba(8,4,22,.9)'; cg.fillRect(0, 0, w, h); }
  cg.globalCompositeOperation = 'destination-in'; cg.save(); cg.translate(w / 2, h / 2); cg.scale(1, h / w);
  var mg = cg.createRadialGradient(0, 0, w * 0.26, 0, 0, w * 0.5); mg.addColorStop(0, 'rgba(0,0,0,1)'); mg.addColorStop(0.72, 'rgba(0,0,0,.85)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
  cg.fillStyle = mg; cg.fillRect(-w / 2, -w / 2, w, w); cg.restore();
  EMI[k] = c; return c;
}
function drawWorldEmblem(g, nd, t, open) {
  var R = nd.R, x = nd.x, y = nd.y + Math.sin(t * 1.1 + nd.i * 1.7) * 5, id = nd.i + 1, C = WC[id];
  g.save(); g.translate(x, y);
  if (!open) {   // عالم مغلق: ظل معتم بلا تفاصيل
    var fg = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.2); fg.addColorStop(0, 'rgba(14,8,32,.95)'); fg.addColorStop(0.7, 'rgba(10,5,26,.85)'); fg.addColorStop(1, 'rgba(10,5,26,0)');
    g.fillStyle = fg; g.beginPath(); g.arc(0, 0, R * 1.2, 0, 7); g.fill();
    g.strokeStyle = 'rgba(120,100,170,.25)'; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.arc(0, 0, R * 0.9, t * 0.1, t * 0.1 + 7); g.stroke(); g.setLineDash([]);
    var di = emImg(id, false); if (di) { var dw2 = R * 3.0, dh2 = dw2 * di.height / di.width; g.drawImage(di, -dw2 / 2, -dh2 * 0.55, dw2, dh2); }
    g.fillStyle = 'rgba(150,130,200,.35)'; g.font = '700 ' + R * 0.8 + 'px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 2);
    g.restore(); return;
  }
  var gl = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 2); gl.addColorStop(0, 'rgba(' + C.a + ',.38)'); gl.addColorStop(0.5, 'rgba(' + C.b + ',.15)'); gl.addColorStop(1, 'rgba(' + C.a + ',0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 2, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
  var im = emImg(id, true), bob = Math.sin(t * 1.3 + id) * 0.03;
  if (im) { var iw = R * 3.0, ih = iw * im.height / im.width; g.save(); g.rotate(bob); g.drawImage(im, -iw / 2, -ih * 0.55, iw, ih); g.restore(); }
  if (id === 2) { for (var q = 0; q < 5; q++) { var ph = (t * 0.5 + q * 0.37) % 1; g.fillStyle = 'rgba(255,170,60,' + (0.8 * (1 - ph)) + ')'; g.beginPath(); g.arc((q - 2) * R * 0.4 + Math.sin(t + q) * 6, R * 0.1 - ph * R * 1.3, 2.2, 0, 7); g.fill(); } }
  else if (id === 3) { for (var q2 = 0; q2 < 4; q2++) { var a2 = t * 0.8 + q2 * 1.571; wmPart(g, 'void', Math.cos(a2) * R * 1.35, Math.sin(a2) * R * 0.5, 0.8, 3.5, q2 % 2 ? '255,122,232' : '143,240,255', t, q2); } }
  else { for (var q3 = 0; q3 < 4; q3++) { var a3 = t * 0.6 + q3 * 1.571; wmPart(g, 'star', Math.cos(a3) * R * 1.35, Math.sin(a3) * R * 0.45 - R * 0.2, 0.7, 3, '240,220,150', t, q3); } }
  g.restore();
}
function wmPart(g, type, x, y, a, size, col, t, k) {
  g.fillStyle = 'rgba(' + col + ',' + a + ')';
  if (type === 'ember') { var fl = 0.8 + 0.3 * Math.sin(t * 20 + k * 3); g.beginPath(); g.arc(x, y, size * 2.2 * fl, 0, 7); g.fillStyle = 'rgba(255,120,30,' + a * 0.25 + ')'; g.fill(); g.beginPath(); g.arc(x, y, size * 0.8 * fl, 0, 7); g.fillStyle = 'rgba(255,230,160,' + a + ')'; g.fill(); }
  else if (type === 'void') { g.beginPath(); g.moveTo(x, y - size * 1.4); g.lineTo(x + size * 0.7, y); g.lineTo(x, y + size * 1.4); g.lineTo(x - size * 0.7, y); g.closePath(); g.fill(); }
  else { g.beginPath(); g.moveTo(x, y - size * 1.5); g.lineTo(x + size * 0.35, y - size * 0.35); g.lineTo(x + size * 1.5, y); g.lineTo(x + size * 0.35, y + size * 0.35); g.lineTo(x, y + size * 1.5); g.lineTo(x - size * 0.35, y + size * 0.35); g.lineTo(x - size * 1.5, y); g.lineTo(x - size * 0.35, y - size * 0.35); g.closePath(); g.fill(); }
}
function wmPlate(i, open, nw) {
  var w = Math.min(158, wm.W * 0.42), h = i < nw && open ? 70 : 52, c = document.createElement('canvas'), S = 2; c.width = w * S; c.height = h * S; var g = c.getContext('2d'); g.scale(S, S);
  var C = i < nw ? WC[i + 1] : null, ac = open && C ? C.a : '150,130,200';
  function rp(x, y, ww, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + ww - r, y); g.quadraticCurveTo(x + ww, y, x + ww, y + r); g.lineTo(x + ww, y + hh - r); g.quadraticCurveTo(x + ww, y + hh, x + ww - r, y + hh); g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
  g.shadowColor = 'rgba(' + ac + ',.5)'; g.shadowBlur = open ? 10 : 0; rp(3, 3, w - 6, h - 6, 12);
  var bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, 'rgba(46,24,104,.93)'); bg.addColorStop(1, 'rgba(14,6,40,.93)'); g.fillStyle = bg; g.fill(); g.shadowBlur = 0;
  var bd = g.createLinearGradient(0, 0, w, h); bd.addColorStop(0, open ? '#fff0b8' : '#6a5a90'); bd.addColorStop(0.5, open ? '#c8902e' : '#40346a'); bd.addColorStop(1, open ? '#f0c970' : '#6a5a90'); g.strokeStyle = bd; g.lineWidth = 1.6; g.stroke();
  [[3, h / 2], [w - 3, h / 2]].forEach(function (p) { g.save(); g.translate(p[0], p[1]); g.rotate(0.785); g.fillStyle = open ? '#f0c970' : '#5a4a80'; g.fillRect(-3.2, -3.2, 6.4, 6.4); g.restore(); });
  g.textAlign = 'center'; var cx0 = w / 2;
  if (i < nw) {
    var st = worldStats(i); g.fillStyle = open ? 'rgb(' + ac + ')' : 'rgba(170,150,210,.6)'; g.font = '700 12.5px Georgia,serif'; g.fillText(ROOMS.worlds[i].name, cx0, 20);
    g.fillStyle = open ? '#fff4d6' : 'rgba(170,150,210,.55)'; g.font = '12px system-ui,sans-serif'; g.fillText(open ? ROOMS.worlds[i].ar : 'مغلق', cx0, 37);
    if (open) { var pw = w - 40, pr = st.n ? st.d / st.n : 0; g.fillStyle = 'rgba(255,255,255,.12)'; rp(20, 45, pw, 6, 3); g.fill(); var pg = g.createLinearGradient(20, 0, 20 + pw, 0); pg.addColorStop(0, 'rgb(' + C.a + ')'); pg.addColorStop(1, 'rgb(' + C.b + ')'); g.fillStyle = pg; if (pr > 0) { rp(20, 45, Math.max(6, pw * pr), 6, 3); g.fill(); } g.fillStyle = 'rgba(255,244,214,.9)'; g.font = '11px system-ui,sans-serif'; g.fillText(st.d + '/' + st.n + '  ·  ★ ' + st.s + '/' + st.n * 3, cx0, 63); }
  } else { g.fillStyle = 'rgba(170,150,210,.6)'; g.font = '700 13px Georgia,serif'; g.fillText('? ? ?', cx0, 22); g.font = '12px system-ui,sans-serif'; g.fillText('عالم مجهول', cx0, 39); }
  return { c: c, w: w, h: h, open: open };
}
function wmDraw(ts) {
  if (!wm.on) return; wm.raf = requestAnimationFrame(wmDraw); if (ts - (wm.last || 0) < 30) return; wm.last = ts;
  var g = wm.g, t = ts / 1000, W = wm.W, H = wm.H, i, k;
  g.setTransform(wm.dpr, 0, 0, wm.dpr, 0, 0);
  var bgi = bgFor('assets/bg.jpg');
  if (!wm.bgc && bgi.complete && bgi.naturalWidth) {   // الخلفية تُرسم مرة واحدة فقط ثم تُنسخ كل إطار
    var bc = document.createElement('canvas'); bc.width = W * wm.dpr; bc.height = H * wm.dpr; var bg2 = bc.getContext('2d'); bg2.scale(wm.dpr, wm.dpr);
    bg2.fillStyle = '#05010f'; bg2.fillRect(0, 0, W, H); var sc = Math.max(W / bgi.naturalWidth, H / bgi.naturalHeight), dw = bgi.naturalWidth * sc, dh = bgi.naturalHeight * sc;
    bg2.globalAlpha = 0.35; bg2.drawImage(bgi, (W - dw) / 2, (H - dh) / 2, dw, dh); bg2.globalAlpha = 1;
    var vg = bg2.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, 'rgba(5,1,15,.65)'); vg.addColorStop(0.5, 'rgba(5,1,15,.35)'); vg.addColorStop(1, 'rgba(5,1,15,.75)'); bg2.fillStyle = vg; bg2.fillRect(0, 0, W, H); wm.bgc = bc;
  }
  if (wm.bgc) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(wm.bgc, 0, 0); g.setTransform(wm.dpr, 0, 0, wm.dpr, 0, 0); } else { g.fillStyle = '#05010f'; g.fillRect(0, 0, W, H); }
  var nodes = wm.nodes, nw = ROOMS.worlds.length;
  // الأشعة بين العوالم المفتوحة
  for (i = 0; i < nodes.length - 1; i++) {
    var A = nodes[i], B = nodes[i + 1]; if (i >= nw || !worldOpen(i)) continue;
    var both = worldOpen(i + 1) && i + 1 < nw, cA = WC[i + 1].a, cB = both ? WC[i + 2].a : cA, ay = A.y + A.R * 0.95, by = B.y - B.R * 0.95, dy = by - ay, lim = both ? 1 : 0.42;
    var pt = function (s) { var u = 1 - s; return [u * u * u * A.x + 3 * u * u * s * A.x + 3 * u * s * s * B.x + s * s * s * B.x, u * u * u * ay + 3 * u * u * s * (ay + dy * 0.5) + 3 * u * s * s * (by - dy * 0.5) + s * s * s * by]; };
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (k = 0; k < 14; k++) {
      var s0 = k / 14 * lim, s1 = (k + 1) / 14 * lim, p0 = pt(s0), p1 = pt(s1), col = lerpC(cA, cB, both ? k / 14 : 0), fa = both ? 1 : Math.pow(1 - k / 14, 1.4), wv = 1 + 0.25 * Math.sin(t * 3 - k * 0.4);
      g.strokeStyle = 'rgba(' + col + ',' + 0.16 * fa + ')'; g.lineWidth = 22 * wv; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,' + 0.55 * fa + ')'; g.lineWidth = 4 * wv; g.stroke();
    }
    var tA = WC[i + 1].t, tB = both ? WC[i + 2].t : tA;
    for (k = 0; k < 12; k++) {
      var s = ((t * 0.16 + k / 12) % 1) * lim, p = pt(s), sw = Math.sin(t * 2 + k * 2.3) * 14 * (tA === 'void' || tB === 'void' ? 1.6 : 1), ty = (both && s > 0.5) ? tB : tA, cc = lerpC(cA, cB, both ? s : 0), fa2 = both ? Math.sin(Math.min(1, s) * Math.PI) : (1 - s / lim);
      wmPart(g, ty, p[0] + sw, p[1], 0.9 * Math.max(0, fa2), 2 + (k % 3), cc, t, k);
    }
    g.restore();
  }
  // العوالم
  for (i = 0; i < nodes.length; i++) {
    var nd = nodes[i], open = i < nw && worldOpen(i);
    drawWorldEmblem(g, nd, t, open);
    if (open) {   // جسيمات خاصة بالعالم حول أيقونته
      var C = WC[i + 1]; g.save(); g.globalCompositeOperation = 'lighter';
      for (k = 0; k < 12; k++) {
        var sd = hsh(k * 3.7 + i * 19), ph = (t * (0.12 + sd * 0.14) + hsh(k + 40 + i) * 5) % 1, px, py;
        if (C.t === 'ember') { px = nd.x + (hsh(k * 1.3 + i) - 0.5) * nd.R * 2 + Math.sin(t * 1.5 + k) * 5 * ph + ph * ph * nd.R * 0.5; py = nd.y + nd.R * 0.6 - Math.pow(ph, 0.8) * nd.R * 2.4; }
        else if (C.t === 'void') { var a = t * 0.8 + k * 0.52; px = nd.x + Math.cos(a) * nd.R * (1.2 + sd * 0.5); py = nd.y + Math.sin(a) * nd.R * (0.5 + sd * 0.3); ph = 0.5; }
        else { px = nd.x + (sd - 0.5) * nd.R * 2.2 + Math.sin(t + k) * 6; py = nd.y + nd.R * 0.3 - ph * nd.R * 2; }
        wmPart(g, C.t, px, py, 0.85 * Math.sin(ph * Math.PI), 1.6 + sd * 2, k % 2 ? C.b : C.a, t, k);
      }
      g.restore();
    }
    // لوحات الأسماء (مرسومة مسبقًا)
    if (!wm.plates) wm.plates = [];
    var pl = wm.plates[i]; if (!pl || pl.open !== open) pl = wm.plates[i] = wmPlate(i, open, nw);
    var left = i % 2 === 0, plx = left ? nd.x + nd.R * 1.5 : nd.x - nd.R * 1.5 - pl.w;
    g.drawImage(pl.c, plx, nd.y - pl.h / 2 - 2, pl.w, pl.h);
  }
}
function openWorlds(from) {
  wm.from = from || 'title'; closeSheet(); hide('#pause'); hide('#clear'); hide('#levels');
  if (!wm.cv) { wm.cv = $('#wmap'); wm.g = wm.cv.getContext('2d'); }
  show('#worlds'); wmLayout(); wm.on = true; cancelAnimationFrame(wm.raf); wm.raf = requestAnimationFrame(wmDraw); G.paused = true;
}
function closeWorlds() { wm.on = false; cancelAnimationFrame(wm.raf); hide('#worlds'); }
function worldAt(px, py) { var best = -1; wm.nodes.forEach(function (n, i) { if (Math.hypot(px - n.x, py - n.y) < n.R * 1.35) best = i; }); return best; }
function openLevels(wi, from) {
  var wd = ROOMS.worlds[wi], C = WC[wi + 1], box = $('#lvPath'); lvFrom = from || lvFrom;
  $('#levels').dataset.w = wi + 1; $('#levels').style.setProperty('--wa', C.a); $('#levels').style.setProperty('--wb', C.b);
  $('#lvBg').style.backgroundImage = 'url(' + wd.bg + ')';
  $('#lvName').textContent = wd.name; var st = worldStats(wi); $('#lvSub').textContent = wd.ar + ' · ★ ' + st.s + ' / ' + st.n * 3;
  var rooms = []; ROOMS.forEach(function (r, i) { if (r.w === wi) rooms.push(i); });
  var rowH = 96, topPad = 70, H = rooms.length * rowH + topPad + 60, pts = [], svg = '', html = '';
  rooms.forEach(function (ri, k) { var xx = 50 + Math.sin(k * 1.15) * 30; pts.push([xx, topPad + k * rowH]); });
  var d = 'M' + pts[0][0] + ' ' + pts[0][1]; for (var k = 1; k < pts.length; k++) { var p0 = pts[k - 1], p1 = pts[k], my = (p0[1] + p1[1]) / 2; d += ' C' + p0[0] + ' ' + my + ',' + p1[0] + ' ' + my + ',' + p1[0] + ' ' + p1[1]; }
  var firstOpen = -1;
  rooms.forEach(function (ri, k) {
    var r = ROOMS[ri], ok = ri === 0 || !!save.done[ROOMS[ri - 1].id], st2 = save.done[r.id] || 0, cur = ok && !st2 && firstOpen < 0; if (cur) firstOpen = k;
    var boss = (k + 1) % 5 === 0, cls = 'lvNode' + (ok ? '' : ' lock') + (st2 ? ' done' : '') + (cur ? ' cur' : '') + (boss ? ' boss' : '');
    var stars = [0, 1, 2].map(function (j) { return '<svg viewBox="0 0 24 24" class="' + (j < st2 ? 'on' : '') + '"><use href="#i-star"/></svg>'; }).join('');
    html += '<button class="' + cls + '" data-i="' + ri + '" style="left:' + pts[k][0] + '%;top:' + pts[k][1] + 'px" ' + (ok ? '' : 'disabled') + '><span class="hx"><b>' + (ok ? (k + 1) : '') + '</b>' + (ok ? '' : icon('i-lock')) + '</span>' + (ok ? '<span class="ss">' + stars + '</span>' : '') + '<em>' + (ok ? r.name : '') + '</em></button>';
  });
  var done = rooms.filter(function (ri) { return save.done[ROOMS[ri].id]; }).length;
  box.style.height = H + 'px';
  box.innerHTML = '<svg class="lvLine" viewBox="0 0 100 ' + H + '" preserveAspectRatio="none"><path d="' + d + '" class="base"/><path d="' + d + '" class="flow"/></svg>' + html;
  $$('#lvPath .lvNode').forEach(function (b) { b.onclick = function () { AudioFX.init(); AudioFX.click(); var i = +b.dataset.i; hide('#levels'); closeWorlds(); enterGame(); if (!started) { started = true; AudioFX.ambience(ROOMS.worlds[ROOMS[i].w].root); } loadRoom(i); G.paused = false; }; });
  show('#levels'); var cur2 = $('#lvPath .cur') || $('#lvPath .done:last-of-type'); setTimeout(function () { if (cur2) cur2.scrollIntoView({ block: 'center' }); }, 30);
}
var lvFrom = 'worlds';
function openMenu() { closeSheet(); hide('#pause'); hide('#clear'); openLevels(G.room ? G.room.w : 0, 'game'); G.paused = true; }
function openMenuOld() { closeSheet(); buildMenu(); hide('#pause'); hide('#clear'); show('#menu'); G.paused = true; }
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
function updateLawSheet() {
  var has = !!(G.lv && G.lv.attr), a = $('#lawSheet [data-law=attraction]'), gr = $('#lawSheet [data-law=gravity]');
  a.classList.toggle('lock', !has);
  a.querySelector('small').textContent = has ? 'اضغط على كتلة لتنجذب نحو المغناطيس' : 'يُفتح في THE PULLING VOID';
  gr.classList.toggle('on', G.law !== 'pull'); a.classList.toggle('on', G.law === 'pull' && has);
  $('#lawName').textContent = G.law === 'pull' ? 'ATTRACTION' : 'GRAVITY'; $('#lawName').classList.toggle('long', G.law === 'pull');
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
$('#btnHint').onclick = useHint; refreshHintBtn();
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
    AudioFX.select(); G.law = b.dataset.law === 'attraction' ? 'pull' : 'gravity'; closeSheet();
    if (G.law === 'pull') toast('ATTRACTION: المس كتلة لتنجذب نحو الثقب الأسود، والسهم يوضّح الاتجاه');
    else toast(G.sel < 0 ? 'GRAVITY نشط: اختر كتلة ثم اتجاه الجاذبية' : 'GRAVITY نشط: اختر اتجاهًا');
  };
});
$('#btnStart').onclick = function () { AudioFX.init(); AudioFX.activate(); AudioFX.click(); openWorlds('title'); };
$('#wBack').onclick = function () { AudioFX.click(); closeWorlds(); if (started && !G.title) G.paused = false; };
$('#lvBack').onclick = function () { AudioFX.click(); hide('#levels'); if (lvFrom === 'game') { if (started) G.paused = false; } else if (!wm.on) openWorlds('title'); };
$('#wmap').addEventListener('pointerdown', function (e) {
  var r = e.target.getBoundingClientRect(), i = worldAt(e.clientX - r.left, e.clientY - r.top);
  if (i < 0) return; if (i >= ROOMS.worlds.length || !worldOpen(i)) { AudioFX.locked(); toast(i >= ROOMS.worlds.length ? 'عالم مجهول… سيُكشف لاحقًا' : 'هذا العالم مغلق: أنهِ العالم السابق أولًا'); return; }
  AudioFX.click(); openLevels(i, 'worlds');
});
window.addEventListener('resize', function () { if (wm.on) wmLayout(); });
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
  if (dt > 0) {   // جودة تكيفية: تقلّل الجسيمات تلقائيًا لو الأجهزة بطيئة، وتعيدها لما ترتاح
    perfEma += (dt - perfEma) * 0.08; perfT += dt;
    if (perfT > 0.4) { perfT = 0; if (perfEma > 0.024 && perfQ > 0.35) perfQ = Math.max(0.35, perfQ - 0.12); else if (perfEma < 0.0185 && perfQ < 1) perfQ = Math.min(1, perfQ + 0.04); }
  }
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
(function () {
  var done = false, imgs = $$('#intro img'), bgi = bgFor('assets/bg.jpg');
  function go() { if (done) return; done = true; requestAnimationFrame(function () { $('#intro').classList.remove('pre'); }); }
  var left = 0; imgs.concat ? 0 : 0;
  Array.prototype.slice.call(imgs).concat([bgi]).forEach(function (im) { if (im.complete && im.naturalWidth) return; left++; var f = function () { if (--left <= 0) go(); }; im.addEventListener('load', f); im.addEventListener('error', f); });
  if (!left) go(); setTimeout(go, 1600);
})();
window.__lawless = { info: function () { return { ox: ox, oy: oy, cs: cs, dz: dz, w: G.lv.w, h: G.lv.h }; }, G: G, loadRoom: loadRoom, runSim: runSim, setDir: setDir, select: select, update: update, draw: draw, openSheet: openSheet, closeSheet: closeSheet, showClear: showClear, startCine: startCine, enterGame: enterGame, layout: layout };
})();
