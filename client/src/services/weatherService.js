// OpenWeather API & IndexedDB Weather Caching Service
// Persists weather to IndexedDB and refetches only when the clock hour has passed

const OPENWEATHER_API_KEY =
  import.meta.env.VITE_OPENWEATHER_API_KEY || 'e8e15d0da03d3cc031d1849f37c33818';

const DB_NAME = 'ImmunoAI_WeatherDB';
const DB_VERSION = 1;
const STORE_NAME = 'weather_cache';
const CACHE_KEY = 'latest_weather';

// Default Fallback Coordinates (Islamabad, Pakistan)
const DEFAULT_COORDS = {
  lat: 33.6844,
  lon: 73.0479,
  name: 'Islamabad',
  country: 'PK',
};

// -------------------------------------------------------------
// INDEXED DB PERSISTENCE HELPERS
// -------------------------------------------------------------
const openDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getCachedWeather = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(CACHE_KEY);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result);
        } else {
          // Fallback to localStorage check
          const local = localStorage.getItem(CACHE_KEY);
          resolve(local ? JSON.parse(local) : null);
        }
      };

      getRequest.onerror = () => {
        const local = localStorage.getItem(CACHE_KEY);
        resolve(local ? JSON.parse(local) : null);
      };
    });
  } catch (err) {
    console.warn('IndexedDB read fallback to localStorage:', err);
    const local = localStorage.getItem(CACHE_KEY);
    return local ? JSON.parse(local) : null;
  }
};

export const saveCachedWeather = async (weatherData) => {
  const payload = {
    key: CACHE_KEY,
    data: weatherData,
    updatedAt: Date.now(),
    updatedTimeString: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(payload);
  } catch (err) {
    console.warn('IndexedDB write error, saving to localStorage:', err);
  }

  // Backup to localStorage for high reliability
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota limits
  }

  return payload;
};

// -------------------------------------------------------------
// CACHE EXPIRY CHECK: "If the previous hour has passed"
// E.g. updated on 6:34, if time is >= 7:00 (hour rolled over) -> fetch again
// -------------------------------------------------------------
export const isCacheStale = (updatedAt) => {
  if (!updatedAt) return true;

  const last = new Date(updatedAt);
  const now = new Date();

  // If more than 1 hour (3600000ms) has passed
  if (now.getTime() - last.getTime() >= 3600000) {
    return true;
  }

  // Check if clock hour has crossed (e.g. from 6:34 to 7:00+)
  const isDifferentDay =
    now.getFullYear() !== last.getFullYear() ||
    now.getMonth() !== last.getMonth() ||
    now.getDate() !== last.getDate();

  if (isDifferentDay || now.getHours() !== last.getHours()) {
    return true;
  }

  return false;
};

// -------------------------------------------------------------
// GET LOCATION (HTML5 Geolocation with IP Fallback)
// -------------------------------------------------------------
export const getUserCoordinates = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_COORDS);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          isUserLocation: true,
        });
      },
      (err) => {
        console.info('Geolocation notice:', err.message, '- Using default location');
        resolve(DEFAULT_COORDS);
      },
      { timeout: 7000, enableHighAccuracy: false }
    );
  });
};

// -------------------------------------------------------------
// FETCH OPENWEATHER DATA & 5-DAY FORECAST
// -------------------------------------------------------------
export const fetchOpenWeatherData = async (coords = null) => {
  const targetCoords = coords || (await getUserCoordinates());
  const { lat, lon } = targetCoords;

  const [weatherRes, forecastRes] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    ),
  ]);

  if (!weatherRes.ok) {
    throw new Error(`OpenWeather weather error: ${weatherRes.status}`);
  }

  const weatherJson = await weatherRes.json();
  const forecastJson = forecastRes.ok ? await forecastRes.json() : null;

  // Process Current Weather
  const current = {
    temp: Math.round(weatherJson.main.temp),
    feels_like: Math.round(weatherJson.main.feels_like),
    temp_min: Math.round(weatherJson.main.temp_min),
    temp_max: Math.round(weatherJson.main.temp_max),
    humidity: weatherJson.main.humidity,
    wind_speed: Math.round((weatherJson.wind?.speed || 0) * 3.6), // Convert m/s to km/h
    description: weatherJson.weather?.[0]?.description || 'Clear',
    condition: weatherJson.weather?.[0]?.main || 'Clear',
    iconCode: weatherJson.weather?.[0]?.icon || '01d',
    cityName: weatherJson.name || targetCoords.name || 'Location',
    country: weatherJson.sys?.country || targetCoords.country || '',
    lat,
    lon,
  };

  // Process 5-Day Forecast from 40 3-hour blocks
  const forecastDays = [];
  if (forecastJson && forecastJson.list) {
    const daysMap = {};

    forecastJson.list.forEach((item) => {
      const dateKey = item.dt_txt.split(' ')[0];
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = [];
      }
      daysMap[dateKey].push(item);
    });

    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayDateKey = new Date().toISOString().split('T')[0];

    Object.keys(daysMap).forEach((dateKey, index) => {
      const items = daysMap[dateKey];
      const dateObj = new Date(dateKey + 'T12:00:00');
      const isToday = dateKey === todayDateKey || index === 0;

      // Find min and max temp across the day
      const minTemp = Math.round(
        Math.min(...items.map((i) => i.main.temp_min))
      );
      const maxTemp = Math.round(
        Math.max(...items.map((i) => i.main.temp_max))
      );

      // Select midday item (around 12:00 or 15:00) for representative condition
      const middayItem =
        items.find((i) => i.dt_txt.includes('12:00:00')) ||
        items.find((i) => i.dt_txt.includes('15:00:00')) ||
        items[Math.floor(items.length / 2)] ||
        items[0];

      forecastDays.push({
        date: dateKey,
        dayName: isToday ? 'Today' : weekdayNames[dateObj.getDay()],
        temp_min: minTemp,
        temp_max: maxTemp,
        condition: middayItem.weather?.[0]?.main || 'Clear',
        description: middayItem.weather?.[0]?.description || 'Clear',
        iconCode: middayItem.weather?.[0]?.icon || '01d',
      });
    });
  }

  const finalPayload = {
    current,
    forecast: forecastDays.slice(0, 5), // 5 days forecast
  };

  // Save to IndexedDB
  await saveCachedWeather(finalPayload);

  return finalPayload;
};
