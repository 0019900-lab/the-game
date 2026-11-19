// تشغيل: node validate.js
// يتحقق أن كل غرفة لها حل، ويقارن الحل الأمثل بقيمة par المكتوبة.
const Sim = require('./sim.js');
const ROOMS = require('./rooms.js');
let bad = 0;
ROOMS.forEach((r, i) => {
  const w = r.map[0].length;
  if (!r.map.every(row => row.length === w)) { console.log(`✗ ${r.id}: صفوف غير متساوية`); bad++; return; }
  const lv = Sim.load(r);
  const sol = Sim.solve(lv, 14);
  if (!sol) { console.log(`✗ ${r.id} ${r.name}: بلا حل`); bad++; return; }
  const ok = sol.path.length === r.par;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '!'} ${r.id} ${r.name}: الحل الأمثل=${sol.path.length} par=${r.par} حالات=${sol.states}  ` +
    sol.path.map(p => `B${p[0]}:${p[1]}`).join(' → '));
});
process.exit(bad ? 1 : 0);
