/** Which apps can be removed from the desktop. */

export const CORE_APPS = ['files', 'settings', 'store', 'terminal'];

export function isInstalled(settings, id) {
  if (CORE_APPS.includes(id)) return true;
  const removed = settings?.get ? settings.get('removedApps') : settings?.removedApps;
  return !(removed || []).includes(id);
}
