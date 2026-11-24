/* LAWLESS: Eat the Laws — محرك Void المنفصل (شبكة) + حلّال */
(function (root) {
'use strict';
var D = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }, DN = ['up', 'right', 'down', 'left'];
function load(room) {
  var map = room.map, H = map.length, W = map[0].length, lv = { W: W, H: H, wall: new Uint8Array(W * H), spike: new Uint8Array(W * H), socks: [], start: null, objs: [], saws: (room.saws || []).slice(), room: room };
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    var ch = map[y][x], i = y * W + x;
    if (ch === '#') lv.wall[i] = 1; else if (ch === '^') lv.spike[i] = 1; else if (ch === 'o') lv.socks.push([x, y]); else if (ch === 'V') lv.start = { x: x, y: y };
    else if ('crms'.indexOf(ch) >= 0) lv.objs.push([ch, x, y, lv.objs.length]);
  }
  lv.period = 1; lv.saws.forEach(function (s) { var L = Math.abs(s.bx - s.ax) + Math.abs(s.by - s.ay); s.L = L; lv.period = lcm(lv.period, Math.max(1, 2 * L)); });
  return lv;
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; } function lcm(a, b) { return a / gcd(a, b) * b; }
function start(lv) { return { x: lv.start.x, y: lv.start.y, bl: '', bi: -1, o: lv.objs.map(function (o) { return o.slice(); }), n: 0, dead: 0 }; }
function clone(s) { return { x: s.x, y: s.y, bl: s.bl, bi: s.bi, o: s.o.filter(Boolean).map(function (o) { return o.slice(); }), n: s.n, dead: s.dead }; }
function sawPos(lv, sw, n) { if (!sw.L) return [sw.ax, sw.ay]; var P = 2 * sw.L, k = n % P, u = k <= sw.L ? k : P - k, dx = Math.sign(sw.bx - sw.ax), dy = Math.sign(sw.by - sw.ay); return [sw.ax + dx * u, sw.ay + dy * u]; }
function act(lv, st, kind, d, opt) {
  opt = opt || {}; var s = clone(st), W = lv.W, H = lv.H, dx = D[d][0], dy = D[d][1], g = new Int16Array(W * H).fill(-1), ev = [];
  s.o.forEach(function (o, i) { if (o) g[o[2] * W + o[1]] = i; });
  function free(x, y) { return x >= 0 && y >= 0 && x < W && y < H && !lv.wall[y * W + x] && g[y * W + x] < 0 && !(x === s.x && y === s.y); }
  function slide(i, ddx, ddy) {
    var o = s.o[i], n = 0; while (free(o[1] + ddx, o[2] + ddy)) { g[o[2] * W + o[1]] = -1; o[1] += ddx; o[2] += ddy; g[o[2] * W + o[1]] = i; n++; if (o[0] === 'c' && lv.spike[o[2] * W + o[1]]) { g[o[2] * W + o[1]] = -1; s.o[i] = null; s.dead = 1; ev.push({ k: 'die', id: o[3], x: o[1], y: o[2], why: 'spike' }); return -1; } }
    return n;
  }
  var changed = false, mv0 = { x: s.x, y: s.y };
  if (kind === 'push' || kind === 'eat') {
    while (free(s.x + dx, s.y + dy)) { s.x += dx; s.y += dy; changed = true; }
    ev.push({ k: 'glide', fx: mv0.x, fy: mv0.y, tx: s.x, ty: s.y });
    var ax = s.x + dx, ay = s.y + dy, oi = (ax >= 0 && ay >= 0 && ax < W && ay < H) ? g[ay * W + ax] : -1;
    if (oi >= 0) {
      var o = s.o[oi];
      if (kind === 'push') { var m = slide(oi, dx, dy); if (m !== 0) { changed = true; ev.push({ k: 'shove', id: o[3], fx: ax, fy: ay, tx: s.o[oi] ? s.o[oi][1] : -1, ty: s.o[oi] ? s.o[oi][2] : -1 }); } else ev.push({ k: 'bump', x: ax, y: ay }); }
      else if (!opt.noEat && !s.bl && o[0] !== 'm') { s.bl = o[0]; s.bi = o[3]; ev.push({ k: 'eat', id: o[3], t: o[0], x: ax, y: ay }); s.o[oi] = null; g[ay * W + ax] = -1; changed = true; }
      else ev.push({ k: 'bump', x: ax, y: ay });
    }
  } else if (kind === 'spit') {
    if (!s.bl || opt.noSpit) return null; var ax2 = s.x + dx, ay2 = s.y + dy; if (!free(ax2, ay2)) return null;
    var t = s.bl; s.bl = ''; var bid = s.bi; s.bi = -1; s.o.push([t, ax2, ay2, bid]); var ni = s.o.length - 1; g[ay2 * W + ax2] = ni; changed = true; ev.push({ k: 'spit', id: bid, t: t, x: ax2, y: ay2, d: d });
    if (t === 'c' && lv.spike[ay2 * W + ax2]) { s.o[ni] = null; g[ay2 * W + ax2] = -1; s.dead = 1; ev.push({ k: 'die', id: bid, x: ax2, y: ay2, why: 'spike' }); }
    else {
      slide(ni, dx, dy);
      var so = s.o[ni];
      if (so && t === 's' && !opt.noStone) {
        ev.push({ k: 'pulse', x: so[1], y: so[2] });
        for (var q = 0; q < 4; q++) {
          var qx = D[DN[q]][0], qy = D[DN[q]][1], x = so[1] + qx, y = so[2] + qy, list = [];
          while (x >= 0 && y >= 0 && x < W && y < H && !lv.wall[y * W + x]) { if (g[y * W + x] >= 0) list.push(g[y * W + x]); x += qx; y += qy; }
          list.forEach(function (ii) { var oo = s.o[ii]; if (!oo || oo[0] === 'm') return; var fx = oo[1], fy = oo[2], mm = slide(ii, -qx, -qy); if (mm > 0) ev.push({ k: 'pull', id: s.o[ii] ? s.o[ii][3] : oo[3], fx: fx, fy: fy, tx: s.o[ii] ? s.o[ii][1] : -1, ty: s.o[ii] ? s.o[ii][2] : -1 }); });
        }
      }
    }
  } else return null;
  if (!changed) return null;
  s.n++;
  s.o.forEach(function (o, i) { if (!o || o[0] !== 'c') return; lv.saws.forEach(function (sw) { var p = sawPos(lv, sw, s.n); if (p[0] === o[1] && p[1] === o[2]) { s.o[i] = null; s.dead = 1; ev.push({ k: 'die', id: o[3], x: p[0], y: p[1], why: 'saw' }); } }); });
  s.o = s.o.filter(Boolean); s.ev = ev; return s;
}
function solved(lv, s) { if (s.dead) return false; return lv.socks.every(function (p) { return s.o.some(function (o) { return o && o[0] === 'c' && o[1] === p[0] && o[2] === p[1]; }); }); }
function key(lv, s) { var a = s.o.filter(Boolean).map(function (o) { return o[0] + o[1] + ',' + o[2]; }).sort().join(';'); return s.x + ',' + s.y + s.bl + '|' + a + (lv.saws.length ? '|' + (s.n % lv.period) : ''); }
function solve(lv, maxDepth, opt, cap, from) {
  cap = cap || 80000; var s0 = from ? clone(from) : start(lv); s0.n = from ? from.n : 0; if (solved(lv, s0)) return { path: [] };
  var seen = {}, q = [{ s: s0, p: [] }], qi = 0; seen[key(lv, s0)] = 1;
  var kinds = ['push', 'eat', 'spit'];
  while (qi < q.length) {
    var cur = q[qi++]; if (cur.p.length >= maxDepth) continue; if (qi > cap) return null;
    for (var di = 0; di < 4; di++) for (var ki = 0; ki < 3; ki++) {
      var n = act(lv, cur.s, kinds[ki], DN[di], opt); if (!n || n.dead) continue; var k = key(lv, n); if (seen[k]) continue; seen[k] = 1;
      var p = cur.p.concat([[kinds[ki], DN[di]]]); if (solved(lv, n)) return { path: p }; q.push({ s: n, p: p });
    }
  }
  return null;
}
var API = { load: load, start: start, act: act, solved: solved, solve: solve, key: key, sawPos: sawPos, DN: DN, D: D };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.VSim = API;
})(typeof self !== 'undefined' ? self : this);
