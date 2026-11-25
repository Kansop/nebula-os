/** Clearly labeled sample forecasts. These numbers are not live. */

export const SAMPLE_NOTE = 'Sample data — not a live forecast';

export const CITIES = [
  {
    id: 'lisbon',
    name: 'Lisbon',
    temp: 18,
    condition: 'Clear night',
    high: 21,
    low: 14,
    wind: 12,
    humidity: 71,
    days: [
      ['Thu', 21, 14, 'Clear'],
      ['Fri', 22, 15, 'Fair'],
      ['Sat', 19, 14, 'Breeze'],
      ['Sun', 20, 13, 'Clear'],
      ['Mon', 18, 12, 'Clouds'],
    ],
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    temp: 3,
    condition: 'Light snow',
    high: 4,
    low: -1,
    wind: 28,
    humidity: 84,
    days: [
      ['Thu', 4, -1, 'Snow'],
      ['Fri', 2, -2, 'Wind'],
      ['Sat', 3, 0, 'Clouds'],
      ['Sun', 5, 1, 'Fair'],
      ['Mon', 4, 0, 'Snow'],
    ],
  },
  {
    id: 'nairobi',
    name: 'Nairobi',
    temp: 24,
    condition: 'Warm sun',
    high: 27,
    low: 16,
    wind: 9,
    humidity: 52,
    days: [
      ['Thu', 27, 16, 'Sun'],
      ['Fri', 26, 15, 'Fair'],
      ['Sat', 25, 16, 'Clouds'],
      ['Sun', 24, 15, 'Showers'],
      ['Mon', 26, 16, 'Sun'],
    ],
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    temp: 14,
    condition: 'High clouds',
    high: 16,
    low: 9,
    wind: 11,
    humidity: 63,
    days: [
      ['Thu', 16, 9, 'Clouds'],
      ['Fri', 15, 8, 'Fair'],
      ['Sat', 13, 7, 'Rain'],
      ['Sun', 14, 8, 'Clouds'],
      ['Mon', 17, 10, 'Clear'],
    ],
  },
  {
    id: 'new-york',
    name: 'New York',
    temp: 8,
    condition: 'Crisp wind',
    high: 10,
    low: 3,
    wind: 22,
    humidity: 48,
    days: [
      ['Thu', 10, 3, 'Wind'],
      ['Fri', 9, 2, 'Clear'],
      ['Sat', 7, 1, 'Clouds'],
      ['Sun', 8, 2, 'Fair'],
      ['Mon', 11, 4, 'Clear'],
    ],
  },
  {
    id: 'sydney',
    name: 'Sydney',
    temp: 26,
    condition: 'Bright afternoon',
    high: 28,
    low: 19,
    wind: 16,
    humidity: 58,
    days: [
      ['Thu', 28, 19, 'Sun'],
      ['Fri', 27, 20, 'Fair'],
      ['Sat', 24, 18, 'Showers'],
      ['Sun', 25, 18, 'Clouds'],
      ['Mon', 27, 19, 'Sun'],
    ],
  },
];

export function cityById(id) {
  return CITIES.find((city) => city.id === id) || CITIES[0];
}
