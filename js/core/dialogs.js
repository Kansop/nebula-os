/** Modal prompts shared by every app. */

import { el, esc } from './util.js';

export function createDialogs() {
  const host = el('div', { id: 'dialogs' });
  document.body.append(host);

  function open({ title, message = '', ok = 'OK', cancel = 'Cancel', danger = false, fields = null, hideCancel = false }) {
    return new Promise((resolve) => {
      const back = el('div', { class: 'dialog-back', role: 'presentation' });
      const dialog = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true' });
      const inputs = [];
      dialog.append(el('h2', { class: 'dialog-title', text: title }));
      if (message) dialog.append(el('p', { class: 'dialog-copy', text: message }));
      if (fields) {
        const form = el('div', { class: 'dialog-fields' });
        for (const field of fields) {
          const input = el('input', {
            class: 'field',
            type: field.type || 'text',
            value: field.value || '',
            placeholder: field.placeholder || '',
            'aria-label': field.label || field.name,
          });
          if (field.label) form.append(el('label', { class: 'field-label', text: field.label }));
          form.append(input);
          inputs.push([field.name, input]);
        }
        dialog.append(form);
      }
      const row = el('div', { class: 'dialog-actions' });
      const cancelBtn = hideCancel ? null : el('button', { class: 'btn', type: 'button', text: cancel });
      const okBtn = el('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button', text: ok });
      if (cancelBtn) row.append(cancelBtn);
      row.append(okBtn);
      dialog.append(row);
      back.append(dialog);
      host.append(back);

      const finish = (value) => {
        back.remove();
        document.removeEventListener('keydown', onKey);
        resolve(value);
      };
      const submit = () => {
        if (!fields) finish(true);
        else finish(Object.fromEntries(inputs.map(([name, input]) => [name, input.value])));
      };
      const onKey = (event) => {
        if (event.key === 'Escape') finish(null);
        if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          submit();
        }
      };
      back.addEventListener('pointerdown', (event) => {
        if (event.target === back) finish(null);
      });
      cancelBtn?.addEventListener('click', () => finish(null));
      okBtn.addEventListener('click', submit);
      document.addEventListener('keydown', onKey);
      (inputs[0]?.[1] || okBtn).focus();
      if (inputs[0]) inputs[0][1].select();
    });
  }

  return {
    alert(opts) { return open({ ...opts, hideCancel: true }); },
    confirm(opts) { return open(opts); },
    prompt({ title, message, value = '', ok = 'OK', placeholder = '', label = '' }) {
      return open({
        title,
        message,
        ok,
        fields: [{ name: 'value', value, placeholder, label }],
      }).then((result) => (result ? result.value : null));
    },
    form(opts) { return open(opts); },
    html(node) { host.append(node); return host; },
  };
}

export function escapeHTML(value) {
  return esc(value);
}
