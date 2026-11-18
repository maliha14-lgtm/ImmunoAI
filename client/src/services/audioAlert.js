// Web Audio API Synthesizer for Security System Chimes & Intruder Sirens
// Requires zero external sound assets, works out-of-the-box in all modern browsers.

let audioCtx = null;
let sirenOscillator1 = null;
let sirenInterval = null;
let isMuted = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const setMuted = (muted) => {
  isMuted = muted;
  if (muted) {
    stopIntruderSiren();
  }
};

export const getIsMuted = () => isMuted;

// Arming sound: high futuristic double beep
export const playArmSound = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.setValueAtTime(1174.66, now + 0.1); // D6

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.35);
};

// Disarming sound: descending double beep
export const playDisarmSound = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1174.66, now); // D6
  osc.frequency.setValueAtTime(783.99, now + 0.1); // G5

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.35);
};

// Tactical Click / Toggle feedback
export const playClickSound = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, now);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
};

// Intruder Alert Siren (urgency alarm tone)
export const playIntruderAlarm = (durationMs = 4000) => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  stopIntruderSiren();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  gain.gain.setValueAtTime(0.2, now);

  // Modulation: rapid alarm warble 750Hz <-> 950Hz
  let high = true;
  osc.frequency.setValueAtTime(800, now);
  sirenInterval = setInterval(() => {
    if (!ctx) return;
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(high ? 980 : 720, t);
    high = !high;
  }, 180);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);

  sirenOscillator1 = osc;

  // Auto stop after duration
  setTimeout(() => {
    stopIntruderSiren();
  }, durationMs);
};

export const stopIntruderSiren = () => {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (sirenOscillator1) {
    try {
      sirenOscillator1.stop();
      sirenOscillator1.disconnect();
    } catch {
      // ignored if already stopped
    }
    sirenOscillator1 = null;
  }
};
