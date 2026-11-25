/** Playlist UI for the shared synth. Closing the window does not stop playback. */

import { icon } from '../core/icons.js';
import { el } from '../core/util.js';

export const musicApp = {
  id: 'music',
  name: 'Music',
  blurb: 'Original pieces and a visualizer',
  category: 'media',
  width: 760,
  height: 520,
  launch(env) {
    const root = el('div', { class: 'music' });
    const stage = el('div', { class: 'music-stage' });
    const canvas = el('canvas', { class: 'viz', width: '640', height: '180' });
    const title = el('h2', { class: 'music-title' });
    const sub = el('p', { class: 'muted', text: 'Played by the Nebula synth. These are original loops, not recordings.' });
    stage.append(canvas, title, sub);
    const controls = el('div', { class: 'music-controls' });
    const prev = el('button', { class: 'iconbtn', type: 'button', html: icon('skip-prev', 20), 'aria-label': 'Previous' });
    const play = el('button', { class: 'iconbtn play-btn', type: 'button', html: icon('play', 22), 'aria-label': 'Play' });
    const next = el('button', { class: 'iconbtn', type: 'button', html: icon('skip-next', 20), 'aria-label': 'Next' });
    const volume = el('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(env.settings.get('volume') ?? 0.8), 'aria-label': 'Volume' });
    controls.append(prev, play, next, volume);
    const list = el('div', { class: 'track-list' });
    root.append(stage, controls, list);
    env.win.body.append(root);
    const ctx = canvas.getContext('2d');

    function renderList() {
      list.innerHTML = '';
      env.music.tracks.forEach((track, index) => {
        const btn = el('button', { class: `track${env.music.state.index === index ? ' active' : ''}`, type: 'button' });
        btn.append(el('strong', { text: track.title }), el('span', { class: 'muted', text: `${track.tempo} bpm · ${track.wave}` }));
        btn.addEventListener('click', () => env.music.play(index));
        list.append(btn);
      });
      const track = env.music.tracks[env.music.state.index];
      title.textContent = track.title;
      play.innerHTML = icon(env.music.state.playing ? 'pause' : 'play', 22);
    }
    function draw() {
      const analyser = env.music.analyser();
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c6bff';
      if (!analyser) {
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, h / 2, w, 2);
        ctx.globalAlpha = 1;
        return;
      }
      const bins = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(bins);
      const barW = w / bins.length;
      bins.forEach((value, i) => {
        const bh = (value / 255) * (h - 12);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.35 + (value / 255) * 0.65;
        ctx.fillRect(i * barW + 2, h - bh, Math.max(2, barW - 4), bh);
      });
      ctx.globalAlpha = 1;
    }
    prev.addEventListener('click', () => env.music.prev());
    next.addEventListener('click', () => env.music.next());
    play.addEventListener('click', () => env.music.toggle());
    volume.addEventListener('input', () => env.settings.set('volume', Number(volume.value)));
    const off = env.bus.on('music', renderList);
    const frame = setInterval(draw, 50);
    env.win.onClose(() => { off(); clearInterval(frame); });
    renderList();
    draw();
  },
};
