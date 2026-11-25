/** Kanban board stored as one JSON file on the virtual disk. */

import { el, uid } from '../core/util.js';

const FILE = '/Home/Board/board.json';

export const kanbanApp = {
  id: 'kanban',
  name: 'Board',
  blurb: 'To-do, doing, and done',
  category: 'productivity',
  width: 920,
  height: 620,
  launch(env) {
    env.fs.mkdir('/Home/Board', { parents: true });
    const root = el('div', { class: 'kanban' });
    env.win.body.append(root);
    let board = read(env.fs);

    function save() {
      env.fs.write(FILE, JSON.stringify(board), 'application/json');
    }
    function render() {
      root.innerHTML = '';
      for (const column of board.columns) {
        const col = el('section', { class: 'kanban-col', 'data-col': column.id });
        const head = el('div', { class: 'kanban-head' });
        head.append(el('h3', { text: column.name }), el('span', { class: 'muted', text: String(column.cards.length) }));
        const add = el('button', { class: 'btn btn-sm', type: 'button', text: 'Add' });
        add.addEventListener('click', async () => {
          const title = await env.dialogs.prompt({ title: `New card in ${column.name}`, ok: 'Add' });
          if (!title?.trim()) return;
          column.cards.push({ id: uid('card'), title: title.trim() });
          save();
        });
        head.append(add);
        const list = el('div', { class: 'kanban-list', 'data-drop': column.id });
        for (const card of column.cards) {
          const item = el('article', { class: 'kanban-card' });
          item.append(el('strong', { text: card.title }));
          const del = el('button', { class: 'btn btn-sm', type: 'button', text: 'Remove' });
          del.addEventListener('click', () => {
            column.cards = column.cards.filter((entry) => entry.id !== card.id);
            save();
          });
          item.append(del);
          item.addEventListener('pointerdown', (event) => dragCard(event, card.id, column.id));
          list.append(item);
        }
        col.append(head, list);
        root.append(col);
      }
    }
    function dragCard(event, cardId, fromId) {
      if (event.button !== 0 || event.target.closest('button')) return;
      const startX = event.clientX;
      const startY = event.clientY;
      let dragging = false;
      let ghost = null;
      const move = (ev) => {
        if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
        if (!dragging) {
          dragging = true;
          ghost = el('div', { class: 'drag-ghost', text: 'Card' });
          document.body.append(ghost);
        }
        ghost.style.left = `${ev.clientX + 12}px`;
        ghost.style.top = `${ev.clientY + 12}px`;
      };
      const up = (ev) => {
        ghost?.remove();
        if (!dragging) return;
        const dest = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]')?.dataset.drop;
        if (!dest || dest === fromId) return;
        const from = board.columns.find((column) => column.id === fromId);
        const to = board.columns.find((column) => column.id === dest);
        const card = from.cards.find((entry) => entry.id === cardId);
        from.cards = from.cards.filter((entry) => entry.id !== cardId);
        to.cards.push(card);
        save();
      };
      event.currentTarget.addEventListener('pointermove', move);
      event.currentTarget.addEventListener('pointerup', up, { once: true });
    }
    const off = env.bus.on('fs-change', () => { board = read(env.fs); render(); });
    env.win.onClose(off);
    render();
  },
};

function read(fs) {
  try {
    const parsed = JSON.parse(fs.read(FILE));
    if (Array.isArray(parsed.columns)) return parsed;
  } catch { /* seed below */ }
  const board = {
    columns: [
      { id: 'todo', name: 'To do', cards: [{ id: 'c1', title: 'Open Sheets and total a column' }] },
      { id: 'doing', name: 'Doing', cards: [] },
      { id: 'done', name: 'Done', cards: [] },
    ],
  };
  fs.write(FILE, JSON.stringify(board), 'application/json');
  return board;
}

export function openCardCount(fs) {
  try {
    const parsed = JSON.parse(fs.read(FILE));
    return (parsed.columns || []).filter((column) => column.id !== 'done').reduce((sum, column) => sum + column.cards.length, 0);
  } catch {
    return 0;
  }
}
