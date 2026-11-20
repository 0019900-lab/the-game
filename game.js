/* LAWLESS — الرسم والتحكم والواجهة (v2: عمق 2.5D، إضاءة، موصلات طاقة، قائمة قوانين بلا تداخل) */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
var cv = $('#c'), cx = cv.getContext('2d', { alpha: false });
var COL = { purple: '#8060C8', cyan: '#55C9D5', gold: '#D6B66D', violet: '#211A35' };
var DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
var DIRS = ['up', 'right', 'down', 'left'];
var ANG = { down: 0, left: Math.PI / 2, up: Math.PI, right: -Math.PI / 2 };
var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var SAVE_KEY = 'lawless_save_v1';
var save = { done: {}, muted: false };
try { var s0 = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); if (s0.done) save.done = s0.done; save.muted = !!s0.muted; } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
AudioFX.setMuted(save.muted);

var G = { ri: 0, room: null, lv: null, blocks: [], hist: [], redo: [], plan: {}, preview: null,
  sel: -1, mode: 'planning', moves: 0, wasted: 0, anim: null, shake: 0, parts: [], rings: [], gateOpen: 0,
  paused: true, t: 0, dt: 0.016, solvedAt: 0, clearShown: false, intro: 0, flash: 0, fieldA: 0, fieldDir: 'down', fieldT: 0, streaks: [] };
var W = 0, H = 0, DPR = 1, cs = 40, dz = 8, ox = 0, oy = 0, bgLayer = null, boardLayer = null, wallLayer = null, started = false;
var SP = {};
var motes = [], mi;
for (mi = 0; mi < 34; mi++) motes.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, s: 0.01 + Math.random() * 0.03, ph: Math.random() * 6.28 });
for (mi = 0; mi < 30; mi++) G.streaks.push({ u: Math.random(), v: Math.random(), s: 0.5 + Math.random() * 0.9, l: 0.4 + Math.random() * 0.7, ph: Math.random() * 6.28 });

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

/* ---------- موصلات الطاقة: من كل مفتاح إلى البوابة ---------- */
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
function loadRoom(i) {
  G.ri = i; G.room = ROOMS[i]; G.lv = Sim.load(G.room); G.blocks = Sim.clone(G.lv.start);
  G.hist = []; G.redo = []; G.plan = {}; G.preview = null; G.sel = -1; G.mode = 'planning';
  G.moves = 0; G.wasted = 0; G.anim = null; G.gateOpen = 0; G.clearShown = false; G.parts.length = 0; G.rings.length = 0;
  G.shake = 0; G.intro = 0; G.flash = 0; G.fieldA = 0;
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
  var portrait = H > W, small = H < 540 && !portrait;
  var top = small ? 66 : portrait ? 128 : 114, bot = portrait ? 218 : 106;
  if (G.lv) {
    var aw = W - 24, ah = H - top - bot;
    cs = Math.floor(Math.min(aw / G.lv.w, ah / (G.lv.h + 0.22), 92)); cs = Math.max(cs, 18);
    dz = Math.round(cs * 0.2);
    ox = Math.round((W - cs * G.lv.w) / 2);
    oy = Math.round(top + (ah - cs * G.lv.h) / 2 + dz * 0.4);
  }
  buildSprites(); buildStatic();
}

/* ---------- Sprites مُسبقة الرسم ---------- */
function halo(rgb, size) {
  var c = mk(size * DPR, size * DPR), g = c.getContext('2d'); g.scale(DPR, DPR);
  var gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(' + rgb + ',.55)'); gr.addColorStop(0.4, 'rgba(' + rgb + ',.18)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
function buildSprites() {
  var s = cs * 0.84, pad = cs * 0.45, size = s + pad * 2, x = pad, y = pad, r = s * 0.2, ext = cs * 0.09;
  var c = mk(size * DPR, size * DPR), g = c.getContext('2d'); g.scale(DPR, DPR);
  g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = cs * 0.24 * DPR; g.shadowOffsetY = cs * 0.1 * DPR; g.fillStyle = '#000'; rr(g, x, y + ext, s, s, r); g.fill(); g.restore();
  var ug = g.createLinearGradient(x, y, x, y + s + ext); ug.addColorStop(0, '#2c2062'); ug.addColorStop(1, '#130d30');
  rr(g, x, y + ext, s, s, r); g.fillStyle = ug; g.fill();
  var bg = g.createLinearGradient(x, y, x + s, y + s); bg.addColorStop(0, '#a487ff'); bg.addColorStop(0.5, '#6a4fd0'); bg.addColorStop(1, '#3a2a82');
  rr(g, x, y, s, s, r); g.fillStyle = bg; g.fill();
  var gl = g.createLinearGradient(x, y, x, y + s * 0.55); gl.addColorStop(0, 'rgba(255,255,255,.34)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  rr(g, x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.52, r * 0.8); g.fillStyle = gl; g.fill();
  rr(g, x, y, s, s, r); g.strokeStyle = 'rgba(120,232,242,.9)'; g.lineWidth = Math.max(1.5, s * 0.05); g.stroke();
  rr(g, x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72, r * 0.55); g.fillStyle = 'rgba(16,10,44,.6)'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = COL.gold;
  [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].forEach(function (p) { g.beginPath(); g.arc(x + s * p[0], y + s * p[1], Math.max(1.2, s * 0.032), 0, 7); g.fill(); });
  var d = s * 0.24, mx = x + s / 2, my = y + s / 2;
  g.beginPath(); g.moveTo(mx, my - d); g.lineTo(mx - d * 0.82, my); g.lineTo(mx, my + d); g.closePath(); g.fillStyle = '#6fd9e8'; g.fill();
  g.beginPath(); g.moveTo(mx, my - d); g.lineTo(mx + d * 0.82, my); g.lineTo(mx, my + d); g.closePath(); g.fillStyle = '#c4f8ff'; g.fill();
  g.beginPath(); g.moveTo(mx, my - d); g.lineTo(mx + d * 0.82, my); g.lineTo(mx, my - d * 0.1); g.lineTo(mx - d * 0.82, my); g.closePath(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill();
  SP.block = c; SP.size = size; SP.pad = pad;
  SP.haloP = halo('128,96,200', cs * 3); SP.haloC = halo('85,201,213', cs * 3); SP.haloG = halo('214,182,109', cs * 3);
}

/* ---------- الخلفية الثابتة ---------- */
function buildStatic() {
  bgLayer = mk(W * DPR, H * DPR);
  var g = bgLayer.getContext('2d'); g.scale(DPR, DPR);
  var bg = g.createRadialGradient(W * 0.7, H * 0.08, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.95);
  bg.addColorStop(0, '#32245a'); bg.addColorStop(0.5, '#171326'); bg.addColorStop(1, '#0a0910');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  var nb = [[0.15, 0.85, '85,201,213', 0.10, 0.5], [0.9, 0.55, '128,96,200', 0.13, 0.55], [0.5, 0.05, '214,182,109', 0.05, 0.4]], i, k, a;
  nb.forEach(function (n) {
    var rad = Math.max(W, H) * n[4], gr = g.createRadialGradient(W * n[0], H * n[1], 0, W * n[0], H * n[1], rad);
    gr.addColorStop(0, 'rgba(' + n[2] + ',' + n[3] + ')'); gr.addColorStop(1, 'rgba(' + n[2] + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  for (i = 0; i < 110; i++) { g.fillStyle = 'rgba(220,210,255,' + (0.1 + rnd() * 0.35) + ')'; g.beginPath(); g.arc(rnd() * W, rnd() * H, 0.4 + rnd() * 1.1, 0, 7); g.fill(); }
  g.save(); g.translate(W / 2, H * 0.52); g.strokeStyle = 'rgba(155,123,234,.06)'; g.lineWidth = 1;
  var R = Math.max(W, H) * 0.12;
  for (i = 1; i <= 7; i++) { g.beginPath(); g.arc(0, 0, R * i, 0, 7); g.stroke(); }
  for (i = 0; i < 12; i++) { a = i * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(a) * R, Math.sin(a) * R); g.lineTo(Math.cos(a) * R * 7, Math.sin(a) * R * 7); g.stroke(); }
  g.restore();
  var v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = v; g.fillRect(0, 0, W, H);

  boardLayer = mk(W * DPR, H * DPR); wallLayer = mk(W * DPR, H * DPR);
  if (G.lv) {
    var b = boardLayer.getContext('2d'); b.scale(DPR, DPR); drawBoard(b);
    var w2 = wallLayer.getContext('2d'); w2.scale(DPR, DPR); drawWalls(w2);
  }
}

function solidAt(x, y) { var lv = G.lv; return x >= 0 && y >= 0 && x < lv.w && y < lv.h && lv.solid[y * lv.w + x] === 1; }

function drawBoard(g) {
  var lv = G.lv, x, y, h, px, py, grd;
  // الأرضية
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) {
    if (lv.solid[y * lv.w + x]) continue;
    h = hh(x, y); px = ox + x * cs; py = oy + y * cs;
    g.fillStyle = 'rgb(' + (22 + (h & 3)) + ',' + (18 + ((h >> 2) & 3)) + ',' + (38 + ((h >> 4) & 5)) + ')'; g.fillRect(px, py, cs, cs);
    g.fillStyle = 'rgba(155,123,234,.08)'; g.fillRect(px, py, cs, 1); g.fillRect(px, py, 1, cs);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px, py + cs - 1, cs, 1); g.fillRect(px + cs - 1, py, 1, cs);
    if (h % 5 === 0) {
      g.strokeStyle = 'rgba(214,182,109,.11)'; g.lineWidth = 1; var r = cs * 0.13, mx = px + cs / 2, my = py + cs / 2;
      g.beginPath(); g.moveTo(mx, my - r); g.lineTo(mx + r, my); g.lineTo(mx, my + r); g.lineTo(mx - r, my); g.closePath(); g.stroke();
    } else if (h % 7 === 1) { g.fillStyle = 'rgba(155,123,234,.14)'; g.beginPath(); g.arc(px + cs / 2, py + cs / 2, cs * 0.04, 0, 7); g.fill(); }
  }
  // ختم هندسي في مركز الأرضية
  g.save(); g.translate(ox + lv.w * cs / 2, oy + lv.h * cs / 2); g.strokeStyle = 'rgba(214,182,109,.06)'; g.lineWidth = 1.2;
  [0.9, 1.6, 2.4].forEach(function (m) { g.beginPath(); g.arc(0, 0, cs * m, 0, 7); g.stroke(); });
  g.restore();
  // تظليل الحواف (Ambient Occlusion)
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) {
    if (lv.solid[y * lv.w + x]) continue; px = ox + x * cs; py = oy + y * cs;
    if (solidAt(x - 1, y)) { grd = g.createLinearGradient(px, 0, px + cs * 0.42, 0); grd.addColorStop(0, 'rgba(0,0,0,.45)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(px, py, cs * 0.42, cs); }
    if (solidAt(x + 1, y)) { grd = g.createLinearGradient(px + cs, 0, px + cs * 0.58, 0); grd.addColorStop(0, 'rgba(0,0,0,.45)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(px + cs * 0.58, py, cs * 0.42, cs); }
    if (solidAt(x, y - 1)) { grd = g.createLinearGradient(0, py, 0, py + cs * 0.55); grd.addColorStop(0, 'rgba(0,0,0,.6)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(px, py, cs, cs * 0.55); }
    if (solidAt(x, y + 1)) { grd = g.createLinearGradient(0, py + cs, 0, py + cs * 0.65); grd.addColorStop(0, 'rgba(0,0,0,.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(px, py + cs * 0.65, cs, cs * 0.35); }
  }
  // قنوات الطاقة الخافتة (تحت الجدران)
  lv.plates.forEach(function (p) {
    strokePath(g, p.path, undefined, cs * 0.2, 'rgba(128,96,200,.07)');
    strokePath(g, p.path, undefined, cs * 0.07, 'rgba(155,123,234,.34)');
    p.path.forEach(function (q) { var c = cxy(q[0], q[1]); g.fillStyle = 'rgba(155,123,234,.45)'; g.beginPath(); g.arc(c[0], c[1], cs * 0.055, 0, 7); g.fill(); });
  });
}
function drawWalls(g) {
  var lv = G.lv, x, y;   // من الأعلى للأسفل ليظهر العمق بشكل صحيح
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) if (lv.solid[y * lv.w + x]) drawWall(g, x, y, lv.kind[y * lv.w + x]);
}

function drawWall(g, x, y, k) {
  var gold = k === 'H', px = ox + x * cs, ty = oy + y * cs - dz;
  var below = solidAt(x, y + 1), above = solidAt(x, y - 1), left = solidAt(x - 1, y), right = solidAt(x + 1, y), grd;
  if (!below) {
    grd = g.createLinearGradient(0, ty + cs, 0, ty + cs + dz);
    grd.addColorStop(0, gold ? '#5f4e24' : '#30275a'); grd.addColorStop(1, gold ? '#2a220e' : '#120c26');
    g.fillStyle = grd; g.fillRect(px, ty + cs, cs, dz);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, ty + cs, cs, 1.5);
    g.fillStyle = 'rgba(255,255,255,.06)'; if (!left) g.fillRect(px, ty + cs, 1.5, dz);
    g.fillStyle = 'rgba(0,0,0,.3)'; if (!right) g.fillRect(px + cs - 1.5, ty + cs, 1.5, dz);
  }
  grd = g.createLinearGradient(px, ty, px + cs, ty + cs);
  if (gold) { grd.addColorStop(0, '#9a8040'); grd.addColorStop(1, '#46391a'); } else { grd.addColorStop(0, '#4d4274'); grd.addColorStop(1, '#271f44'); }
  g.fillStyle = grd; g.fillRect(px, ty, cs, cs);
  var t = Math.max(2, cs * 0.07);
  g.fillStyle = 'rgba(255,255,255,.14)'; if (!above) g.fillRect(px, ty, cs, t); if (!left) g.fillRect(px, ty, t * 0.7, cs);
  g.fillStyle = 'rgba(0,0,0,.34)'; if (!below) g.fillRect(px, ty + cs - t, cs, t); if (!right) g.fillRect(px + cs - t * 0.7, ty, t * 0.7, cs);
  g.strokeStyle = 'rgba(0,0,0,.32)'; g.lineWidth = 1; g.strokeRect(px + 0.5, ty + 0.5, cs - 1, cs - 1);
  var h = hh(x, y), c = cs / 2;
  g.save(); g.translate(px + c, ty + c);
  if (gold) {
    g.strokeStyle = 'rgba(255,230,160,.85)'; g.lineWidth = Math.max(1.5, cs * 0.05);
    g.beginPath(); g.arc(0, 0, cs * 0.27, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(-cs * 0.27, 0); g.lineTo(cs * 0.27, 0); g.moveTo(0, -cs * 0.27); g.lineTo(0, cs * 0.27); g.stroke();
    g.beginPath(); g.arc(0, 0, cs * 0.1, 0, 7); g.fillStyle = 'rgba(255,230,160,.7)'; g.fill();
  } else if (k === '#' && h % 4 === 0) {
    g.strokeStyle = 'rgba(214,182,109,.24)'; g.lineWidth = 1.2;
    var p = (h >> 3) % 3, r = cs * 0.2; g.beginPath();
    if (p === 0) g.arc(0, 0, r, 0, 7);
    else if (p === 1) { g.moveTo(0, -r); g.lineTo(r, r * 0.8); g.lineTo(-r, r * 0.8); g.closePath(); }
    else { g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath(); }
    g.stroke();
  }
  g.restore();
}

/* ---------- الخلفية المتحركة ---------- */
function ring(r, dash, rot, col, lw) {
  cx.save(); cx.rotate(rot); cx.setLineDash(dash); cx.strokeStyle = col; cx.lineWidth = lw || 1.3;
  cx.beginPath(); cx.arc(0, 0, r, 0, 7); cx.stroke(); cx.restore();
}
function poly(n, r, rot, col) {
  cx.save(); cx.rotate(rot); cx.strokeStyle = col; cx.lineWidth = 1.2; cx.beginPath();
  for (var i = 0; i < n; i++) { var a = i * 2 * Math.PI / n - Math.PI / 2; if (i) cx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else cx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  cx.closePath(); cx.stroke(); cx.restore();
}
var D1 = [10, 14], D2 = [24, 12], D3 = [4, 10], D0 = [];
function drawBackdrop() {
  var R = Math.max(W, H) * 0.12, t = G.t;
  cx.save(); cx.translate(W / 2, H * 0.52);
  ring(R * 2.3, D1, t * 0.04, 'rgba(155,123,234,.14)'); ring(R * 3.4, D2, -t * 0.03, 'rgba(85,201,213,.10)');
  ring(R * 4.6, D3, t * 0.02, 'rgba(214,182,109,.10)'); ring(R * 1.5, D0, 0, 'rgba(155,123,234,.07)');
  poly(3, R * 3.4, t * 0.03, 'rgba(85,201,213,.08)'); poly(3, R * 3.4, -t * 0.03 + Math.PI / 3, 'rgba(155,123,234,.08)');
  poly(6, R * 4.7, -t * 0.02, 'rgba(214,182,109,.07)');
  cx.restore();
  cx.save(); cx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < motes.length; i++) {
    var m = motes[i], a = 0.12 + 0.26 * (0.5 + 0.5 * Math.sin(t * 1.3 + m.ph));
    cx.fillStyle = 'rgba(155,123,234,' + a + ')'; cx.beginPath(); cx.arc(m.x * W, m.y * H, m.r, 0, 7); cx.fill();
  }
  cx.restore();
}

/* ---------- العناصر الديناميكية ---------- */
function glow(sprite, x, y, size, a) {
  cx.globalAlpha = a; cx.drawImage(sprite, x - size / 2, y - size / 2, size, size); cx.globalAlpha = 1;
}
function gravMark(x, y, dir, a) {
  var v = DIRV[dir], s = cs * 0.84, t = G.t;
  cx.save(); cx.translate(x, y); cx.rotate(ANG[dir] || 0);
  cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.lineWidth = Math.max(1.6, cs * 0.05);
  for (var i = 0; i < 3; i++) {
    var ph = (t * 1.1 + i / 3) % 1, py = s * 0.24 + ph * s * 0.2, al = Math.sin(ph * Math.PI) * a;
    cx.strokeStyle = 'rgba(255,224,150,' + al + ')';
    cx.beginPath(); cx.moveTo(-s * 0.075, py - s * 0.04); cx.lineTo(0, py + s * 0.025); cx.lineTo(s * 0.075, py - s * 0.04); cx.stroke();
  }
  cx.restore();
}
function drawBlock(b, k, dpos) {
  var c = cxy(dpos.x, dpos.y), sc = k, lift = cs * 0.05, i = b.id;
  glow(SP.haloP, c[0], c[1], cs * 2.3, 0.55 * sc);
  cx.save(); cx.translate(c[0], c[1] - lift); if (sc !== 1) cx.scale(sc, sc);
  cx.drawImage(SP.block, -SP.size / 2, -SP.size / 2, SP.size, SP.size);
  var pu = 0.5 + 0.5 * Math.sin(G.t * 2.4 + i);
  cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.5 + 0.4 * pu;
  cx.drawImage(SP.haloC, -cs * 0.45, -cs * 0.45, cs * 0.9, cs * 0.9);
  cx.restore();
  cx.save(); cx.globalAlpha = 1; gravMark(c[0], c[1] - lift, b.g, 0.95 * sc); cx.restore();
}
function drawPlate(p, covered) {
  var c = cxy(p.x, p.y), dt = G.dt;
  if (covered && !p.on) { p.ripple = 0.001; G.rings.push({ x: c[0], y: c[1], t: 0, col: '255,230,160' }); }
  p.on = covered; p.glow += ((covered ? 1 : 0) - p.glow) * Math.min(1, dt * 9);
  var gl = p.glow, pulse = 0.5 + 0.5 * Math.sin(G.t * 3 + p.x);
  cx.save(); cx.translate(c[0], c[1]);
  cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.arc(0, 0, cs * 0.4, 0, 7); cx.fill();
  cx.restore();
  cx.save(); cx.globalCompositeOperation = 'lighter'; glow(SP.haloG, c[0], c[1], cs * (1.4 + gl * 1.2), 0.22 + gl * 0.6); cx.restore();
  cx.save(); cx.translate(c[0], c[1]);
  cx.strokeStyle = 'rgba(214,182,109,' + (0.5 + gl * 0.5) + ')'; cx.lineWidth = Math.max(1.5, cs * 0.055);
  cx.beginPath(); cx.arc(0, 0, cs * 0.34, 0, 7); cx.stroke();
  cx.save(); cx.setLineDash([cs * 0.07, cs * 0.06]); cx.rotate(G.t * (0.5 + gl * 1.5)); cx.lineWidth = Math.max(1.2, cs * 0.04);
  cx.beginPath(); cx.arc(0, 0, cs * 0.21, 0, 7); cx.stroke(); cx.restore();
  cx.beginPath(); cx.moveTo(0, -cs * 0.11); cx.lineTo(cs * 0.1, 0); cx.lineTo(0, cs * 0.11); cx.lineTo(-cs * 0.1, 0); cx.closePath();
  cx.fillStyle = 'rgba(255,225,150,' + (0.4 + gl * 0.6) + ')'; cx.fill();
  if (gl > 0.5) { cx.strokeStyle = 'rgba(255,235,170,' + (0.45 * (1 - pulse)) + ')'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(0, 0, cs * (0.38 + pulse * 0.25), 0, 7); cx.stroke(); }
  cx.restore();
}
function drawConduit(p) {
  var u = ((G.t * (0.28 + p.glow * 0.8)) % 1) * p.len, c = pathAt(p.path, u), gl = p.glow;
  cx.save(); cx.globalCompositeOperation = 'lighter';
  if (gl > 0.02) {
    strokePath(cx, p.path, p.len * gl, cs * 0.2, 'rgba(85,201,213,.10)');
    strokePath(cx, p.path, p.len * gl, cs * 0.06, 'rgba(120,226,238,.9)');
  }
  glow(SP.haloG, c[0], c[1], cs * 0.9, 0.35 + gl * 0.6);
  cx.restore();
}
function drawGate(covered, total) {
  var lv = G.lv, o = G.gateOpen, t = G.t;
  lv.gates.forEach(function (gt) {
    var w = cs * 0.74, x0 = ox + gt.x * cs + (cs - w) / 2, ybot = oy + (gt.y + 1) * cs, ytop = oy + gt.y * cs - dz + cs * 0.1, h = ybot - ytop, mx = x0 + w / 2;
    cx.save();
    if (o > 0) {
      var sh = cx.createLinearGradient(0, ybot, 0, ybot + cs * 4);
      sh.addColorStop(0, 'rgba(170,244,255,' + 0.42 * o + ')'); sh.addColorStop(1, 'rgba(170,244,255,0)');
      cx.globalCompositeOperation = 'lighter'; cx.fillStyle = sh;
      cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0 + w, ybot); cx.lineTo(x0 + w + cs * 1.5, ybot + cs * 4); cx.lineTo(x0 - cs * 1.5, ybot + cs * 4); cx.closePath(); cx.fill();
      cx.globalCompositeOperation = 'source-over';
    }
    cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0, ytop + w / 2); cx.arc(mx, ytop + w / 2, w / 2, Math.PI, 0); cx.lineTo(x0 + w, ybot); cx.closePath();
    var fg = cx.createLinearGradient(0, ytop, 0, ybot);
    if (o > 0) { fg.addColorStop(0, 'rgba(225,253,255,' + (0.35 + 0.65 * o) + ')'); fg.addColorStop(1, 'rgba(85,201,213,' + (0.3 + 0.6 * o) + ')'); }
    else { fg.addColorStop(0, '#05030a'); fg.addColorStop(1, '#150e28'); }
    cx.fillStyle = fg; cx.fill();
    cx.save(); cx.clip();
    if (o > 0) {
      cx.globalCompositeOperation = 'lighter'; cx.translate(mx, ytop + h * 0.5);
      for (var i = 0; i < 3; i++) { cx.save(); cx.rotate(t * (0.8 + i * 0.5) * (i % 2 ? -1 : 1)); cx.setLineDash([cs * 0.2, cs * 0.14]); cx.strokeStyle = 'rgba(255,255,255,' + 0.5 * o + ')'; cx.lineWidth = 1.4; cx.beginPath(); cx.arc(0, 0, cs * (0.14 + i * 0.12), 0, 7); cx.stroke(); cx.restore(); }
    } else {
      var ig = cx.createLinearGradient(x0, 0, x0 + w, 0); ig.addColorStop(0, 'rgba(0,0,0,.6)'); ig.addColorStop(0.5, 'rgba(0,0,0,0)'); ig.addColorStop(1, 'rgba(0,0,0,.6)');
      cx.fillStyle = ig; cx.fillRect(x0, ytop, w, h);
      cx.strokeStyle = 'rgba(214,182,109,.16)'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x0, ytop + h * 0.62); cx.lineTo(x0 + w, ytop + h * 0.62); cx.moveTo(x0, ytop + h * 0.72); cx.lineTo(x0 + w, ytop + h * 0.72); cx.stroke();
    }
    cx.restore();
    cx.beginPath(); cx.moveTo(x0, ybot); cx.lineTo(x0, ytop + w / 2); cx.arc(mx, ytop + w / 2, w / 2, Math.PI, 0); cx.lineTo(x0 + w, ybot);
    cx.strokeStyle = o > 0 ? '#d5fbff' : 'rgba(214,182,109,.95)'; cx.lineWidth = Math.max(2, cs * 0.07); cx.lineJoin = 'round'; cx.stroke();
    cx.strokeStyle = o > 0 ? 'rgba(170,244,255,.6)' : 'rgba(214,182,109,.35)'; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(x0 + cs * 0.07, ybot); cx.lineTo(x0 + cs * 0.07, ytop + w / 2); cx.arc(mx, ytop + w / 2, w / 2 - cs * 0.07, Math.PI, 0); cx.lineTo(x0 + w - cs * 0.07, ybot); cx.stroke();
    var n = total, gap = Math.min(cs * 0.17, (w * 0.7) / Math.max(1, n)), sy = ytop + w * 0.48, r = Math.max(2.2, cs * 0.05);
    for (var j = 0; j < n; j++) {
      var dx = mx + (j - (n - 1) / 2) * gap, on = j < covered;
      cx.beginPath(); cx.moveTo(dx, sy - r * 1.5); cx.lineTo(dx + r, sy); cx.lineTo(dx, sy + r * 1.5); cx.lineTo(dx - r, sy); cx.closePath();
      cx.fillStyle = on ? '#ffe6a3' : 'rgba(214,182,109,.22)'; cx.fill();
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
    cx.strokeStyle = 'rgba(120,225,240,' + Math.max(0, al) + ')';
    cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - v[0] * l, y - v[1] * l); cx.stroke();
  });
  cx.restore();
}
function drawGhosts() {
  if (!G.preview || G.mode !== 'planning') return;
  var pv = G.preview.blocks, t = G.t;
  G.blocks.forEach(function (b) {
    var q = pv[b.id]; if (q.x === b.x && q.y === b.y) return;
    var planned = !!G.plan[b.id], col = planned ? '85,201,213' : '214,182,109';
    var a = cxy(b.x, b.y), e = cxy(q.x, q.y), dx = e[0] - a[0], dy = e[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    cx.save(); cx.setLineDash([cs * 0.1, cs * 0.1]); cx.lineDashOffset = -t * cs * 0.7; cx.strokeStyle = 'rgba(' + col + ',.55)'; cx.lineWidth = 2;
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
    cx.save(); cx.setLineDash([cs * 0.1, cs * 0.08]); cx.strokeStyle = 'rgba(' + col + ',.95)'; cx.lineWidth = 2; rr(cx, e[0] - cs * 0.42, e[1] - cs * 0.42, cs * 0.84, cs * 0.84, cs * 0.16); cx.stroke(); cx.restore();
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
  var g = cx.createLinearGradient(0, -r, 0, r); if (on) { g.addColorStop(0, '#3a97ad'); g.addColorStop(1, '#4b36a0'); } else { g.addColorStop(0, '#2c2350'); g.addColorStop(1, '#171230'); }
  cx.beginPath(); cx.arc(0, 0, r, 0, 7); cx.fillStyle = g; cx.fill();
  cx.strokeStyle = on ? '#8cf0fa' : 'rgba(165,135,245,.85)'; cx.lineWidth = 1.6; cx.stroke();
  cx.rotate(ANG[dir]); cx.strokeStyle = '#fff'; cx.lineWidth = Math.max(2, r * 0.17); cx.lineCap = 'round'; cx.lineJoin = 'round';
  cx.beginPath(); cx.moveTo(0, -r * 0.42); cx.lineTo(0, r * 0.38); cx.moveTo(-r * 0.3, r * 0.1); cx.lineTo(0, r * 0.4); cx.lineTo(r * 0.3, r * 0.1); cx.stroke();
  cx.restore();
}
function drawSelection(dpos) {
  if (G.sel < 0 || G.mode !== 'planning') return;
  var b = G.blocks[G.sel], c = cxy(b.x, b.y), t = G.t, pu = 0.5 + 0.5 * Math.sin(t * 5), r = cs * 0.5;
  cx.save(); cx.translate(c[0], c[1]);
  cx.save(); cx.rotate(t * 0.9); cx.setLineDash([cs * 0.12, cs * 0.1]); cx.strokeStyle = 'rgba(190,245,255,' + (0.55 + 0.3 * pu) + ')'; cx.lineWidth = 1.6;
  cx.beginPath(); cx.arc(0, 0, cs * 0.62, 0, 7); cx.stroke(); cx.restore();
  cx.strokeStyle = 'rgba(255,255,255,' + (0.75 + 0.25 * pu) + ')'; cx.lineWidth = 2.4; cx.lineCap = 'round';
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
  cx.globalAlpha = 1; cx.lineWidth = 2;
  for (i = 0; i < G.rings.length; i++) {
    var r = G.rings[i], k = r.t / 0.55;
    cx.strokeStyle = 'rgba(' + r.col + ',' + (0.7 * (1 - k)) + ')'; cx.lineWidth = Math.max(1, cs * 0.06 * (1 - k));
    cx.beginPath(); cx.arc(r.x, r.y, cs * (0.25 + k * 1.2), 0, 7); cx.stroke();
  }
  cx.restore();
}
function burst(x, y, vx, vy, n, c, spread) {
  if (reduce) n = Math.ceil(n / 4);
  for (var i = 0; i < n && G.parts.length < 280; i++) {
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

function draw() {
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  var sx = 0, sy = 0;
  if (G.shake > 0.1 && !reduce) { sx = (Math.random() - 0.5) * G.shake; sy = (Math.random() - 0.5) * G.shake; }
  cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  cx.fillStyle = '#0b0a12'; cx.fillRect(0, 0, W, H);
  cx.save(); cx.translate(sx, sy);
  if (bgLayer) cx.drawImage(bgLayer, 0, 0, W, H);
  drawBackdrop();
  var lv = G.lv;
  if (lv) {
    var k = easeOut(G.intro), bcx = ox + lv.w * cs / 2, bcy = oy + lv.h * cs / 2;
    cx.save(); cx.translate(bcx, bcy); cx.scale(0.93 + 0.07 * k, 0.93 + 0.07 * k); cx.translate(-bcx, -bcy); cx.globalAlpha = k;
    if (boardLayer) cx.drawImage(boardLayer, 0, 0, W, H);
    var pos = G.blocks.map(displayPos), covered = 0;
    lv.plates.forEach(function (p) { drawConduit(p); });
    lv.plates.forEach(function (p) {
      var c = pos.some(function (q) { return Math.abs(q.x - p.x) < 0.2 && Math.abs(q.y - p.y) < 0.2; });
      if (c) covered++; drawPlate(p, c);
    });
    if (wallLayer) cx.drawImage(wallLayer, 0, 0, W, H);
    drawGate(covered, lv.plates.length);
    drawField();
    drawGhosts();
    G.blocks.forEach(function (b, i) { drawBlock(b, easeBack((G.intro - 0.3 - i * 0.1) / 0.5), pos[i]); });
    drawSelection();
    drawParticles();
    cx.restore();
  }
  cx.restore();
  if (G.flash > 0.01) { cx.fillStyle = 'rgba(190,248,255,' + (G.flash * 0.32) + ')'; cx.fillRect(0, 0, W, H); }
}

/* ---------- التحديث ---------- */
function updateAmbient(dt) {
  G.t += dt; G.dt = dt;
  motes.forEach(function (m) { m.y -= m.s * dt; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); } });
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
  G.flash = Math.max(0, G.flash - dt * 1.8);
  // حقل الجاذبية
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
  if (G.mode === 'solved') {
    G.gateOpen = Math.min(1, G.gateOpen + dt * 1.1);
    if (G.gateOpen > 0.3 && !reduce && G.lv.gates[0] && Math.random() < 0.55) {
      var gt = G.lv.gates[0], gx = ox + (gt.x + 0.5) * cs + (Math.random() - 0.5) * cs * 0.5, gy = oy + (gt.y + 1) * cs;
      G.parts.push({ x: gx, y: gy, vx: (Math.random() - 0.5) * 20, vy: cs * (0.8 + Math.random() * 1.4), life: 0.9, max: 1.1, s: 1.5 + Math.random() * 2, c: 'rgba(190,248,255,.9)' });
    }
    if (!G.clearShown && G.t - G.solvedAt > 1.7) showClear();
  }
  if (G.anim) updateAnim(dt);
}
function updateAnim(dt) {
  var A = G.anim; A.t += dt;
  var st = A.steps[A.i];
  if (st && !reduce) st.forEach(function (m) {
    var p = Math.min(1, A.t / stepDur(A.i)), x = m.fx + (m.tx - m.fx) * p, y = m.fy + (m.ty - m.fy) * p, c = cxy(x, y);
    if (Math.random() < 0.7) burst(c[0], c[1], 0, 0, 1, Math.random() < 0.5 ? 'rgba(85,201,213,.7)' : 'rgba(128,96,200,.8)', 14);
  });
  while (A.i < A.steps.length && A.t >= stepDur(A.i)) { A.t -= stepDur(A.i); finishStep(A); A.i++; }
  if (A.i >= A.steps.length) endAnim();
}
function finishStep(A) {
  var step = A.steps[A.i], next = A.steps[A.i + 1];
  step.forEach(function (m) {
    A.cur.set(m.id, { x: m.tx, y: m.ty });
    var run = (A.run.get(m.id) || 0) + 1; A.run.set(m.id, run);
    var moving = next && next.some(function (n) { return n.id === m.id; });
    if (!moving) { A.run.set(m.id, 0); land(m, run, A.g.get(m.id)); }
  });
}
function land(m, run, gdir) {
  var v = DIRV[gdir], c = cxy(m.tx, m.ty), px = c[0] + v[0] * cs * 0.42, py = c[1] + v[1] * cs * 0.42;
  burst(px, py, -v[0] * 40, -v[1] * 40, 14, 'rgba(214,182,109,.8)', 70);
  burst(px, py, -v[0] * 30, -v[1] * 30, 8, 'rgba(155,123,234,.9)', 60);
  G.rings.push({ x: px, y: py, t: 0, col: '214,182,109' });
  G.shake = Math.max(G.shake, Math.min(9, run * 1.4 + 1.5));
  AudioFX.land(Math.min(1, run / 6));
  var on = G.lv.plates.some(function (p) { return p.x === m.tx && p.y === m.ty; });
  if (on) setTimeout(function () { AudioFX.plate(true); }, 90);
}
function endAnim() {
  G.blocks = G.anim.final; G.anim = null; G.mode = 'planning'; G.plan = {}; G.preview = null;
  if (Sim.solved(G.lv, G.blocks)) {
    G.mode = 'solved'; G.solvedAt = G.t; G.sel = -1; G.flash = 1;
    setTimeout(function () { AudioFX.gate(); AudioFX.success(); }, 250);
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
  $('#shifter').className = st;
  var modeTxt = { planning: 'تخطيط', running: 'تشغيل', solved: 'مراجعة' }[G.mode];
  $('#status').innerHTML = '<span class="seg">' + icon('i-gravity') + '<span>GRAVITY</span></span><i class="sep"></i><span class="mode">' + modeTxt + '</span><i class="sep"></i><span>طاقة <b>' + G.moves + '</b> / ' + (G.room ? G.room.par : '-') + '</span>';
  document.body.classList.toggle('sel', G.sel >= 0 && G.mode === 'planning');
  $('#btnUndo').disabled = G.mode !== 'planning' || !G.hist.length;
  $('#btnRedo').disabled = G.mode !== 'planning' || !G.redo.length;
  var sim = $('#btnSim'); sim.disabled = G.mode !== 'planning'; sim.classList.toggle('armed', G.mode === 'planning' && planned > 0);
  $$('#dpad button').forEach(function (b) { b.classList.toggle('on', G.sel >= 0 && G.plan[G.sel] === b.dataset.d); });
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
  G.clearShown = true;
  var n = stars(), id = G.room.id;
  if ((save.done[id] || 0) < n) { save.done[id] = n; persist(); }
  $('#clearRoom').textContent = G.room.name; $('#clearTitle').textContent = 'تم فتح البوابة';
  $('#clearStars').innerHTML = starsSvg(n, 0.15);
  $('#clearInfo').textContent = 'الطاقة المستخدمة: ' + G.moves + ' · الحل المثالي: ' + G.room.par;
  $('#clearCodex').textContent = 'THE LAW CODEX · ' + G.room.codex;
  $('#btnNext').textContent = G.ri === ROOMS.length - 1 ? 'انتهت المرحلة الأولى · القائمة' : 'الغرفة التالية';
  refreshUI(); show('#clear');
}
function buildMenu() {
  var box = $('#roomList'); box.innerHTML = '';
  ROOMS.forEach(function (r, i) {
    var ok = i === 0 || save.done[ROOMS[i - 1].id], st = save.done[r.id] || 0, b = document.createElement('button');
    b.className = 'roomBtn' + (ok ? '' : ' locked'); b.disabled = !ok;
    var right = ok ? '<span class="s">' + [0, 1, 2].map(function (j) { return '<svg viewBox="0 0 24 24" class="' + (j < st ? 'on' : '') + '"><use href="#i-star"/></svg>'; }).join('') + '</span>' : '<span class="s">' + icon('i-lock') + '</span>';
    b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"><b>' + r.name + '</b><small>' + r.sub + '</small></span>' + right;
    b.onclick = function () { AudioFX.click(); hide('#menu'); loadRoom(i); G.paused = false; };
    box.appendChild(b);
  });
}
function openMenu() { closeSheet(); buildMenu(); hide('#pause'); hide('#clear'); show('#menu'); G.paused = true; }
function updateMuteBtns() {
  var m = AudioFX.isMuted();
  $$('.js-mute').forEach(function (b) { b.querySelector('.t').textContent = m ? 'الصوت: متوقف' : 'الصوت: يعمل'; b.querySelector('use').setAttribute('href', m ? '#i-mute' : '#i-sound'); });
}
/* قائمة القوانين */
function placeSheet() {
  var r = $('#shifter').getBoundingClientRect(), s = $('#lawSheet');
  s.style.left = Math.max(8, r.left) + 'px'; s.style.bottom = Math.round(window.innerHeight - r.top + 12) + 'px';
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
    if (panelOpen()) { if ($('#pause').classList.contains('show')) { hide('#pause'); G.paused = false; } else if ($('#menu').classList.contains('show') && started) { hide('#menu'); G.paused = false; } }
    else if (G.sel >= 0) deselect(); else { G.paused = true; show('#pause'); }
  }
});

/* ---------- ربط الأزرار ---------- */
$('#btnSim').onclick = function () { AudioFX.init(); runSim(); };
$('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo; $('#btnReset').onclick = resetRoom;
$('#btnMenu').onclick = function () { AudioFX.click(); openMenu(); };
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
$('#btnFs').onclick = function () {
  var el = document.documentElement;
  try { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); } catch (e) {}
};
$$('.js-mute').forEach(function (b) {
  b.onclick = function () { AudioFX.init(); AudioFX.setMuted(!AudioFX.isMuted()); save.muted = AudioFX.isMuted(); persist(); updateMuteBtns(); };
});
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
  AudioFX.init(); AudioFX.activate(); AudioFX.ambience(45);
  started = true; hide('#intro');
  var first = 0; for (var i = 0; i < ROOMS.length; i++) { if (!save.done[ROOMS[i].id]) { first = i; break; } first = i; }
  loadRoom(first); G.paused = false;
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
updateMuteBtns();
loadRoom(0);
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
}
window.__lawless = { info: function () { return { ox: ox, oy: oy, cs: cs, dz: dz, w: G.lv.w, h: G.lv.h }; }, G: G, loadRoom: loadRoom, runSim: runSim, setDir: setDir, select: select, update: update, draw: draw, openSheet: openSheet, closeSheet: closeSheet, showClear: showClear };
})();
