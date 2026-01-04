import { memo, useState, useEffect, useCallback } from 'react';
import { MapPin, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind, Loader2 } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  location: string;
  timestamp: number;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
}

// Weather code to description and icon mapping (WMO codes)
const WEATHER_INFO: Record<number, { description: string; icon: typeof Sun }> = {
  0: { description: 'Clear', icon: Sun },
  1: { description: 'Mainly clear', icon: Sun },
  2: { description: 'Partly cloudy', icon: Cloud },
  3: { description: 'Overcast', icon: Cloud },
  45: { description: 'Foggy', icon: CloudFog },
  48: { description: 'Rime fog', icon: CloudFog },
  51: { description: 'Light drizzle', icon: CloudRain },
  53: { description: 'Drizzle', icon: CloudRain },
  55: { description: 'Dense drizzle', icon: CloudRain },
  61: { description: 'Light rain', icon: CloudRain },
  63: { description: 'Rain', icon: CloudRain },
  65: { description: 'Heavy rain', icon: CloudRain },
  66: { description: 'Freezing rain', icon: CloudRain },
  67: { description: 'Heavy freezing rain', icon: CloudRain },
  71: { description: 'Light snow', icon: CloudSnow },
  73: { description: 'Snow', icon: CloudSnow },
  75: { description: 'Heavy snow', icon: CloudSnow },
  77: { description: 'Snow grains', icon: CloudSnow },
  80: { description: 'Light showers', icon: CloudRain },
  81: { description: 'Showers', icon: CloudRain },
  82: { description: 'Heavy showers', icon: CloudRain },
  85: { description: 'Snow showers', icon: CloudSnow },
  86: { description: 'Heavy snow showers', icon: CloudSnow },
  95: { description: 'Thunderstorm', icon: CloudLightning },
  96: { description: 'Thunderstorm with hail', icon: CloudLightning },
  99: { description: 'Heavy thunderstorm', icon: CloudLightning },
};

const CACHE_KEY = 'mydash-weather-cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedWeather(): WeatherData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as WeatherData;
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedWeather(data: WeatherData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

async function getLocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const data = await response.json();
    return data.city || data.locality || data.principalSubdivision || 'Unknown';
  } catch {
    return 'Unknown location';
  }
}

async function fetchWeather(lat: number, lon: number): Promise<{ temperature: number; weatherCode: number }> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
  );

  if (!response.ok) {
    throw new Error('Weather fetch failed');
  }

  const data = await response.json();
  return {
    temperature: Math.round(data.current.temperature_2m),
    weatherCode: data.current.weather_code,
  };
}

interface WeatherWidgetProps {
  className?: string;
  compact?: boolean;
}

export const WeatherWidget = memo(function WeatherWidget({
  className = '',
  compact = false,
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accentColor = useThemeStore((state) => state.accentColor);

  const loadWeather = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = getCachedWeather();
      if (cached) {
        setWeather(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const location = await getLocation();
      const [weatherData, locationName] = await Promise.all([
        fetchWeather(location.latitude, location.longitude),
        reverseGeocode(location.latitude, location.longitude),
      ]);

      const data: WeatherData = {
        temperature: weatherData.temperature,
        weatherCode: weatherData.weatherCode,
        location: locationName,
        timestamp: Date.now(),
      };

      setWeather(data);
      setCachedWeather(data);
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location access denied');
        } else {
          setError('Could not get location');
        }
      } else {
        setError('Could not load weather');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  const weatherInfo = weather ? WEATHER_INFO[weather.weatherCode] || { description: 'Unknown', icon: Cloud } : null;
  const WeatherIcon = weatherInfo?.icon || Cloud;

  if (loading) {
    return (
      <div className={`flex items-center justify-center gap-2 text-secondary-500 dark:text-secondary-400 ${className}`}>
        <Loader2 size={compact ? 14 : 16} className="animate-spin" />
        <span className={compact ? 'text-xs' : 'text-sm'}>Loading weather...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center gap-2 text-secondary-500 dark:text-secondary-400 ${className}`}>
        <Wind size={compact ? 14 : 16} />
        <span className={compact ? 'text-xs' : 'text-sm'}>{error}</span>
      </div>
    );
  }

  if (!weather) return null;

  const iconSize = compact ? 14 : 16;
  const textSize = compact ? 'text-xs' : 'text-sm';
  const tempSize = compact ? 'text-sm' : 'text-base';

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-secondary-600 dark:text-secondary-400">
        <MapPin size={compact ? 12 : 14} />
        <span className={textSize}>{weather.location}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <WeatherIcon size={iconSize} style={{ color: accentColor }} />
        <span className={`${tempSize} font-medium text-secondary-900 dark:text-white`}>
          {weather.temperature}°C
        </span>
        <span className={`${textSize} text-secondary-500 dark:text-secondary-400`}>
          {weatherInfo?.description}
        </span>
      </div>
    </div>
  );
});

export default WeatherWidget;
