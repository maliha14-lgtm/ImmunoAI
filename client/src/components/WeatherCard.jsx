import { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  CloudFog,
  RefreshCw,
  MapPin,
  Wind,
  Droplets,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  getCachedWeather,
  isCacheStale,
  fetchOpenWeatherData
} from '../services/weatherService';

// Map OpenWeather weather conditions to clean Lucide icons
const getWeatherIcon = (condition, iconCode, size = 20, className = '') => {
  const isNight = iconCode && iconCode.endsWith('n');
  const cond = (condition || '').toLowerCase();

  if (cond.includes('thunder') || cond.includes('lightning')) {
    return <CloudLightning size={size} className={`weather-icon lightning ${className}`} />;
  }
  if (cond.includes('drizzle')) {
    return <CloudDrizzle size={size} className={`weather-icon rain ${className}`} />;
  }
  if (cond.includes('rain')) {
    return <CloudRain size={size} className={`weather-icon rain ${className}`} />;
  }
  if (cond.includes('snow')) {
    return <Snowflake size={size} className={`weather-icon snow ${className}`} />;
  }
  if (cond.includes('fog') || cond.includes('mist') || cond.includes('haze')) {
    return <CloudFog size={size} className={`weather-icon fog ${className}`} />;
  }
  if (cond.includes('cloud')) {
    return isNight ? (
      <Cloud size={size} className={`weather-icon cloud ${className}`} />
    ) : (
      <CloudSun size={size} className={`weather-icon cloud-sun ${className}`} />
    );
  }
  // Default clear/sun
  return <Sun size={size} className={`weather-icon sun ${className}`} />;
};

export const WeatherCard = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Initialize from IndexedDB & check hour-staleness
  useEffect(() => {
    let isCancelled = false;

    const initWeather = async () => {
      try {
        // Step 1: Read from IndexedDB cache
        const cached = await getCachedWeather();
        if (isCancelled) return;

        if (cached && cached.data) {
          setWeatherData(cached.data);
          setLastUpdatedTime(cached.updatedTimeString || '');
          setIsLoading(false);

          // Step 2: Check if previous hour has passed
          const stale = isCacheStale(cached.updatedAt);
          if (!stale) {
            // Fresh for this hour! No network call needed
            return;
          }
        }

        // Step 3: Hour passed or no cache -> fetch from OpenWeather
        const freshData = await fetchOpenWeatherData();
        if (isCancelled) return;

        setWeatherData(freshData);
        setLastUpdatedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
        setError(null);
      } catch (err) {
        if (!isCancelled) {
          console.warn('Weather fetch notice:', err);
          setError('Unable to reach live weather feed.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initWeather();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Manual User Force Refresh Button
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const freshData = await fetchOpenWeatherData();
      setWeatherData(freshData);
      setLastUpdatedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setError(null);
    } catch (err) {
      console.warn('Manual weather refresh error:', err);
      setError('Refresh failed. Keeping cached forecast.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Loading State
  if (isLoading && !weatherData) {
    return (
      <div className="smart-card weather-card weather-card-wide loading-state">
        <div className="weather-loading-inner">
          <RefreshCw size={20} className="spinning text-orange" />
          <span>Loading local weather & 5-day forecast...</span>
        </div>
      </div>
    );
  }

  const current = weatherData?.current || {
    temp: 24,
    feels_like: 24,
    temp_min: 18,
    temp_max: 27,
    humidity: 55,
    wind_speed: 12,
    description: 'Clear sky',
    condition: 'Clear',
    cityName: 'Current Location',
    country: '',
  };

  const forecast = weatherData?.forecast || [];

  return (
    <div className="smart-card weather-card weather-card-wide">
      {/* Top Header Row */}
      <div className="weather-top-header">
        <div className="weather-location-pill">
          <MapPin size={13} className="text-orange location-pin" />
          <span className="location-name">
            {current.cityName}
            {current.country ? `, ${current.country}` : ''}
          </span>
          <span className="weather-live-dot" title="Live OpenWeather Feed"></span>
        </div>

        <div className="weather-header-right">
          {lastUpdatedTime && (
            <span className="weather-updated-time">Updated {lastUpdatedTime}</span>
          )}
          <button
            className={`weather-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleManualRefresh}
            title="Refresh Weather & Forecast (IndexedDB Cached)"
            type="button"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Main Weather Body (Current Weather + 5-Day Forecast Grid) */}
      <div className="weather-main-grid">
        {/* Left Side: Current Weather Highlights */}
        <div className="weather-current-panel">
          <div className="current-temp-row">
            <div className="current-icon-box">
              {getWeatherIcon(current.condition, current.iconCode, 38)}
            </div>
            <div className="current-temp-numbers">
              <span className="current-temp-value">{current.temp}</span>
              <span className="current-temp-unit">°C</span>
            </div>
          </div>

          <div className="current-condition-text">
            <span className="cond-title">{current.condition}</span>
            <span className="cond-desc">{current.description}</span>
          </div>

          {/* Quick Metrics (H/L, Humidity, Wind) */}
          <div className="weather-metrics-strip">
            <div className="metric-chip">
              <ArrowUp size={11} className="text-orange" />
              <span>{current.temp_max}°</span>
              <ArrowDown size={11} className="text-muted" />
              <span>{current.temp_min}°</span>
            </div>
            <div className="metric-chip">
              <Droplets size={11} className="text-blue" />
              <span>{current.humidity}%</span>
            </div>
            <div className="metric-chip">
              <Wind size={11} className="text-secondary" />
              <span>{current.wind_speed} km/h</span>
            </div>
          </div>
        </div>

        {/* Right Side: 5-Day Forecast Strip */}
        <div className="weather-forecast-panel">
          <div className="forecast-title-row">
            <span className="forecast-section-title">5-Day Forecast</span>
          </div>

          <div className="forecast-days-row">
            {forecast.map((day, idx) => (
              <div key={idx} className={`forecast-day-cell ${idx === 0 ? 'is-today' : ''}`}>
                <span className="day-name">{day.dayName}</span>
                <div className="forecast-icon-box">
                  {getWeatherIcon(day.condition, day.iconCode, 18)}
                </div>
                <div className="day-temp-range">
                  <span className="day-high">{day.temp_max}°</span>
                  <span className="day-low">{day.temp_min}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="weather-error-banner">{error}</div>}
    </div>
  );
};
