/** Code editor with syntax highlighting and a runnable JavaScript console. */

import { mountEditor } from './editor.js';

export const codeApp = {
  id: 'code',
  name: 'Code',
  blurb: 'Edit code and run JavaScript',
  category: 'productivity',
  width: 980,
  height: 640,
  launch(env) {
    mountEditor(env, { highlight: true, run: true });
  },
};
