/** Every app the desktop can launch. One module per app. */

import { browserApp } from '../apps/browser.js';
import { calcApp } from '../apps/calc.js';
import { calendarApp } from '../apps/calendar.js';
import { clockApp } from '../apps/clock.js';
import { codeApp } from '../apps/code.js';
import { editorApp } from '../apps/editor.js';
import { filesApp } from '../apps/files.js';
import { musicApp } from '../apps/music.js';
import { notesApp } from '../apps/notes.js';
import { paintApp } from '../apps/paint.js';
import { settingsApp } from '../apps/settings.js';
import { tasksApp } from '../apps/tasks.js';
import { terminalApp } from '../apps/terminal.js';
import { viewerApp } from '../apps/viewer.js';
import { archiveApp } from '../apps/archive.js';
import { clipsApp } from '../apps/clips.js';
import { contactsApp } from '../apps/contacts.js';
import { docsApp } from '../apps/docs.js';
import { kanbanApp } from '../apps/kanban.js';
import { mailApp } from '../apps/mail.js';
import { markdownApp } from '../apps/markdown.js';
import { sheetApp } from '../apps/sheet.js';
import { slidesApp } from '../apps/slides.js';
import { storeApp } from '../apps/store.js';
import { weatherApp } from '../apps/weather.js';
import { writerApp } from '../apps/writer.js';
import { breakoutApp } from '../games/breakout.js';
import { g2048App } from '../games/g2048.js';
import { minesApp } from '../games/mines.js';
import { snakeApp } from '../games/snake.js';
import { solitaireApp } from '../games/solitaire.js';
import { tetrisApp } from '../games/tetris.js';

export const APPS = [
  filesApp,
  editorApp,
  codeApp,
  terminalApp,
  notesApp,
  calcApp,
  paintApp,
  calendarApp,
  clockApp,
  musicApp,
  viewerApp,
  browserApp,
  weatherApp,
  sheetApp,
  writerApp,
  slidesApp,
  kanbanApp,
  mailApp,
  contactsApp,
  markdownApp,
  docsApp,
  archiveApp,
  clipsApp,
  storeApp,
  settingsApp,
  tasksApp,
  snakeApp,
  tetrisApp,
  minesApp,
  g2048App,
  solitaireApp,
  breakoutApp,
];

export function getApp(id) {
  return APPS.find((app) => app.id === id);
}
