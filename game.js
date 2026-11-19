/* LAWLESS — الرسم والتحكم والواجهة */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
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
  sel: -1, mode: 'planning', moves: 0, wasted: 0, anim: null, shake: 0, parts: [], gateOpen: 0,
  paused: true, t: 0, solvedAt: 0, clearShown: false, lastLanded: 0 };
var W = 0, H = 0, DPR = 1, cs = 40, ox = 0, oy = 0, staticLayer = null, started = false;
var motes = [];
for (var mi = 0; mi < 34; mi++) motes.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, s: 0.01 + Math.random() * 0.03, ph: Math.random() * 6.28 });

/* ---------- أدوات ---------- */
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
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

/* ---------- تحميل غرفة ---------- */
function loadRoom(i) {
  G.ri = i; G.room = ROOMS[i]; G.lv = Sim.load(G.room); G.blocks = Sim.clone(G.lv.start);
  G.hist = []; G.redo = []; G.plan = {}; G.preview = null; G.sel = -1; G.mode = 'planning';
  G.moves = 0; G.wasted = 0; G.anim = null; G.gateOpen = 0; G.clearShown = false; G.parts.length = 0; G.shake = 0;
  G.lv.plates.forEach(function (p) { p.glow = 0; p.was = false; });
  $('#roomName').textContent = String(i + 1).padStart(2, '0') + ' · ' + G.room.name;
  showHint(G.room.hint);
  layout(); refreshUI();
}

/* ---------- التخطيط ---------- */
function layout() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  var portrait = H > W, top = H >= 600 ? 100 : 66, bot = portrait ? 215 : 92;
  if (G.lv) {
    cs = Math.floor(Math.min((W - 20) / G.lv.w, (H - top - bot) / G.lv.h, 88));
    cs = Math.max(cs, 16);
    ox = Math.round((W - cs * G.lv.w) / 2);
    oy = Math.round(top + ((H - top - bot) - cs * G.lv.h) / 2);
  }
  buildStatic();
}

/* ---------- الطبقة الثابتة ---------- */
function buildStatic() {
  staticLayer = document.createElement('canvas');
  staticLayer.width = cv.width; staticLayer.height = cv.height;
  var g = staticLayer.getContext('2d'); g.scale(DPR, DPR);
  var bg = g.createRadialGradient(W * 0.7, H * 0.1, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.9);
  bg.addColorStop(0, '#2e2250'); bg.addColorStop(0.5, '#171326'); bg.addColorStop(1, '#0b0a12');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // هندسة مقدسة خافتة
  g.save(); g.translate(W / 2, H * 0.52); g.strokeStyle = 'rgba(155,123,234,.07)'; g.lineWidth = 1;
  var R = Math.max(W, H) * 0.12, i, k, a;
  for (i = 1; i <= 6; i++) { g.beginPath(); g.arc(0, 0, R * i, 0, 7); g.stroke(); }
  for (k = 0; k < 2; k++) {
    g.beginPath();
    for (i = 0; i < 3; i++) { a = i * 2 * Math.PI / 3 + k * Math.PI / 3 - Math.PI / 2; var x = Math.cos(a) * R * 4, y = Math.sin(a) * R * 4; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.closePath(); g.stroke();
  }
  for (i = 0; i < 12; i++) { a = i * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(a) * R, Math.sin(a) * R); g.lineTo(Math.cos(a) * R * 6, Math.sin(a) * R * 6); g.stroke(); }
  g.restore();
  if (G.lv) drawWalls(g);
  var v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}

function drawWalls(g) {
  var lv = G.lv, d = Math.max(3, cs * 0.15), x, y;
  g.fillStyle = 'rgba(6,5,14,.62)'; g.fillRect(ox, oy, lv.w * cs, lv.h * cs);
  g.strokeStyle = 'rgba(155,123,234,.07)'; g.lineWidth = 1; g.beginPath();
  for (x = 1; x < lv.w; x++) { g.moveTo(ox + x * cs + 0.5, oy); g.lineTo(ox + x * cs + 0.5, oy + lv.h * cs); }
  for (y = 1; y < lv.h; y++) { g.moveTo(ox, oy + y * cs + 0.5); g.lineTo(ox + lv.w * cs, oy + y * cs + 0.5); }
  g.stroke();
  g.fillStyle = 'rgba(4,3,10,.8)';
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) if (lv.solid[y * lv.w + x]) g.fillRect(ox + x * cs + d * 0.4, oy + y * cs + d, cs, cs);
  for (y = 0; y < lv.h; y++) for (x = 0; x < lv.w; x++) if (lv.solid[y * lv.w + x]) drawStone(g, x, y, lv.kind[y * lv.w + x]);
}

function drawStone(g, x, y, k) {
  var lv = G.lv, px = ox + x * cs, py = oy + y * cs;
  function sa(a, b) { return a >= 0 && b >= 0 && a < lv.w && b < lv.h && lv.solid[b * lv.w + a]; }
  var gr = g.createLinearGradient(px, py, px + cs, py + cs);
  if (k === 'H') { gr.addColorStop(0, '#85703a'); gr.addColorStop(1, '#3b3118'); }
  else { gr.addColorStop(0, '#41375f'); gr.addColorStop(1, '#231c39'); }
  g.fillStyle = gr; g.fillRect(px, py, cs, cs);
  var t = Math.max(2, cs * 0.07), s = Math.max(2, cs * 0.05);
  g.fillStyle = 'rgba(255,255,255,.1)';
  if (!sa(x, y - 1)) g.fillRect(px, py, cs, t);
  if (!sa(x - 1, y)) g.fillRect(px, py, s, cs);
  g.fillStyle = 'rgba(0,0,0,.32)';
  if (!sa(x, y + 1)) g.fillRect(px, py + cs - t, cs, t);
  if (!sa(x + 1, y)) g.fillRect(px + cs - s, py, s, cs);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
  var h = ((x * 73856093) ^ (y * 19349663)) >>> 0, c = cs / 2;
  g.save(); g.translate(px + c, py + c);
  if (k === 'H') {
    g.strokeStyle = 'rgba(255,225,150,.75)'; g.lineWidth = Math.max(1.5, cs * 0.05);
    g.beginPath(); g.arc(0, 0, cs * 0.27, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(-cs * 0.27, 0); g.lineTo(cs * 0.27, 0); g.moveTo(0, -cs * 0.27); g.lineTo(0, cs * 0.27); g.stroke();
    g.beginPath(); g.arc(0, 0, cs * 0.1, 0, 7); g.fillStyle = 'rgba(255,225,150,.6)'; g.fill();
  } else if (h % 4 === 0 && k === '#') {
    g.strokeStyle = 'rgba(214,182,109,.2)'; g.lineWidth = 1.2;
    var p = (h >> 3) % 3, r = cs * 0.2;
    g.beginPath();
    if (p === 0) g.arc(0, 0, r, 0, 7);
    else if (p === 1) { g.moveTo(0, -r); g.lineTo(r, r * 0.8); g.lineTo(-r, r * 0.8); g.closePath(); }
    else { g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath(); }
    g.stroke();
  }
  g.restore();
}

/* ---------- رسم العناصر الديناميكية ---------- */
function drawBlock(g, px, py, s, gdir, o) {
  o = o || {};
  var inset = (cs - s) / 2, x = px + inset, y = py + inset, r = s * 0.18, cxm = x + s / 2, cym = y + s / 2;
  g.save();
  if (o.ghost) {
    g.setLineDash([s * 0.12, s * 0.1]); rr(g, x, y, s, s, r);
    g.fillStyle = 'rgba(85,201,213,.10)'; g.fill();
    g.strokeStyle = o.color || COL.cyan; g.lineWidth = 2; g.stroke(); g.restore(); return;
  }
  g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, x + s * 0.06, y + s * 0.1, s, s, r); g.fill();
  var h = g.createRadialGradient(cxm, cym, s * 0.2, cxm, cym, s * 0.95);
  h.addColorStop(0, 'rgba(128,96,200,.35)'); h.addColorStop(1, 'rgba(128,96,200,0)');
  g.fillStyle = h; g.fillRect(x - s * 0.5, y - s * 0.5, s * 2, s * 2);
  var gr = g.createLinearGradient(x, y, x + s, y + s);
  gr.addColorStop(0, '#7e5fe0'); gr.addColorStop(1, '#35276f');
  rr(g, x, y, s, s, r); g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(85,201,213,.75)'; g.lineWidth = Math.max(1.5, s * 0.05); g.stroke();
  rr(g, x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8, r * 0.7);
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.stroke();
  // بلورة مركزية
  var d = s * 0.2, cg = g.createLinearGradient(cxm - d, cym - d, cxm + d, cym + d);
  cg.addColorStop(0, '#bff6ff'); cg.addColorStop(1, '#6f55d6');
  g.beginPath(); g.moveTo(cxm, cym - d); g.lineTo(cxm + d * 0.8, cym); g.lineTo(cxm, cym + d); g.lineTo(cxm - d * 0.8, cym); g.closePath();
  g.fillStyle = cg; g.globalAlpha = 0.9; g.fill(); g.globalAlpha = 1;
  // مؤشر اتجاه الجاذبية الحالي
  g.translate(cxm, cym); g.rotate(ANG[gdir] || 0);
  var tt = s * 0.1;
  g.beginPath(); g.moveTo(-tt, s * 0.3); g.lineTo(tt, s * 0.3); g.lineTo(0, s * 0.43); g.closePath();
  g.fillStyle = COL.gold; g.fill();
  g.restore();
}

function chevron(g, x, y, r, dir, fill, stroke) {
  g.save(); g.translate(x, y);
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke();
  g.rotate(ANG[dir]); g.beginPath(); g.moveTo(-r * 0.42, -r * 0.2); g.lineTo(0, r * 0.28); g.lineTo(r * 0.42, -r * 0.2);
  g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, r * 0.18); g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  g.restore();
}

function displayPos(b) {
  var A = G.anim; if (!A) return { x: b.x, y: b.y };
  var c = A.cur.get(b.id), x = c.x, y = c.y, st = A.steps[A.i];
  if (st) for (var k = 0; k < st.length; k++) if (st[k].id === b.id) {
    var p = Math.min(1, A.t / stepDur(A.i)); x = st[k].fx + (st[k].tx - st[k].fx) * p; y = st[k].fy + (st[k].ty - st[k].fy) * p;
  }
  return { x: x, y: y };
}

function drawPlate(p, covered) {
  var c = { x: ox + (p.x + 0.5) * cs, y: oy + (p.y + 0.5) * cs };
  p.glow += ((covered ? 1 : 0) - p.glow) * 0.18;
  var gl = p.glow, pulse = 0.5 + 0.5 * Math.sin(G.t * 3 + p.x);
  cx.save(); cx.translate(c.x, c.y);
  var gr = cx.createRadialGradient(0, 0, 0, 0, 0, cs * (0.5 + gl * 0.35));
  gr.addColorStop(0, 'rgba(214,182,109,' + (0.18 + gl * 0.5) + ')'); gr.addColorStop(1, 'rgba(214,182,109,0)');
  cx.fillStyle = gr; cx.fillRect(-cs, -cs, cs * 2, cs * 2);
  cx.strokeStyle = 'rgba(214,182,109,' + (0.5 + gl * 0.5) + ')'; cx.lineWidth = Math.max(1.5, cs * 0.05);
  cx.beginPath(); cx.arc(0, 0, cs * 0.33, 0, 7); cx.stroke();
  cx.setLineDash([cs * 0.07, cs * 0.06]); cx.rotate(G.t * 0.5);
  cx.beginPath(); cx.arc(0, 0, cs * 0.2, 0, 7); cx.stroke(); cx.setLineDash([]); cx.rotate(-G.t * 0.5);
  cx.beginPath(); cx.moveTo(0, -cs * 0.1); cx.lineTo(cs * 0.09, 0); cx.lineTo(0, cs * 0.1); cx.lineTo(-cs * 0.09, 0); cx.closePath();
  cx.fillStyle = 'rgba(214,182,109,' + (0.35 + gl * 0.6) + ')'; cx.fill();
  if (gl > 0.5) { cx.strokeStyle = 'rgba(255,235,170,' + (0.5 * (1 - pulse)) + ')'; cx.beginPath(); cx.arc(0, 0, cs * (0.35 + pulse * 0.3), 0, 7); cx.stroke(); }
  cx.restore();
}

function drawGate(covered, total) {
  var lv = G.lv, o = G.gateOpen;
  lv.gates.forEach(function (gt) {
    var px = ox + gt.x * cs, py = oy + gt.y * cs, w = cs * 0.74, h = cs * 0.92, x = px + (cs - w) / 2, y = py + (cs - h) / 2;
    cx.save();
    if (o > 0) { // شعاع ضوء داخل الغرفة
      var bg = cx.createLinearGradient(0, py + cs, 0, py + cs * 4.2);
      bg.addColorStop(0, 'rgba(160,240,255,' + 0.38 * o + ')'); bg.addColorStop(1, 'rgba(160,240,255,0)');
      cx.globalCompositeOperation = 'lighter'; cx.fillStyle = bg;
      cx.beginPath(); cx.moveTo(x, py + cs); cx.lineTo(x + w, py + cs); cx.lineTo(x + w + cs * 1.4, py + cs * 4.2); cx.lineTo(x - cs * 1.4, py + cs * 4.2); cx.closePath(); cx.fill();
      cx.globalCompositeOperation = 'source-over';
    }
    cx.beginPath(); cx.moveTo(x, y + h); cx.lineTo(x, y + w / 2); cx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); cx.lineTo(x + w, y + h); cx.closePath();
    var fg = cx.createLinearGradient(0, y, 0, y + h);
    fg.addColorStop(0, o > 0 ? 'rgba(220,252,255,' + (0.3 + 0.7 * o) + ')' : '#07050d'); fg.addColorStop(1, o > 0 ? 'rgba(85,201,213,' + (0.3 + 0.6 * o) + ')' : '#120d20');
    cx.fillStyle = fg; cx.fill();
    cx.strokeStyle = o > 0 ? '#bff6ff' : 'rgba(214,182,109,.85)'; cx.lineWidth = Math.max(1.5, cs * 0.05); cx.stroke();
    // رموز التقدّم: نقطة لكل مفتاح مفعّل
    var n = total, gap = Math.min(cs * 0.2, w / (n + 1));
    for (var i = 0; i < n; i++) {
      var dx = x + w / 2 + (i - (n - 1) / 2) * gap, dy = y + h * 0.55;
      cx.beginPath(); cx.arc(dx, dy, Math.max(2, cs * 0.05), 0, 7);
      cx.fillStyle = i < covered ? COL.gold : 'rgba(214,182,109,.25)'; cx.fill();
    }
    cx.restore();
  });
}

function drawGhosts() {
  if (!G.preview || G.mode !== 'planning') return;
  var pv = G.preview.blocks;
  G.blocks.forEach(function (b) {
    var q = pv[b.id]; if (q.x === b.x && q.y === b.y) return;
    var planned = !!G.plan[b.id];
    var x1 = ox + (b.x + 0.5) * cs, y1 = oy + (b.y + 0.5) * cs, x2 = ox + (q.x + 0.5) * cs, y2 = oy + (q.y + 0.5) * cs;
    cx.save(); cx.setLineDash([cs * 0.12, cs * 0.1]); cx.lineDashOffset = -G.t * cs * 0.6;
    cx.strokeStyle = planned ? 'rgba(85,201,213,.9)' : 'rgba(214,182,109,.65)'; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke(); cx.restore();
    drawBlock(cx, ox + q.x * cs, oy + q.y * cs, cs * 0.84, q.g, { ghost: true, color: planned ? COL.cyan : COL.gold });
  });
}

function arrowPos(b, d) { var v = DIRV[d]; return { x: ox + (b.x + 0.5 + v[0]) * cs, y: oy + (b.y + 0.5 + v[1]) * cs }; }
function arrowOK(b, d) { var v = DIRV[d], nx = b.x + v[0], ny = b.y + v[1]; return nx >= 0 && ny >= 0 && nx < G.lv.w && ny < G.lv.h; }

function drawSelection() {
  if (G.sel < 0 || G.mode !== 'planning') return;
  var b = G.blocks[G.sel], x = ox + b.x * cs, y = oy + b.y * cs, s = cs * 0.9, i = (cs - s) / 2;
  var pu = 0.5 + 0.5 * Math.sin(G.t * 5);
  cx.save(); rr(cx, x + i, y + i, s, s, s * 0.2); cx.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * pu) + ')'; cx.lineWidth = 2 + pu * 1.5; cx.stroke(); cx.restore();
  DIRS.forEach(function (d) {
    if (!arrowOK(b, d)) return;
    var p = arrowPos(b, d), on = G.plan[b.id] === d;
    chevron(cx, p.x, p.y, cs * 0.34, d, on ? 'rgba(47,126,150,.96)' : 'rgba(40,31,66,.92)', on ? COL.cyan : 'rgba(155,123,234,.8)');
  });
}

function drawParticles() {
  cx.save(); cx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < G.parts.length; i++) {
    var p = G.parts[i], a = Math.max(0, p.life / p.max);
    cx.globalAlpha = a * 0.9; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.s * (0.4 + a * 0.6), 0, 7); cx.fill();
  }
  cx.restore();
}
function burst(x, y, vx, vy, n, c, spread) {
  if (reduce) n = Math.ceil(n / 4);
  for (var i = 0; i < n && G.parts.length < 260; i++) {
    var a = Math.random() * 6.28, sp = (0.3 + Math.random()) * spread;
    G.parts.push({ x: x, y: y, vx: vx * 0.5 + Math.cos(a) * sp, vy: vy * 0.5 + Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, max: 0.9, s: 1.5 + Math.random() * cs * 0.06, c: c });
  }
}

function draw() {
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  var sx = 0, sy = 0;
  if (G.shake > 0.1 && !reduce) { sx = (Math.random() - 0.5) * G.shake; sy = (Math.random() - 0.5) * G.shake; }
  cx.fillStyle = '#0b0a12'; cx.fillRect(0, 0, W, H);
  cx.save(); cx.translate(sx, sy);
  if (staticLayer) cx.drawImage(staticLayer, 0, 0, W, H);
  // غبار عائم
  cx.save(); cx.globalCompositeOperation = 'lighter';
  for (var i = 0; i < motes.length; i++) {
    var m = motes[i], a = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(G.t * 1.3 + m.ph));
    cx.fillStyle = 'rgba(155,123,234,' + a + ')'; cx.beginPath(); cx.arc(m.x * W, m.y * H, m.r, 0, 7); cx.fill();
  }
  cx.restore();
  var lv = G.lv;
  if (lv) {
    var pos = G.blocks.map(displayPos), covered = 0;
    lv.plates.forEach(function (p) {
      var c = pos.some(function (q) { return Math.abs(q.x - p.x) < 0.2 && Math.abs(q.y - p.y) < 0.2; });
      if (c) covered++; drawPlate(p, c);
    });
    drawGate(covered, lv.plates.length);
    drawGhosts();
    G.blocks.forEach(function (b, k) { drawBlock(cx, ox + pos[k].x * cs, oy + pos[k].y * cs, cs * 0.84, b.g); });
    drawSelection();
    drawParticles();
  }
  cx.restore();
}

/* ---------- التحديث ---------- */
function update(dt) {
  G.t += dt;
  motes.forEach(function (m) { m.y -= m.s * dt; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); } });
  for (var i = G.parts.length - 1; i >= 0; i--) {
    var p = G.parts[i]; p.life -= dt; if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
  }
  G.shake *= Math.pow(0.0008, dt);
  if (G.mode === 'solved') {
    G.gateOpen = Math.min(1, G.gateOpen + dt * 1.1);
    if (!G.clearShown && G.t - G.solvedAt > 1.6) showClear();
  }
  if (G.anim) updateAnim(dt);
}

function updateAnim(dt) {
  var A = G.anim; A.t += dt;
  // انبعاثات أثر الحركة
  var st = A.steps[A.i];
  if (st && !reduce) st.forEach(function (m) {
    var p = Math.min(1, A.t / stepDur(A.i)), x = m.fx + (m.tx - m.fx) * p, y = m.fy + (m.ty - m.fy) * p;
    if (Math.random() < 0.7) burst(ox + (x + 0.5) * cs, oy + (y + 0.5) * cs, 0, 0, 1, Math.random() < 0.5 ? 'rgba(85,201,213,.7)' : 'rgba(128,96,200,.8)', 14);
  });
  while (A.i < A.steps.length && A.t >= stepDur(A.i)) {
    A.t -= stepDur(A.i); finishStep(A); A.i++;
  }
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
  var v = DIRV[gdir], px = ox + (m.tx + 0.5 + v[0] * 0.42) * cs, py = oy + (m.ty + 0.5 + v[1] * 0.42) * cs;
  burst(px, py, -v[0] * 40, -v[1] * 40, 14, 'rgba(214,182,109,.8)', 70);
  burst(px, py, -v[0] * 30, -v[1] * 30, 8, 'rgba(155,123,234,.9)', 60);
  G.shake = Math.max(G.shake, Math.min(9, run * 1.4 + 1.5));
  AudioFX.land(Math.min(1, run / 6));
  var on = G.lv.plates.some(function (p) { return p.x === m.tx && p.y === m.ty; });
  if (on) setTimeout(function () { AudioFX.plate(true); }, 90);
}

function endAnim() {
  G.blocks = G.anim.final; G.anim = null; G.mode = 'planning'; G.plan = {}; G.preview = null;
  if (Sim.solved(G.lv, G.blocks)) {
    G.mode = 'solved'; G.solvedAt = G.t; G.sel = -1;
    setTimeout(function () { AudioFX.gate(); AudioFX.success(); }, 250);
  }
  refreshUI();
}

/* ---------- إجراءات ---------- */
function select(id) {
  if (G.sel !== id) AudioFX.select();
  G.sel = id; refreshUI();
}
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
  G.moves++; G.plan = {}; G.preview = null; G.blocks = applied;
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
function refreshUI() {
  var planned = Object.keys(G.plan).length;
  var st = G.mode === 'running' ? 'running' : planned ? 'targeting' : G.sel >= 0 ? 'selected' : 'dormant';
  $('#shifter').className = st;
  var modeTxt = { planning: 'تخطيط', running: 'تشغيل', solved: 'مراجعة' }[G.mode];
  $('#status').innerHTML = '<span>LAW · <b>GRAVITY ↓</b></span><span class="sep">|</span><span>' + modeTxt + '</span><span class="sep">|</span><span>طاقة <b>' + G.moves + '</b> / ' + (G.room ? G.room.par : '-') + '</span>';
  document.body.classList.toggle('sel', G.sel >= 0 && G.mode === 'planning');
  $('#btnUndo').disabled = G.mode !== 'planning' || !G.hist.length;
  $('#btnRedo').disabled = G.mode !== 'planning' || !G.redo.length;
  var sim = $('#btnSim'); sim.disabled = G.mode !== 'planning'; sim.classList.toggle('armed', G.mode === 'planning' && planned > 0);
  [].forEach.call(document.querySelectorAll('#dpad button'), function (b) {
    var d = b.dataset.d; b.classList.toggle('on', G.sel >= 0 && G.plan[G.sel] === d);
  });
}

function stars() { var p = G.room.par; return G.moves <= p ? 3 : G.moves <= p + 2 ? 2 : 1; }
function showClear() {
  G.clearShown = true;
  var n = stars(), id = G.room.id;
  if ((save.done[id] || 0) < n) { save.done[id] = n; persist(); }
  $('#clearTitle').textContent = G.room.name + ' · تم فتح البوابة';
  $('#clearStars').textContent = '★'.repeat(n) + '☆'.repeat(3 - n);
  $('#clearInfo').textContent = 'الطاقة المستخدمة: ' + G.moves + ' · الحل المثالي: ' + G.room.par;
  $('#clearCodex').textContent = 'THE LAW CODEX · ' + G.room.codex;
  var last = G.ri === ROOMS.length - 1;
  $('#btnNext').textContent = last ? 'انتهت المرحلة الأولى · القائمة' : 'الغرفة التالية';
  show('#clear');
}

function buildMenu() {
  var box = $('#roomList'); box.innerHTML = '';
  ROOMS.forEach(function (r, i) {
    var ok = i === 0 || save.done[ROOMS[i - 1].id], st = save.done[r.id] || 0, b = document.createElement('button');
    b.className = 'roomBtn' + (ok ? '' : ' locked'); b.disabled = !ok;
    b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"><b>' + r.name + '</b><small>' + r.sub + '</small></span><span class="s">' + (ok ? '★'.repeat(st) + '☆'.repeat(3 - st) : '🔒') + '</span>';
    b.onclick = function () { AudioFX.click(); hide('#menu'); loadRoom(i); G.paused = false; };
    box.appendChild(b);
  });
}
function openMenu() { buildMenu(); hide('#pause'); hide('#clear'); show('#menu'); G.paused = true; }

function updateMuteBtns() {
  [].forEach.call(document.querySelectorAll('.js-mute'), function (b) { b.textContent = AudioFX.isMuted() ? '🔇 الصوت: متوقف' : '🔊 الصوت: يعمل'; });
}

/* ---------- المدخلات ---------- */
var drag = null;
function ptr(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function blockAt(px, py) {
  var best = -1, bd = 1e9;
  G.blocks.forEach(function (b) {
    var d = Math.hypot(px - (ox + (b.x + 0.5) * cs), py - (oy + (b.y + 0.5) * cs));
    if (d < bd && d < cs * 0.8) { bd = d; best = b.id; }
  });
  return best;
}
function arrowAt(px, py) {
  var b = G.blocks[G.sel], hit = null;
  DIRS.forEach(function (d) {
    if (!arrowOK(b, d)) return; var p = arrowPos(b, d);
    if (Math.hypot(px - p.x, py - p.y) < Math.max(cs * 0.46, 18)) hit = d;
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
  var cxl = Math.floor((p.x - ox) / cs), cyl = Math.floor((p.y - oy) / cs);
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
  if (panelOpen() && e.key !== 'Escape') return;
  var k = e.key, tag = e.target && e.target.tagName;
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
  else if (k === '1') { $('#radial').classList.remove('open'); toast('GRAVITY هو القانون الفعّال'); }
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
$('#btnPause').onclick = function () { AudioFX.click(); G.paused = true; show('#pause'); };
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
[].forEach.call(document.querySelectorAll('.js-mute'), function (b) {
  b.onclick = function () { AudioFX.init(); AudioFX.setMuted(!AudioFX.isMuted()); save.muted = AudioFX.isMuted(); persist(); updateMuteBtns(); };
});
[].forEach.call(document.querySelectorAll('#dpad button'), function (b) {
  b.onclick = function () { if (G.sel >= 0 && G.mode === 'planning') setDir(G.sel, b.dataset.d); };
});
$('#shifter').onclick = function () {
  AudioFX.init(); var r = $('#radial'); r.classList.toggle('open'); AudioFX.activate();
  if (r.classList.contains('open')) showHint('GRAVITY هو القانون الفعّال الآن. ATTRACTION وREFLECTION تُفتحان في مراحل لاحقة.');
};
[].forEach.call(document.querySelectorAll('#radial .law'), function (b) {
  b.onclick = function (e) {
    e.stopPropagation();
    if (b.classList.contains('lock')) { AudioFX.locked(); toast('هذا القانون يُفتح في مرحلة لاحقة'); return; }
    AudioFX.select(); $('#radial').classList.remove('open');
    if (G.sel < 0) toast('اختر كتلة ثم اتجاه الجاذبية');
  };
});
$('#btnStart').onclick = function () {
  AudioFX.init(); AudioFX.activate(); AudioFX.ambience(45);
  started = true; hide('#intro');
  var first = 0; for (var i = 0; i < ROOMS.length; i++) { if (!save.done[ROOMS[i].id]) { first = i; break; } first = i; }
  loadRoom(first); G.paused = false;
};

var deferred = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; $('#btnInstall').style.display = 'block'; });
$('#btnInstall').onclick = function () { if (deferred) { deferred.prompt(); deferred = null; $('#btnInstall').style.display = 'none'; } };

document.addEventListener('visibilitychange', function () { if (document.hidden) AudioFX.suspend(); else AudioFX.resume(); });
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', function () { setTimeout(layout, 200); });

/* ---------- الحلقة الرئيسية ---------- */
var last = 0;
// الخلفية تتحرك دائمًا، والمحاكاة تتوقف عند الإيقاف المؤقت
function frame2(ts) {
  var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (G.paused) { G.t += dt; motes.forEach(function (m) { m.y -= m.s * dt; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); } }); }
  else update(dt);
  draw(); requestAnimationFrame(frame2);
}

updateMuteBtns();
loadRoom(0);
requestAnimationFrame(frame2);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
}
window.__lawless = { G: G, loadRoom: loadRoom, runSim: runSim, setDir: setDir, select: select, update: update, draw: draw };
})();
