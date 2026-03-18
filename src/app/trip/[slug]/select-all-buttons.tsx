"use client";

import { useTripStore } from "@/store/trip-store";
import type { LocationType } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function SelectAllButtons({ type }: { type: LocationType }) {
  const selectAll = useTripStore((s) => s.selectAllByType);
  const deselectAll = useTripStore((s) => s.deselectAllByType);
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="xs" className="text-xs px-2" onClick={() => selectAll(type)}>
        All
      </Button>
      <Button variant="ghost" size="xs" className="text-xs px-2" onClick={() => deselectAll(type)}>
        None
      </Button>
    </div>
  );
}
