"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle } from "lucide-react";
import type { LocationType } from "@/lib/types";

interface ExtractedLocation {
  name: string;
  lat: number;
  lon: number;
  address: string | null;
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: ExtractedLocation[];
  errors: string[];
  onConfirm: (
    items: Array<ExtractedLocation & { type: LocationType }>
  ) => void;
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  locations,
  errors,
  onConfirm,
}: ImportPreviewDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkType, setBulkType] = useState<LocationType>("destination");
  const [typeOverrides, setTypeOverrides] = useState<Map<number, LocationType>>(
    new Map()
  );

  // Reset state when locations change (dialog re-opened with new data)
  useEffect(() => {
    setSelected(new Set(locations.map((_, i) => i)));
    setBulkType("destination");
    setTypeOverrides(new Map());
  }, [locations]);

  const selectedCount = selected.size;
  const allSelected = selectedCount === locations.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(locations.map((_, i) => i)));
  }

  function toggleOne(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleType(index: number) {
    setTypeOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(index) ?? bulkType;
      next.set(index, current === "homestay" ? "destination" : "homestay");
      return next;
    });
  }

  function handleConfirm() {
    const items = locations
      .map((loc, i) => ({
        ...loc,
        type: typeOverrides.get(i) ?? bulkType,
        _index: i,
      }))
      .filter((item) => selected.has(item._index))
      .map(({ _index: _, ...rest }) => rest);
    onConfirm(items);
  }

  function getType(index: number): LocationType {
    return typeOverrides.get(index) ?? bulkType;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Import {locations.length} Location{locations.length !== 1 && "s"}
          </DialogTitle>
          <DialogDescription>
            Select locations to import and choose their type.
          </DialogDescription>
        </DialogHeader>

        {/* Bulk controls */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            onClick={toggleAll}
            className="text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">All as:</span>
            <Button
              size="sm"
              variant={bulkType === "homestay" ? "default" : "outline"}
              className="h-6 px-2 text-xs"
              onClick={() => {
                setBulkType("homestay");
                setTypeOverrides(new Map());
              }}
            >
              Homestay
            </Button>
            <Button
              size="sm"
              variant={bulkType === "destination" ? "default" : "outline"}
              className="h-6 px-2 text-xs"
              onClick={() => {
                setBulkType("destination");
                setTypeOverrides(new Map());
              }}
            >
              Destination
            </Button>
          </div>
        </div>

        {/* Location list */}
        <div className="max-h-80 overflow-y-auto -mx-4 px-4">
          <div className="space-y-1">
            {locations.map((loc, i) => (
              <label
                key={i}
                className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => toggleOne(i)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-sm">
                    {loc.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                    {loc.address && ` — ${loc.address}`}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleType(i);
                  }}
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                    getType(i) === "homestay"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                  }`}
                >
                  {getType(i) === "homestay" ? "H" : "D"}
                </button>
              </label>
            ))}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm">
            <div className="flex items-center gap-1.5 font-medium text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errors.length} warning{errors.length !== 1 && "s"}
            </div>
            <ul className="mt-1 list-disc pl-5 text-xs text-yellow-700 dark:text-yellow-300">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedCount === 0}>
            Import {selectedCount} location{selectedCount !== 1 && "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
