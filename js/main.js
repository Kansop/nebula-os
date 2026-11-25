import { boot } from './core/boot.js';

boot().catch((error) => {
  const status = document.getElementById('boot-status');
  if (status) status.textContent = error?.message || 'Could not start NebulaOS';
});
