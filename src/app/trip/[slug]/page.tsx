"use client";

import { useState, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { MapPin, Home, Compass, ChevronUp, ChevronDown } from "lucide-react";
import { useTripStore } from "@/store/trip-store";
import { MapView } from "@/components/map-view";
import { LocationInput } from "@/components/location-input";
import { LocationList } from "@/components/location-list";
import { RankingList } from "@/components/ranking-list";
import { DistanceMatrix } from "@/components/distance-matrix";
import { CostEstimator } from "@/components/cost-estimator";
import { ComparisonView } from "@/components/comparison-view";
import { ComparisonBar } from "@/components/comparison-bar";
import { ShareExport } from "@/components/share-export";
import { WeatherWidget } from "@/components/weather-widget";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useAutoFetchDistances } from "@/hooks/use-auto-fetch-distances";
import { Card } from "@/components/ui/card";
import { EditableTripName } from "./editable-trip-name";
import { SelectAllButtons } from "./select-all-buttons";

export default function TripPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isOwner } = useAutoSave(slug);
  useAutoFetchDistances();
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const locations = useTripStore((s) => s.locations);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const weatherCenter = useMemo(() => {
    if (locations.length === 0) return null;
    return {
      lat: locations.reduce((s, l) => s + l.lat, 0) / locations.length,
      lon: locations.reduce((s, l) => s + l.lon, 0) / locations.length,
    };
  }, [locations]);

  function scrollToComparison() {
    comparisonRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 pb-16 md:pb-0">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-6 w-6 shrink-0" />
          <EditableTripName isOwner={isOwner} />
        </div>
        <ShareExport slug={slug} />
      </header>

      {/* Weather Forecast */}
      <WeatherWidget center={weatherCenter} />

      {/* Data Input + Map side-by-side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-start">
        {/* Left column: Bases + Destinations stacked */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                Bases
              </h2>
              <SelectAllButtons type="base" />
            </div>
            <LocationInput type="base" />
            <LocationList type="base" />
          </Card>
          <Card className="p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Compass className="h-4 w-4 text-muted-foreground" />
                Destinations
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Set priority to weight ranking</span>
                <SelectAllButtons type="destination" />
              </div>
            </div>
            <LocationInput type="destination" />
            <LocationList type="destination" />
          </Card>
        </div>

        {/* Right column: Map sticky */}
        <div className="sticky top-4 h-[min(600px,calc(100vh-8rem))]">
          <MapView />
        </div>
      </div>

      {/* Ranking + Matrix: Desktop inline */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <CostEstimator />
          <RankingList />
        </Card>
        <Card className="p-4">
          <DistanceMatrix />
        </Card>
      </div>

      {/* Comparison View */}
      <div ref={comparisonRef} className="hidden md:block">
        <ComparisonView wrapped />
      </div>

      {/* Floating comparison bar */}
      <ComparisonBar onView={scrollToComparison} />

      {/* Ranking + Matrix: Mobile bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t shadow-lg z-50">
        <div className="flex justify-center pt-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
          className="w-full gap-2 text-sm font-medium"
        >
          {bottomSheetOpen ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Hide Rankings
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" />
              Show Rankings
            </>
          )}
        </Button>
        <div
          className={`transition-[max-height] duration-300 ease-in-out overflow-y-auto space-y-4 ${
            bottomSheetOpen ? "max-h-[50vh] sm:max-h-[60vh] p-4" : "max-h-0 overflow-hidden"
          }`}
        >
          <CostEstimator />
          <RankingList />
          <ComparisonView />
          <DistanceMatrix />
        </div>
      </div>
    </div>
  );
}
