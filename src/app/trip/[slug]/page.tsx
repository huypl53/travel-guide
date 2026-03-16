"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MapView } from "@/components/map-view";
import { LocationInput } from "@/components/location-input";
import { LocationList } from "@/components/location-list";
import { RankingList } from "@/components/ranking-list";
import { DistanceMatrix } from "@/components/distance-matrix";
import { ShareExport } from "@/components/share-export";
import { Card } from "@/components/ui/card";

export default function TripPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 space-y-4 pb-16 md:pb-0">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trip Planner</h1>
        <ShareExport slug={slug} />
      </header>

      {/* Data Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Homestays</h2>
          <LocationInput type="homestay" />
          <LocationList type="homestay" />
        </Card>
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Destinations</h2>
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
        <button
          onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
          className="w-full p-2 text-center text-sm font-medium"
        >
          {bottomSheetOpen ? "\u25BC Hide Rankings" : "\u25B2 Show Rankings"}
        </button>
        {bottomSheetOpen && (
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            <RankingList />
            <DistanceMatrix />
          </div>
        )}
      </div>
    </div>
  );
}
