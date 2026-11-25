/** Task manager: open windows plus a live frame-time graph. */

import { el, formatBytes } from '../core/util.js';

export const tasksApp = {
  id: 'tasks',
  name: 'Task Manager',
  blurb: 'Windows and frame time',
  category: 'system',
  width: 680,
  height: 520,
  launch(env) {
    const root = el('div', { class: 'tasks' });
    const summary = el('div', { class: 'task-summary' });
    const canvas = el('canvas', { class: 'task-graph', width: '640', height: '120' });
    const list = el('div', { class: 'task-list-full' });
    root.append(summary, canvas, list);
    env.win.body.append(root);
    const samples = [];
    let last = performance.now();
    const ctx = canvas.getContext('2d');

    function render() {
      const wins = env.listWindows();
      const stats = env.fs.stats();
      const memory = performance.memory ? formatBytes(performance.memory.usedJSHeapSize) : `${wins.length} windows`;
      summary.innerHTML = '';
      summary.append(stat('Processes', String(wins.length)), stat('Files', String(stats.files)), stat('Disk', formatBytes(stats.bytes)), stat('Memory', memory));
      list.innerHTML = '';
      if (!wins.length) list.append(el('div', { class: 'empty', text: 'No apps are open.' }));
      for (const win of wins.sort((a, b) => b.z - a.z)) {
        const row = el('div', { class: 'task-row' });
        row.append(el('span', { class: 'grow', text: `${env.appName(win.appId)} — ${win.title}` }), el('span', { class: 'muted', text: `Desktop ${win.desktop + 1}${win.minimized ? ' · minimized' : ''}` }));
        const focus = el('button', { class: 'btn btn-sm', type: 'button', text: 'Focus' });
        const end = el('button', { class: 'btn btn-sm btn-danger', type: 'button', text: 'End' });
        focus.addEventListener('click', () => env.focusWindow(win.id));
        end.addEventListener('click', () => env.closeWindow(win.id));
        row.append(focus, end);
        list.append(row);
      }
    }
    function stat(label, value) {
      const node = el('div', { class: 'stat' });
      node.append(el('span', { text: label }), el('strong', { text: value }));
      return node;
    }
    function graph(dt) {
      samples.push(dt);
      if (samples.length > 80) samples.shift();
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c6bff';
      ctx.beginPath();
      samples.forEach((value, i) => {
        const x = (i / 80) * w;
        const y = h - Math.min(h - 4, (value / 50) * h);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    let frame;
    const loop = (now) => {
      const dt = now - last;
      last = now;
      graph(dt);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const off = env.bus.on('windows', render);
    env.win.onClose(() => { cancelAnimationFrame(frame); off(); });
    render();
  },
};
