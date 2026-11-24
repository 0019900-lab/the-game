/* LAWLESS: Eat the Laws — لعبة Void على الشبكة */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
var cv = $('#cv'), cx = cv.getContext('2d'), dpr = 1, VW = 0, VH = 0;
var AU = (typeof AudioFX !== 'undefined') ? AudioFX : {}; function snd(n, a, b) { try { AU[n] && AU[n](a, b); } catch (e) {} }
function vib(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
var SAVE = { done: {} }; try { SAVE = JSON.parse(localStorage.getItem('void_save') || '{"done":{}}'); } catch (e) {} function persist() { try { localStorage.setItem('void_save', JSON.stringify(SAVE)); } catch (e) {} }
/* ---------- الصور ---------- */
var P = 'assets/void/', IM = {}, names = ['v_idle','v_trans','v_hungry','v_sad','v_power','v_surprise','v_happy','law_grav','it_cry_m','it_cry_s','it_rock','it_metal','gate_closed','gate_open'], left = names.length + 1;
var BG = new Image(); BG.onload = BG.onerror = done; BG.src = 'assets/bg.jpg';
names.forEach(function (n) { var i = new Image(); i.onload = i.onerror = done; i.src = P + n + '.webp'; IM[n] = i; });
function done() { if (!--left) boot(); }
/* ---------- حالة ---------- */
var W = 7, H = 10, cell = 50, bx = 0, by = 0, lv, S, hist = [], ri = 0, moves = 0, mode = 'eat';
var A = null;   // الأنيميشن الحالي
var vis = {};   // id -> {t,x,y,sc,al,rot}
var VO = { x: 0, y: 0, ox: 0, oy: 0, pa: 0, pt: 0, ex: 'idle', exT: 0, blinkT: 2, idleT: 0, sq: 0, sqx: 0, sqy: 0 };
var parts = [], rings = [], trail = [], shake = 0, zoomP = 0, solvedT = -1, gateOpen = 0, flash = 0, hintA = null, lockUntil = 0, queued = null;
var EXS = { idle: ['v_idle', 8, 12, 1], hungry: ['v_hungry', 8, 8, 0], sad: ['v_sad', 8, 9, 0], power: ['v_power', 8, 10, 1], surprise: ['v_surprise', 8, 12, 0], happy: ['v_happy', 8, 11, 0] };
function setEx(n) { VO.ex = n; VO.exT = 0; }
var TIPS = ['اسحب في أي اتجاه: Void ينزلق حتى يصطدم. في وضع «ادفع» يدفع ما أمامه. أوصل البلورة إلى الدائرة المضيئة.', 'الجدران توقف الأشياء. اختر من أين تدفع لتتوقف البلورة فوق الدائرة.', 'بلورتان وبوابة واحدة. فكّر بالترتيب.', 'وضع «ابتلع»: يبتلع Void ما أمامه. ثم «ابصق» يطلقه في الاتجاه الذي تسحبه إليه.', 'ابتلع ثم أعد المكان: البصق يضع الشيء في مكان لا تصل إليه بالدفع.', 'الحجر الذهبي إذا بُصق يسحب كل ما في صفّه وعموده نحوه. اجعله مغناطيسًا عن بُعد.', 'احسب أين سيهبط الحجر قبل أن تبصقه.', 'المكعب المعدني ثقيل ولا يُبتلع. استخدمه كحاجز.', 'الأشواك تحطّم البلورة إن مرّت عليها.', 'المنشار يتحرك خطوة مع كل حركة منك. اجعل الوقت لصالحك.', 'اجمع كل شيء: قوانين وأخطار.', 'الاختبار الأخير.'];
/* ---------- تحميل غرفة ---------- */
function loadRoom(i) {
  ri = (i + VROOMS.length) % VROOMS.length; var R = VROOMS[ri]; lv = VSim.load(R); W = lv.W; H = lv.H; S = VSim.start(lv); hist = []; moves = 0; A = null; mode = 'eat'; solvedT = -1; gateOpen = 0; parts = []; rings = []; trail = []; hintA = null; queued = null;
  vis = {}; S.o.forEach(function (o) { vis[o[3]] = { t: o[0], x: o[1], y: o[2], sc: 1, al: 1, rot: 0 }; });
  VO.x = S.x; VO.y = S.y; VO.ox = VO.oy = 0; VO.pa = 0; VO.pt = 0; setEx('idle'); sawPrev = lv.saws.map(function (s) { return VSim.sawPos(lv, s, 0); });
  floorCache = null; $('#end').classList.remove('show'); $('#sel').classList.remove('show'); hud(); setModeUI(); tip(R.tip || TIPS[Math.min(ri, TIPS.length - 1)]);
}
var sawPrev = [];
function tip(t) { var e = $('#tip'); e.textContent = t; e.classList.add('show'); clearTimeout(tip.t); tip.t = setTimeout(function () { e.classList.remove('show'); }, 5500); }
function starsFor(m, par) { return m <= par ? 3 : m <= par + 2 ? 2 : 1; }
function hud() {
  var R = VROOMS[ri]; $('#room').textContent = (ri + 1) + ' · ' + (R.name || 'ROOM'); var st = moves <= R.par ? 3 : moves <= R.par + 2 ? 2 : 1; $('#mv').innerHTML = '<b>' + moves + '</b>/' + R.par + ' <span id="stars">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < st ? 'on' : '') + '">★</i>'; }).join('') + '</span>';
  $('#spit').classList.toggle('dis', !S.bl);
}
function setModeUI() { ['eat', 'push', 'spit'].forEach(function (m) { $('#' + m).classList.toggle('on', mode === m); }); $('#spit').classList.toggle('dis', !S.bl); }
function setMode(m, silent) {
  if (m === 'spit' && !S.bl) return; if (m === mode) return; var was = mode; mode = m; setModeUI(); if (!silent) { snd('click'); rings.push({ x: VO.x, y: VO.y, t: 0, c: m === 'push' ? '255,240,190' : m === 'spit' ? '255,190,70' : '170,110,255', big: 0.8 }); vib(10); }
  VO.pt = m === 'push' ? 1 : 0; if (m === 'spit') setEx('power'); else if (was === 'spit') setEx('idle');
}
['eat', 'push', 'spit'].forEach(function (m) { $('#' + m).onclick = function () { AU.init && AU.init(); setMode(m); }; });
/* ---------- تنفيذ حركة ---------- */
function ease(t) { return 1 - Math.pow(1 - t, 3); }
function act(kind, d) {
  if (A || solvedT >= 0) { queued = [kind, d]; return; }
  var n = VSim.act(lv, S, kind, d); if (!n) { shake = Math.max(shake, 3); snd('error'); VO.ox = { left: -1, right: 1 }[d] || 0; VO.oy = { up: -1, down: 1 }[d] || 0; VO.bump = 0.12; vib(12); hintA = null; return; }
  hist.push(S); var prev = S; S = n; moves++; hintA = null; hud();
  var ev = n.ev, dx = VSim.D[d][0], dy = VSim.D[d][1], tw = [], T = 0, g = null;
  ev.forEach(function (e) { if (e.k === 'glide') g = e; });
  var gd = 0; if (g) { var dist = Math.abs(g.tx - g.fx) + Math.abs(g.ty - g.fy); gd = dist ? 0.07 + dist * 0.035 : 0; }
  var vt = { fx: prev.x, fy: prev.y, tx: n.x, ty: n.y, t0: 0, dur: gd }; if (gd) { snd('dir', d); }
  var tail = gd, spitDur = 0;
  var pos = {}; prev.o.forEach(function (o) { pos[o[3]] = o; }); var nowPos = {}; n.o.forEach(function (o) { nowPos[o[3]] = o; });
  ev.forEach(function (e) {
    if (e.k === 'eat') { tw.push({ id: e.id, k: 'eat', fx: e.x, fy: e.y, tx: n.x, ty: n.y, t0: gd, dur: 0.24 }); tail = Math.max(tail, gd + 0.24); }
    if (e.k === 'spit') { var f = nowPos[e.id]; var tx = f ? f[1] : e.x, ty = f ? f[2] : e.y, dd = Math.abs(tx - n.x) + Math.abs(ty - n.y); spitDur = 0.08 + dd * 0.04; tw.push({ id: e.id, k: 'fly', fx: n.x, fy: n.y, tx: tx, ty: ty, t0: 0.06, dur: spitDur }); tail = Math.max(tail, 0.06 + spitDur); VO.sq = -1; VO.recoil = { x: -dx, y: -dy, t: 0 }; }
    if (e.k === 'pulse') { tw.push({ k: 'pulse', x: e.x, y: e.y, t0: 0.06 + spitDur }); }
  });
  // مواقع الكائنات المتحركة
  n.o.forEach(function (o) { var p = pos[o[3]]; if (!p) return; if (p[1] !== o[1] || p[2] !== o[2]) { var isPull = ev.some(function (e) { return e.k === 'pull' && e.id === o[3]; }), dd = Math.abs(o[1] - p[1]) + Math.abs(o[2] - p[2]), t0 = isPull ? 0.06 + spitDur + 0.18 : gd, dur = 0.07 + dd * 0.045; tw.push({ id: o[3], k: isPull ? 'pull' : 'slide', fx: p[1], fy: p[2], tx: o[1], ty: o[2], t0: t0, dur: dur }); tail = Math.max(tail, t0 + dur); } });
  ev.forEach(function (e) { if (e.k === 'die') { var p = pos[e.id] || { 1: e.x, 2: e.y }; var wasMoving = nowPos[e.id]; tw.push({ id: e.id, k: 'die', fx: p[1], fy: p[2], tx: e.x, ty: e.y, t0: gd, dur: 0.06 + (Math.abs(e.x - p[1]) + Math.abs(e.y - p[2])) * 0.045, why: e.why }); tail = Math.max(tail, gd + 0.06 + (Math.abs(e.x - p[1]) + Math.abs(e.y - p[2])) * 0.045 + 0.1); } });
  // lunge عند الدفع
  var shoved = ev.some(function (e) { return e.k === 'shove'; }); if (shoved) { VO.lunge = { x: dx, y: dy, t0: gd }; }
  var bumped = ev.find(function (e) { return e.k === 'bump'; });
  var sawN = lv.saws.map(function (s) { return VSim.sawPos(lv, s, n.n); });
  A = { t: 0, vt: vt, tw: tw, T: tail + 0.05, ev: ev, d: d, sawFrom: sawPrev.slice(), sawTo: sawN, done: {}, kind: kind, dx: dx, dy: dy, gd: gd };
  sawPrev = sawN; if (kind === 'eat') setEx('surprise'); if (n.dead) { setEx('sad'); }
}
function finishAnim() {
  var a = A; A = null; S.o.forEach(function (o) { var v = vis[o[3]]; if (v) { v.x = o[1]; v.y = o[2]; v.sc = 1; v.al = 1; } });
  VO.x = S.x; VO.y = S.y;
  if (S.dead) { setTimeout(function () { if (S.dead) failUI(); }, 350); return; }
  if (S.bl && mode === 'eat') setModeUI(); if (!S.bl && mode === 'spit') setMode('eat', true); hud(); setModeUI();
  if (VSim.solved(lv, S)) startWin();
  else if (queued) { var q = queued; queued = null; act(q[0], q[1]); }
}
/* ---------- فشل / فوز ---------- */
function failUI() { tip('فقدت بلورة! اضغط ↶ للتراجع.'); }
function startWin() {
  solvedT = 0; snd('success'); vib([40, 60, 90]); setEx('happy'); var R = VROOMS[ri], st = starsFor(moves, R.par);
  var prevBest = SAVE.done[ri]; if (!prevBest || moves < prevBest.m) { SAVE.done[ri] = { m: moves, s: st }; persist(); }
  $('#es').innerHTML = [0, 1, 2].map(function (i) { return '<i class="' + (i < st ? 'on' : '') + '">★</i>'; }).join(''); $('#endp').textContent = moves + ' حركة · الأفضل ' + R.par;
  $('#nxt').textContent = ri + 1 < VROOMS.length ? 'الغرفة التالية' : 'من البداية';
}
/* ---------- الإدخال ---------- */
var pt = null;
cv.addEventListener('pointerdown', function (e) { e.preventDefault(); AU.init && AU.init(); pt = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
cv.addEventListener('pointerup', function (e) {
  if (!pt) return; var dx = e.clientX - pt.x, dy = e.clientY - pt.y, q = pt; pt = null; if (solvedT >= 0) return;
  if (Math.hypot(dx, dy) > 22) { act(mode, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }
  else { var vx = bx + (VO.x + .5) * cell, vy = by + (VO.y + .5) * cell; if (Math.hypot(e.clientX - vx, e.clientY - vy) < cell * 0.9) { var order = S.bl ? ['eat', 'push', 'spit'] : ['eat', 'push']; setMode(order[(order.indexOf(mode) + 1) % order.length]); } }
});
cv.addEventListener('pointercancel', function () { pt = null; });
window.addEventListener('keydown', function (e) { var m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key]; if (m) { e.preventDefault(); act(mode, m); } if (e.key === '1') setMode('eat'); if (e.key === '2') setMode('push'); if (e.key === '3') setMode('spit'); if (e.key === 'z') undo(); if (e.key === 'r') loadRoom(ri); });
function undo() { if (A || !hist.length) return; S = hist.pop(); moves = Math.max(0, moves - 1); snd('undo'); vis = {}; S.o.forEach(function (o) { vis[o[3]] = { t: o[0], x: o[1], y: o[2], sc: 1, al: 1, rot: 0 }; }); VO.x = S.x; VO.y = S.y; setEx('idle'); solvedT = -1; gateOpen = 0; $('#end').classList.remove('show'); sawPrev = lv.saws.map(function (s) { return VSim.sawPos(lv, s, S.n); }); hintA = null; hud(); setModeUI(); if (mode === 'spit' && !S.bl) setMode('eat', true); }
$('#undo').onclick = undo; $('#rst').onclick = function () { snd('click'); loadRoom(ri); };
$('#hint').onclick = function () { if (A) return; var r = VSim.solve(lv, 14, {}, 90000, S); if (r && r.path.length) { hintA = { k: r.path[0][0], d: r.path[0][1], t: 0 }; var nm = { eat: 'ابتلع', push: 'ادفع', spit: 'ابصق' }[r.path[0][0]], dn = { up: 'لأعلى', down: 'لأسفل', left: 'لليسار', right: 'لليمين' }[r.path[0][1]]; setMode(r.path[0][0]); tip('جرّب: ' + nm + ' ' + dn + ' (يتبقى ' + r.path.length + ' حركات في أفضل حل)'); snd('hint'); } else tip('لا يوجد حل من هذه الحالة. تراجع ↶'); };
$('#nxt').onclick = function () { snd('click'); loadRoom(ri + 1); }; $('#again').onclick = function () { snd('click'); loadRoom(ri); };
function openSel() { var g = $('#grid'); g.innerHTML = ''; VROOMS.forEach(function (r, i) { var b = document.createElement('button'), d = SAVE.done[i]; b.className = i === ri ? 'cur' : ''; b.innerHTML = (i + 1) + '<small>' + (d ? '★'.repeat(d.s) : '·') + '</small>'; b.onclick = function () { loadRoom(i); }; g.appendChild(b); }); $('#sel').classList.add('show'); }
$('#sel0').onclick = openSel; $('#selx').onclick = function () { $('#sel').classList.remove('show'); };
/* ---------- جسيمات ---------- */
function cpos(x, y) { return [bx + (x + .5) * cell, by + (y + .5) * cell]; }
function burst(x, y, n, col, sp, life, sz) { var p = cpos(x, y); for (var i = 0; i < n && parts.length < 320; i++) { var a = Math.random() * 6.283, s = sp * (0.3 + Math.random() * 0.8); parts.push({ x: p[0], y: p[1], vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 0, L: (life || 0.6) * (0.6 + Math.random() * 0.7), c: col, z: (sz || 2) * (0.6 + Math.random()) }); } }
function dust(x, y, dx, dy) { var p = cpos(x, y); for (var i = 0; i < 8; i++) { parts.push({ x: p[0] - dx * cell * .3, y: p[1] - dy * cell * .3, vx: (Math.random() - .5) * 60 - dx * 40, vy: (Math.random() - .5) * 60 - dy * 40, l: 0, L: 0.45, c: 'rgba(200,180,255,.7)', z: 2 + Math.random() * 2 }); } }
/* ---------- تحديث ---------- */
function update(dt) {
  VO.exT += dt; VO.pa += ((VO.pt) - VO.pa) * Math.min(1, dt * 9); VO.sq *= Math.pow(0.0008, dt);
  if (VO.bump !== undefined) { VO.bump -= dt; if (VO.bump <= 0) { VO.bump = undefined; VO.ox = VO.oy = 0; } }
  if (A) {
    A.t += dt; var t = A.t, vt = A.vt;
    if (vt.dur > 0) { var u = Math.min(1, t / vt.dur), e = ease(u); VO.x = vt.fx + (vt.tx - vt.fx) * e; VO.y = vt.fy + (vt.ty - vt.fy) * e; if (u < 1 && Math.random() < 0.9) trail.push({ x: VO.x, y: VO.y, l: 0, L: 0.22 }); var st = Math.min(0.28, 0.1 * Math.abs(vt.tx - vt.fx + vt.ty - vt.fy)); VO.sqx = Math.abs(A.dx) ? st : -st * 0.6; VO.sqy = Math.abs(A.dy) ? st : -st * 0.6; if (u >= 1 && !A.arrived) { A.arrived = 1; VO.sqx = VO.sqy = 0; VO.sq = 0.6; } } else { VO.x = vt.tx; VO.y = vt.ty; VO.sqx = VO.sqy = 0; }
    if (A.lunge === undefined && VO.lunge) { }
    if (VO.lunge) { var lu = (t - VO.lunge.t0) / 0.18; if (lu >= 0 && lu < 1) { var k = Math.sin(lu * Math.PI) * 0.22; VO.ox = VO.lunge.x * k; VO.oy = VO.lunge.y * k; } else if (lu >= 1) { VO.ox = VO.oy = 0; VO.lunge = null; } }
    if (VO.recoil) { VO.recoil.t += dt; var rk = Math.sin(Math.min(1, VO.recoil.t / 0.2) * Math.PI) * 0.18; VO.ox = VO.recoil.x * rk; VO.oy = VO.recoil.y * rk; if (VO.recoil.t > 0.2) { VO.recoil = null; VO.ox = VO.oy = 0; } }
    A.tw.forEach(function (w, wi) {
      if (t < w.t0) return; var u = Math.min(1, (t - w.t0) / (w.dur || 0.01)), v = w.id !== undefined ? vis[w.id] : null;
      if (w.k === 'pulse') { if (!A.done[wi]) { A.done[wi] = 1; rings.push({ x: w.x, y: w.y, t: 0, c: '255,200,80', big: 2.2 }); snd('activate'); shake = Math.max(shake, 4); vib(20); burst(w.x, w.y, 24, 'rgba(255,205,90,.95)', 200, 0.7, 2.5); } return; }
      if (!v) return; var e = ease(u);
      if (w.k === 'slide' || w.k === 'pull' || w.k === 'fly') { v.x = w.fx + (w.tx - w.fx) * e; v.y = w.fy + (w.ty - w.fy) * e; v.al = 1; v.sc = 1; if (w.k === 'fly' && u < 1) { burst(v.x, v.y, 1, 'rgba(255,215,120,.9)', 40, 0.3, 2); } if (u >= 1 && !A.done[wi]) { A.done[wi] = 1; dust(w.tx, w.ty, Math.sign(w.tx - w.fx), Math.sign(w.ty - w.fy)); shake = Math.max(shake, 2.5); if (w.k !== 'pull') { snd('impact', 'wall', Math.min(1, Math.abs(w.tx - w.fx + w.ty - w.fy) / 6)); vib(8); } if (v.t === 'c' && lv.socks.some(function (p) { return p[0] === w.tx && p[1] === w.ty; })) { snd('plate', true); burst(w.tx, w.ty, 18, 'rgba(255,225,140,.95)', 150, 0.7, 2.5); rings.push({ x: w.tx, y: w.ty, t: 0, c: '255,220,120', big: 1.0 }); } } }
      if (w.k === 'eat') { v.x = w.fx + (w.tx - w.fx) * e; v.y = w.fy + (w.ty - w.fy) * e; v.sc = 1 - e; v.al = 1 - e * 0.5; v.rot = e * 6; if (u >= 1 && !A.done[wi]) { A.done[wi] = 1; snd('absorb'); vib(25); VO.sq = -1; burst(S.x, S.y, 16, v.t === 's' ? 'rgba(255,205,90,.95)' : 'rgba(170,120,255,.95)', 130, 0.6, 2.5); rings.push({ x: S.x, y: S.y, t: 0, c: '170,110,255', big: 0.9 }); v.al = 0; setMode('eat', true); } }
      if (w.k === 'die') { v.x = w.fx + (w.tx - w.fx) * e; v.y = w.fy + (w.ty - w.fy) * e; if (u >= 1 && !A.done[wi]) { A.done[wi] = 1; v.al = 0; snd('shatter'); vib(60); shake = 9; burst(w.tx, w.ty, 30, 'rgba(255,110,90,.95)', 240, 0.8, 3); rings.push({ x: w.tx, y: w.ty, t: 0, c: '255,110,90', big: 1.3 }); } }
    });
    if (A.t >= A.T) finishAnim();
  } else if (VO.lunge) VO.lunge = null;
  trail.forEach(function (q) { q.l += dt; }); trail = trail.filter(function (q) { return q.l < q.L; });
  parts.forEach(function (p) { p.l += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.1, dt); p.vy *= Math.pow(0.1, dt); }); parts = parts.filter(function (p) { return p.l < p.L; });
  rings.forEach(function (r) { r.t += dt; }); rings = rings.filter(function (r) { return r.t < 0.7; });
  shake *= Math.pow(0.001, dt); flash = Math.max(0, flash - dt);
  // تعبيرات
  var E = EXS[VO.ex]; if (!E[3] && VO.exT > E[1] / E[2]) setEx(mode === 'spit' ? 'power' : 'idle');
  if (VO.ex === 'idle') { VO.idleT += dt; VO.blinkT -= dt; if (VO.blinkT < 0) { VO.blinkT = 2.5 + Math.random() * 3; VO.blinkP = 0; } if (VO.blinkP !== undefined) { VO.blinkP += dt; if (VO.blinkP > 8 / 14) VO.blinkP = undefined; } if (VO.idleT > 12 && !A) { VO.idleT = 0; setEx('hungry'); } } else VO.idleT = 0;
  // فوز
  if (solvedT >= 0) { solvedT += dt; if (solvedT > 0.2 && !startWin.f) { startWin.f = 1; for (var q = 0; q < S.o.length; q++) { } } if (solvedT > 0.35) gateOpen = Math.min(1, gateOpen + dt * 2.5); if (solvedT > 0.3 && !startWin.b) { startWin.b = 1; flash = 0.6; shake = 8; var gp = gatePos(); for (var k = 0; k < 5; k++) (function (k) { setTimeout(function () { rings.push({ x: 0, y: 0, gx: gp[0], gy: gp[1], t: 0, c: '255,225,130', big: 2.4 }); }, k * 110); })(k); S.o.forEach(function (o) { if (o[0] === 'c') { var v = vis[o[3]]; if (v) v.fly = { t: 0, d: 0.7 + Math.random() * 0.3, fx: v.x, fy: v.y }; } }); }
    S.o.forEach(function (o) { var v = vis[o[3]]; if (v && v.fly) { v.fly.t += dt; var u = Math.min(1, v.fly.t / v.fly.d), gp = gatePos(), e = u * u * (3 - 2 * u), fp = cpos(v.fly.fx, v.fly.fy); v.px = fp[0] + (gp[0] - fp[0]) * e; v.py = fp[1] + (gp[1] - fp[1]) * e - Math.sin(u * Math.PI) * cell * 0.8; v.sc = 1 - u * 0.5; if (u < 1) parts.push({ x: v.px, y: v.py, vx: (Math.random() - .5) * 30, vy: 20, l: 0, L: .4, c: 'rgba(255,225,140,.9)', z: 3 }); if (u >= 1) { v.al = 0; } } });
    if (solvedT > 1.5 && !$('#end').classList.contains('show')) $('#end').classList.add('show'); }
  else { startWin.f = startWin.b = 0; }
  if (hintA) hintA.t += dt;
  if (zoomP > 0) zoomP = Math.max(0, zoomP - dt);
}
function gatePos() { return [bx + W * cell / 2, by - 40]; }
/* ---------- الرسم ---------- */
var floorCache = null, GL = {};
function glow(c) { if (GL[c]) return GL[c]; var g = document.createElement('canvas'); g.width = g.height = 96; var x = g.getContext('2d'), r = x.createRadialGradient(48, 48, 0, 48, 48, 48); r.addColorStop(0, 'rgba(' + c + ',1)'); r.addColorStop(0.35, 'rgba(' + c + ',.4)'); r.addColorStop(1, 'rgba(' + c + ',0)'); x.fillStyle = r; x.fillRect(0, 0, 96, 96); return GL[c] = g; }
function dglow(c, x, y, r, a) { cx.globalAlpha = a; cx.drawImage(glow(c), x - r, y - r, r * 2, r * 2); cx.globalAlpha = 1; }
function chamf(c, x, y, w, h, k) { c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + w - k, y); c.lineTo(x + w, y + k); c.lineTo(x + w, y + h - k); c.lineTo(x + w - k, y + h); c.lineTo(x + k, y + h); c.lineTo(x, y + h - k); c.lineTo(x, y + k); c.closePath(); }
function buildFloor() {
  var c = document.createElement('canvas'); c.width = Math.round(VW * dpr); c.height = Math.round(VH * dpr); var x = c.getContext('2d'); x.scale(dpr, dpr);
  for (var j = 0; j < H; j++) for (var i = 0; i < W; i++) {
    var px = bx + i * cell, py = by + j * cell, idx = j * W + i;
    if (lv.wall[idx]) {
      x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 8; x.shadowOffsetY = 3; var g = x.createLinearGradient(px, py, px, py + cell); g.addColorStop(0, '#5a43a8'); g.addColorStop(0.5, '#33256f'); g.addColorStop(1, '#1d1348'); x.fillStyle = g; chamf(x, px + 1.5, py + 1.5, cell - 3, cell - 3, cell * 0.16); x.fill(); x.restore();
      x.strokeStyle = 'rgba(240,201,112,.85)'; x.lineWidth = 1.6; chamf(x, px + 2.5, py + 2.5, cell - 5, cell - 5, cell * 0.15); x.stroke();
      x.fillStyle = 'rgba(190,160,255,.22)'; chamf(x, px + 5, py + 5, cell - 10, cell * 0.3, cell * 0.1); x.fill();
      x.strokeStyle = 'rgba(240,201,112,.35)'; x.lineWidth = 1.2; var m = cell / 2; x.beginPath(); x.moveTo(px + m, py + cell * 0.3); x.lineTo(px + cell * 0.7, py + m); x.lineTo(px + m, py + cell * 0.7); x.lineTo(px + cell * 0.3, py + m); x.closePath(); x.stroke();
    } else {
      var g2 = x.createLinearGradient(px, py, px + cell, py + cell); var ch = (i + j) % 2; g2.addColorStop(0, ch ? 'rgba(46,30,110,.78)' : 'rgba(34,20,86,.78)'); g2.addColorStop(1, ch ? 'rgba(26,14,70,.82)' : 'rgba(20,10,58,.82)');
      x.fillStyle = g2; chamf(x, px + 1.5, py + 1.5, cell - 3, cell - 3, cell * 0.1); x.fill(); x.strokeStyle = 'rgba(150,120,255,.22)'; x.lineWidth = 1; chamf(x, px + 1.5, py + 1.5, cell - 3, cell - 3, cell * 0.1); x.stroke();
    }
  }
  floorCache = c;
}
function frame(k, fi, x, y, s, a) { var im = IM[k]; if (!im || !im.width) return; var S2 = im.height; cx.globalAlpha = a; cx.drawImage(im, fi * S2, 0, S2, S2, x - s / 2, y - s / 2, s, s); cx.globalAlpha = 1; }
function drawVoid(t) {
  var p = cpos(VO.x + VO.ox, VO.y + VO.oy), x = p[0], y = p[1] + Math.sin(t * 2.2) * cell * 0.03, s = cell * 1.62 * (1 + Math.sin(t * 3) * 0.012);
  var sx = 1 + VO.sq * 0.1 + (VO.sqx || 0), sy = 1 - VO.sq * 0.08 + (VO.sqy || 0);
  trail.forEach(function (q) { var a = 1 - q.l / q.L, pp = cpos(q.x, q.y); cx.save(); cx.globalCompositeOperation = 'lighter'; dglow(VO.pa > .5 ? '255,236,170' : '150,100,255', pp[0], pp[1], cell * 0.55, a * 0.35); cx.restore(); });
  cx.save(); cx.translate(x, y); cx.scale(sx, sy);
  cx.save(); cx.globalCompositeOperation = 'lighter'; dglow(VO.pa > 0.5 ? '255,236,170' : mode === 'spit' ? '255,190,70' : '140,90,255', 0, 0, cell * 1.15, 0.4 + VO.pa * 0.25); cx.restore();
  var E = EXS[VO.ex];
  if (VO.pa > 0.02 && VO.pa < 0.999 || VO.pa >= 0.999) { var pp = Math.max(0, Math.min(1, VO.pa)); pp = pp * pp * (3 - 2 * pp); var fp = pp * 7, i0 = Math.floor(fp), fr = fp - i0; frame('v_trans', Math.min(7, i0), 0, 0, s, 1); if (fr > 0.01 && i0 < 7) frame('v_trans', i0 + 1, 0, 0, s, fr); if (pp > 0.97) frame('v_trans', 4 + Math.floor((t * 5) % 4), 0, 0, s, 0.5); }
  else if (VO.ex === 'idle') { frame('v_idle', VO.blinkP !== undefined ? Math.min(7, Math.floor(VO.blinkP * 14)) : 0, 0, 0, s, 1); }
  else { var f2 = E[3] ? Math.floor(VO.exT * E[2]) % E[1] : Math.min(E[1] - 1, Math.floor(VO.exT * E[2])); frame(E[0], f2, 0, 0, s, 1); }
  if (S.bl) { var im = IM[S.bl === 's' ? 'law_grav' : S.bl === 'c' ? 'it_cry_s' : 'it_rock']; if (im && im.width) { var bw = cell * 0.5, bh = bw * im.height / im.width; cx.save(); cx.shadowColor = 'rgba(255,210,100,.9)'; cx.shadowBlur = 10; cx.drawImage(im, cell * 0.28, -cell * 0.66, bw, bh); cx.restore(); } }
  cx.restore();
}
function drawObj(o, t) {
  var v = vis[o[3]]; if (!v || v.al <= 0.01) return; var p = v.px !== undefined && v.fly ? [v.px, v.py] : cpos(v.x, v.y), key = v.t === 'c' ? 'it_cry_m' : v.t === 'r' ? 'it_rock' : v.t === 'm' ? 'it_metal' : 'law_grav', im = IM[key]; if (!im || !im.width) return;
  var w = cell * (v.t === 'c' ? 0.78 : v.t === 'm' ? 0.92 : v.t === 's' ? 0.86 : 0.88) * v.sc, h = w * im.height / im.width, bob = (v.t === 'c' || v.t === 's') ? Math.sin(t * 2.6 + o[3]) * cell * 0.025 : 0;
  cx.save(); cx.globalAlpha = v.al; cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(p[0], p[1] + h * 0.38, w * 0.36, w * 0.12, 0, 0, 7); cx.fill();
  cx.translate(p[0], p[1] + bob); cx.rotate(v.rot || 0); if (v.t === 'c' || v.t === 's') { cx.globalCompositeOperation = 'lighter'; dglow(v.t === 'c' ? '160,100,255' : '255,190,70', 0, 0, w * 0.85, 0.35 + Math.sin(t * 3 + o[3]) * 0.1); cx.globalCompositeOperation = 'source-over'; }
  cx.drawImage(im, -w / 2, -h / 2, w, h); cx.restore();
}
function render(t) {
  cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#06021a'; cx.fillRect(0, 0, cv.width, cv.height); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var shx = (Math.random() - 0.5) * shake, shy = (Math.random() - 0.5) * shake, zm = 1 + Math.sin(Math.min(1, solvedT / 1.2) * Math.PI) * 0.03 * (solvedT >= 0 ? 1 : 0);
  cx.save(); cx.translate(VW / 2 + shx, VH / 2 + shy); cx.scale(zm, zm); cx.translate(-VW / 2, -VH / 2);
  if (BG.width) { var br = Math.max(VW / BG.width, VH / BG.height); cx.drawImage(BG, (VW - BG.width * br) / 2, (VH - BG.height * br) / 2, BG.width * br, BG.height * br); }
  cx.fillStyle = 'rgba(8,3,32,.66)'; cx.fillRect(0, 0, VW, VH);
  cx.save(); cx.globalCompositeOperation = 'lighter'; dglow('120,70,230', VW * (0.3 + Math.sin(t * 0.2) * 0.1), VH * 0.35, VW * 0.8, 0.22); dglow('255,190,90', VW * (0.75 + Math.cos(t * 0.17) * 0.08), VH * 0.7, VW * 0.7, 0.1); cx.restore();
  for (var s = 0; s < 26; s++) { var sxp = (s * 97.3 + t * (4 + s % 5)) % VW, syp = (s * 53.7) % VH; cx.fillStyle = 'rgba(220,200,255,' + (0.2 + 0.25 * Math.sin(t * 1.5 + s)) + ')'; cx.fillRect(sxp, syp, 1.5, 1.5); }
  var vg = cx.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VH * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,12,.65)'); cx.fillStyle = vg; cx.fillRect(0, 0, VW, VH);
  // البوابة
  var gim = IM[gateOpen > 0.3 ? 'gate_open' : 'gate_closed'], gp = gatePos(); if (gim && gim.width) { var gw = cell * 2.7, gh = gw * gim.height / gim.width; if (gateOpen > 0) { cx.save(); cx.globalCompositeOperation = 'lighter'; dglow('255,220,120', gp[0], gp[1], gw * (0.7 + gateOpen * 0.5), 0.55 * gateOpen); cx.restore(); } cx.drawImage(gim, gp[0] - gw / 2, gp[1] - gh * 0.55, gw, gh); }
  if (floorCache) cx.drawImage(floorCache, 0, 0, VW, VH);
  // أقواس الدوائر والأشواك والسكك
  lv.socks.forEach(function (p) { var q = cpos(p[0], p[1]), filled = S.o.some(function (o) { return o[0] === 'c' && o[1] === p[0] && o[2] === p[1]; }) && (!A || A.t > A.T * 0.7); cx.save(); cx.globalCompositeOperation = 'lighter'; var pulse = 0.5 + Math.sin(t * 3 + p[0]) * 0.25; dglow(filled ? '255,215,110' : '90,220,255', q[0], q[1], cell * 0.8, filled ? 0.55 : 0.28 + pulse * 0.2); cx.strokeStyle = filled ? 'rgba(255,220,120,.9)' : 'rgba(120,230,255,' + (0.55 + pulse * 0.3) + ')'; cx.lineWidth = 2.2; cx.beginPath(); cx.arc(q[0], q[1], cell * 0.32, 0, 7); cx.stroke(); cx.setLineDash([4, 6]); cx.lineDashOffset = -t * 12; cx.beginPath(); cx.arc(q[0], q[1], cell * 0.4, 0, 7); cx.stroke(); cx.setLineDash([]); cx.restore(); });
  for (var j = 0; j < H; j++) for (var i = 0; i < W; i++) if (lv.spike[j * W + i]) { var q = cpos(i, j), pu = 0.6 + Math.sin(t * 4 + i * 2 + j) * 0.2; cx.save(); cx.globalCompositeOperation = 'lighter'; dglow('255,60,70', q[0], q[1], cell * 0.7, 0.35 * pu); cx.restore(); cx.fillStyle = 'rgba(255,70,80,' + (0.75 * pu + 0.2) + ')'; cx.strokeStyle = 'rgba(255,200,180,.7)'; cx.lineWidth = 1; for (var k = -1; k <= 1; k++) { var tx = q[0] + k * cell * 0.24, ty = q[1] + cell * 0.22, hh = cell * (k ? 0.38 : 0.48); cx.beginPath(); cx.moveTo(tx - cell * 0.11, ty); cx.lineTo(tx, ty - hh); cx.lineTo(tx + cell * 0.11, ty); cx.closePath(); cx.fill(); cx.stroke(); } }
  lv.saws.forEach(function (sw, k) { var a = cpos(sw.ax, sw.ay), b = cpos(sw.bx, sw.by); cx.save(); cx.strokeStyle = 'rgba(255,130,100,.28)'; cx.lineWidth = 4; cx.setLineDash([2, 8]); cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke(); cx.restore(); });
  // أدوات
  var objs = S.o.slice().sort(function (a, b) { var va = vis[a[3]], vb = vis[b[3]]; return (va ? va.y : a[2]) - (vb ? vb.y : b[2]); }); objs.forEach(function (o) { drawObj(o, t); });
  // المناشير
  lv.saws.forEach(function (sw, k) { var f = sawPrev[k] || [sw.ax, sw.ay], p;
    var cur = VSim.sawPos(lv, sw, S.n), from = A ? A.sawFrom[k] : cur, to = cur, u = A ? Math.min(1, A.t / Math.max(0.2, A.T)) : 1, e = ease(u); p = cpos(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e);
    cx.save(); cx.translate(p[0], p[1]); cx.globalCompositeOperation = 'lighter'; dglow('255,80,70', 0, 0, cell * 0.8, 0.65); cx.globalCompositeOperation = 'source-over'; cx.rotate(t * 10); var R = cell * 0.4; var g = cx.createRadialGradient(0, 0, 2, 0, 0, R); g.addColorStop(0, '#fff6e0'); g.addColorStop(1, '#d9c7ff'); cx.fillStyle = g; cx.beginPath(); for (var z = 0; z < 24; z++) { var an = z / 24 * 6.283, rr = z % 2 ? R * 0.72 : R; cx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } cx.closePath(); cx.fill(); cx.fillStyle = '#c0283c'; cx.beginPath(); cx.arc(0, 0, R * 0.38, 0, 7); cx.fill(); cx.fillStyle = '#ffe9a8'; cx.beginPath(); cx.arc(0, 0, R * 0.16, 0, 7); cx.fill(); cx.restore(); });
  drawVoid(t);
  // تلميح
  if (hintA) { var hp = cpos(VO.x, VO.y), dd = VSim.D[hintA.d], pul = (Math.sin(hintA.t * 7) + 1) / 2; cx.save(); cx.globalCompositeOperation = 'lighter'; cx.strokeStyle = 'rgba(255,230,140,' + (0.5 + pul * 0.5) + ')'; cx.lineWidth = 5; cx.lineCap = 'round'; var L = cell * (0.9 + pul * 0.3); cx.beginPath(); cx.moveTo(hp[0] + dd[0] * cell * 0.6, hp[1] + dd[1] * cell * 0.6); cx.lineTo(hp[0] + dd[0] * (cell * 0.6 + L), hp[1] + dd[1] * (cell * 0.6 + L)); cx.stroke(); var ex = hp[0] + dd[0] * (cell * 0.6 + L), ey = hp[1] + dd[1] * (cell * 0.6 + L); cx.beginPath(); cx.moveTo(ex - dd[1] * 10 - dd[0] * 10, ey + dd[0] * 10 - dd[1] * 10); cx.lineTo(ex + dd[0] * 6, ey + dd[1] * 6); cx.lineTo(ex + dd[1] * 10 - dd[0] * 10, ey - dd[0] * 10 - dd[1] * 10); cx.stroke(); cx.restore(); }
  cx.save(); cx.globalCompositeOperation = 'lighter';
  parts.forEach(function (p) { var a = 1 - p.l / p.L; cx.globalAlpha = a; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.z * (0.4 + a * 0.6), 0, 7); cx.fill(); }); cx.globalAlpha = 1;
  rings.forEach(function (r) { var q = r.t / 0.7, pp = r.gx !== undefined ? [r.gx, r.gy] : cpos(r.x, r.y); cx.strokeStyle = 'rgba(' + r.c + ',' + (1 - q) * 0.9 + ')'; cx.lineWidth = 3.5 * (1 - q) + 1; cx.beginPath(); cx.arc(pp[0], pp[1], cell * 0.3 + q * cell * 2.2 * r.big, 0, 7); cx.stroke(); });
  if (flash > 0) { cx.fillStyle = 'rgba(255,240,200,' + flash * 0.4 + ')'; cx.fillRect(0, 0, VW, VH); }
  cx.restore(); cx.restore();
}
/* ---------- تشغيل ---------- */
function layout() { dpr = Math.min(window.devicePixelRatio || 1, 2); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); var top = 54, band = 86, bot = 160; cell = Math.floor(Math.min((VW - 16) / W, (VH - top - band - bot) / H)); bx = Math.round((VW - cell * W) / 2); by = Math.round(top + band + (VH - top - band - bot - cell * H) / 2); floorCache = null; }
window.addEventListener('resize', function () { layout(); });
var last = 0, T0 = performance.now();
function loop(ts) { var dt = Math.min(0.034, (ts - last) / 1000 || 0.016); last = ts; if (!floorCache) buildFloor(); update(dt); render((ts - T0) / 1000); requestAnimationFrame(loop); }
function boot() { var r = +(new URLSearchParams(location.search).get('r') || 0); loadRoom(0); layout(); loadRoom(r); requestAnimationFrame(loop); }
window.__v = { get S() { return S; }, get lv() { return lv; }, act: act, loadRoom: loadRoom, setMode: setMode, undo: undo, get A() { return A; }, get solved() { return solvedT >= 0; }, get moves() { return moves; } };
})();
