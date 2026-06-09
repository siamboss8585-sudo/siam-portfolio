// ═══════════════════════════════════════════════════════
//  NEXIAS AI OS v3  —  location.js
//  Location + Weather System
// ═══════════════════════════════════════════════════════

window.NexiasLocation = (function () {
  'use strict';

  const LOC_KEY = 'nexias_location_v3';
  const DEFAULT_LOC = 'Chandina, Cumilla, Bangladesh';

  const WEATHER_ICONS = {
    sunny: '☀️', clear: '☀️', cloud: '⛅', overcast: '☁️',
    rain: '🌧️', drizzle: '🌦️', thunder: '⛈️', storm: '⛈️',
    snow: '❄️', mist: '🌫️', fog: '🌫️', haze: '🌫️',
    default: '🌤️'
  };

  let currentLocation = DEFAULT_LOC;
  let weatherData = null;
  let loading = false;

  // ── PERSIST ──
  function saveLocation(loc) {
    currentLocation = loc;
    localStorage.setItem(LOC_KEY, loc);
  }

  function loadLocation() {
    currentLocation = localStorage.getItem(LOC_KEY) || DEFAULT_LOC;
    return currentLocation;
  }

  // ── WEATHER FETCH via wttr.in ──
  async function fetchWeather(location) {
    if (loading) return;
    loading = true;
    setLoading(true);

    try {
      const encoded = encodeURIComponent(location);
      const res = await fetch(`https://wttr.in/${encoded}?format=j1`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      weatherData = parseWeather(data, location);
      renderWeather(weatherData);
    } catch (err) {
      // Fallback mock data for offline/error
      weatherData = {
        temp: '--', feels: '--', humidity: '--', wind: '--',
        desc: 'Weather unavailable (offline mode)', city: location,
        icon: WEATHER_ICONS.default
      };
      renderWeather(weatherData);
      window.NexiasApp?.showToast('Weather unavailable — check connection', 'error');
    } finally {
      loading = false;
      setLoading(false);
    }
  }

  function parseWeather(data, location) {
    const cur = data.current_condition?.[0] || {};
    const area = data.nearest_area?.[0];
    const city = area
      ? `${area.areaName?.[0]?.value || ''}, ${area.region?.[0]?.value || ''}, ${area.country?.[0]?.value || ''}`
      : location;

    const desc = (cur.weatherDesc?.[0]?.value || 'Clear').toLowerCase();
    let icon = WEATHER_ICONS.default;
    for (const [key, val] of Object.entries(WEATHER_ICONS)) {
      if (desc.includes(key)) { icon = val; break; }
    }

    return {
      temp:     cur.temp_C      || '--',
      feels:    cur.FeelsLikeC  || '--',
      humidity: cur.humidity    || '--',
      wind:     cur.windspeedKmph || '--',
      desc:     cur.weatherDesc?.[0]?.value || 'Clear',
      city:     city.trim().replace(/^,\s*/,''),
      icon
    };
  }

  function renderWeather(w) {
    // Full weather view
    setEl('wm-icon',     w.icon);
    setEl('wm-temp',     `${w.temp}°C`);
    setEl('wm-city',     w.city);
    setEl('wm-desc',     w.desc);
    setEl('ws-humidity', `${w.humidity}%`);
    setEl('ws-wind',     `${w.wind} km/h`);
    setEl('ws-feels',    `${w.feels}°C`);

    // Mini card (home)
    setEl('hwc-icon',  w.icon);
    setEl('hwc-temp',  `${w.temp}°C`);
    setEl('hwc-city',  w.city);
    setEl('hwc-desc',  w.desc);

    // Sidebar location
    setEl('sidebar-loc', `📍 ${w.city}`);
  }

  function setLoading(on) {
    if (on) {
      setEl('wm-desc', 'Loading weather...');
      setEl('hwc-desc', 'Loading...');
    }
  }

  function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── LOCATION INPUT ──
  function bindInputs() {
    // Weather view input
    const locInput = document.getElementById('location-input');
    const locSave  = document.getElementById('location-save-btn');
    if (locInput) locInput.value = currentLocation;

    locSave?.addEventListener('click', () => {
      const v = locInput?.value.trim();
      if (!v) return;
      saveLocation(v);
      fetchWeather(v);
      window.NexiasApp?.showToast('Location saved ✓', 'success');
    });
    locInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') locSave?.click();
    });

    // Refresh buttons
    document.getElementById('weather-refresh-btn')?.addEventListener('click', refresh);
    document.getElementById('hwc-refresh')?.addEventListener('click', refresh);

    // Location edit modal (sidebar)
    document.getElementById('location-edit-btn')?.addEventListener('click', () => {
      const ml = document.getElementById('ml-input');
      if (ml) ml.value = currentLocation;
      document.getElementById('modal-location')?.classList.remove('hidden');
    });
    document.getElementById('ml-cancel')?.addEventListener('click', () => {
      document.getElementById('modal-location')?.classList.add('hidden');
    });
    document.getElementById('ml-save')?.addEventListener('click', () => {
      const v = document.getElementById('ml-input')?.value.trim();
      if (!v) return;
      saveLocation(v);
      if (locInput) locInput.value = v;
      fetchWeather(v);
      document.getElementById('modal-location')?.classList.add('hidden');
      window.NexiasApp?.showToast('Location updated ✓', 'success');
    });
  }

  function refresh() {
    fetchWeather(currentLocation);
  }

  // ── INIT ──
  function init() {
    loadLocation();
    const locInput = document.getElementById('location-input');
    if (locInput) locInput.value = currentLocation;
    bindInputs();
    fetchWeather(currentLocation);
  }

  return {
    init,
    refresh,
    getLocation: () => currentLocation,
    getWeather: () => weatherData,
  };
})();
