/** Alarms, timer, and stopwatch that keep running when the Clock window is closed. */

import { pad } from './util.js';

export function createClockService({ settings, notify, beep }) {
  const stopwatch = { running: false, startedAt: 0, elapsed: 0, laps: [] };
  let timer = settings.get('timer') || { running: false, endsAt: 0, duration: 25 * 60 * 1000, remaining: 25 * 60 * 1000 };
  const fired = new Set();

  function persistTimer() {
    settings.set('timer', { ...timer });
  }

  function remaining() {
    if (!timer.running) return timer.remaining;
    return Math.max(0, timer.endsAt - Date.now());
  }

  function checkTimer() {
    if (!timer.running) return;
    if (Date.now() >= timer.endsAt) {
      timer.running = false;
      timer.remaining = 0;
      persistTimer();
      beep?.();
      notify({ title: 'Timer done', body: 'The countdown reached zero.', app: 'clock' });
    }
  }

  function checkAlarms() {
    const now = new Date();
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const alarms = settings.get('alarms') || [];
    let changed = false;
    for (const alarm of alarms) {
      if (!alarm.enabled) continue;
      const key = `${alarm.id}:${day}:${hhmm}`;
      if (alarm.time !== hhmm || fired.has(key) || alarm.lastFired === key) continue;
      if (alarm.days?.length && !alarm.days.includes(now.getDay())) continue;
      fired.add(key);
      alarm.lastFired = key;
      changed = true;
      beep?.();
      notify({ title: alarm.label || 'Alarm', body: alarm.time, app: 'clock' });
    }
    if (changed) settings.set('alarms', alarms.slice());
  }

  const interval = window.setInterval(() => {
    checkTimer();
    checkAlarms();
  }, 1000);

  return {
    stopwatch,
    timerState: () => ({ ...timer, remaining: remaining() }),
    startTimer(ms) {
      const duration = Math.max(1000, ms);
      timer = { running: true, duration, remaining: duration, endsAt: Date.now() + duration };
      persistTimer();
    },
    pauseTimer() {
      timer = { ...timer, running: false, remaining: remaining() };
      persistTimer();
    },
    resumeTimer() {
      const left = remaining();
      if (left <= 0) return;
      timer = { ...timer, running: true, remaining: left, endsAt: Date.now() + left };
      persistTimer();
    },
    resetTimer(ms = timer.duration || 25 * 60 * 1000) {
      timer = { running: false, duration: ms, remaining: ms, endsAt: 0 };
      persistTimer();
    },
    toggleStopwatch() {
      if (stopwatch.running) {
        stopwatch.elapsed += Date.now() - stopwatch.startedAt;
        stopwatch.running = false;
      } else {
        stopwatch.startedAt = Date.now();
        stopwatch.running = true;
      }
    },
    resetStopwatch() {
      stopwatch.running = false;
      stopwatch.elapsed = 0;
      stopwatch.startedAt = 0;
      stopwatch.laps = [];
    },
    lap() {
      const elapsed = stopwatch.running ? stopwatch.elapsed + (Date.now() - stopwatch.startedAt) : stopwatch.elapsed;
      stopwatch.laps.unshift(elapsed);
    },
    stopwatchElapsed() {
      return stopwatch.running ? stopwatch.elapsed + (Date.now() - stopwatch.startedAt) : stopwatch.elapsed;
    },
    dispose() { clearInterval(interval); },
  };
}
