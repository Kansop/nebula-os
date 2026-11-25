/** Presentation maker with an in-window present mode. */

import { el, uid } from '../core/util.js';

export const slidesApp = {
  id: 'slides',
  name: 'Slides',
  blurb: 'Build a deck and present it',
  category: 'productivity',
  width: 980,
  height: 640,
  launch(env) {
    let path = env.params.path || '';
    let deck = sampleDeck();
    let index = 0;
    const root = el('div', { class: 'slides' });
    const rail = el('div', { class: 'slide-rail' });
    const main = el('div', { class: 'slide-main' });
    const bar = el('div', { class: 'toolbar' });
    const add = el('button', { class: 'btn btn-sm', type: 'button', text: 'Add slide' });
    const del = el('button', { class: 'btn btn-sm', type: 'button', text: 'Delete' });
    const present = el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: 'Present' });
    const save = el('button', { class: 'btn btn-sm', type: 'button', text: 'Save' });
    bar.append(add, del, save, present);
    const title = el('input', { class: 'field slide-title', 'aria-label': 'Slide title' });
    const body = el('textarea', { class: 'slide-body', 'aria-label': 'Slide text' });
    main.append(bar, title, body);
    root.append(rail, main);
    env.win.body.append(root);

    function render() {
      const slide = deck.slides[index];
      title.value = slide?.title || '';
      body.value = slide?.body || '';
      rail.innerHTML = '';
      deck.slides.forEach((item, i) => {
        const btn = el('button', { class: `slide-thumb${i === index ? ' active' : ''}`, type: 'button' });
        btn.append(el('strong', { text: String(i + 1) }), el('span', { text: item.title || 'Untitled' }));
        btn.addEventListener('click', () => { commit(); index = i; render(); });
        rail.append(btn);
      });
      env.win.setTitle(path ? path.split('/').pop() : 'Slides');
    }
    function commit() {
      const slide = deck.slides[index];
      if (!slide) return;
      slide.title = title.value;
      slide.body = body.value;
    }
    title.addEventListener('input', commit);
    body.addEventListener('input', commit);
    add.addEventListener('click', () => {
      commit();
      deck.slides.splice(index + 1, 0, { id: uid('slide'), title: 'New slide', body: '' });
      index += 1;
      render();
    });
    del.addEventListener('click', () => {
      if (deck.slides.length === 1) return;
      deck.slides.splice(index, 1);
      index = Math.max(0, index - 1);
      render();
    });
    present.addEventListener('click', () => {
      commit();
      openShow(deck, index, env.win);
    });
    save.addEventListener('click', persist);
    const off = env.bus.on('save', (id) => { if (id === env.win.id) persist(); });
    env.win.onClose(off);
    async function persist() {
      commit();
      let file = path;
      if (!file) {
        file = await env.files.save({ title: 'Save slides', start: '/Home/Documents', name: 'Talk.nslide' });
        if (!file) return;
        if (!file.endsWith('.nslide')) file += '.nslide';
      }
      env.fs.write(file, JSON.stringify(deck), 'application/json');
      path = file;
      env.notify({ title: 'Slides saved', body: file.split('/').pop(), app: 'slides' });
      render();
    }
    if (path && env.fs.exists(path)) {
      try { deck = JSON.parse(env.fs.read(path)); } catch { deck = sampleDeck(); }
    }
    render();
  },
};

function sampleDeck() {
  return {
    slides: [
      { id: 's1', title: 'NebulaOS', body: 'A desktop in the browser.\nFiles stay on this device.' },
      { id: 's2', title: 'Today', body: 'Sheets, Writer, and this deck\nshare the same disk.' },
    ],
  };
}

function openShow(deck, start, win) {
  let index = start;
  const overlay = el('div', { class: 'present', role: 'dialog', 'aria-label': 'Presentation' });
  const title = el('h1');
  const body = el('pre');
  const hint = el('p', { class: 'present-hint', text: 'Arrow keys move. Escape closes.' });
  overlay.append(title, body, hint);
  document.body.append(overlay);
  const paint = () => {
    const slide = deck.slides[index];
    title.textContent = slide?.title || '';
    body.textContent = slide?.body || '';
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowRight' || event.key === ' ') { index = Math.min(deck.slides.length - 1, index + 1); paint(); }
    if (event.key === 'ArrowLeft') { index = Math.max(0, index - 1); paint(); }
  };
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
    else { index = Math.min(deck.slides.length - 1, index + 1); paint(); }
  });
  document.addEventListener('keydown', onKey);
  win.onClose(close);
  paint();
  overlay.focus();
}
