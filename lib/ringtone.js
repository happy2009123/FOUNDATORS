'use client';

// Synthesized call audio - no assets, no network requests.
//   startRingbackTune: what the CALLER hears while waiting ("caller tune").
//   startIncomingRing: what the CALLEE hears/feels when a call arrives.
// Both return a stop() function.

function makeCtx() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    return new Ctx();
  } catch (e) {
    return null;
  }
}

// Default caller tune: a gentle harp-like 8-note loop (C5 D5 E5 D5 |
// C5 B4 A4 B4) with a soft low note on each downbeat. Plucked timbre =
// triangle body + sine octave shimmer with a fast attack and soft decay.
const RINGBACK_NOTES = [523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 440.0, 493.88];
const RINGBACK_NOTE_MS = 320;
const RINGBACK_VOLUME = 0.06;

export function startRingbackTune() {
  const ctx = makeCtx();
  if (!ctx) return () => {};
  try {
    ctx.resume();
  } catch (e) {}
  const master = ctx.createGain();
  master.gain.value = RINGBACK_VOLUME;
  master.connect(ctx.destination);

  const playNote = (freq, at, dur) => {
    const g = ctx.createGain();
    g.connect(master);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(1, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.value = freq;
    body.connect(g);
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = freq * 2;
    const sg = ctx.createGain();
    sg.gain.value = 0.3;
    shimmer.connect(sg);
    sg.connect(g);
    body.start(at);
    shimmer.start(at);
    body.stop(at + dur + 0.05);
    shimmer.stop(at + dur + 0.05);
  };

  let step = 0;
  let stopped = false;
  const iv = setInterval(() => {
    if (stopped) return;
    try {
      const at = ctx.currentTime + 0.03;
      const note = RINGBACK_NOTES[step % RINGBACK_NOTES.length];
      playNote(note, at, (RINGBACK_NOTE_MS / 1000) * 0.95);
      if (step % RINGBACK_NOTES.length === 0) playNote(note / 4, at, 1.1);
      step += 1;
    } catch (e) {}
  }, RINGBACK_NOTE_MS);

  // Browsers may keep the context suspended until a gesture - resume on touch.
  const resume = () => {
    try {
      ctx.resume();
    } catch (e) {}
  };
  window.addEventListener('pointerdown', resume);

  return () => {
    stopped = true;
    clearInterval(iv);
    window.removeEventListener('pointerdown', resume);
    try {
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
    } catch (e) {}
    setTimeout(() => {
      try {
        ctx.close();
      } catch (e) {}
    }, 150);
  };
}

// Incoming-call alert: classic two-tone ring + vibration pattern
// (Android/iOS vibration where supported).
export function startIncomingRing() {
  try {
    navigator.vibrate && navigator.vibrate([400, 250, 400]);
  } catch (e) {}
  const ctx = makeCtx();
  const vibrateIv = setInterval(() => {
    try {
      navigator.vibrate && navigator.vibrate([400, 250, 400]);
    } catch (e) {}
  }, 1400);

  let cleanupTone = () => {};
  if (ctx) {
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      osc.connect(gain);
      osc.start();
      try {
        ctx.resume();
      } catch (e) {}
      const resume = () => {
        try {
          ctx.resume();
        } catch (e) {}
      };
      window.addEventListener('pointerdown', resume);
      const toneIv = setInterval(() => {
        osc.frequency.value = osc.frequency.value > 450 ? 420 : 480;
      }, 400);
      cleanupTone = () => {
        clearInterval(toneIv);
        window.removeEventListener('pointerdown', resume);
        try {
          osc.stop();
        } catch (e) {}
        try {
          ctx.close();
        } catch (e) {}
      };
    } catch (e) {}
  }

  return () => {
    clearInterval(vibrateIv);
    try {
      cleanupTone();
    } catch (e) {}
  };
}
