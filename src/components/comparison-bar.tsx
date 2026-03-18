"use client";

import { GitCompareArrows, X } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { Button } from "@/components/ui/button";

interface ComparisonBarProps {
  onView: () => void;
}

export function ComparisonBar({ onView }: ComparisonBarProps) {
  const comparisonIds = useTripStore((s) => s.comparisonIds);
  const clearComparison = useTripStore((s) => s.clearComparison);

  if (comparisonIds.length < 2) return null;

  return (
    <div className="fixed bottom-14 md:bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-primary text-primary-foreground rounded-full shadow-lg px-4 py-2 flex items-center gap-3 text-sm">
      <GitCompareArrows className="h-4 w-4" />
      <span>Comparing {comparisonIds.length} bases</span>
      <Button
        variant="secondary"
        size="xs"
        onClick={onView}
        className="rounded-full hidden sm:inline-flex"
      >
        View
      </Button>
      <button
        aria-label="Clear comparison"
        onClick={clearComparison}
        className="hover:bg-primary-foreground/20 rounded-full p-2 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
