/** Month calendar. Events are stored in Home/Calendar/events.json. */

import { icon } from '../core/icons.js';
import { el, isoDay, uid } from '../core/util.js';

const FILE = '/Home/Calendar/events.json';

export const calendarApp = {
  id: 'calendar',
  name: 'Calendar',
  blurb: 'Month view and events',
  category: 'productivity',
  width: 860,
  height: 620,
  launch(env) {
    env.fs.mkdir('/Home/Calendar', { parents: true });
    if (!env.fs.exists(FILE)) env.fs.write(FILE, '[]', 'application/json');
    const today = new Date();
    let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    let selected = isoDay(today);
    const root = el('div', { class: 'cal' });
    const bar = el('div', { class: 'toolbar' });
    const prev = el('button', { class: 'iconbtn', type: 'button', html: icon('chevron-left', 18), 'aria-label': 'Previous month' });
    const next = el('button', { class: 'iconbtn', type: 'button', html: icon('chevron-right', 18), 'aria-label': 'Next month' });
    const label = el('strong', { class: 'grow cal-label' });
    const todayBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Today' });
    const add = el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: 'New event' });
    bar.append(prev, next, label, todayBtn, add);
    const layout = el('div', { class: 'cal-layout' });
    const grid = el('div', { class: 'cal-grid' });
    const agenda = el('div', { class: 'cal-agenda' });
    layout.append(grid, agenda);
    root.append(bar, layout);
    env.win.body.append(root);

    function load() {
      try {
        const parsed = JSON.parse(env.fs.read(FILE) || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    function store(events) {
      env.fs.write(FILE, JSON.stringify(events, null, 2), 'application/json');
    }
    function render() {
      const events = load();
      label.textContent = cursor.toLocaleDateString([], { month: 'long', year: 'numeric' });
      grid.innerHTML = '';
      for (const name of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
        grid.append(el('div', { class: 'cal-dow', text: name }));
      }
      const start = new Date(cursor);
      start.setDate(1 - start.getDay());
      for (let i = 0; i < 42; i += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const key = isoDay(day);
        const cell = el('button', { class: 'cal-day', type: 'button' });
        if (day.getMonth() !== cursor.getMonth()) cell.classList.add('muted-day');
        if (key === isoDay(new Date())) cell.classList.add('today');
        if (key === selected) cell.classList.add('selected');
        cell.append(el('span', { text: String(day.getDate()) }));
        const dots = events.filter((event) => event.date === key).length;
        if (dots) cell.append(el('i', { class: 'dot', title: `${dots} events` }));
        cell.addEventListener('click', () => { selected = key; render(); });
        grid.append(cell);
      }
      agenda.innerHTML = '';
      agenda.append(el('h3', { text: new Date(`${selected}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) }));
      const mine = events.filter((event) => event.date === selected).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      if (!mine.length) agenda.append(el('p', { class: 'muted', text: 'Nothing scheduled.' }));
      for (const event of mine) {
        const row = el('div', { class: 'event' });
        row.append(el('strong', { text: event.time || 'All day' }), el('span', { text: event.title }));
        const del = el('button', { class: 'iconbtn', type: 'button', title: 'Delete', html: icon('trash', 14) });
        del.addEventListener('click', () => store(load().filter((item) => item.id !== event.id)));
        row.append(del);
        agenda.append(row);
      }
    }
    prev.addEventListener('click', () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1); render(); });
    next.addEventListener('click', () => { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); render(); });
    todayBtn.addEventListener('click', () => {
      const now = new Date();
      cursor = new Date(now.getFullYear(), now.getMonth(), 1);
      selected = isoDay(now);
      render();
    });
    add.addEventListener('click', async () => {
      const form = await env.dialogs.form({
        title: 'New event',
        ok: 'Add',
        fields: [
          { name: 'title', label: 'Title', value: '' },
          { name: 'time', label: 'Time', value: '09:00', type: 'time' },
          { name: 'notes', label: 'Notes', value: '' },
        ],
      });
      if (!form || !form.title.trim()) return;
      const events = load();
      events.push({ id: uid('evt'), title: form.title.trim(), date: selected, time: form.time, notes: form.notes });
      store(events);
      env.notify({ title: 'Event added', body: `${form.title} on ${selected}`, app: 'calendar' });
    });
    const off = env.bus.on('fs-change', render);
    env.win.onClose(off);
    render();
  },
};

export function eventsOn(fs, day) {
  try {
    if (!fs.exists(FILE)) return [];
    const events = JSON.parse(fs.read(FILE) || '[]');
    return (Array.isArray(events) ? events : []).filter((event) => event.date === day);
  } catch {
    return [];
  }
}
