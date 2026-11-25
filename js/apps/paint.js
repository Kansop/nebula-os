/** Drawing canvas that saves PNG files back onto the virtual disk. */

import { icon } from '../core/icons.js';
import { el } from '../core/util.js';

const TOOLS = [
  ['pencil', 'pencil'],
  ['eraser', 'eraser'],
  ['line', 'line'],
  ['rect', 'rect'],
  ['ellipse', 'circle'],
  ['fill', 'droplet'],
  ['pick', 'eye'],
];

export const paintApp = {
  id: 'paint',
  name: 'Paint',
  blurb: 'Draw and save pictures',
  category: 'media',
  width: 980,
  height: 680,
  launch(env) {
    const colors = ['#111827', '#f8fafc', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#7c6bff', '#ec4899', '#a16207', '#64748b'];
    let tool = 'pencil';
    let color = '#7c6bff';
    let size = 4;
    let drawing = false;
    let start = null;
    const undo = [];
    const redo = [];
    const root = el('div', { class: 'paint' });
    const bar = el('div', { class: 'toolbar paint-bar' });
    const tools = el('div', { class: 'paint-tools' });
    const swatches = el('div', { class: 'swatches' });
    const picker = el('input', { type: 'color', value: color, 'aria-label': 'Color' });
    const width = el('input', { type: 'range', min: '1', max: '48', value: String(size), 'aria-label': 'Brush size' });
    const undoBtn = el('button', { class: 'iconbtn', type: 'button', title: 'Undo', html: icon('undo', 18) });
    const redoBtn = el('button', { class: 'iconbtn', type: 'button', title: 'Redo', html: icon('redo', 18) });
    const clearBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Clear' });
    const openBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Open' });
    const saveBtn = el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: 'Save' });
    bar.append(tools, swatches, picker, width, undoBtn, redoBtn, clearBtn, openBtn, saveBtn);
    const frame = el('div', { class: 'paint-frame' });
    const canvas = el('canvas', { class: 'paint-canvas', width: '1200', height: '800' });
    frame.append(canvas);
    root.append(bar, frame);
    env.win.body.append(root);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function snapshot() {
      undo.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undo.length > 25) undo.shift();
      redo.length = 0;
    }
    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      };
    }
    function strokeStart(p) {
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.fillStyle = color;
      ctx.lineWidth = tool === 'eraser' ? size * 3 : size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    for (const [id, glyph] of TOOLS) {
      const btn = el('button', { class: `iconbtn${id === tool ? ' active' : ''}`, type: 'button', title: id, html: icon(glyph, 18) });
      btn.dataset.tool = id;
      btn.addEventListener('click', () => {
        tool = id;
        tools.querySelectorAll('.iconbtn').forEach((node) => node.classList.toggle('active', node.dataset.tool === id));
      });
      tools.append(btn);
    }
    for (const swatch of colors) {
      const btn = el('button', { class: 'swatch', type: 'button', title: swatch });
      btn.style.background = swatch;
      btn.addEventListener('click', () => { color = swatch; picker.value = swatch; });
      swatches.append(btn);
    }
    picker.addEventListener('input', () => { color = picker.value; });
    width.addEventListener('input', () => { size = Number(width.value); });
    undoBtn.addEventListener('click', () => {
      if (!undo.length) return;
      redo.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      ctx.putImageData(undo.pop(), 0, 0);
    });
    redoBtn.addEventListener('click', () => {
      if (!redo.length) return;
      undo.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      ctx.putImageData(redo.pop(), 0, 0);
    });
    clearBtn.addEventListener('click', () => {
      snapshot();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    canvas.addEventListener('pointerdown', (event) => {
      const p = point(event);
      if (tool === 'fill') {
        snapshot();
        flood(ctx, Math.floor(p.x), Math.floor(p.y), color);
        return;
      }
      if (tool === 'pick') {
        const pixel = ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
        color = `#${[...pixel.slice(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        picker.value = color;
        return;
      }
      drawing = true;
      start = p;
      snapshot();
      canvas.setPointerCapture(event.pointerId);
      if (tool === 'pencil' || tool === 'eraser') strokeStart(p);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!drawing) return;
      const p = point(event);
      if (tool === 'pencil' || tool === 'eraser') {
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        return;
      }
      ctx.putImageData(undo[undo.length - 1], 0, 0);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = size;
      traceShape(ctx, tool, start, p);
    });
    canvas.addEventListener('pointerup', () => { drawing = false; });

    openBtn.addEventListener('click', async () => {
      const path = await env.files.open({
        title: 'Open image',
        start: '/Home/Pictures',
        filter: (entry) => /\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name),
      });
      if (!path) return;
      await drawFile(env.fs, path, ctx, canvas);
    });
    saveBtn.addEventListener('click', () => saveImage(env, canvas));
    const off = env.bus.on('save', (id) => { if (id === env.win.id) saveImage(env, canvas); });
    env.win.onClose(off);
    if (env.params.path) drawFile(env.fs, env.params.path, ctx, canvas);
  },
};

function traceShape(ctx, tool, a, b) {
  ctx.beginPath();
  if (tool === 'line') {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  } else if (tool === 'rect') {
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (tool === 'ellipse') {
    ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function flood(ctx, x, y, color) {
  const { width, height } = ctx.canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const start = (y * width + x) * 4;
  const target = data.slice(start, start + 4);
  const fill = hexToRgb(color);
  if (!target.length || same(target, fill)) return;
  const stack = [[x, y]];
  const seen = new Uint8Array(width * height);
  let guard = 0;
  while (stack.length && guard < width * height) {
    guard += 1;
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
    const i = cy * width + cx;
    if (seen[i]) continue;
    const p = i * 4;
    if (!same(data.slice(p, p + 4), target)) continue;
    seen[i] = 1;
    data[p] = fill[0];
    data[p + 1] = fill[1];
    data[p + 2] = fill[2];
    data[p + 3] = 255;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  ctx.putImageData(image, 0, 0);
}

function same(a, b) {
  return Math.abs(a[0] - b[0]) < 8 && Math.abs(a[1] - b[1]) < 8 && Math.abs(a[2] - b[2]) < 8;
}

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function sourceOf(fs, path) {
  const content = String(fs.read(path));
  if (content.startsWith('data:') || content.startsWith('blob:')) return content;
  if (path.endsWith('.svg') || content.trim().startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
  }
  return '';
}

function drawFile(fs, path, ctx, canvas) {
  const src = sourceOf(fs, path);
  if (!src) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

async function saveImage(env, canvas) {
  const path = await env.files.save({ title: 'Save drawing', start: '/Home/Pictures', name: 'Drawing.png' });
  if (!path) return;
  const named = path.toLowerCase().endsWith('.png') ? path : `${path}.png`;
  const data = canvas.toDataURL('image/png');
  try {
    env.fs.write(named, data, 'image/png');
    env.notify({ title: 'Saved drawing', body: named.split('/').pop(), app: 'paint' });
  } catch (error) {
    env.notify({ title: 'Save failed', body: error.message, app: 'paint' });
  }
}
