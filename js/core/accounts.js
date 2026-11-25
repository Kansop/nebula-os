/** Account directory. Each user gets a separate settings blob and virtual disk. */

const KEY = 'nebula.accounts.v1';

export function normalizeAccounts(raw, legacySettings) {
  if (raw?.active && Array.isArray(raw.users) && raw.users.some((user) => user.id === raw.active)) return raw;
  return {
    active: 'user-default',
    users: [{ id: 'user-default', name: legacySettings?.username || 'Astronaut' }],
  };
}

export function readAccounts() {
  let raw = null;
  let legacy = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
  try { legacy = JSON.parse(localStorage.getItem('nebula.settings.v1') || 'null'); } catch { legacy = null; }
  const data = normalizeAccounts(raw, legacy);
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(data));
    const perUser = `nebula.settings.v1:${data.active}`;
    if (legacy && !localStorage.getItem(perUser)) localStorage.setItem(perUser, JSON.stringify(legacy));
  }
  return data;
}

export function writeAccounts(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function accountName(data, id = data.active) {
  return data.users.find((user) => user.id === id)?.name || 'Astronaut';
}
