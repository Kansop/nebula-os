/** Global search across apps, settings actions, and files. */

export function searchSystem({ fs, apps, actions, query }) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const results = [];
  for (const app of apps) {
    const hay = `${app.name} ${app.blurb || ''} ${app.category || ''} ${app.id}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        type: 'app',
        id: `app:${app.id}`,
        title: app.name,
        subtitle: app.blurb || app.category,
        appId: app.id,
      });
    }
  }
  for (const action of actions) {
    const hay = `${action.title} ${(action.keywords || []).join(' ')}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({
        type: 'setting',
        id: `set:${action.id}`,
        title: action.title,
        subtitle: 'Settings',
        actionId: action.id,
      });
    }
  }
  for (const hit of fs.search(q, { limit: 14 })) {
    results.push({
      type: 'file',
      id: `file:${hit.path}`,
      title: hit.name,
      subtitle: hit.snippet || hit.path,
      path: hit.path,
      kind: hit.kind,
    });
  }
  return results.slice(0, 36);
}
