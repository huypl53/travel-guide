"use client";

import { useState, useRef, useCallback } from "react";
import { Link, Search, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTripStore } from "@/store/trip-store";
import { parseGoogleMapsUrl, isShortMapsUrl, parseCsvLocations, parseJsonLocations } from "@/lib/parsers";
import type { LocationType } from "@/lib/types";

interface LocationInputProps {
  type: LocationType;
}

export function LocationInput({ type }: LocationInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"paste" | "manual">("paste");
  const [geocoding, setGeocoding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const addLocation = useTripStore((s) => s.addLocation);

  const label = type === "homestay" ? "Homestay" : "Destination";

  const cancelPending = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  async function handlePaste() {
    let url = input.trim();

    // Resolve short URLs (maps.app.goo.gl) via server
    if (isShortMapsUrl(url)) {
      cancelPending();
      const controller = new AbortController();
      abortRef.current = controller;
      setGeocoding(true);
      try {
        const res = await fetch(`/api/resolve-url?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.resolvedUrl) {
          url = data.resolvedUrl;
        } else {
          return;
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        return;
      } finally {
        setGeocoding(false);
      }
    }

    const parsed = parseGoogleMapsUrl(url);
    if (parsed) {
      addLocation({
        type,
        name: parsed.name ?? "Unnamed",
        lat: parsed.lat,
        lon: parsed.lon,
        address: null,
        source: "google_maps",
      });
      setInput("");
    }
  }

  async function handleManual() {
    if (!input.trim()) return;
    cancelPending();
    const controller = new AbortController();
    abortRef.current = controller;
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.length > 0) {
        addLocation({
          type,
          name: data[0].name.split(",")[0],
          lat: data[0].lat,
          lon: data[0].lon,
          address: input,
          source: "manual",
        });
        setInput("");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    } finally {
      setGeocoding(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const locations = file.name.endsWith(".json")
        ? parseJsonLocations(text)
        : parseCsvLocations(text);

      locations.forEach((loc) => {
        addLocation({
          type,
          name: loc.name,
          lat: loc.lat,
          lon: loc.lon,
          address: loc.address,
          source: "csv",
        });
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={mode === "paste" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("paste")}
          aria-label="Paste Link"
        >
          <Link className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Paste Link</span>
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
          aria-label="Search Address"
        >
          <Search className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Search Address</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          aria-label="Upload File"
        >
          <Upload className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Upload File</span>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={mode === "paste" ? "Paste Google Maps link..." : `Search ${label.toLowerCase()} address...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (mode === "paste") handlePaste(); else handleManual();
            }
          }}
        />
        <Button
          onClick={mode === "paste" ? handlePaste : handleManual}
          disabled={geocoding}
          aria-label={geocoding ? "Loading" : "Add location"}
        >
          {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>
    </div>
  );
}
