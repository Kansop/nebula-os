import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const port = 9334;
const chrome = spawn('google-chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--window-size=1280,800',
  `--remote-debugging-port=${port}`, '--remote-allow-origins=*', 'about:blank',
], { stdio: 'ignore' });
const logs = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page;
for (let i = 0; i < 40 && !page; i += 1) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:8765/index.html`, { method: 'PUT' });
    if (res.ok) page = await res.json();
  } catch { await sleep(150); }
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) {
    const job = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) job.reject(new Error(JSON.stringify(data.error)));
    else job.resolve(data.result);
  }
  if (data.method === 'Runtime.exceptionThrown') logs.push(`EXC ${data.params.exceptionDetails.text} ${data.params.exceptionDetails.exception?.description || ''}`);
  if (data.method === 'Runtime.consoleAPICalled' && (data.params.type === 'error' || data.params.type === 'warning')) {
    logs.push(`${data.params.type} ${data.params.args.map((arg) => arg.value ?? arg.description).join(' ')}`);
  }
});
await new Promise((resolve) => ws.addEventListener('open', resolve));
await send('Runtime.enable');
await send('Page.enable');
await sleep(2200);
const evalJs = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    logs.push(`EVAL ${result.exceptionDetails.text} ${result.exceptionDetails.exception?.description || ''}`);
    return null;
  }
  return result.result.value;
};
await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.trim()==='Enter')?.click()`);
await sleep(300);
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('/tmp/nebula-desktop.png', Buffer.from(shot1.data, 'base64'));

const terminal = await evalJs(`(() => {
  const btn = [...document.querySelectorAll('.start-app')].find(n => n.textContent.includes('Terminal'));
  document.querySelector('.start-btn')?.click();
  btn?.click();
  const input = document.querySelector('.term-input');
  if (!input) return 'no-input';
  input.value = 'ls Documents && grep -n Nebula Documents/Welcome.txt';
  input.form.requestSubmit();
  return document.querySelector('.term-out').innerText;
})()`);
const code = await evalJs(`(() => {
  document.querySelector('.start-btn')?.click();
  [...document.querySelectorAll('.start-app')].find(n => n.textContent.trim()==='Code')?.click();
  const run = [...document.querySelectorAll('.window.active button')].find(b => b.textContent.includes('Run'));
  run?.click();
  return document.querySelector('.window.active .console')?.innerText || 'no-console';
})()`);
const calc = await evalJs(`(() => {
  document.querySelector('.start-btn')?.click();
  [...document.querySelectorAll('.start-app')].find(n => n.textContent.trim()==='Calculator')?.click();
  const keys = [...document.querySelectorAll('.window.active .calc-key')];
  for (const label of ['2','+','2','=']) keys.find(k => k.textContent===label)?.click();
  return document.querySelector('.window.active .calc-result')?.textContent;
})()`);
const search = await evalJs(`(() => {
  document.querySelector('.start-btn')?.click();
  const input = document.querySelector('.start-search');
  input.value = 'Welcome';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return [...document.querySelectorAll('.result')].map(n => n.innerText.replace(/\\s+/g,' ').trim()).slice(0, 6);
})()`);
const theme = await evalJs(`(() => {
  document.querySelector('.start-btn')?.click();
  [...document.querySelectorAll('.start-app')].find(n => n.textContent.trim()==='Settings')?.click();
  const light = [...document.querySelectorAll('.window.active .seg-btn')].find(b => b.textContent==='Light');
  light?.click();
  return document.documentElement.dataset.theme;
})()`);
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(300);
const mobile = await evalJs(`({
  icons: document.querySelectorAll('.desk-icon').length,
  taskbar: !!document.querySelector('.taskbar'),
  startHidden: document.getElementById('start')?.classList.contains('hidden')
})`);
console.log(JSON.stringify({ terminal, code, calc, search, theme, mobile, logs }, null, 2));
chrome.kill();
ws.close();
process.exit(logs.length ? 1 : 0);
