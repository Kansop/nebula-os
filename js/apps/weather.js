/** Weather-style view. All numbers are bundled sample data. */

import { el } from '../core/util.js';
import { CITIES, SAMPLE_NOTE, cityById } from '../core/weather-data.js';

export const weatherApp = {
  id: 'weather',
  name: 'Weather',
  blurb: 'Sample forecasts for six cities',
  category: 'media',
  width: 720,
  height: 560,
  launch(env) {
    const root = el('div', { class: 'weather' });
    env.win.body.append(root);
    const render = () => {
      const city = cityById(env.settings.get('weatherCity'));
      root.innerHTML = '';
      const badge = el('div', { class: 'badge', text: SAMPLE_NOTE });
      const select = el('select', { class: 'field', 'aria-label': 'City' });
      for (const item of CITIES) {
        const option = el('option', { value: item.id, text: item.name });
        if (item.id === city.id) option.selected = true;
        select.append(option);
      }
      select.addEventListener('change', () => env.settings.set('weatherCity', select.value));
      const hero = el('div', { class: 'weather-hero' });
      hero.append(el('div', { class: 'weather-temp', text: `${city.temp}°` }), el('div', { class: 'weather-cond', text: city.condition }), el('div', { class: 'muted', text: `H ${city.high}°  L ${city.low}°  ·  Wind ${city.wind} km/h  ·  Humidity ${city.humidity}%` }));
      const days = el('div', { class: 'weather-days' });
      for (const [name, high, low, cond] of city.days) {
        const card = el('div', { class: 'weather-day' });
        card.append(el('strong', { text: name }), el('span', { text: cond }), el('span', { text: `${high}° / ${low}°` }));
        days.append(card);
      }
      root.append(badge, select, hero, days);
    };
    const off = env.settings.onChange((key) => { if (key === 'weatherCity') render(); });
    env.win.onClose(off);
    render();
  },
};
