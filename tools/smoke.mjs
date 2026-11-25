import { spawn } from 'node:child_process';

const port = 9333;
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1280,800',
  `--remote-debugging-port=${port}`,
  '--remote-allow-origins=*',
  'about:blank',
], { stdio: 'ignore' });

const logs = [];
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function connect() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:8765/index.html`, { method: 'PUT' });
      if (res.ok) return res.json();
    } catch { /* chrome still starting */ }
    await sleep(150);
  }
  throw new Error('Chrome did not open a debugging port');
}

const page = await connect();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(JSON.stringify(data.error)));
    else resolve(data.result);
    return;
  }
  if (data.method === 'Runtime.exceptionThrown') {
    logs.push(`EXC ${data.params.exceptionDetails.text} ${data.params.exceptionDetails.exception?.description || ''}`);
  }
  if (data.method === 'Runtime.consoleAPICalled') {
    const text = data.params.args.map((arg) => arg.value ?? arg.description ?? arg.type).join(' ');
    if (data.params.type === 'error' || data.params.type === 'warning') logs.push(`${data.params.type.toUpperCase()} ${text}`);
  }
  if (data.method === 'Log.entryAdded') {
    logs.push(`LOG ${data.params.entry.level} ${data.params.entry.text}`);
  }
});

await new Promise((resolve) => ws.addEventListener('open', resolve));
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8765/index.html' });
await sleep(2500);

async function evalJs(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    logs.push(`EVAL ${result.exceptionDetails.text} ${result.exceptionDetails.exception?.description || ''}`);
    return null;
  }
  return result.result.value;
}

const before = await evalJs(`document.body.innerText.slice(0, 400)`);
const clicked = await evalJs(`(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Enter'); if (!btn) return 'no-enter'; btn.click(); return 'entered'; })()`);
await sleep(600);
const apps = ['Files', 'Text Editor', 'Code', 'Terminal', 'Notes', 'Calculator', 'Paint', 'Calendar', 'Clock', 'Music', 'Viewer', 'Browser', 'Weather', 'Settings', 'Task Manager', 'Snake', 'Blocks', 'Mines', '2048', 'Solitaire', 'Breakout'];
const opened = [];
for (const name of apps) {
  const outcome = await evalJs(`(() => {
    const tiles = [...document.querySelectorAll('.start-app, .app-tile, .task-btn')];
    const start = document.querySelector('.start-btn');
    if (start && document.getElementById('start')?.classList.contains('hidden')) start.click();
    const btn = [...document.querySelectorAll('.start-app, .app-tile')].find(node => node.textContent.trim() === ${JSON.stringify(name)} || node.title === ${JSON.stringify(name)});
    if (!btn) return 'missing';
    btn.click();
    return 'ok';
  })()`);
  opened.push(`${name}:${outcome}`);
  await sleep(120);
}
await sleep(800);
const text = await evalJs(`document.body.innerText.slice(0, 800)`);
const windows = await evalJs(`document.querySelectorAll('.window').length`);
const sw = await evalJs(`navigator.serviceWorker.getRegistration().then(r => r ? r.active?.state || r.installing?.state || 'reg' : 'none')`);
console.log(JSON.stringify({ before, clicked, opened, windows, sw, text, logs }, null, 2));
chrome.kill();
ws.close();
process.exit(logs.some((line) => line.startsWith('EXC') || line.startsWith('ERROR')) ? 1 : 0);
