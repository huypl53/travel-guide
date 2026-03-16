"use client";

import { useTripStore } from "@/store/trip-store";
import { PriorityStars } from "@/components/priority-stars";
import { Button } from "@/components/ui/button";
import type { LocationType } from "@/lib/types";

interface LocationListProps {
  type: LocationType;
}

export function LocationList({ type }: LocationListProps) {
  const locations = useTripStore((s) =>
    s.locations.filter((l) => l.type === type)
  );
  const removeLocation = useTripStore((s) => s.removeLocation);
  const updatePriority = useTripStore((s) => s.updatePriority);

  if (locations.length === 0) {
    return <p className="text-sm text-muted-foreground">No {type}s added yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {locations.map((loc) => (
        <li key={loc.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted">
          <span className="text-sm truncate flex-1">{loc.name}</span>
          {type === "destination" && (
            <PriorityStars
              value={loc.priority}
              onChange={(p) => updatePriority(loc.id, p)}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-6 w-6 p-0"
            onClick={() => removeLocation(loc.id)}
          >
            x
          </Button>
        </li>
      ))}
    </ul>
  );
}
