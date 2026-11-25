/** Address book stored on the virtual disk. */

import { el, uid } from '../core/util.js';

const FILE = '/Home/Contacts/people.json';

export const contactsApp = {
  id: 'contacts',
  name: 'Contacts',
  blurb: 'Names, mail, and notes',
  category: 'productivity',
  width: 760,
  height: 560,
  launch(env) {
    env.fs.mkdir('/Home/Contacts', { parents: true });
    if (!env.fs.exists(FILE)) {
      env.fs.write(FILE, JSON.stringify([
        { id: 'p1', name: 'Ada Orbit', email: 'ada@example.invalid', phone: '', notes: 'Sample contact — not a real person.' },
      ]), 'application/json');
    }
    let people = read(env.fs);
    let current = people[0]?.id || null;
    const root = el('div', { class: 'contacts' });
    const list = el('div', { class: 'side' });
    const form = el('form', { class: 'contact-form' });
    root.append(list, form);
    env.win.body.append(root);
    const name = field('Name');
    const email = field('Email');
    const phone = field('Phone');
    const notes = el('textarea', { class: 'field', 'aria-label': 'Notes' });
    const save = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Save' });
    const del = el('button', { class: 'btn', type: 'button', text: 'Delete' });
    form.append(name.label, name.input, email.label, email.input, phone.label, phone.input, el('label', { class: 'field-label', text: 'Notes' }), notes, el('div', { class: 'inline' }, [save, del]));

    function render() {
      list.innerHTML = '';
      list.append(el('div', { class: 'badge', text: 'Stored only on this device' }));
      const add = el('button', { class: 'btn btn-sm', type: 'button', text: 'New contact' });
      add.addEventListener('click', () => {
        const person = { id: uid('p'), name: 'New contact', email: '', phone: '', notes: '' };
        people.unshift(person);
        current = person.id;
        persist();
      });
      list.append(add);
      for (const person of people) {
        const btn = el('button', { class: `place${person.id === current ? ' active' : ''}`, type: 'button', text: person.name || 'Unnamed' });
        btn.addEventListener('click', () => { current = person.id; render(); });
        list.append(btn);
      }
      const person = people.find((item) => item.id === current);
      name.input.value = person?.name || '';
      email.input.value = person?.email || '';
      phone.input.value = person?.phone || '';
      notes.value = person?.notes || '';
      form.classList.toggle('hidden', !person);
    }
    function persist() {
      env.fs.write(FILE, JSON.stringify(people), 'application/json');
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const person = people.find((item) => item.id === current);
      if (!person) return;
      person.name = name.input.value.trim() || 'Unnamed';
      person.email = email.input.value.trim();
      person.phone = phone.input.value.trim();
      person.notes = notes.value;
      persist();
      env.notify({ title: 'Contact saved', body: person.name, app: 'contacts' });
    });
    del.addEventListener('click', () => {
      people = people.filter((item) => item.id !== current);
      current = people[0]?.id || null;
      persist();
    });
    const off = env.bus.on('fs-change', () => { people = read(env.fs); if (!people.some((item) => item.id === current)) current = people[0]?.id || null; render(); });
    env.win.onClose(off);
    render();
  },
};

function field(label) {
  return { label: el('label', { class: 'field-label', text: label }), input: el('input', { class: 'field', 'aria-label': label }) };
}

function read(fs) {
  try {
    const parsed = JSON.parse(fs.read(FILE));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
