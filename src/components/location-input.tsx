"use client";

import { useState, useRef, useCallback } from "react";
import { Link, Search, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTripStore } from "@/store/trip-store";
import { parseGoogleMapsUrl, isShortMapsUrl, isMultiLocationInput, parseCsvLocations, parseJsonLocations } from "@/lib/parsers";
import { ImportPreviewDialog } from "./import-preview-dialog";
import type { LocationType } from "@/lib/types";

interface LocationInputProps {
  type: LocationType;
}

export function LocationInput({ type }: LocationInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"paste" | "manual">("paste");
  const [geocoding, setGeocoding] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    locations: Array<{ name: string; lat: number; lon: number; address: string | null }>;
    errors: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const addLocation = useTripStore((s) => s.addLocation);

  const label = type === "homestay" ? "Homestay" : "Destination";

  const cancelPending = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  async function handlePaste() {
    const text = input.trim();
    if (!text) return;

    // Multi-location detection (directions URL or multiple URLs)
    if (isMultiLocationInput(text)) {
      cancelPending();
      const controller = new AbortController();
      abortRef.current = controller;
      setExtracting(true);
      try {
        const res = await fetch("/api/extract-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setImportPreview({ locations: [], errors: [data.error || "Extraction failed"] });
        } else if (data.locations?.length > 0) {
          setImportPreview({ locations: data.locations, errors: data.errors ?? [] });
        } else {
          setImportPreview({ locations: [], errors: data.errors?.length ? data.errors : ["No locations found in the provided URL(s)"] });
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setImportPreview({ locations: [], errors: ["Network error — could not extract locations"] });
      } finally {
        setExtracting(false);
      }
      return;
    }

    let url = text;

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

  function handleBulkImport(
    items: Array<{ name: string; lat: number; lon: number; address: string | null; type: LocationType }>
  ) {
    items.forEach((item) => {
      addLocation({
        type: item.type,
        name: item.name,
        lat: item.lat,
        lon: item.lon,
        address: item.address,
        source: "google_maps",
      });
    });
    setImportPreview(null);
    setInput("");
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
          placeholder={mode === "paste" ? "Paste Google Maps link(s) or directions URL..." : `Search ${label.toLowerCase()} address...`}
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
          disabled={geocoding || extracting}
          aria-label={geocoding || extracting ? "Loading" : "Add location"}
        >
          {geocoding || extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>

      {mode === "paste" && !extracting && (
        <p className="text-xs text-muted-foreground">
          Tip: Paste a Google Maps directions link to import all stops at once, or paste multiple links separated by spaces.
        </p>
      )}
      {extracting && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Extracting locations...
        </p>
      )}

      <ImportPreviewDialog
        open={importPreview !== null}
        onOpenChange={(open) => { if (!open) setImportPreview(null); }}
        locations={importPreview?.locations ?? []}
        errors={importPreview?.errors ?? []}
        onConfirm={handleBulkImport}
      />
    </div>
  );
}
