/** Original looping pieces played by a small synth. Playback survives closing the app. */

const A = 440;
const note = (semi, base = A) => base * 2 ** ((semi - 9) / 12);
const C4 = note(0, 261.63);

const TRACKS = [
  {
    id: 'orbital',
    title: 'Orbital',
    tempo: 108,
    wave: 'triangle',
    steps: melody([0, 4, 7, 11, 12, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0], 1),
  },
  {
    id: 'quiet-dock',
    title: 'Quiet Dock',
    tempo: 86,
    wave: 'sine',
    steps: melody([0, 2, 3, 7, 3, 2, 0, -5, 0, 3, 7, 12, 7, 3, 2, 0], 1.5),
  },
  {
    id: 'ion-drift',
    title: 'Ion Drift',
    tempo: 120,
    wave: 'square',
    steps: melody([7, 7, 12, 11, 7, 4, 2, 4, 0, 4, 7, 4, 2, 0, -1, 0], 0.75),
  },
];

function melody(semis, beats) {
  return semis.map((semi) => ({ freq: C4 * 2 ** (semi / 12), beats, bass: C4 * 2 ** ((semi - 12) / 12) }));
}

export function createMusic({ settings, bus }) {
  let ctx = null;
  let master = null;
  let analyser = null;
  let timer = null;
  let nodes = [];
  const state = {
    playing: false,
    index: 0,
    step: 0,
    nextTime: 0,
  };

  function ensure() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    applyVolume();
  }

  function applyVolume() {
    if (!master || !ctx) return;
    const muted = settings.get('muted');
    const volume = Number(settings.get('volume') ?? 0.8);
    master.gain.setTargetAtTime(muted ? 0 : Math.max(0, Math.min(1, volume)) * 0.25, ctx.currentTime, 0.03);
  }

  function stopNotes() {
    for (const node of nodes) {
      try { node.stop(); } catch { /* already stopped */ }
    }
    nodes = [];
  }

  function tone(freq, when, dur, type, gainValue) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(gainValue, when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
    nodes.push(osc);
  }

  function tick() {
    if (!state.playing || !ctx) return;
    const track = TRACKS[state.index];
    const beat = 60 / track.tempo;
    while (state.nextTime < ctx.currentTime + 0.25) {
      const step = track.steps[state.step % track.steps.length];
      const dur = step.beats * beat * 0.92;
      tone(step.freq, state.nextTime, dur, track.wave, 0.9);
      tone(step.bass, state.nextTime, dur, 'sine', 0.35);
      state.nextTime += step.beats * beat;
      state.step += 1;
    }
    timer = window.setTimeout(tick, 60);
  }

  function play(index = state.index) {
    ensure();
    if (!ctx) return;
    ctx.resume();
    stopNotes();
    state.index = (index + TRACKS.length) % TRACKS.length;
    state.step = 0;
    state.nextTime = ctx.currentTime + 0.05;
    state.playing = true;
    clearTimeout(timer);
    tick();
    bus.emit('music');
  }

  function pause() {
    state.playing = false;
    clearTimeout(timer);
    stopNotes();
    bus.emit('music');
  }

  function toggle() {
    if (state.playing) pause();
    else play();
  }

  function beep() {
    if (!ctx || settings.get('muted')) return;
    if (ctx.state === 'suspended') return;
    tone(880, ctx.currentTime, 0.12, 'sine', 0.6);
    tone(660, ctx.currentTime + 0.14, 0.18, 'sine', 0.45);
  }

  settings.onChange((key) => {
    if (key === 'volume' || key === 'muted') applyVolume();
  });

  return {
    tracks: TRACKS,
    state,
    play,
    pause,
    toggle,
    next() { play(state.index + 1); },
    prev() { play(state.index - 1); },
    beep,
    analyser: () => analyser,
    context: () => ctx,
  };
}
