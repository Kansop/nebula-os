/** A small browser: Nebula pages, plus a short allowlist of sites that can be framed. */

import { icon } from '../core/icons.js';
import { el } from '../core/util.js';

const ALLOW = [
  { url: 'https://example.com', title: 'Example' },
  { url: 'https://example.org', title: 'Example.org' },
  { url: 'https://info.cern.ch', title: 'CERN — the first website' },
];

const PAGES = {
  'nebula:home': homePage,
  'nebula:help': helpPage,
  'nebula:news': newsPage,
};

export const browserApp = {
  id: 'browser',
  name: 'Browser',
  blurb: 'Nebula pages and approved sites',
  category: 'media',
  width: 960,
  height: 640,
  launch(env) {
    const history = ['nebula:home'];
    let index = 0;
    const root = el('div', { class: 'browser' });
    const bar = el('div', { class: 'toolbar' });
    const back = el('button', { class: 'iconbtn', type: 'button', html: icon('chevron-left', 18), 'aria-label': 'Back' });
    const fwd = el('button', { class: 'iconbtn', type: 'button', html: icon('chevron-right', 18), 'aria-label': 'Forward' });
    const reload = el('button', { class: 'iconbtn', type: 'button', html: icon('refresh', 18), 'aria-label': 'Reload' });
    const form = el('form', { class: 'browser-form grow' });
    const input = el('input', { class: 'field', 'aria-label': 'Address', spellcheck: 'false' });
    const go = el('button', { class: 'btn btn-sm btn-primary', type: 'submit', text: 'Go' });
    form.append(input, go);
    bar.append(back, fwd, reload, form);
    const view = el('div', { class: 'browser-view' });
    root.append(bar, view);
    env.win.body.append(root);

    function current() { return history[index]; }
    function visit(url, { push = true } = {}) {
      const next = normalize(url);
      if (!next) {
        renderBlocked(url);
        input.value = url;
        return;
      }
      if (push && next !== current()) {
        history.splice(index + 1);
        history.push(next);
        index = history.length - 1;
      }
      input.value = next;
      render(next);
    }
    function render(url) {
      view.innerHTML = '';
      if (PAGES[url]) {
        view.append(PAGES[url](visit));
        return;
      }
      const frame = el('iframe', {
        class: 'browser-frame',
        src: url,
        title: url,
        sandbox: 'allow-scripts allow-forms allow-popups',
        referrerpolicy: 'no-referrer',
      });
      view.append(frame);
    }
    function renderBlocked(url) {
      view.innerHTML = '';
      const panel = el('div', { class: 'page' });
      panel.append(el('h2', { text: 'This site is not on the allowlist' }));
      panel.append(el('p', { text: 'Nebula Browser only opens built-in pages and a few sites that allow embedding. Many websites block iframes, so the allowlist stays short on purpose.' }));
      panel.append(el('p', { class: 'muted', text: url || '' }));
      view.append(panel);
    }
    back.addEventListener('click', () => { if (index > 0) { index -= 1; visit(current(), { push: false }); } });
    fwd.addEventListener('click', () => { if (index < history.length - 1) { index += 1; visit(current(), { push: false }); } });
    reload.addEventListener('click', () => visit(current(), { push: false }));
    form.addEventListener('submit', (event) => { event.preventDefault(); visit(input.value); });
    visit(current(), { push: false });
  },
};

function normalize(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'nebula:home';
  if (raw.startsWith('nebula:')) return PAGES[raw] ? raw : null;
  if (raw === 'home' || raw === 'help' || raw === 'news') return `nebula:${raw}`;
  let url = raw;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const hit = ALLOW.find((item) => url === item.url || url === `${item.url}/`);
  return hit ? hit.url : null;
}

function homePage(visit) {
  const page = el('div', { class: 'page' });
  page.append(el('h2', { text: 'Nebula Web' }), el('p', { text: 'A small browser inside the desktop. Built-in pages always work offline. External pages are limited to sites that can be shown in a frame.' }));
  const grid = el('div', { class: 'link-grid' });
  for (const [url, title, copy] of [['nebula:help', 'Help', 'How this browser decides what to open'], ['nebula:news', 'Sample news', 'Headlines written for NebulaOS, not the wire'], ...ALLOW.map((item) => [item.url, item.title, 'External, if the site allows framing'])]) {
    const btn = el('button', { class: 'link-card', type: 'button' });
    btn.append(el('strong', { text: title }), el('span', { text: copy }));
    btn.addEventListener('click', () => visit(url));
    grid.append(btn);
  }
  page.append(grid);
  return page;
}

function helpPage() {
  const page = el('div', { class: 'page' });
  page.append(
    el('h2', { text: 'Browser help' }),
    el('p', { text: 'Type example.com, example.org, or info.cern.ch. Other addresses stay on this explanation instead of failing inside a blank frame.' }),
    el('p', { text: 'nebula:home, nebula:help, and nebula:news are local pages rendered by NebulaOS.' }),
  );
  return page;
}

function newsPage() {
  const page = el('div', { class: 'page' });
  page.append(el('div', { class: 'badge', text: 'Sample page — not live news' }));
  page.append(el('h2', { text: 'Dockside edition' }));
  for (const [title, body] of [
    ['Window manager learns to snap', 'Half-screen layouts landed on the desktop this morning, along with a third virtual desk for people who keep too many notes open.'],
    ['Synth trio finishes a loop', 'Orbital, Quiet Dock, and Ion Drift are original pieces. Nothing here is a recording of someone else\'s song.'],
    ['Files remember the trash', 'Deleted items wait in Trash until you restore them or empty it. The same files show up in search.'],
  ]) {
    page.append(el('article', { class: 'story' }, [el('h3', { text: title }), el('p', { text: body })]));
  }
  return page;
}
