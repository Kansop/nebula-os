/** Shared file clipboard for Files and the desktop. */

import { basename, joinPath, uniqueName } from './util.js';

export function createClipboard(fs) {
  const state = { mode: null, paths: [] };

  function transfer(paths, destDir, mode = 'copy') {
    const moved = [];
    for (const path of paths) {
      if (!fs.exists(path)) continue;
      const parent = destDir;
      if (fs.stat(path).kind === 'dir' && (parent === path || parent.startsWith(`${path}/`))) continue;
      let name = basename(path);
      const sameParent = fs.normalize(joinPath(parent, name)) === fs.normalize(path);
      if (!sameParent && fs.exists(joinPath(parent, name))) {
        name = uniqueName(name, (candidate) => fs.exists(joinPath(parent, candidate)));
      }
      const target = joinPath(parent, name);
      if (fs.normalize(target) === fs.normalize(path)) {
        moved.push(path);
        continue;
      }
      if (mode === 'cut') fs.move(path, target);
      else fs.copy(path, target);
      moved.push(target);
    }
    return moved;
  }

  return {
    state,
    copy(paths) {
      state.mode = 'copy';
      state.paths = [...paths];
    },
    cut(paths) {
      state.mode = 'cut';
      state.paths = [...paths];
    },
    clear() {
      state.mode = null;
      state.paths = [];
    },
    paste(destDir) {
      if (!state.mode || !state.paths.length) return [];
      const mode = state.mode;
      const paths = state.paths.slice();
      const moved = transfer(paths, destDir, mode);
      if (mode === 'cut') this.clear();
      return moved;
    },
    drop(paths, destDir) {
      return transfer(paths, destDir, 'cut');
    },
  };
}
