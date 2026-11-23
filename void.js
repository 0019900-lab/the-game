/* LAWLESS: Eat the Laws — نموذج Void (المرحلة 1) */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
var cv = $('#cv'), cx = cv.getContext('2d'), VW = 360, VH = 640, sc = 1, ox = 0, oy = 0, dpr = 1;
var AU = (typeof AudioFX !== 'undefined') ? AudioFX : {}; function snd(n, a, b) { try { AU[n] && AU[n](a, b); } catch (e) {} }
function vib(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
/* ---------- الصور ---------- */
var IM = {}, P = 'assets/void/', need = ['v_idle','v_trans','v_hungry','v_sad','v_power','v_surprise','v_happy','v_white','law_grav','law_mirror','law_time','law_magnet','it_cry_l','it_cry_m','it_cry_s','it_rock','it_metal','it_crate','it_orb','it_bomb','gate_closed','gate_open'], left = need.length;
var BG = new Image(); BG.src = 'assets/bg.jpg';
need.forEach(function (n) { var i = new Image(); i.onload = function () { if (!--left) boot(); }; i.onerror = function () { if (!--left) boot(); }; i.src = P + n + '.webp'; IM[n] = i; });
/* ---------- الغرف ---------- */
var WALL = 16;
function border() { return [{ x: 0, y: 0, w: 135, h: 60 }, { x: 225, y: 0, w: 135, h: 60 }, { x: 0, y: 0, w: WALL, h: VH }, { x: VW - WALL, y: 0, w: WALL, h: VH }, { x: 0, y: VH - WALL, w: VW, h: WALL }]; }
var ROOMS = [
  { name: 'FIRST BITE', tip: 'اسحب Void بإصبعك. الثقب الأسود يسحب البلورات حوله: اجرّها إلى البوابة.',
    walls: [{ x: 120, y: 260, w: 120, h: 22 }, { x: 16, y: 400, w: 70, h: 22 }, { x: 274, y: 400, w: 70, h: 22 }],
    items: [{ t: 'cry', x: 80, y: 480 }, { t: 'cry', x: 280, y: 340 }], start: [180, 540] },
  { name: 'SHOCKWAVE', tip: 'المكعب المعدني ثقيل. اضغط ضغطة سريعة لتتحول إلى الأبيض: موجة تدفع كل شيء بعيدًا.',
    walls: [{ x: 16, y: 330, w: 136, h: 24 }, { x: 208, y: 330, w: 136, h: 24 }],
    items: [{ t: 'metal', x: 180, y: 342 }, { t: 'cry', x: 70, y: 220 }, { t: 'cry', x: 290, y: 220 }], start: [180, 520] },
  { name: 'EAT THE LAW', tip: 'ابتلع الحجر الذهبي، ثم اضغط مطولًا فوق الحفرة لتبصق منطقة جاذبية تصعد بالبلورة.',
    walls: [{ x: 120, y: 400, w: 16, h: 120 }, { x: 204, y: 400, w: 16, h: 120 }, { x: 120, y: 520, w: 100, h: 16 }, { x: 16, y: 250, w: 90, h: 20 }],
    items: [{ t: 'cry', x: 170, y: 490 }, { t: 'cry', x: 300, y: 450 }, { t: 'stone', x: 60, y: 520 }], start: [260, 560] }
];
var DEF = { cry: { r: 12, m: 1, img: 'it_cry_m', w: 38, kind: 'cry' }, metal: { r: 22, m: 6, img: 'it_metal', w: 52, kind: 'metal' }, stone: { r: 14, m: 1, img: 'law_grav', w: 42, kind: 'stone' } };
/* ---------- الحالة ---------- */
var G = { ri: 0, walls: [], items: [], zones: [], parts: [], rings: [], belly: [], got: 0, total: 0, t: 0, shake: 0, open: 0, done: false, flash: 0 };
var V = { x: 180, y: 560, vx: 0, vy: 0, r: 22, pol: 0, pa: 0, flipT: -1, ex: 'idle', exT: 0, blinkT: 2, idleT: 0, sq: 0, face: [0, -1], hold: 0 };
var ptr = null;
function loadRoom(i) {
  var R = ROOMS[G.ri = i % ROOMS.length]; G.walls = border().concat(R.walls.map(function (w) { return Object.assign({}, w); }));
  G.items = R.items.map(function (o) { var d = DEF[o.t]; return { t: o.t, d: d, x: o.x, y: o.y, vx: 0, vy: 0, r: d.r, m: d.m }; });
  G.zones = []; G.parts = []; G.rings = []; G.belly = []; G.got = 0; G.total = G.items.filter(function (o) { return o.d.kind === 'cry'; }).length; G.open = 0; G.done = false; G.shake = 0;
  V.x = R.start[0]; V.y = R.start[1]; V.vx = V.vy = 0; V.pol = 0; V.pa = 0; V.flipT = -1; ptr = null; setEx('idle');
  $('#room').textContent = (G.ri + 1) + ' · ' + R.name; $('#end').classList.remove('show'); hud(); tip(R.tip);
}
function hud() {
  $('#cnt').innerHTML = '◆ <b>' + G.got + '</b>/' + G.total;
  var b = $('#belly'); b.innerHTML = ''; for (var i = 0; i < 2; i++) { var e = document.createElement('i'); if (G.belly[i]) { e.className = 'on'; e.innerHTML = '<img src="' + P + 'law_grav.webp">'; } b.appendChild(e); }
}
var tipT = 0; function tip(s) { var t = $('#tip'); t.textContent = s; t.classList.add('show'); clearTimeout(tipT); tipT = setTimeout(function () { t.classList.remove('show'); }, 6500); }
/* ---------- الجسيمات ---------- */
function burst(x, y, n, col, sp, life) { for (var i = 0; i < n && G.parts.length < 260; i++) { var a = Math.random() * 6.283, s = sp * (0.3 + Math.random() * 0.7); G.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 0, L: (life || 0.7) * (0.6 + Math.random() * 0.6), c: col, z: 1.5 + Math.random() * 2.5 }); } }
function ring(x, y, col, big) { G.rings.push({ x: x, y: y, t: 0, c: col, big: big || 1 }); }
/* ---------- تعابير Void ---------- */
var EX = { idle: { k: 'v_idle', f: 8, fps: 12, loop: 1 }, hungry: { k: 'v_hungry', f: 8, fps: 8, once: 1 }, sad: { k: 'v_sad', f: 8, fps: 9, once: 1 }, power: { k: 'v_power', f: 8, fps: 10, loop: 1 }, surprise: { k: 'v_surprise', f: 8, fps: 12, once: 1 }, happy: { k: 'v_happy', f: 8, fps: 11, once: 1 } };
function setEx(n) { V.ex = n; V.exT = 0; }
/* ---------- الإدخال ---------- */
function toW(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / sc, y: (e.clientY - r.top - oy) / sc }; }
cv.addEventListener('pointerdown', function (e) {
  e.preventDefault(); snd('init'); if (G.done) return; var p = toW(e);
  ptr = { x: p.x, y: p.y, sx: p.x, sy: p.y, ox: V.x - p.x, oy: V.y - p.y, t: G.t, moved: 0, held: 0, id: e.pointerId };
  try { cv.setPointerCapture(e.pointerId); } catch (er) {}
});
cv.addEventListener('pointermove', function (e) { if (!ptr || e.pointerId !== ptr.id) return; var p = toW(e); ptr.x = p.x; ptr.y = p.y; if (Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > 9) ptr.moved = 1; });
function up(e) { if (!ptr || (e && e.pointerId !== ptr.id)) return; var q = ptr; ptr = null; if (!q.moved && !q.spat && G.t - q.t < 0.28 && !G.done) flip(); }
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', function () { ptr = null; });
window.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); flip(); } if (e.key === 'r') loadRoom(G.ri); if (e.key === 'x') spit(); });
$('#rst').onclick = function () { snd('click'); loadRoom(G.ri); }; $('#nxt').onclick = function () { snd('click'); loadRoom(G.ri + 1); };
function flip() {
  V.pol = V.pol ? 0 : 1; V.flipT = 0; snd('click'); snd(V.pol ? 'activate' : 'absorb'); vib(V.pol ? 18 : 12); G.shake = Math.max(G.shake, 4);
  ring(V.x, V.y, V.pol ? '255,240,190' : '170,110,255', V.pol ? 1.6 : 1.2); burst(V.x, V.y, 18, V.pol ? 'rgba(255,236,170,.95)' : 'rgba(160,110,255,.95)', 160, 0.7);
  if (V.pol) G.items.forEach(function (o) { var dx = o.x - V.x, dy = o.y - V.y, d = Math.hypot(dx, dy) || 1; if (d < 190) { var k = (1 - d / 190) * 640 / o.m; o.vx += dx / d * k; o.vy += dy / d * k; } });   // موجة صدمة
  else G.items.forEach(function (o) { var dx = V.x - o.x, dy = V.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < 150 && d > 40) { var k = (1 - d / 150) * 220 / o.m; o.vx += dx / d * k; o.vy += dy / d * k; } });
}
function spit() {
  if (!G.belly.length || G.done) return; var s = G.belly.pop(), f = V.face;
  snd('mirror'); vib(24); G.shake = Math.max(G.shake, 5); V.sq = 1; setEx('surprise');
  G.zones.push({ k: 'grav', x: V.x + f[0] * 10, y: V.y + f[1] * 10, r: 105, t: 0, L: 6 }); ring(V.x, V.y, '255,190,70', 1.8); burst(V.x, V.y, 26, 'rgba(255,200,80,.95)', 220, 0.9); hud();
}
/* ---------- الفيزياء ---------- */
function circRect(o, w, bounce) {
  var cxp = Math.max(w.x, Math.min(o.x, w.x + w.w)), cyp = Math.max(w.y, Math.min(o.y, w.y + w.h)), dx = o.x - cxp, dy = o.y - cyp, d2 = dx * dx + dy * dy;
  if (d2 >= o.r * o.r) return 0; var d = Math.sqrt(d2), nx, ny;
  if (d < 0.001) { nx = 0; ny = -1; d = 0; var l = o.x - w.x, r = w.x + w.w - o.x, t = o.y - w.y, b = w.y + w.h - o.y, m = Math.min(l, r, t, b); if (m === l) { nx = -1; ny = 0; } else if (m === r) { nx = 1; ny = 0; } else if (m === t) { nx = 0; ny = -1; } else { nx = 0; ny = 1; } } else { nx = dx / d; ny = dy / d; }
  o.x += nx * (o.r - d); o.y += ny * (o.r - d); var vn = o.vx * nx + o.vy * ny; if (vn < 0) { o.vx -= (1 + bounce) * vn * nx; o.vy -= (1 + bounce) * vn * ny; return -vn; } return 0;
}
function step(dt) {
  G.t += dt;
  // حركة Void
  var tx = V.x, ty = V.y;
  if (ptr) { tx = ptr.x + ptr.ox; ty = ptr.y + ptr.oy; ptr.held = ptr.moved ? 0 : ptr.held + dt; if (ptr.held > 0.42 && G.belly.length && !G.done) { ptr.spat = 1; spit(); ptr.held = -0.4; } }
  var ax = (tx - V.x) * 38 - V.vx * 9, ay = (ty - V.y) * 38 - V.vy * 9; V.vx += ax * dt; V.vy += ay * dt;
  var sp = Math.hypot(V.vx, V.vy); if (sp > 520) { V.vx *= 520 / sp; V.vy *= 520 / sp; }
  if (!ptr) { V.vx *= Math.pow(0.02, dt); V.vy *= Math.pow(0.02, dt); }
  if (sp > 40) { V.face = [V.vx / sp, V.vy / sp]; }
  V.x += V.vx * dt; V.y += V.vy * dt;
  var vo = { x: V.x, y: V.y, vx: V.vx, vy: V.vy, r: V.r }; G.walls.forEach(function (w) { circRect(vo, w, 0.1); }); V.x = vo.x; V.y = vo.y; V.vx = vo.vx; V.vy = vo.vy;
  V.pa += ((V.pol ? 1 : 0) - V.pa) * Math.min(1, dt * 12); V.sq *= Math.pow(0.001, dt);
  if (V.flipT >= 0) { V.flipT += dt; if (V.flipT > 0.5) V.flipT = -1; }
  // العناصر
  var R = V.pol ? 175 : 165;
  for (var i = G.items.length - 1; i >= 0; i--) {
    var o = G.items[i], dx = V.x - o.x, dy = V.y - o.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    if (!V.pol && d < R) {
      if (o.d.kind === 'stone') { var f = 900 * (1 - d / R); o.vx += ux * f * dt; o.vy += uy * f * dt; if (d < V.r + 8 && G.belly.length < 2) { G.belly.push('grav'); G.items.splice(i, 1); snd('absorb'); snd('hint'); vib(30); ring(V.x, V.y, '255,190,70', 1.4); burst(o.x, o.y, 22, 'rgba(255,205,90,.95)', 190, 0.8); V.sq = -1; setEx('power'); hud(); tip('ابتلعت قانونًا! اضغط مطولًا (دون تحريك) لتبصقه.'); continue; } }
      else { var rr = 50, f2 = (d - rr) * 60 * (1 - d / R * 0.6); o.vx += ux * f2 / Math.sqrt(o.m) * dt; o.vy += uy * f2 / Math.sqrt(o.m) * dt; o.vx -= (o.vx - V.vx) * 3.2 * dt * (d < rr * 2 ? 1 : 0.3); o.vy -= (o.vy - V.vy) * 3.2 * dt * (d < rr * 2 ? 1 : 0.3); }
    } else if (V.pol && d < R) { var f3 = 420 * Math.pow(1 - d / R, 1.5) / o.m; o.vx -= ux * f3 * dt; o.vy -= uy * f3 * dt; }
    G.zones.forEach(function (z) { if (z.k === 'grav' && Math.hypot(o.x - z.x, o.y - z.y) < z.r) o.vy -= 1500 * dt / Math.sqrt(o.m) * Math.min(1, z.t * 4); });
    o.vx *= Math.pow(V.pol ? 0.35 : 0.28, dt); o.vy *= Math.pow(V.pol ? 0.35 : 0.28, dt);
    o.x += o.vx * dt; o.y += o.vy * dt; var hit = 0; G.walls.forEach(function (w) { hit = Math.max(hit, circRect(o, w, 0.35)); }); if (hit > 140) { snd('impact', 'wall', Math.min(1, hit / 500)); burst(o.x, o.y, 6, 'rgba(240,201,112,.8)', 90, 0.4); }
    // تصادم مع Void
    if (o.d.kind === 'metal') { var vx = o.x - V.x, vy = o.y - V.y, vd = Math.hypot(vx, vy), mn = o.r + V.r; if (vd < mn && vd > 0.01) { o.x += vx / vd * (mn - vd) * 0.5; o.y += vy / vd * (mn - vd) * 0.5; V.x -= vx / vd * (mn - vd) * 0.5; V.y -= vy / vd * (mn - vd) * 0.5; } }
    // تسليم البلورات
    if (o.d.kind === 'cry' && o.x > 135 && o.x < 225 && o.y < 70) { G.items.splice(i, 1); G.got++; snd('tick', G.got * 2); snd('plate', true); vib([20, 30, 40]); burst(o.x, 40, 28, 'rgba(255,225,140,.95)', 230, 0.9); ring(o.x, 50, '255,220,120', 1.6); setEx('happy'); G.flash = 0.5; hud(); }
  }
  for (var a = 0; a < G.items.length; a++) for (var b = a + 1; b < G.items.length; b++) { var p = G.items[a], q = G.items[b], ddx = q.x - p.x, ddy = q.y - p.y, dd = Math.hypot(ddx, ddy), mn2 = p.r + q.r; if (dd < mn2 && dd > 0.01) { var nx = ddx / dd, ny = ddy / dd, pen = mn2 - dd, tm = p.m + q.m; p.x -= nx * pen * q.m / tm; p.y -= ny * pen * q.m / tm; q.x += nx * pen * p.m / tm; q.y += ny * pen * p.m / tm; } }
  G.zones.forEach(function (z) { z.t += dt; if (Math.random() < dt * 40) G.parts.push({ x: z.x + (Math.random() - 0.5) * z.r * 1.6, y: z.y + z.r * 0.5, vx: 0, vy: -90 - Math.random() * 90, l: 0, L: 0.9, c: 'rgba(255,200,90,.9)', z: 2 }); }); G.zones = G.zones.filter(function (z) { return z.t < z.L; });
  G.parts.forEach(function (p) { p.l += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.1, dt); p.vy *= Math.pow(0.1, dt); }); G.parts = G.parts.filter(function (p) { return p.l < p.L; });
  G.rings.forEach(function (r) { r.t += dt; }); G.rings = G.rings.filter(function (r) { return r.t < 0.7; });
  G.shake *= Math.pow(0.0006, dt); G.flash = Math.max(0, G.flash - dt);
  if (G.got >= G.total && G.total && !G.done) { G.done = true; G.doneT = 0; snd('success'); vib([40, 60, 90]); G.shake = 9; }
  if (G.done) { G.doneT += dt; G.open = Math.min(1, G.doneT * 2.2); if (G.doneT > 0.15 && !G.burst) { G.burst = 1; for (var k = 0; k < 6; k++) setTimeout(function () { burst(180, 70, 30, 'rgba(255,230,150,.95)', 300, 1); ring(180, 70, '255,225,130', 2); }, k * 90); } if (G.doneT > 1.4 && !$('#end').classList.contains('show')) { $('#endp').textContent = 'الغرفة ' + (G.ri + 1) + ' من ' + ROOMS.length; $('#nxt').textContent = G.ri + 1 < ROOMS.length ? 'الغرفة التالية' : 'من البداية'; $('#end').classList.add('show'); setEx('happy'); } }
  else G.burst = 0;
  // تعبير
  V.exT += dt; var E = EX[V.ex]; if (V.ex !== 'idle' && !E.loop && V.exT > E.f / E.fps) setEx('idle');
  if (V.ex === 'power' && !G.belly.length) setEx('idle');
  if (V.ex === 'idle') { V.idleT += dt; V.blinkT -= dt; if (V.blinkT < 0) { V.blinkT = 2.5 + Math.random() * 3; V.blinkP = 0; } if (V.blinkP !== undefined) { V.blinkP += dt; if (V.blinkP > 8 / 14) V.blinkP = undefined; } if (!ptr && V.idleT > 9 && !V.pol) { V.idleT = 0; setEx('hungry'); } if (ptr) V.idleT = 0; }
}
/* ---------- الرسم ---------- */
var GLOW = {};
function glow(c, s) { var k = c + s; if (GLOW[k]) return GLOW[k]; var g = document.createElement('canvas'); g.width = g.height = 128; var x = g.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(' + c + ',1)'); gr.addColorStop(0.35, 'rgba(' + c + ',.45)'); gr.addColorStop(1, 'rgba(' + c + ',0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return GLOW[k] = g; }
function dglow(c, x, y, r, a) { cx.globalAlpha = a; cx.drawImage(glow(c, 0), x - r, y - r, r * 2, r * 2); cx.globalAlpha = 1; }
function drawWall(w) {
  var g = cx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h); g.addColorStop(0, '#3b2b78'); g.addColorStop(1, '#1d1348');
  cx.fillStyle = g; cx.fillRect(w.x, w.y, w.w, w.h); cx.strokeStyle = 'rgba(240,201,112,.85)'; cx.lineWidth = 1.5; cx.strokeRect(w.x + 0.75, w.y + 0.75, w.w - 1.5, w.h - 1.5);
  cx.fillStyle = 'rgba(180,150,255,.18)'; cx.fillRect(w.x + 2, w.y + 2, w.w - 4, Math.min(5, w.h - 4));
  cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = 1; for (var x = w.x + 28; x < w.x + w.w - 6; x += 28) { cx.beginPath(); cx.moveTo(x, w.y + 3); cx.lineTo(x, w.y + w.h - 3); cx.stroke(); }
}
function frame(k, fi, x, y, s, a) { var im = IM[k]; if (!im.width) return; var S = im.height; cx.globalAlpha = a; cx.drawImage(im, fi * S, 0, S, S, x - s / 2, y - s / 2, s, s); cx.globalAlpha = 1; }
function drawVoid() {
  var t = G.t, bob = Math.sin(t * 2.2) * 2.5, x = V.x, y = V.y + bob, s = 112 * (1 + Math.sin(t * 3) * 0.015), E = EX[V.ex];
  var sq = V.sq; var sx = 1 + sq * 0.12, sy = 1 - sq * 0.1; if (V.flipT >= 0) { var q = V.flipT / 0.5; var pu = Math.sin(q * Math.PI); sx *= 1 + pu * 0.18; sy *= 1 + pu * 0.18; }
  cx.save(); cx.translate(x, y); cx.rotate(Math.max(-0.2, Math.min(0.2, V.vx * 0.0006))); cx.scale(sx, sy);
  dglow(V.pa > 0.5 ? '255,236,170' : '140,90,255', 0, 0, 92, 0.35 + V.pa * 0.3);
  // اختيار الإطار
  if (V.pa > 0.02 || V.flipT >= 0 && V.pa < 0.98) { var p = Math.max(0, Math.min(1, V.pa)); p = p * p * (3 - 2 * p); var fp = p * 7, i0 = Math.floor(fp), fr = fp - i0; frame('v_trans', i0, 0, 0, s, 1); if (fr > 0.01 && i0 < 7) frame('v_trans', i0 + 1, 0, 0, s, fr); if (p > 0.97) { var w2 = 4 + Math.floor((t * 5) % 4); frame('v_trans', w2 > 7 ? 7 : w2, 0, 0, s, 0.55); } }
  else if (V.ex === 'idle') { var fi = V.blinkP !== undefined ? Math.min(7, Math.floor(V.blinkP * 14)) : 0; frame('v_idle', fi, 0, 0, s, 1); }
  else { var f2 = E.loop ? Math.floor(V.exT * E.fps) % E.f : Math.min(E.f - 1, Math.floor(V.exT * E.fps)); frame(E.k, f2, 0, 0, s, 1); }
  cx.restore();
}
function render() {
  var W = cv.width, H = cv.height; cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#06021a'; cx.fillRect(0, 0, W, H);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); var shx = (Math.random() - 0.5) * G.shake, shy = (Math.random() - 0.5) * G.shake;
  cx.save(); cx.translate(ox + shx * sc, oy + shy * sc); cx.scale(sc, sc);
  cx.save(); cx.beginPath(); cx.rect(0, 0, VW, VH); cx.clip();
  if (BG.width) { var br = Math.max(VW / BG.width, VH / BG.height); cx.globalAlpha = 0.9; cx.drawImage(BG, (VW - BG.width * br) / 2, (VH - BG.height * br) / 2, BG.width * br, BG.height * br); cx.globalAlpha = 1; }
  cx.fillStyle = 'rgba(6,2,30,.55)'; cx.fillRect(0, 0, VW, VH);
  var vg = cx.createRadialGradient(VW / 2, VH / 2, 120, VW / 2, VH / 2, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.6)'); cx.fillStyle = vg; cx.fillRect(0, 0, VW, VH);
  // أرضية: شبكة خافتة
  cx.strokeStyle = 'rgba(160,130,255,.06)'; cx.lineWidth = 1; for (var gx = 0; gx <= VW; gx += 40) { cx.beginPath(); cx.moveTo(gx, 0); cx.lineTo(gx, VH); cx.stroke(); } for (var gy = 0; gy <= VH; gy += 40) { cx.beginPath(); cx.moveTo(0, gy); cx.lineTo(VW, gy); cx.stroke(); }
  G.zones.forEach(function (z) { var a = Math.min(1, z.t * 4) * Math.min(1, (z.L - z.t) * 2); cx.save(); cx.globalCompositeOperation = 'lighter'; dglow('255,190,70', z.x, z.y, z.r * 1.15, 0.5 * a); cx.strokeStyle = 'rgba(255,215,110,' + 0.7 * a + ')'; cx.lineWidth = 2; cx.setLineDash([10, 8]); cx.lineDashOffset = -z.t * 40; cx.beginPath(); cx.arc(z.x, z.y, z.r, 0, 7); cx.stroke(); cx.setLineDash([]); cx.fillStyle = 'rgba(255,225,140,' + 0.8 * a + ')'; cx.font = 'bold 26px system-ui'; cx.textAlign = 'center'; cx.fillText('▲', z.x, z.y + 9 - ((z.t * 40) % 24)); cx.restore(); });
  // مجال Void
  var rr = V.pol ? 175 : 165; cx.save(); cx.globalCompositeOperation = 'lighter'; cx.strokeStyle = V.pol ? 'rgba(255,236,170,.2)' : 'rgba(150,100,255,.25)'; cx.lineWidth = 1.5; cx.setLineDash([4, 10]); cx.lineDashOffset = (V.pol ? 1 : -1) * G.t * 30; cx.beginPath(); cx.arc(V.x, V.y, rr, 0, 7); cx.stroke(); cx.restore();
  // البوابة
  var gimg = IM[G.open > 0.3 ? 'gate_open' : 'gate_closed']; if (gimg.width) { var gw = 190, gh = gw * gimg.height / gimg.width; if (G.open > 0) { cx.save(); cx.globalCompositeOperation = 'lighter'; dglow('255,220,120', 180, 76, 150 * (0.8 + G.open * 0.5), 0.6 * G.open + G.flash); cx.restore(); } cx.drawImage(gimg, 180 - gw / 2, 56 - gh * 0.42, gw, gh); } else { cx.fillStyle = '#f0c970'; cx.fillRect(135, 20, 90, 40); }
  G.walls.forEach(drawWall);
  G.items.forEach(function (o) { var im = IM[o.d.img]; if (!im.width) return; var w = o.d.w, h = w * im.height / im.width, bob = o.d.kind === 'stone' ? Math.sin(G.t * 3 + o.x) * 3 : 0; cx.save(); cx.translate(o.x, o.y + bob); if (o.d.kind !== 'metal') cx.rotate(o.vx * 0.0012); cx.shadowColor = o.d.kind === 'stone' ? 'rgba(255,190,70,.9)' : o.d.kind === 'cry' ? 'rgba(170,110,255,.9)' : 'rgba(0,0,0,.6)'; cx.shadowBlur = 14; cx.drawImage(im, -w / 2, -h / 2, w, h); cx.restore(); });
  drawVoid();
  cx.save(); cx.globalCompositeOperation = 'lighter';
  G.parts.forEach(function (p) { var a = 1 - p.l / p.L; cx.globalAlpha = a; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.z * (0.5 + a * 0.5), 0, 7); cx.fill(); }); cx.globalAlpha = 1;
  G.rings.forEach(function (r) { var q = r.t / 0.7; cx.strokeStyle = 'rgba(' + r.c + ',' + (1 - q) * 0.9 + ')'; cx.lineWidth = 3 * (1 - q) + 1; cx.beginPath(); cx.arc(r.x, r.y, 20 + q * 120 * r.big, 0, 7); cx.stroke(); });
  cx.restore(); cx.restore(); cx.restore();
}
/* ---------- تشغيل ---------- */
function layout() { dpr = Math.min(window.devicePixelRatio || 1, 2); var w = innerWidth, h = innerHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); sc = Math.min(w / VW, h / VH); ox = (w - VW * sc) / 2; oy = (h - VH * sc) / 2; }
window.addEventListener('resize', layout);
var last = 0;
function loop(ts) { var dt = Math.min(0.033, (ts - last) / 1000 || 0.016); last = ts; var n = 2; for (var i = 0; i < n; i++) step(dt / n); render(); requestAnimationFrame(loop); }
function boot() { layout(); loadRoom(+(new URLSearchParams(location.search).get('r') || 0)); requestAnimationFrame(loop); }
window.__void = { G: G, V: V, loadRoom: loadRoom, flip: flip, spit: spit, step: step, setPtr: function (p) { ptr = p; } };
})();
