/** Apply theme, accent, wallpaper, and display preferences to the document. */

export function applyAppearance(settings, customWall) {
  const root = document.documentElement;
  const theme = settings.get('theme') === 'light' ? 'light' : 'dark';
  root.dataset.theme = theme;
  root.dataset.wall = settings.get('wallpaper') || 'nebula';
  root.dataset.transparency = settings.get('transparency') === false ? 'off' : 'on';
  root.dataset.motion = settings.get('reducedMotion') ? 'reduce' : 'full';
  root.dataset.contrast = settings.get('contrast') ? 'high' : 'off';
  root.style.setProperty('--accent', settings.get('accent') || '#7c6bff');
  root.style.setProperty('--dim', String(settings.get('dim') ?? 0));
  root.style.setProperty('--font-scale', String(settings.get('fontScale') || 1));
  if (settings.get('wallpaper') === 'custom' && customWall) {
    root.style.setProperty('--custom-wall', `url("${customWall}")`);
  } else {
    root.style.removeProperty('--custom-wall');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#eceff8' : '#070814');
}
