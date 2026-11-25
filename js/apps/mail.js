/** Local inbox. Sample messages are labeled and nothing is sent on the network. */

import { el, uid } from '../core/util.js';

const DIR = '/Home/Mail';

export const mailApp = {
  id: 'mail',
  name: 'Mail',
  blurb: 'Local inbox with sample mail',
  category: 'productivity',
  width: 860,
  height: 620,
  launch(env) {
    env.fs.mkdir(DIR, { parents: true });
    ensure(env.fs);
    let box = 'inbox';
    let selected = null;
    const root = el('div', { class: 'mail' });
    const side = el('div', { class: 'side' });
    const list = el('div', { class: 'mail-list' });
    const read = el('div', { class: 'mail-read' });
    root.append(side, list, read);
    env.win.body.append(root);

    function messages() {
      return JSON.parse(env.fs.read(`${DIR}/${box}.json`) || '[]');
    }
    function write(items) {
      env.fs.write(`${DIR}/${box}.json`, JSON.stringify(items), 'application/json');
    }
    function render() {
      side.innerHTML = '';
      side.append(el('div', { class: 'badge', text: 'Local only — sample mail is labeled' }));
      for (const name of ['inbox', 'sent']) {
        const btn = el('button', { class: `place${box === name ? ' active' : ''}`, type: 'button', text: name === 'inbox' ? 'Inbox' : 'Sent' });
        btn.addEventListener('click', () => { box = name; selected = null; render(); });
        side.append(btn);
      }
      const compose = el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: 'Compose' });
      compose.addEventListener('click', async () => {
        const form = await env.dialogs.form({
          title: 'New message',
          ok: 'Save to Sent',
          fields: [
            { name: 'to', label: 'To', value: '' },
            { name: 'subject', label: 'Subject', value: '' },
            { name: 'body', label: 'Message', value: '' },
          ],
        });
        if (!form || !form.subject.trim()) return;
        const sent = JSON.parse(env.fs.read(`${DIR}/sent.json`) || '[]');
        sent.unshift({ id: uid('mail'), to: form.to, from: env.settings.get('username') || 'Me', subject: form.subject.trim(), body: form.body, at: Date.now(), sample: false });
        env.fs.write(`${DIR}/sent.json`, JSON.stringify(sent), 'application/json');
        env.notify({ title: 'Saved locally', body: 'The message is in Sent. It was not delivered anywhere.', app: 'mail' });
        box = 'sent';
        render();
      });
      side.append(compose);
      const items = messages();
      list.innerHTML = '';
      for (const item of items) {
        const btn = el('button', { class: `mail-item${item.id === selected ? ' active' : ''}`, type: 'button' });
        btn.append(el('strong', { text: item.subject }), el('span', { text: item.sample ? 'Sample' : (item.from || item.to || '') }));
        btn.addEventListener('click', () => { selected = item.id; render(); });
        list.append(btn);
      }
      if (!items.length) list.append(el('div', { class: 'empty', text: 'Nothing here' }));
      const message = items.find((item) => item.id === selected) || items[0];
      read.innerHTML = '';
      if (!message) return;
      selected = message.id;
      if (message.sample) read.append(el('div', { class: 'badge', text: 'Sample message — not from a real sender' }));
      read.append(el('h2', { text: message.subject }));
      read.append(el('p', { class: 'muted', text: `${message.from || 'Me'} → ${message.to || 'Inbox'} · ${new Date(message.at).toLocaleString()}` }));
      read.append(el('p', { class: 'mail-body', text: message.body }));
      const del = el('button', { class: 'btn btn-sm', type: 'button', text: 'Delete' });
      del.addEventListener('click', () => write(messages().filter((item) => item.id !== message.id)));
      read.append(del);
    }
    const off = env.bus.on('fs-change', render);
    env.win.onClose(off);
    render();
  },
};

function ensure(fs) {
  if (!fs.exists(`${DIR}/inbox.json`)) {
    const inbox = [
      { id: 'm1', sample: true, from: 'Nebula Desk', to: 'Inbox', subject: 'Welcome aboard', body: 'Sample message. This inbox lives in Home/Mail and never contacts a server.', at: Date.now() - 86400000 },
      { id: 'm2', sample: true, from: 'Archive', to: 'Inbox', subject: 'Your files stayed put', body: 'Sample message. Zip a folder from Archive, or export the whole disk from Settings.', at: Date.now() - 3600000 },
    ];
    fs.write(`${DIR}/inbox.json`, JSON.stringify(inbox), 'application/json');
  }
  if (!fs.exists(`${DIR}/sent.json`)) fs.write(`${DIR}/sent.json`, '[]', 'application/json');
}
