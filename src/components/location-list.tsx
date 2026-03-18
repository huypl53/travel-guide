"use client";

import { useMemo, useState } from "react";
import { X, CheckSquare, Square, StickyNote, ChevronDown, ChevronRight } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { PriorityStars } from "@/components/priority-stars";
import { LocationDetail } from "@/components/location-detail";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LocationType } from "@/lib/types";

interface LocationListProps {
  type: LocationType;
}

export function LocationList({ type }: LocationListProps) {
  const allLocations = useTripStore((s) => s.locations);
  const locations = useMemo(
    () => allLocations.filter((l) => l.type === type),
    [allLocations, type]
  );
  const removeLocation = useTripStore((s) => s.removeLocation);
  const updatePriority = useTripStore((s) => s.updatePriority);
  const setFocusedLocation = useTripStore((s) => s.setFocusedLocation);
  const selectedIds = useTripStore((s) => type === "base" ? s.selectedBaseIds : s.selectedDestinationIds);
  const toggleSelection = useTripStore((s) => s.toggleLocationSelection);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (locations.length === 0) {
    return <p className="text-sm text-muted-foreground">No {type}s added yet.</p>;
  }

  return (
    <TooltipProvider delay={300}>
      <ul className="space-y-1 max-h-[300px] overflow-y-auto">
        {locations.map((loc) => (
          <li key={loc.id}>
            <div
              className={`flex items-center justify-between py-1 px-2 rounded hover:bg-muted border-l-4 cursor-pointer ${
                loc.type === "destination" ? "border-l-red-400" : "border-l-blue-400"
              } ${!selectedIds.has(loc.id) ? "opacity-40" : ""}`}
              onClick={(e) => {
                const btn = (e.target as HTMLElement).closest("button");
                if (btn && btn.getAttribute("data-slot") !== "tooltip-trigger") return;
                setFocusedLocation({ lat: loc.lat, lon: loc.lon });
              }}
            >
              <button
                className="mr-1.5 flex-shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); toggleSelection(loc.id); }}
                aria-label={selectedIds.has(loc.id) ? "Deselect" : "Select"}
              >
                {selectedIds.has(loc.id) ? (
                  <CheckSquare className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-primary" />
                ) : (
                  <Square className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                )}
              </button>
              <button
                className="mr-1 flex-shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 inline-flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedId(expandedId === loc.id ? null : loc.id);
                }}
                aria-label={expandedId === loc.id ? "Collapse details" : "Expand details"}
              >
                {expandedId === loc.id ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {loc.notes && (
                <StickyNote className="h-3 w-3 text-amber-500 mr-1 flex-shrink-0" aria-label="Has notes" />
              )}
              <Tooltip>
                <TooltipTrigger className="flex-1 truncate text-sm text-left min-w-0 bg-transparent font-normal">
                  {loc.name}
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{loc.name}</p>
                </TooltipContent>
              </Tooltip>
              {type === "destination" && (
                <PriorityStars
                  value={loc.priority}
                  onChange={(p) => updatePriority(loc.id, p)}
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-8 w-8 sm:h-6 sm:w-6 p-0"
                onClick={(e) => { e.stopPropagation(); removeLocation(loc.id); }}
                aria-label="Remove"
              >
                <X className="h-4 w-4 sm:h-3 sm:w-3" />
              </Button>
            </div>
            {expandedId === loc.id && <LocationDetail location={loc} />}
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}
