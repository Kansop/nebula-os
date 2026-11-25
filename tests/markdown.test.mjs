import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../js/core/markdown.js';
import { normalizeAccounts } from '../js/core/accounts.js';

test('markdown renders structure and escapes html', () => {
  const html = renderMarkdown('# Title\n\n- **bold** item\n\n`<script>`\n');
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<li>/);
  assert.equal(html.includes('<script>'), false);
});

test('account directory keeps a valid active user', () => {
  const fresh = normalizeAccounts(null, { username: 'Ada' });
  assert.equal(fresh.users[0].name, 'Ada');
  assert.equal(fresh.active, fresh.users[0].id);
  const kept = normalizeAccounts({ active: 'u2', users: [{ id: 'u2', name: 'Bea' }] }, null);
  assert.equal(kept.active, 'u2');
});
