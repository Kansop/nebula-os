/** Clock with a face, alarms, a timer, and a stopwatch. */

import { icon } from '../core/icons.js';
import { el, pad, uid } from '../core/util.js';

export const clockApp = {
  id: 'clock',
  name: 'Clock',
  blurb: 'Alarms, timer, and stopwatch',
  category: 'productivity',
  width: 760,
  height: 560,
  launch(env) {
    const root = el('div', { class: 'clockapp' });
    const face = el('canvas', { class: 'clock-face', width: '280', height: '280' });
    const digital = el('div', { class: 'clock-digital' });
    const tabs = el('div', { class: 'seg' });
    const panels = el('div', { class: 'clock-panels' });
    root.append(el('div', { class: 'clock-hero' }, [face, digital]), tabs, panels);
    env.win.body.append(root);
    const names = [['alarm', 'Alarms'], ['timer', 'Timer'], ['stop', 'Stopwatch']];
    let mode = 'alarm';
    const buttons = {};
    for (const [id, label] of names) {
      const btn = el('button', { class: 'seg-btn', type: 'button', text: label });
      btn.addEventListener('click', () => { mode = id; showPanel(); });
      buttons[id] = btn;
      tabs.append(btn);
    }
    const ctx = face.getContext('2d');
    function showPanel() {
      for (const [id, btn] of Object.entries(buttons)) btn.classList.toggle('active', id === mode);
      panels.innerHTML = '';
      if (mode === 'alarm') panels.append(alarmPanel(env, showPanel));
      else if (mode === 'timer') panels.append(timerPanel(env, showPanel));
      else panels.append(stopPanel(env, showPanel));
    }
    function drawFace(date) {
      const w = face.width;
      ctx.clearRect(0, 0, w, w);
      ctx.save();
      ctx.translate(w / 2, w / 2);
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-solid').trim() || '#161824';
      ctx.fill();
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c6bff';
      ctx.lineWidth = 4;
      ctx.stroke();
      for (let i = 0; i < 60; i += 1) {
        const a = (i / 60) * Math.PI * 2;
        const inner = i % 5 === 0 ? 98 : 106;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * inner, -Math.cos(a) * inner);
        ctx.lineTo(Math.sin(a) * 112, -Math.cos(a) * 112);
        ctx.strokeStyle = 'currentColor';
        ctx.lineWidth = i % 5 === 0 ? 2 : 1;
        ctx.stroke();
      }
      const h = date.getHours() % 12;
      const m = date.getMinutes();
      const s = date.getSeconds();
      hand(((h + m / 60) / 12) * Math.PI * 2, 62, 5);
      hand(((m + s / 60) / 60) * Math.PI * 2, 86, 3);
      hand((s / 60) * Math.PI * 2, 96, 1.5, ctx.strokeStyle);
      ctx.restore();
    }
    function hand(angle, length, width, stroke) {
      ctx.beginPath();
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = stroke || getComputedStyle(env.win.body).color;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(angle) * length, -Math.cos(angle) * length);
      ctx.stroke();
    }
    function tick() {
      const now = new Date();
      digital.textContent = now.toLocaleTimeString();
      drawFace(now);
      const display = panels.querySelector('.big-time');
      if (!display) return;
      if (mode === 'timer') display.textContent = formatMs(env.clock.timerState().remaining);
      if (mode === 'stop') display.textContent = formatMs(env.clock.stopwatchElapsed());
    }
    const timer = setInterval(tick, 250);
    env.win.onClose(() => clearInterval(timer));
    showPanel();
    tick();
  },
};

function alarmPanel(env, refresh) {
  const wrap = el('div', { class: 'stack' });
  const row = el('div', { class: 'inline' });
  const time = el('input', { type: 'time', value: '07:30', 'aria-label': 'Alarm time' });
  const label = el('input', { class: 'field', placeholder: 'Label', value: 'Wake up', 'aria-label': 'Alarm label' });
  const add = el('button', { class: 'btn btn-primary', type: 'button', text: 'Add' });
  row.append(time, label, add);
  wrap.append(row);
  const alarms = env.settings.get('alarms') || [];
  if (!alarms.length) wrap.append(el('p', { class: 'muted', text: 'No alarms yet.' }));
  for (const alarm of alarms) {
    const item = el('label', { class: 'alarm-row' });
    const check = el('input', { type: 'checkbox' });
    check.checked = alarm.enabled !== false;
    check.addEventListener('change', () => {
      alarm.enabled = check.checked;
      env.settings.set('alarms', alarms.slice());
    });
    item.append(check, el('strong', { text: alarm.time }), el('span', { class: 'grow', text: alarm.label || 'Alarm' }));
    const del = el('button', { class: 'iconbtn', type: 'button', html: icon('trash', 14), title: 'Delete' });
    del.addEventListener('click', () => {
      env.settings.set('alarms', alarms.filter((item) => item.id !== alarm.id));
      refresh();
    });
    item.append(del);
    wrap.append(item);
  }
  add.addEventListener('click', () => {
    const next = alarms.concat([{ id: uid('alarm'), time: time.value || '07:00', label: label.value.trim() || 'Alarm', enabled: true, days: [] }]);
    env.settings.set('alarms', next);
    refresh();
  });
  return wrap;
}

function timerPanel(env, refresh) {
  const wrap = el('div', { class: 'stack' });
  const state = env.clock.timerState();
  const display = el('div', { class: 'big-time', text: formatMs(state.remaining) });
  const row = el('div', { class: 'inline' });
  const minutes = el('input', { class: 'field field-sm', type: 'number', min: '0', value: '25', 'aria-label': 'Minutes' });
  const seconds = el('input', { class: 'field field-sm', type: 'number', min: '0', max: '59', value: '0', 'aria-label': 'Seconds' });
  const start = el('button', { class: 'btn btn-primary', type: 'button', text: state.running ? 'Pause' : 'Start' });
  const reset = el('button', { class: 'btn', type: 'button', text: 'Reset' });
  row.append(minutes, el('span', { text: 'min' }), seconds, el('span', { text: 'sec' }), start, reset);
  wrap.append(display, row);
  start.addEventListener('click', () => {
    const live = env.clock.timerState();
    if (live.running) env.clock.pauseTimer();
    else if (live.remaining > 0 && live.remaining !== live.duration) env.clock.resumeTimer();
    else env.clock.startTimer((Number(minutes.value) * 60 + Number(seconds.value)) * 1000);
    refresh();
  });
  reset.addEventListener('click', () => {
    env.clock.resetTimer((Number(minutes.value) * 60 + Number(seconds.value)) * 1000);
    refresh();
  });
  return wrap;
}

function stopPanel(env, refresh) {
  const wrap = el('div', { class: 'stack' });
  wrap.append(el('div', { class: 'big-time', text: formatMs(env.clock.stopwatchElapsed()) }));
  const row = el('div', { class: 'inline' });
  const toggle = el('button', { class: 'btn btn-primary', type: 'button', text: env.clock.stopwatch.running ? 'Stop' : 'Start' });
  const lap = el('button', { class: 'btn', type: 'button', text: 'Lap' });
  const reset = el('button', { class: 'btn', type: 'button', text: 'Reset' });
  row.append(toggle, lap, reset);
  wrap.append(row);
  for (const [i, value] of env.clock.stopwatch.laps.entries()) {
    wrap.append(el('div', { class: 'lap', text: `Lap ${env.clock.stopwatch.laps.length - i}  ${formatMs(value)}` }));
  }
  toggle.addEventListener('click', () => { env.clock.toggleStopwatch(); refresh(); });
  lap.addEventListener('click', () => { env.clock.lap(); refresh(); });
  reset.addEventListener('click', () => { env.clock.resetStopwatch(); refresh(); });
  return wrap;
}

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const base = `${pad(m)}:${pad(s)}`;
  return h ? `${h}:${base}` : base;
}
