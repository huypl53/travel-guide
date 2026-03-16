"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MapPin, Home, Compass, ChevronUp, ChevronDown } from "lucide-react";
import { MapView } from "@/components/map-view";
import { LocationInput } from "@/components/location-input";
import { LocationList } from "@/components/location-list";
import { RankingList } from "@/components/ranking-list";
import { DistanceMatrix } from "@/components/distance-matrix";
import { ShareExport } from "@/components/share-export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TripPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 pb-16 md:pb-0">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
          <MapPin className="h-6 w-6" />
          Trip Planner
        </h1>
        <ShareExport slug={slug} />
      </header>

      {/* Data Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            Homestays
          </h2>
          <LocationInput type="homestay" />
          <LocationList type="homestay" />
        </Card>
        <Card className="p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Compass className="h-4 w-4 text-muted-foreground" />
              Destinations
            </h2>
            <span className="text-[10px] text-muted-foreground">Set priority to weight ranking</span>
          </div>
          <LocationInput type="destination" />
          <LocationList type="destination" />
        </Card>
      </div>

      {/* Map */}
      <MapView />

      {/* Ranking + Matrix: Desktop inline */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <RankingList />
        </Card>
        <Card className="p-4">
          <DistanceMatrix />
        </Card>
      </div>

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
            bottomSheetOpen ? "max-h-[60vh] p-4" : "max-h-0 overflow-hidden"
          }`}
        >
          <RankingList />
          <DistanceMatrix />
        </div>
      </div>
    </div>
  );
}
