"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getWeatherInfo } from "@/lib/weather-codes";
import { cn } from "@/lib/utils";

interface DayForecast {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

interface OpenMeteoResponse {
  daily?: {
    time?: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseForecast(data: OpenMeteoResponse): DayForecast[] | null {
  if (!data?.daily?.time?.length) return null;

  const { time, temperature_2m_max, temperature_2m_min, weathercode } = data.daily;

  return time.map((date, i) => {
    const d = new Date(date + "T00:00:00+07:00");
    return {
      date,
      dayName: dayNames[d.getDay()],
      tempMax: Math.round(temperature_2m_max[i]),
      tempMin: Math.round(temperature_2m_min[i]),
      weatherCode: weathercode[i],
    };
  });
}

function DayCard({ day, isToday }: { day: DayForecast; isToday: boolean }) {
  const weather = getWeatherInfo(day.weatherCode);
  const Icon = weather.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-3 py-2 min-w-[4.5rem] transition-colors",
        weather.isRainy && "bg-blue-500/10",
        isToday && "ring-1 ring-primary/30",
      )}
      title={weather.label}
    >
      <span className="text-xs font-medium text-muted-foreground">
        {isToday ? "Today" : day.dayName}
      </span>
      <Icon className={cn("h-5 w-5", weather.isRainy ? "text-blue-500" : "text-amber-500")} aria-hidden="true" />
      <span className="sr-only">{weather.label}</span>
      <div className="flex gap-1 text-xs">
        <span className="font-semibold">{day.tempMax}°</span>
        <span className="text-muted-foreground">{day.tempMin}°</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 min-w-[4.5rem]">
      <div className="h-3 w-8 rounded bg-muted animate-pulse" />
      <div className="h-5 w-5 rounded-full bg-muted animate-pulse" />
      <div className="h-3 w-12 rounded bg-muted animate-pulse" />
    </div>
  );
}

interface WeatherWidgetProps {
  center: { lat: number; lon: number } | null;
}

export function WeatherWidget({ center }: WeatherWidgetProps) {
  const [forecast, setForecast] = useState<DayForecast[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!center) return;

    let cancelled = false;

    const roundedLat = Math.round(center.lat * 100) / 100;
    const roundedLon = Math.round(center.lon * 100) / 100;

    const fetchWeather = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/weather?lat=${roundedLat}&lon=${roundedLon}`);
        if (!res.ok) throw new Error("API error");
        const data: OpenMeteoResponse = await res.json();
        if (!cancelled) {
          const parsed = parseForecast(data);
          if (!parsed) {
            setError(true);
          } else {
            setForecast(parsed);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [center?.lat, center?.lon]);

  // Hide widget if no center or API failed
  if (!center || error) return null;

  return (
    <Card className="px-4 py-3">
      {/* Desktop: show all 5 days */}
      {loading ? (
        <div className="flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : forecast ? (
        <>
          {/* Desktop view */}
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto">
            {forecast.map((day, i) => (
              <DayCard key={day.date} day={day} isToday={i === 0} />
            ))}
          </div>

          {/* Mobile view: today + expand */}
          <div className="sm:hidden">
            <div className="flex items-center gap-2 overflow-x-auto">
              <DayCard day={forecast[0]} isToday />
              {expanded &&
                forecast.slice(1).map((day) => (
                  <DayCard key={day.date} day={day} isToday={false} />
                ))}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse forecast" : "Show 5-day forecast"}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <>
                    <span className="text-xs">5-day</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}
