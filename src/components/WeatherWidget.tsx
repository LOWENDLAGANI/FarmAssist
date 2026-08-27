/**
 * WeatherWidget.tsx
 * ─────────────────────────────────────────────────────────────────
 * Compact weather widget using the free Open-Meteo API.
 * Shows current outdoor conditions so users can contextualize
 * their sensor readings (e.g. "it's cloudy, so low light is normal").
 *
 * Features:
 *  • Fetches live weather every 10 minutes
 *  • Shows temperature, humidity, cloud cover, UV index
 *  • Displays weather condition icon + description
 *  • No API key needed (Open-Meteo is free)
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Loader2,
} from "lucide-react";

interface WeatherData {
  temperature: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
  uvIndex: number;
  condition: string;
  icon: string;
  isDay: boolean;
}

const WMO_ICONS: Record<number, { icon: string; label: string }> = {
  0: { icon: "☀️", label: "Clear sky" },
  1: { icon: "🌤️", label: "Mainly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Depositing rime fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Moderate drizzle" },
  55: { icon: "🌧️", label: "Dense drizzle" },
  61: { icon: "🌧️", label: "Slight rain" },
  63: { icon: "🌧️", label: "Moderate rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  71: { icon: "🌨️", label: "Slight snow" },
  73: { icon: "🌨️", label: "Moderate snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  80: { icon: "🌦️", label: "Slight showers" },
  81: { icon: "🌧️", label: "Moderate showers" },
  82: { icon: "⛈️", label: "Violent showers" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Thunderstorm with hail" },
  99: { icon: "⛈️", label: "Severe thunderstorm" },
};

function getConditionFromCode(code: number): { icon: string; label: string } {
  return WMO_ICONS[code] ?? { icon: "🌡️", label: "Unknown" };
}

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        // Try to get user's location, fall back to Bangkok
        let lat = 13.7563;
        let lon = 100.5018;

        if ("geolocation" in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>(
              (resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 5000,
                  maximumAge: 3600000,
                })
            );
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
          } catch {
            // Use default coords
          }
        }

        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,uv_index,weather_code,is_day` +
            `&timezone=auto`
        );

        if (!res.ok) throw new Error("Weather API failed");

        const data = await res.json();
        const current = data.current;
        const condition = getConditionFromCode(current.weather_code);

        if (!cancelled) {
          setWeather({
            temperature: Math.round(current.temperature_2m),
            humidity: current.relative_humidity_2m,
            cloudCover: current.cloud_cover,
            windSpeed: Math.round(current.wind_speed_10m),
            uvIndex: Math.round(current.uv_index ?? 0),
            condition: condition.label,
            icon: condition.icon,
            isDay: current.is_day === 1,
          });
          setLoading(false);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-3 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Loading weather…</span>
      </div>
    );
  }

  if (error || !weather) {
    return null; // Silently hide if weather fails
  }

  return (
    <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: condition icon + description */}
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{weather.icon}</span>
          <div>
            <p className="text-xs font-medium text-white">
              {weather.condition}
            </p>
            <p className="text-[10px] text-slate-500">Outdoor weather</p>
          </div>
        </div>

        {/* Right: key metrics */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1" title="Temperature">
            <Thermometer className="h-3 w-3 text-amber-400" />
            <span className="text-xs font-medium text-slate-300">
              {weather.temperature}°C
            </span>
          </div>
          <div className="flex items-center gap-1" title="Humidity">
            <Droplets className="h-3 w-3 text-blue-400" />
            <span className="text-xs font-medium text-slate-300">
              {weather.humidity}%
            </span>
          </div>
          <div className="flex items-center gap-1" title="Cloud cover">
            <Cloud className="h-3 w-3 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">
              {weather.cloudCover}%
            </span>
          </div>
          <div className="hidden items-center gap-1 sm:flex" title="Wind speed">
            <Wind className="h-3 w-3 text-teal-400" />
            <span className="text-xs font-medium text-slate-300">
              {weather.windSpeed} km/h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
