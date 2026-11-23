/* LAWLESS — صوت Procedural بالكامل عبر Web Audio API (بدون ملفات صوتية)
   v2: سلسلة ماستر آمنة (فلتر + ليميتر + تشبّع ناعم)، reverb ناعم بدون هسهسة،
   سقف للأصوات المتزامنة، وإزالة الموجات الحادة (sawtooth/square) التي كانت تسبب الخروشة. */
var AudioFX = (function () {
  'use strict';
  var ac = null, master, sfx, mus, noiseBuf, muted = false, pad = null, pingT = 0;
  var voices = 0, MAX_VOICES = 22, lastLand = 0, lastDir = 0;
  var PENT = [0, 2, 4, 7, 9];
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // IR ناعم: ضجيج مرشّح بمرشح تمرير منخفض متحرك + بداية متدرجة (بدون نقرة) + تلاشٍ أسي
  function impulse(sec) {
    var rate = ac.sampleRate, n = (rate * sec) | 0, b = ac.createBuffer(2, n, rate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c), lp = 0;
      for (var i = 0; i < n; i++) {
        var t = i / n, k = 0.06 + 0.5 * Math.pow(1 - t, 2);   // يغمق الذيل تدريجيًا
        lp += (Math.random() * 2 - 1 - lp) * k;
        var env = Math.pow(1 - t, 3.2) * Math.min(1, i / (rate * 0.012));
        d[i] = lp * env * 1.6;
      }
    }
    return b;
  }

  function init(ctx) {
    if (ac) { if (ac.state === 'suspended' && ac.resume) ac.resume(); return; }
    if (ctx) ac = ctx;
    else {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ac = new AC({ latencyHint: 'balanced' }); } catch (e) { ac = new AC(); }
    }
    // السلسلة: [sfx+mus] → (جاف + reverb) → bus → فلتر 9kHz → ليميتر → تشبّع ناعم → master
    var bus = ac.createGain(); bus.gain.value = 0.62;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.5;
    var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28; hp.Q.value = 0.5;
    var lim = ac.createDynamicsCompressor();
    lim.threshold.value = -9; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.12;
    var sat = ac.createWaveShaper(), curve = new Float32Array(1024);
    for (var i = 0; i < 1024; i++) { var x = i / 512 - 1; curve[i] = Math.tanh(x * 1.15) / Math.tanh(1.15); }
    sat.curve = curve;
    master = ac.createGain(); master.gain.value = muted ? 0 : 1;
    bus.connect(hp); hp.connect(lp); lp.connect(lim); lim.connect(sat); sat.connect(master); master.connect(ac.destination);

    var verb = ac.createConvolver(); verb.buffer = impulse(1.0);
    var vf = ac.createBiquadFilter(); vf.type = 'lowpass'; vf.frequency.value = 3800; vf.Q.value = 0.4;
    var wet = ac.createGain(); wet.gain.value = 0.28;
    verb.connect(vf); vf.connect(wet); wet.connect(bus);
    sfx = ac.createGain(); sfx.gain.value = 0.85;
    mus = ac.createGain(); mus.gain.value = 0.55;
    sfx.connect(bus); sfx.connect(verb);
    mus.connect(bus); mus.connect(verb);

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    var nd = noiseBuf.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
    for (var j = 0; j < nd.length; j++) {          // ضجيج وردي (أنعم من الأبيض)
      var w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
      nd[j] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    var xf = (ac.sampleRate * 0.04) | 0;           // بداية/نهاية الحلقة تبدأ وتنتهي عند الصفر: لا نقرة
    for (var k = 0; k < xf; k++) { var a = k / xf; nd[k] *= a; nd[nd.length - 1 - k] *= a; }
  }

  function take() { if (voices >= MAX_VOICES) return false; voices++; return true; }
  function release() { voices = Math.max(0, voices - 1); }

  function pannerFor(o, g) {
    if (o.pan !== undefined && ac.createStereoPanner) {
      var p = ac.createStereoPanner(); p.pan.value = o.pan; g.connect(p); return p;
    }
    return g;
  }

  // نغمة بغلاف ناعم: هجوم ≥ 6ms، وتلاشٍ بـ setTarget (بلا قفزات) ثم إيقاف بعد الصمت
  function tone(o) {
    if (!ac || !take()) return;
    var t0 = ac.currentTime + (o.at || 0), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur * 0.9);
    var a = Math.max(0.006, o.attack || 0.006), v = o.vol || 0.15;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    g.gain.setTargetAtTime(0, t0 + a, Math.max(0.02, (o.dur - a) / 4.2));
    osc.connect(g);
    var out = pannerFor(o, g);
    if (o.lp) { var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.3; out.connect(f); out = f; }
    out.connect(o.dest || sfx);
    osc.onended = release;
    osc.start(t0); osc.stop(t0 + o.dur + 0.08);
  }

  function noise(o) {
    if (!ac || !take()) return;
    var t0 = ac.currentTime + (o.at || 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.ftype || 'lowpass'; f.Q.value = Math.min(o.q || 0.6, 1.6);
    f.frequency.setValueAtTime(o.fc, t0);
    if (o.fc2) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.fc2), t0 + o.dur * 0.9);
    var a = Math.max(0.012, o.attack || 0.012);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.vol || 0.08, t0 + a);
    g.gain.setTargetAtTime(0, t0 + a, Math.max(0.03, (o.dur - a) / 4));
    src.connect(f); f.connect(g);
    pannerFor(o, g).connect(sfx);
    src.onended = release;
    src.start(t0, Math.random() * 1.2); src.stop(t0 + o.dur + 0.08);
  }

  // جرس: مكوّنان فقط (أساسي + جزئي) بدل ثلاثة
  function bell(f, at, vol, dest, dur) {
    dur = dur || 1.6;
    tone({ f: f, dur: dur, vol: vol, at: at, attack: 0.008, dest: dest });
    tone({ f: f * 2.76, dur: dur * 0.4, vol: vol * 0.22, at: at, attack: 0.006, dest: dest });
  }

  var api = {
    init: init,
    suspend: function () { if (ac && ac.state === 'running') ac.suspend(); },
    resume: function () { if (ac && ac.state === 'suspended') ac.resume(); },
    isMuted: function () { return muted; },
    setMuted: function (m) {
      muted = !!m;
      if (ac) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.06);
    },
    click: function () { tone({ f: 640, f2: 520, dur: 0.07, vol: 0.09 }); },
    select: function () {
      tone({ f: 880, f2: 1250, dur: 0.1, vol: 0.1 });
      tone({ f: 1760, dur: 0.14, vol: 0.035, at: 0.03 });
    },
    hint: function (st) {
      if (!ac) return; var f = st === 1 ? 784 : 988; bell(hz ? f : f, 0, 0.1, sfx, 1.2); bell(f * 1.5, 0.09, 0.07, sfx, 1.2);
    },
    mirror: function () { if (!ac) return; bell(1318, 0, 0.18, sfx, 1.4); bell(1760, 0.06, 0.16, sfx, 1.4); bell(2349, 0.12, 0.14, sfx, 1.4); },
    dir: function (d) {
      var now = ac ? ac.currentTime : 0; if (now - lastDir < 0.05) return; lastDir = now;
      var base = { up: 740, right: 622, down: 494, left: 554 }[d] || 600;
      var pan = d === 'left' ? -0.5 : d === 'right' ? 0.5 : 0;
      tone({ f: base, f2: base * (d === 'up' ? 1.2 : d === 'down' ? 0.84 : 1.04), dur: 0.14, vol: 0.09, pan: pan });
    },
    activate: function () {
      [392, 587.3, 784, 1174.7].forEach(function (f, i) { tone({ f: f, dur: 1.5, vol: 0.06, at: i * 0.09, attack: 0.3 }); });
      noise({ fc: 500, fc2: 3000, dur: 0.9, vol: 0.025, attack: 0.4 });
    },
    simulate: function (d) {
      var pan = d === 'left' ? -0.4 : d === 'right' ? 0.4 : 0, up = d === 'up';
      noise({ fc: up ? 400 : 1800, fc2: up ? 1800 : 380, dur: 0.5, vol: 0.05, attack: 0.05, pan: pan });
      tone({ f: up ? 200 : 500, f2: up ? 500 : 170, dur: 0.42, vol: 0.075, type: 'triangle', pan: pan, lp: 2400 });
    },
    land: function (p) {
      var now = ac ? ac.currentTime : 0; if (now - lastLand < 0.07) return; lastLand = now;
      p = Math.max(0.15, Math.min(1, p || 0.5));
      tone({ f: 130, f2: 52, dur: 0.24 + p * 0.12, vol: 0.2 * p + 0.07 });
      noise({ fc: 700, fc2: 140, dur: 0.16, vol: 0.06 * p + 0.02 });
      tone({ f: 300, f2: 210, dur: 0.08, vol: 0.03, type: 'triangle', lp: 1800 });
    },
    plate: function (on) {
      if (on) { bell(784, 0, 0.08, null, 1.3); bell(1175, 0.09, 0.05, null, 1.1); }
      else tone({ f: 330, f2: 230, dur: 0.18, vol: 0.07, type: 'triangle', lp: 1600 });
    },
    success: function () {
      [0, 4, 7, 12, 16].forEach(function (iv, i) { bell(hz(72 + iv), i * 0.12, 0.07, null, 2); });
    },
    gate: function () {
      noise({ fc: 140, fc2: 800, dur: 1.4, vol: 0.07, attack: 0.3 });
      tone({ f: 98, f2: 180, dur: 1.6, vol: 0.09, type: 'triangle', attack: 0.4, lp: 900 });
      [0, 7, 12].forEach(function (iv, i) { tone({ f: hz(60 + iv), dur: 2.2, vol: 0.05, at: 0.3 + i * 0.12, attack: 0.5 }); });
    },
    error: function () {
      tone({ f: 180, dur: 0.12, vol: 0.09, type: 'triangle', lp: 1400 });
      tone({ f: 135, dur: 0.18, vol: 0.09, at: 0.1, type: 'triangle', lp: 1400 });
    },
    locked: function () {
      tone({ f: 230, dur: 0.09, vol: 0.08, type: 'triangle', lp: 1500 });
      tone({ f: 170, dur: 0.15, vol: 0.08, at: 0.07, type: 'triangle', lp: 1500 });
    },
    undo: function () { tone({ f: 600, f2: 380, dur: 0.15, vol: 0.08, type: 'triangle', lp: 2000 }); },



    // ===== اصطدام الكتلة: أصوات متوسطة/عالية تُسمع على سماعة الموبايل =====
    tick: function (n) {   // خطوة انزلاق خفيفة، تعلو نغمتها مع طول الانزلاق
      tone({ f: 820 + Math.min(8, n) * 70, f2: 620 + Math.min(8, n) * 50, dur: 0.045, vol: 0.035, type: 'triangle' });
    },
    impact: function (kind, p) {
      p = Math.max(0.25, Math.min(1, p || 0.5));
      if (kind === 'block') {          // بلّور على بلّور: رنّة زجاجية
        bell(1976, 0, 0.09 * p + 0.03, null, 0.5); bell(2960, 0.012, 0.06 * p, null, 0.35);
        noise({ fc: 4200, fc2: 1800, dur: 0.06, vol: 0.06 * p + 0.02, ftype: 'bandpass', q: 1.2, attack: 0.003 });
        tone({ f: 260, f2: 150, dur: 0.1, vol: 0.1 * p, type: 'triangle' });
      } else if (kind === 'gold') {    // عنصر محصّن: صدمة معدنية ثقيلة
        tone({ f: 220, f2: 90, dur: 0.18, vol: 0.2 * p + 0.06, type: 'triangle' });
        bell(523, 0, 0.09 * p + 0.03, null, 0.9); bell(1318, 0.01, 0.05 * p, null, 0.5);
        noise({ fc: 1800, fc2: 400, dur: 0.1, vol: 0.12 * p + 0.03, ftype: 'bandpass', q: 0.9, attack: 0.003 });
      } else {                         // جدار حجري: ضربة + شرارة بلّورية
        tone({ f: 190, f2: 75, dur: 0.2, vol: 0.22 * p + 0.06, type: 'triangle' });
        tone({ f: 95, f2: 45, dur: 0.25, vol: 0.2 * p, type: 'sine' });
        noise({ fc: 1500, fc2: 280, dur: 0.14, vol: 0.15 * p + 0.04, ftype: 'bandpass', q: 0.8, attack: 0.003 });
        bell(1568, 0.005, 0.06 * p + 0.02, null, 0.45); bell(2349, 0.015, 0.035 * p, null, 0.3);
      }
    },
    // ===== مشهد فتح البوابة =====
    cineCharge: function () {   // دمدمة صاعدة + صفير طاقة
      noise({ fc: 70, fc2: 260, dur: 1.3, vol: 0.12, attack: 0.9 });
      tone({ f: 55, f2: 110, dur: 1.3, vol: 0.14, attack: 0.9 });
      tone({ f: 330, f2: 1650, dur: 1.2, vol: 0.05, attack: 0.9, lp: 3000 });
      tone({ f: 495, f2: 2480, dur: 1.2, vol: 0.03, attack: 0.9, lp: 3200 });
    },
    crack: function () {
      noise({ fc: 3200, fc2: 900, dur: 0.22, vol: 0.07, ftype: 'bandpass', attack: 0.012 });
      tone({ f: 1900, f2: 700, dur: 0.18, vol: 0.04, lp: 3500 });
      tone({ f: 70, f2: 50, dur: 0.3, vol: 0.12 });
    },
    boom: function () {
      tone({ f: 80, f2: 28, dur: 1.5, vol: 0.34, attack: 0.008 });
      tone({ f: 160, f2: 55, dur: 0.7, vol: 0.14, attack: 0.008 });
      noise({ fc: 2600, fc2: 90, dur: 1.3, vol: 0.2, attack: 0.012 });
      noise({ fc: 5000, fc2: 700, dur: 0.6, vol: 0.05, ftype: 'bandpass', attack: 0.01 });
      [0, 7, 12, 19].forEach(function (iv, i) { bell(hz(64 + iv), 0.08 + i * 0.07, 0.06, null, 2.6); });
    },
    crumble: function (gold, far) {   // تفتّت حجر
      far = Math.max(0, Math.min(1, far || 0));
      var f = (gold ? 420 : 260) * (0.8 + Math.random() * 0.5);
      noise({ fc: 1500 * (1 - far * 0.4), fc2: 160, dur: 0.3 + Math.random() * 0.15, vol: 0.075 * (1 - far * 0.35), attack: 0.01, pan: (Math.random() - 0.5) * 0.8 });
      tone({ f: f, f2: f * 0.35, dur: 0.16, vol: 0.05, type: 'triangle', lp: 1400, pan: (Math.random() - 0.5) * 0.8 });
      if (gold) tone({ f: 1800 + Math.random() * 900, dur: 0.25, vol: 0.02 });
    },
    shatter: function () {   // تكسّر بلّور
      for (var i = 0; i < 4; i++) tone({ f: 1800 + Math.random() * 2600, dur: 0.18 + Math.random() * 0.2, vol: 0.03, at: i * 0.025, pan: (Math.random() - 0.5) * 0.9 });
      noise({ fc: 6500, fc2: 2500, dur: 0.25, vol: 0.035, ftype: 'bandpass', attack: 0.008 });
      tone({ f: 210, f2: 90, dur: 0.2, vol: 0.09 });
    },
    absorb: function (i) {   // رنّة امتصاص صاعدة على السلم الخماسي
      var n = 76 + PENT[((i | 0) % 5)] + 12 * (((i | 0) / 5) | 0 > 1 ? 1 : 0);
      bell(hz(n), 0, 0.045, null, 0.9);
    },

    // أجواء: Pad ناعم من موجات جيبية/مثلثية فقط + أجراس خماسية متباعدة
    ambience: function (root) {
      if (!ac) return;
      api.stopAmbience();
      var t = ac.currentTime, nodes = [];
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.4;
      var g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 6);
      lp.connect(g); g.connect(mus);
      [0, 7, 12].forEach(function (iv, i) {
        [-6, 6].forEach(function (det) {
          var o = ac.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine';
          o.frequency.value = hz(root + iv - 12); o.detune.value = det;
          var og = ac.createGain(); og.gain.value = i === 0 ? 0.07 : 0.05;
          o.connect(og); og.connect(lp); o.start(t); nodes.push(o);
        });
      });
      var lfo = ac.createOscillator(); lfo.frequency.value = 0.05;
      var lg = ac.createGain(); lg.gain.value = 180;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t); nodes.push(lfo);
      pad = { nodes: nodes, g: g };
      (function ping() {
        pingT = setTimeout(function () {
          if (ac && pad && !muted && !document.hidden) {
            var n = root + 12 + PENT[(Math.random() * 5) | 0] + (Math.random() < 0.3 ? 12 : 0);
            bell(hz(n), 0, 0.03, mus, 3);
          }
          ping();
        }, 3200 + Math.random() * 4500);
      })();
    },
    stopAmbience: function () {
      clearTimeout(pingT);
      if (!pad || !ac) return;
      var p = pad; pad = null;
      p.g.gain.setTargetAtTime(0, ac.currentTime, 0.4);
      setTimeout(function () { p.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); }, 2500);
    }
  };
  return api;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AudioFX;
