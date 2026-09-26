export const Sound = (() => {
  let ctx = null, master = null, humGain = null, enabled = false;

  function ensureContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    humGain = ctx.createGain(); humGain.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; lp.Q.value = 3.2;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55.0;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 55.7;
    const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 110.0;
    const g3 = ctx.createGain(); g3.gain.value = 0.30;
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp);
    lp.connect(humGain); humGain.connect(master);
    o1.start(); o2.start(); o3.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.028;
    lfo.connect(lfoGain); lfoGain.connect(humGain.gain); lfo.start();
  }

  function tone(freq, dur, type, vol, dest) {
    if (!ctx || !enabled) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(dest || master);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  function noiseBurst(dur, vol, freq) {
    if (!ctx || !enabled) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq || 420; bp.Q.value = 1.1;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t0);
  }

  return {
    get enabled() { return enabled; },
    async enable() {
      ensureContext(); if (!ctx) return false;
      if (ctx.state === 'suspended') await ctx.resume();
      enabled = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.85, ctx.currentTime + 0.5);
      humGain.gain.cancelScheduledValues(ctx.currentTime);
      humGain.gain.setValueAtTime(Math.max(humGain.gain.value, 0.0001), ctx.currentTime);
      humGain.gain.exponentialRampToValueAtTime(0.085, ctx.currentTime + 1.2);
      tone(660, 0.09, 'square', 0.055);
      setTimeout(() => tone(990, 0.10, 'square', 0.045), 90);
      return true;
    },
    disable() {
      if (!ctx) return;
      enabled = false;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    },
    hover() { tone(1180 + Math.random() * 220, 0.05, 'sine', 0.028); },
    click() { tone(520, 0.07, 'square', 0.06); noiseBurst(0.10, 0.05, 300); },
    typeBeep() { tone(1500 + Math.random() * 900, 0.028, 'square', 0.016); },
    toggle() { tone(300, 0.09, 'sawtooth', 0.05); tone(900, 0.06, 'square', 0.03); },
    whoosh() { noiseBurst(0.65, 0.075, 900); },
    servo() { tone(220, 0.05, 'sawtooth', 0.03); },
    warp() {
      if (!ctx || !enabled) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t0);
      osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.7);
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.12, t0 + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + 0.9);
      noiseBurst(0.8, 0.08, 1400);
    }
  };
})();