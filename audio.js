/* LAWLESS — صوت Procedural بالكامل عبر Web Audio API (بدون ملفات صوتية) */
var AudioFX = (function () {
  'use strict';
  var ac = null, master, sfx, mus, verb, noiseBuf, muted = false, pad = null, pingT = 0;
  var PENT = [0, 2, 4, 7, 9];
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function impulse(sec, decay) {
    var n = (ac.sampleRate * sec) | 0, b = ac.createBuffer(2, n, ac.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.85;
    mus = ac.createGain(); mus.gain.value = 0.5;
    verb = ac.createConvolver(); verb.buffer = impulse(2.8, 2.4);
    var wet = ac.createGain(); wet.gain.value = 0.34;
    verb.connect(wet); wet.connect(master);
    sfx.connect(master); sfx.connect(verb); mus.connect(master); mus.connect(verb);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(o) {
    if (!ac) return;
    var t0 = ac.currentTime + (o.at || 0), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + o.dur);
    var a = o.attack || 0.005, v = o.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    var out = g;
    if (o.pan !== undefined && ac.createStereoPanner) {
      var p = ac.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p;
    }
    out.connect(o.dest || sfx);
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  }

  function noise(o) {
    if (!ac) return;
    var t0 = ac.currentTime + (o.at || 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.ftype || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.fc, t0);
    if (o.fc2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.fc2), t0 + o.dur);
    var a = o.attack || 0.01;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.vol || 0.15, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g);
    var out = g;
    if (o.pan !== undefined && ac.createStereoPanner) {
      var p = ac.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p;
    }
    out.connect(sfx);
    src.start(t0); src.stop(t0 + o.dur + 0.05);
  }

  function bell(f, at, vol, dest, dur) {
    dur = dur || 1.6;
    tone({ f: f, dur: dur, vol: vol, at: at, type: 'sine', attack: 0.004, dest: dest });
    tone({ f: f * 2.756, dur: dur * 0.5, vol: vol * 0.35, at: at, type: 'sine', attack: 0.004, dest: dest });
    tone({ f: f * 5.4, dur: dur * 0.25, vol: vol * 0.15, at: at, type: 'sine', attack: 0.002, dest: dest });
  }

  var api = {
    init: init,
    suspend: function () { if (ac && ac.state === 'running') ac.suspend(); },
    resume: function () { if (ac && ac.state === 'suspended') ac.resume(); },
    isMuted: function () { return muted; },
    setMuted: function (m) {
      muted = !!m;
      if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.9, ac.currentTime, 0.05);
    },
    click: function () { tone({ f: 660, f2: 520, dur: 0.06, vol: 0.12, type: 'triangle' }); },
    select: function () {
      tone({ f: 880, f2: 1320, dur: 0.09, vol: 0.14, type: 'sine' });
      tone({ f: 1760, dur: 0.12, vol: 0.05, at: 0.03, type: 'sine' });
    },
    // معاينة اتجاه: نغمة قصيرة تختلف حسب الاتجاه
    dir: function (d) {
      var base = { up: 740, right: 622, down: 494, left: 554 }[d] || 600;
      var pan = d === 'left' ? -0.6 : d === 'right' ? 0.6 : 0;
      tone({ f: base, f2: base * (d === 'up' ? 1.25 : d === 'down' ? 0.8 : 1.05), dur: 0.12, vol: 0.13, type: 'triangle', pan: pan });
    },
    activate: function () {
      [392, 587.3, 784, 1174.7].forEach(function (f, i) {
        tone({ f: f, dur: 1.4, vol: 0.09, at: i * 0.08, attack: 0.25, type: 'sine' });
      });
      noise({ fc: 400, fc2: 4200, q: 3, dur: 0.9, vol: 0.05, attack: 0.4 });
    },
    // بدء المحاكاة: اجتياح فلتر + نبضة
    simulate: function (d) {
      var pan = d === 'left' ? -0.5 : d === 'right' ? 0.5 : 0;
      var up = d === 'up';
      noise({ fc: up ? 300 : 2200, fc2: up ? 2400 : 260, q: 2, dur: 0.5, vol: 0.16, attack: 0.04, pan: pan });
      tone({ f: up ? 180 : 520, f2: up ? 520 : 150, dur: 0.45, vol: 0.12, type: 'sawtooth', pan: pan });
    },
    land: function (p) {
      p = Math.max(0.15, Math.min(1, p || 0.5));
      tone({ f: 120, f2: 42, dur: 0.22 + p * 0.15, vol: 0.28 * p + 0.1, type: 'sine' });
      noise({ fc: 900, fc2: 120, q: 0.8, dur: 0.18, vol: 0.14 * p + 0.04, ftype: 'lowpass' });
      tone({ f: 260, f2: 180, dur: 0.1, vol: 0.05, type: 'square' });
    },
    plate: function (on) {
      if (on) { bell(784, 0, 0.12, null, 1.4); bell(1175, 0.09, 0.08, null, 1.2); }
      else tone({ f: 330, f2: 220, dur: 0.18, vol: 0.1, type: 'triangle' });
    },
    success: function () {
      [0, 4, 7, 12, 16].forEach(function (iv, i) { bell(hz(72 + iv), i * 0.11, 0.1, null, 2.2); });
    },
    gate: function () {
      noise({ fc: 120, fc2: 900, q: 1.5, dur: 1.4, vol: 0.18, attack: 0.3, ftype: 'lowpass' });
      tone({ f: 98, f2: 196, dur: 1.6, vol: 0.14, type: 'sawtooth', attack: 0.4 });
      [0, 7, 12].forEach(function (iv, i) { tone({ f: hz(60 + iv), dur: 2.2, vol: 0.08, at: 0.3 + i * 0.12, attack: 0.5 }); });
    },
    error: function () {
      tone({ f: 170, dur: 0.12, vol: 0.14, type: 'square' });
      tone({ f: 130, dur: 0.18, vol: 0.14, at: 0.1, type: 'square' });
    },
    locked: function () {
      tone({ f: 220, dur: 0.08, vol: 0.12, type: 'triangle' });
      tone({ f: 165, dur: 0.14, vol: 0.12, at: 0.07, type: 'triangle' });
    },
    undo: function () { tone({ f: 600, f2: 360, dur: 0.14, vol: 0.12, type: 'triangle' }); },

    // أجواء المنطقة: Pad هادئ + أجراس عشوائية على السلم الخماسي
    ambience: function (root) {
      if (!ac) return;
      api.stopAmbience();
      var t = ac.currentTime, nodes = [];
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 0.7;
      var g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 5);
      lp.connect(g); g.connect(mus);
      [0, 7, 12, 16].forEach(function (iv, i) {
        [-7, 7].forEach(function (det) {
          var o = ac.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth';
          o.frequency.value = hz(root + iv - 12); o.detune.value = det;
          var og = ac.createGain(); og.gain.value = 0.05;
          o.connect(og); og.connect(lp); o.start(); nodes.push(o);
        });
      });
      var lfo = ac.createOscillator(); lfo.frequency.value = 0.06;
      var lg = ac.createGain(); lg.gain.value = 260;
      lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); nodes.push(lfo);
      pad = { nodes: nodes, g: g };
      (function ping() {
        pingT = setTimeout(function () {
          if (ac && pad && !muted) {
            var n = root + 12 + PENT[(Math.random() * 5) | 0] + (Math.random() < 0.3 ? 12 : 0);
            bell(hz(n), 0, 0.045, mus, 3.2);
          }
          ping();
        }, 2600 + Math.random() * 4200);
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
