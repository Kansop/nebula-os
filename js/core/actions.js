/** Searchable settings actions. They change the same preferences as the Settings app. */

export function createActions(env) {
  return [
    { id: 'dark', title: 'Use dark theme', keywords: ['dark', 'theme', 'night', 'appearance'], run() { env.settings.set('theme', 'dark'); } },
    { id: 'light', title: 'Use light theme', keywords: ['light', 'theme', 'day', 'appearance'], run() { env.settings.set('theme', 'light'); } },
    { id: 'wallpaper', title: 'Change wallpaper', keywords: ['wallpaper', 'background', 'personalize'], run() { env.openApp('settings', { section: 'personal' }); } },
    { id: 'pin', title: 'Set a lock PIN', keywords: ['pin', 'password', 'lock', 'account'], run() { env.openApp('settings', { section: 'account' }); } },
    { id: 'widget', title: 'Toggle the weather widget', keywords: ['weather', 'widget', 'desktop'], run() { env.settings.set('showWidget', env.settings.get('showWidget') === false); } },
    { id: 'mute', title: 'Mute or unmute', keywords: ['mute', 'volume', 'sound'], run() { env.settings.set('muted', !env.settings.get('muted')); } },
    { id: 'trash', title: 'Open Trash', keywords: ['trash', 'recycle', 'delete'], run() { env.openApp('files', { path: '/Trash' }); } },
    { id: 'install', title: 'Install NebulaOS', keywords: ['install', 'pwa', 'app'], run() { env.openApp('settings', { section: 'about' }); } },
    { id: 'contrast', title: 'Toggle high contrast', keywords: ['contrast', 'accessibility', 'vision'], run() { env.settings.set('contrast', !env.settings.get('contrast')); } },
    { id: 'screenshot', title: 'Screenshot the active window', keywords: ['screenshot', 'capture', 'picture'], run() { env.captureActive?.(); } },
    { id: 'store', title: 'Open the App Store', keywords: ['store', 'install', 'remove', 'apps'], run() { env.openApp('store'); } },
    { id: 'backup', title: 'Back up the disk', keywords: ['backup', 'export', 'restore'], run() { env.openApp('settings', { section: 'storage' }); } },
  ];
}
