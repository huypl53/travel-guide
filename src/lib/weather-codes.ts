import {
  Sun,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  Snowflake,
  CloudLightning,
  CloudFog,
  type LucideIcon,
} from "lucide-react";

interface WeatherInfo {
  icon: LucideIcon;
  label: string;
  isRainy: boolean;
}

const weatherMap: Record<number, WeatherInfo> = {
  0: { icon: Sun, label: "Clear", isRainy: false },
  1: { icon: Sun, label: "Mostly Clear", isRainy: false },
  2: { icon: Cloud, label: "Partly Cloudy", isRainy: false },
  3: { icon: Cloud, label: "Overcast", isRainy: false },
  45: { icon: CloudFog, label: "Fog", isRainy: false },
  48: { icon: CloudFog, label: "Rime Fog", isRainy: false },
  51: { icon: CloudDrizzle, label: "Light Drizzle", isRainy: true },
  53: { icon: CloudDrizzle, label: "Drizzle", isRainy: true },
  55: { icon: CloudDrizzle, label: "Heavy Drizzle", isRainy: true },
  56: { icon: CloudDrizzle, label: "Freezing Drizzle", isRainy: true },
  57: { icon: CloudDrizzle, label: "Heavy Freezing Drizzle", isRainy: true },
  61: { icon: CloudRain, label: "Light Rain", isRainy: true },
  63: { icon: CloudRain, label: "Rain", isRainy: true },
  65: { icon: CloudRain, label: "Heavy Rain", isRainy: true },
  66: { icon: CloudRain, label: "Freezing Rain", isRainy: true },
  67: { icon: CloudRain, label: "Heavy Freezing Rain", isRainy: true },
  71: { icon: CloudSnow, label: "Light Snow", isRainy: false },
  73: { icon: CloudSnow, label: "Snow", isRainy: false },
  75: { icon: CloudSnow, label: "Heavy Snow", isRainy: false },
  77: { icon: Snowflake, label: "Snow Grains", isRainy: false },
  80: { icon: CloudRain, label: "Light Showers", isRainy: true },
  81: { icon: CloudRain, label: "Showers", isRainy: true },
  82: { icon: CloudRain, label: "Heavy Showers", isRainy: true },
  85: { icon: CloudSnow, label: "Light Snow Showers", isRainy: false },
  86: { icon: CloudSnow, label: "Snow Showers", isRainy: false },
  95: { icon: CloudLightning, label: "Thunderstorm", isRainy: true },
  96: { icon: CloudLightning, label: "Thunderstorm + Hail", isRainy: true },
  99: { icon: CloudLightning, label: "Heavy Thunderstorm + Hail", isRainy: true },
};

const fallback: WeatherInfo = { icon: Cloud, label: "Unknown", isRainy: false };

export function getWeatherInfo(code: number): WeatherInfo {
  return weatherMap[code] ?? fallback;
}
