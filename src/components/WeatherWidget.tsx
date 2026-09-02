/**
 * WeatherWidget.tsx
 * ─────────────────────────────────────────────────────────────────
 * Compact weather widget using the free Open-Meteo API.
 * Shows current outdoor conditions so users can contextualize
 * their sensor readings (e.g. "it's cloudy, so low light is normal").
 *
 * Features:
 *  • Fetches live weather every 10 minutes
 *  • Shows temperature, humidity, cloud cover, wind speed, UV index
 *  • Displays weather condition icon + description
 *  • Custom location input — type a city name or "lat,lon" coordinates
 *  • Falls back to Bangkok when no location is available
 *  • No API key needed (Open-Meteo is free)
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Cloud,
  Wind,
  Droplets,
  Thermometer,
  Loader2,
  MapPin,
  MapPinned,
  X,
  Check,
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
const STORAGE_KEY = "farmassist-weather-location";

// Default fallback: Bangkok
const DEFAULT_LAT = 13.7563;
const DEFAULT_LON = 100.5018;

interface SavedLocation {
  lat: number;
  lon: number;
  label: string;
}

function loadSavedLocation(): SavedLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedLocation;
  } catch {
    return null;
  }
}

function saveLocation(loc: SavedLocation): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
}

function clearSavedLocation(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Geocode a city name or "lat,lon" string via Open-Meteo geocoding API.
 * Returns { lat, lon, label } or null if not found.
 */
async function geocodeLocation(input: string): Promise<SavedLocation | null> {
  const trimmed = input.trim();

  // Try "lat,lon" format first
  const coordMatch = trimmed.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
  );
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]!);
    const lon = parseFloat(coordMatch[2]!);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon, label: `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
    }
  }

  // Otherwise use Open-Meteo geocoding API
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;

    const label = [result.name, result.admin1, result.country]
      .filter(Boolean)
      .join(", ");
    return { lat: result.latitude, lon: result.longitude, label };
  } catch {
    return null;
  }
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"loading" | "granted" | "denied" | "unavailable">("loading");
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);

  // ── Custom location input state ──
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);

  // Load saved location on mount
  useEffect(() => {
    setSavedLocation(loadSavedLocation());
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,uv_index,weather_code,is_day` +
          `&timezone=auto`
      );

      if (!res.ok) throw new Error("Weather API failed");

      const data = await res.json();
      const current = data.current;
      const condition = getConditionFromCode(current.weather_code);

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
      setFetchError(false);
    } catch {
      setFetchError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const requestWeather = () => {
      // Priority: 1) saved custom location, 2) geolocation, 3) Bangkok default
      const saved = loadSavedLocation();
      if (saved) {
        setSavedLocation(saved);
        setGeoStatus("granted");
        fetchWeather(saved.lat, saved.lon);
        return;
      }

      if (!("geolocation" in navigator)) {
        setGeoStatus("unavailable");
        fetchWeather(DEFAULT_LAT, DEFAULT_LON);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) {
            setGeoStatus("granted");
            fetchWeather(pos.coords.latitude, pos.coords.longitude);
          }
        },
        (err) => {
          if (!cancelled) {
            if (err.code === err.PERMISSION_DENIED) {
              setGeoStatus("denied");
            } else {
              setGeoStatus("unavailable");
            }
            fetchWeather(DEFAULT_LAT, DEFAULT_LON);
          }
        },
        { timeout: 5000, maximumAge: 3600000 }
      );
    };

    requestWeather();
    const interval = setInterval(requestWeather, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchWeather, savedLocation?.label]);

  // ── Handle saving a custom location ──
  const handleSaveLocation = useCallback(async () => {
    if (!locationInput.trim()) return;
    setGeocoding(true);
    setGeocodeError(false);

    const result = await geocodeLocation(locationInput);
    if (!result) {
      setGeocodeError(true);
      setGeocoding(false);
      return;
    }

    saveLocation(result);
    setSavedLocation(result);
    setEditingLocation(false);
    setLocationInput("");
    setGeocoding(false);
    setLoading(true);
    setGeoStatus("granted");
    fetchWeather(result.lat, result.lon);
  }, [locationInput, fetchWeather]);

  const handleClearLocation = useCallback(() => {
    clearSavedLocation();
    setSavedLocation(null);
    setEditingLocation(false);
    setLoading(true);
    // Re-trigger geolocation or fallback to Bangkok
    if ("geolocation" in navigator) {
      setGeoStatus("loading");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus("granted");
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setGeoStatus("unavailable");
          fetchWeather(DEFAULT_LAT, DEFAULT_LON);
        },
        { timeout: 5000, maximumAge: 3600000 }
      );
    } else {
      setGeoStatus("unavailable");
      fetchWeather(DEFAULT_LAT, DEFAULT_LON);
    }
  }, [fetchWeather]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-3 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Loading weather…</span>
      </div>
    );
  }

  // ── Fetch error state ──
  if (fetchError && !weather) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-amber-900/20 bg-[#0c1a2e] px-4 py-3">
        <span className="text-sm">⚠️</span>
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-300">Weather fetch unsuccessful</p>
          <p className="text-[10px] text-slate-500">Could not reach the weather service.</p>
        </div>
      </div>
    );
  }

  const locationLabel = savedLocation?.label ?? null;
  const showLocationWarning = !savedLocation && (geoStatus === "denied" || geoStatus === "unavailable");

  return (
    <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: condition icon + description */}
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{weather?.icon ?? "🌡️"}</span>
          <div>
            <p className="text-xs font-medium text-white">
              {weather?.condition ?? "Weather data"}
            </p>
            <p className="text-[10px] text-slate-500">
              {locationLabel ? `Weather for ${locationLabel}` : "Outdoor weather"}
            </p>
          </div>
        </div>

        {/* Right: key metrics + location button */}
        <div className="flex items-center gap-4">
          {weather && (
            <>
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
              <div className="hidden items-center gap-1 sm:flex" title="Cloud cover">
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
            </>
          )}

          {/* Location / edit button */}
          <button
            type="button"
            onClick={() => {
              setEditingLocation((v) => !v);
              setGeocodeError(false);
            }}
            title={savedLocation ? `Location: ${savedLocation.label}. Click to change.` : "Set your location"}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-cyan-500/10 hover:text-cyan-400"
          >
            {savedLocation ? (
              <MapPinned className="h-3.5 w-3.5" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Custom location input panel ── */}
      {editingLocation && (
        <div className="mt-2 rounded-xl border border-cyan-900/20 bg-[#0a1628] p-3 animate-slide-down">
          <p className="mb-2 text-[10px] font-medium text-slate-400">
            Enter a city name (e.g. "Chiang Mai") or coordinates (e.g. "13.75, 100.50")
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => {
                setLocationInput(e.target.value);
                setGeocodeError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSaveLocation()}
              placeholder="City or lat, lon"
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-cyan-900/30 bg-[#0c1a2e] px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={!locationInput.trim() || geocoding}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-white transition-all hover:bg-cyan-500 active:scale-95 disabled:opacity-40"
            >
              {geocoding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            {savedLocation && (
              <button
                type="button"
                onClick={handleClearLocation}
                title="Reset to automatic location"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-500/20 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {geocodeError && (
            <p className="mt-1.5 text-[10px] text-red-400">
              Location not found. Try a different name or check the format.
            </p>
          )}
        </div>
      )}

      {/* ── Location warning (no custom location + geolocation unavailable) ── */}
      {showLocationWarning && !editingLocation && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-500/5 border border-amber-900/20 px-3 py-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="text-[11px] text-amber-300/80">
              {geoStatus === "denied"
                ? "Location access denied — showing approximate weather."
                : "Location unavailable — showing default weather (Bangkok)."}
            </p>
            <button
              type="button"
              onClick={() => setEditingLocation(true)}
              className="mt-1 text-[10px] font-medium text-cyan-400 underline underline-offset-2 transition-colors hover:text-cyan-300"
            >
              Set your location →
            </button>
          </div>
        </div>
      )}

      {/* ── Active custom location badge ── */}
      {locationLabel && !editingLocation && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-cyan-500/5 border border-cyan-900/15 px-2.5 py-1.5">
          <MapPinned className="h-3 w-3 shrink-0 text-cyan-400" />
          <p className="min-w-0 flex-1 truncate text-[10px] text-cyan-300/80">
            Custom: <span className="font-medium text-cyan-300">{locationLabel}</span>
          </p>
          <button
            type="button"
            onClick={handleClearLocation}
            title="Switch back to automatic location"
            className="shrink-0 rounded-lg border border-cyan-900/20 bg-[#0c1a2e]/80 px-2 py-1 text-[9px] font-medium text-cyan-400 transition-all hover:bg-cyan-500/15 hover:text-cyan-300 active:scale-95"
          >
            Use automatic
          </button>
        </div>
      )}
    </div>
  );
}
