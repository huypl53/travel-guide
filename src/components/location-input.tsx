"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTripStore } from "@/store/trip-store";
import { parseGoogleMapsUrl, parseCsvLocations, parseJsonLocations } from "@/lib/parsers";
import type { LocationType } from "@/lib/types";

interface LocationInputProps {
  type: LocationType;
}

export function LocationInput({ type }: LocationInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"paste" | "manual">("paste");
  const [geocoding, setGeocoding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addLocation = useTripStore((s) => s.addLocation);

  const label = type === "homestay" ? "Homestay" : "Destination";

  async function handlePaste() {
    const parsed = parseGoogleMapsUrl(input);
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
    setGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(input)}`);
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
      <div className="flex gap-2">
        <Button
          variant={mode === "paste" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("paste")}
        >
          Paste Link
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
        >
          Search Address
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          Upload File
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
            if (e.key === "Enter") mode === "paste" ? handlePaste() : handleManual();
          }}
        />
        <Button
          onClick={mode === "paste" ? handlePaste : handleManual}
          disabled={geocoding}
        >
          {geocoding ? "..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
