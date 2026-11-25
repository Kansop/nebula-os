/** Soft interface tones. Playback waits for a user gesture and honors mute. */

export function createSounds(settings) {
  let ctx = null;
  let master = null;

  function ensure() {
    if (ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.connect(ctx.destination);
    return true;
  }

  function tone(freq, when, duration, type, amount) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(amount, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  window.addEventListener('pointerdown', () => {
    try {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    } catch { /* autoplay policies */ }
  }, { once: true });

  function play(kind) {
    if (settings.get('muted') || settings.get('sounds') === false) return;
    if (!ctx || ctx.state !== 'running') return;
    const volume = Number(settings.get('volume') ?? 0.8);
    master.gain.setTargetAtTime(Math.max(0.05, Math.min(1, volume)), ctx.currentTime, 0.02);
    const now = ctx.currentTime;
    if (kind === 'open') {
      tone(523, now, 0.09, 'sine', 0.05);
      tone(784, now + 0.06, 0.12, 'sine', 0.035);
    } else if (kind === 'notify') {
      tone(659, now, 0.1, 'sine', 0.05);
      tone(880, now + 0.08, 0.16, 'triangle', 0.03);
    } else {
      tone(494, now, 0.05, 'sine', 0.03);
    }
  }

  return { play };
}
