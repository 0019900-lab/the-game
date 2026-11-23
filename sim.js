/* LAWLESS — محاكاة شبكية حتمية (مشتركة بين اللعبة والـ Validator) */
(function (root) {
  'use strict';
  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var NAMES = ['up', 'right', 'down', 'left'];

  function clone(bs) { return bs.map(function (b) { var o = { id: b.id, x: b.x, y: b.y, g: b.g }; if (b.rg) o.rg = b.rg; return o; }); }

  // رموز الخريطة: # جدار | H عنصر محصّن | E بوابة | B كتلة | P مفتاح ضغط | . فراغ
  function load(room) {
    var h = room.map.length, w = room.map[0].length;
    var solid = new Uint8Array(w * h), kind = new Array(w * h).fill('.');
    var blocks = [], plates = [], gates = [], attr = null;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var c = room.map[y][x] || '#';
      if (c === '#' || c === 'H' || c === 'E') {
        solid[y * w + x] = 1; kind[y * w + x] = c;
        if (c === 'E') gates.push({ x: x, y: y });
      } else if (c === 'B') blocks.push({ id: blocks.length, x: x, y: y, g: 'down' });
      else if (c === 'P') plates.push({ x: x, y: y });
      else if (c === 'O') attr = { x: x, y: y };
    }
    var lv = { w: w, h: h, solid: solid, kind: kind, plates: plates, gates: gates, attr: attr, mirror: !!room.mirror };
    lv.start = simulate(lv, blocks).blocks; // استقرار أولي
    return lv;
  }

  // خطوة متزامنة: كل كتلة تتحرك خانة واحدة في اتجاه جاذبيتها إن كانت حرة
  function simulate(lv, blocks) {
    var cur = clone(blocks), steps = [], w = lv.w, h = lv.h;
    for (var iter = 0; iter < 120; iter++) {
      var occ = new Map();
      cur.forEach(function (b) { occ.set(b.y * w + b.x, b.id); });
      var moves = new Map();
      cur.forEach(function (b) {
        var d, nx, ny;
        if (b.g === 'mirror') {   // REFLECTION: قفزة إلى الخانة المقابلة عبر محور الغرفة
          if (iter || !lv.mirror) return; nx = w - 1 - b.x; ny = b.y; if (nx === b.x || lv.solid[ny * w + nx]) return;
          moves.set(b.id, { id: b.id, fx: b.x, fy: b.y, tx: nx, ty: ny, jump: true }); return;
        }
        if (b.g === 'pull') {   // ATTRACTION: خطوة نحو المغناطيس، المحور الأبعد أولًا
          if (!lv.attr) return;
          var ax = lv.attr.x - b.x, ay = lv.attr.y - b.y; if (!ax && !ay) return;
          var hx = Math.abs(ax) >= Math.abs(ay), cand = hx ? [[Math.sign(ax), 0], [0, Math.sign(ay)]] : [[0, Math.sign(ay)], [Math.sign(ax), 0]], ok = false;
          for (var ci = 0; ci < 2; ci++) { var cd = cand[ci]; if (!cd[0] && !cd[1]) continue; var tx2 = b.x + cd[0], ty2 = b.y + cd[1]; if (tx2 >= 0 && ty2 >= 0 && tx2 < w && ty2 < h && !lv.solid[ty2 * w + tx2]) { d = cd; ok = true; break; } }
          if (!ok) return;
        } else d = DIRS[b.g];
        nx = b.x + d[0]; ny = b.y + d[1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || lv.solid[ny * w + nx]) return;
        moves.set(b.id, { id: b.id, fx: b.x, fy: b.y, tx: nx, ty: ny });
      });
      var changed = true;
      while (changed) {
        changed = false;
        var tgt = new Set();
        Array.from(moves.values()).sort(function (a, b) { return a.id - b.id; }).forEach(function (m) {
          var k = m.ty * w + m.tx, ok = true, o = occ.get(k);
          if (o !== undefined) {
            var om = moves.get(o);
            if (!om || (om.tx === m.fx && om.ty === m.fy)) ok = false;
          }
          if (ok && tgt.has(k)) ok = false;
          if (ok) tgt.add(k); else { moves.delete(m.id); changed = true; }
        });
      }
      cur.forEach(function (b) { if (b.g === 'mirror') b.g = b.rg || 'down'; });
      if (!moves.size) break;
      var step = Array.from(moves.values()).sort(function (a, b) { return a.id - b.id; });
      step.forEach(function (m) { var b = cur[m.id]; b.x = m.tx; b.y = m.ty; });
      steps.push(step);
    }
    return { blocks: cur, steps: steps };
  }

  function applyPlan(blocks, plan) {
    var c = clone(blocks);
    c.forEach(function (b) { if (plan[b.id]) { if (plan[b.id] === 'mirror') b.rg = b.g; b.g = plan[b.id]; } });
    return c;
  }
  function preview(lv, blocks, plan) { return simulate(lv, applyPlan(blocks, plan)); }
  function solved(lv, blocks) {
    return lv.plates.length > 0 && lv.plates.every(function (p) {
      return blocks.some(function (b) { return b.x === p.x && b.y === p.y; });
    });
  }
  function key(bs) { return bs.map(function (b) { return b.x + ',' + b.y + ',' + b.g[0]; }).join('|'); }

  // BFS: أقصر سلسلة أفعال (كتلة + اتجاه) تحل الغرفة. تعيد null إن لم يوجد حل.
  function solve(lv, maxDepth, opt) {
    maxDepth = maxDepth || 12; var names = (lv.attr && !(opt && opt.noPull)) ? NAMES.concat(['pull']) : NAMES; if (lv.mirror && !(opt && opt.noMirror)) names = names.concat(['mirror']);
    var start = clone(lv.start);
    if (solved(lv, start)) return { path: [], states: 1, dead: 0 };
    var seen = new Set([key(start)]), q = [{ b: start, path: [] }], best = null, states = 1;
    while (q.length) {
      var cur = q.shift();
      if (cur.path.length >= maxDepth) continue;
      for (var i = 0; i < cur.b.length; i++) for (var d = 0; d < names.length; d++) {
        var dir = names[d];
        if (cur.b[i].g === dir) continue;
        var plan = {}; plan[i] = dir;
        var res = simulate(lv, applyPlan(cur.b, plan));
        var k = key(res.blocks);
        if (seen.has(k)) continue;
        seen.add(k); states++;
        var path = cur.path.concat([[i, dir]]);
        if (solved(lv, res.blocks)) { if (!best) best = path; }
        else q.push({ b: res.blocks, path: path });
      }
      if (best) break;
    }
    return best ? { path: best, states: states } : null;
  }

  var api = { DIRS: DIRS, NAMES: NAMES, load: load, clone: clone, simulate: simulate,
    applyPlan: applyPlan, preview: preview, solved: solved, solve: solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Sim = api;
})(typeof self !== 'undefined' ? self : this);
